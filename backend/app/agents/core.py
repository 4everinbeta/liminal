import json
import httpx
import os
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from .. import crud
from ..models import TaskCreate, TaskStatus
from ..config import get_settings
from .prompts import (
    SUPERVISOR_SYSTEM_PROMPT,
    TASK_AGENT_SYSTEM_PROMPT,
    QA_AGENT_SYSTEM_PROMPT,
    TRACKING_AGENT_SYSTEM_PROMPT
)
from .tools import ToolCall, CreateTaskArgs, DeleteTaskArgs, SearchTasksArgs
from ..websockets import manager

DEBUG_AGENT = os.getenv("DEBUG_AGENT", "").lower() in ("1", "true", "yes")

class AgentService:
    def __init__(self, session: AsyncSession, user_id: str):
        self.session = session
        self.user_id = user_id
        self.settings = get_settings()
        self.user_context = None

    async def _fetch_user_context(self):
        # We need a crud method for this or direct query
        # For simplicity, assuming crud or direct execution
        from sqlmodel import select
        from ..models import User
        stmt = select(User).where(User.id == self.user_id)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            self.user_context = {
                "name": user.name or "User",
                # "theme": user.settings.theme if user.settings else "default" 
            }

    async def process_request(self, messages: List[Dict[str, str]], session_id: Optional[str] = None) -> str:
        await self._fetch_user_context()
        # ... rest of the method ...

    async def _call_llm(self, messages: List[Dict[str, str]], model: Optional[str] = None) -> str:
        base_url = self.settings.llm_base_url
        if not base_url:
            raise Exception("LLM base URL not configured")

        headers = {"Content-Type": "application/json"}
        params = None
        
        # Determine endpoint and auth based on provider
        if self.settings.llm_provider.lower() == "azure":
            api_version = self.settings.azure_openai_api_version or "2023-09-01-preview"
            params = {"api-version": api_version}
            if self.settings.llm_api_key:
                headers["api-key"] = self.settings.llm_api_key
            full_url = f"{base_url}/deployments/{self.settings.llm_model}/chat/completions"
        elif self.settings.llm_provider.lower() == "groq":
            headers["Authorization"] = f"Bearer {self.settings.llm_api_key}"
            full_url = f"{base_url}/openai/v1/chat/completions"
        elif self.settings.llm_provider.lower() == "local":
            if self.settings.llm_api_key:
                headers["Authorization"] = f"Bearer {self.settings.llm_api_key}"
            full_url = base_url
        else: # Default to OpenAI-compatible API
            if self.settings.llm_api_key:
                headers["Authorization"] = f"Bearer {self.settings.llm_api_key}"
            full_url = f"{base_url}/v1/chat/completions"

        if DEBUG_AGENT:
            print(f"DEBUG: Requesting URL: {full_url}")
            print(f"DEBUG: Model: {model or self.settings.llm_model}")

        body = {
            "messages": messages, 
            "model": model or self.settings.llm_model, 
            "stream": False,
            "temperature": 0.2, 
            "tool_choice": "none" 
        }

        async with httpx.AsyncClient(timeout=30.0) as client: 
            try:
                resp = await client.post(full_url, json=body, headers=headers, params=params)
                resp.raise_for_status()
                data = resp.json()
                return data.get("choices", [{}])[0].get("message", {}).get("content", "")
            except httpx.HTTPError as e:
                print(f"LLM Provider Error: {e}")
                raise

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Robustly extract JSON from text. 
        Handles markdown code blocks (```json ... ```) and raw JSON.
        """
        try:
            # 1. Try finding markdown code blocks first
            code_block = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL | re.IGNORECASE)
            if code_block:
                return json.loads(code_block.group(1))
            
            # 2. Try finding raw JSON object
            # Matches { ... } that looks like a valid object
            json_match = re.search(r"(\{.*\})", text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
                
            return None
        except json.JSONDecodeError:
            return None

    async def process_request(self, messages: List[Dict[str, str]], session_id: Optional[str] = None) -> Dict[str, Any]:
        # 1. Handle Persistence
        user_msg_content = messages[-1]["content"] if messages else ""
        
        chat_session = None
        if session_id:
            chat_session = await crud.get_chat_session(self.session, session_id, self.user_id)
        
        if not chat_session:
            chat_session = await crud.create_chat_session(self.session, self.user_id, title=user_msg_content[:30])
        
        if user_msg_content:
            await crud.add_chat_message(self.session, chat_session.id, "user", user_msg_content)

        # 2. Supervisor Step
        intent = await self._classify_intent(messages)
        if DEBUG_AGENT:
            print(f"DEBUG: Intent classified as {intent}")

        response = ""
        if intent == "task_management":
            response = await self._handle_task_management(messages)
        elif intent == "general_qa":
            response = await self._handle_qa(messages)
        elif intent == "tracking":
            response = await self._handle_tracking(messages)
        else:
            response = await self._call_llm(messages)
            
        # 3. Save Response
        if response:
            await crud.add_chat_message(self.session, chat_session.id, "assistant", response)
            
        return {"content": response, "session_id": chat_session.id}

    async def _classify_intent(self, messages: List[Dict[str, str]]) -> str:
        content = SUPERVISOR_SYSTEM_PROMPT
        if self.user_context:
            content = f"User Context: {self.user_context}\n\n" + content
            
        system_msg = {"role": "system", "content": content}
        context = messages[-3:] if len(messages) > 3 else messages
        response = await self._call_llm([system_msg] + context)
        
        cleaned = response.strip().upper()
        if "TASK" in cleaned: return "task_management"
        if "QA" in cleaned: return "general_qa"
        if "TRACKING" in cleaned: return "tracking"
        return "chat"

    async def _handle_task_management(self, messages: List[Dict[str, str]]) -> str:
        system_msg = {"role": "system", "content": TASK_AGENT_SYSTEM_PROMPT}
        
        response = await self._call_llm([system_msg] + messages)
        tool_data = self._extract_json(response)

        # Retry logic
        if not tool_data and any(k in response.lower() for k in ["created", "deleted", "added"]):
             retry_msg = {
                 "role": "system",
                 "content": "ERROR: You did not output the valid JSON command. Output JSON ONLY."
             }
             response = await self._call_llm([system_msg] + messages + [retry_msg])
             tool_data = self._extract_json(response)

        if tool_data:
            try:
                # Validate with Pydantic
                tool_call = ToolCall(**tool_data)
                
                result_text = ""
                refresh_needed = False
                
                if tool_call.tool == "create_task":
                    args = CreateTaskArgs(**tool_call.args)
                    task = await crud.create_task(self.session, TaskCreate(**args.dict()), self.user_id)
                    await manager.broadcast("refresh", self.user_id)
                    result_text = f"Successfully created task: '{task.title}' (ID: {task.id})."
                    refresh_needed = True
                    
                elif tool_call.tool == "search_tasks":
                    args = SearchTasksArgs(**tool_call.args)
                    tasks = await crud.search_tasks(self.session, self.user_id, args.query)
                    if not tasks:
                        result_text = "No tasks found."
                    else:
                        result_text = "Found:\n" + "\n".join([f"- {t.title} (ID: {t.id})" for t in tasks])
                        
                elif tool_call.tool == "delete_task":
                    args = DeleteTaskArgs(**tool_call.args)
                    task = await crud.get_task_by_id(self.session, args.id, self.user_id)
                    if task:
                        await crud.delete_task(self.session, task)
                        await manager.broadcast("refresh", self.user_id)
                        result_text = f"Deleted task '{task.title}'."
                        refresh_needed = True
                    else:
                        result_text = "Task not found."

                tool_result_msg = {
                    "role": "system", 
                    "content": f"Tool execution result: {result_text}"
                }
                
                final_response = await self._call_llm([system_msg] + messages + [tool_result_msg])
                
                if refresh_needed:
                    # Append client-side action trigger
                    final_response += " :::{\"action\": \"refresh_board\"}:::"
                
                return final_response

            except Exception as e:
                if DEBUG_AGENT:
                    print(f"Tool execution failed: {e}")
                return f"I encountered an error executing that command: {str(e)}"
        
        return response

    async def _handle_qa(self, messages: List[Dict[str, str]]) -> str:
        system_msg = {"role": "system", "content": QA_AGENT_SYSTEM_PROMPT}
        return await self._call_llm([system_msg] + messages)

    async def _handle_tracking(self, messages: List[Dict[str, str]]) -> str:
        tasks = await crud.get_tasks(self.session, self.user_id)
        stale_tasks = await crud.get_stale_tasks(self.session, self.user_id, days=5)
        
        backlog_count = len([t for t in tasks if t.status == TaskStatus.backlog])
        in_progress_count = len([t for t in tasks if t.status == TaskStatus.in_progress])
        done_count = len([t for t in tasks if t.status == TaskStatus.done])
        
        context_str = f"""
Current Status:
- Backlog: {backlog_count}
- In Progress: {in_progress_count}
- Completed: {done_count}
- Stale Tasks (>5 days old): {len(stale_tasks)}
"""
        if stale_tasks:
            context_str += "\nStale Items:\n" + "\n".join([f"- {t.title} ({t.created_at.strftime('%Y-%m-%d')})" for t in stale_tasks[:3]])

        system_msg = {
            "role": "system",
            "content": TRACKING_AGENT_SYSTEM_PROMPT + f"\n{context_str}"
        }
        return await self._call_llm([system_msg] + messages)