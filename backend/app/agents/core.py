import json
import httpx
import os
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from .. import crud
from ..models import TaskCreate, TaskStatus
from ..config import get_settings
from .knowledge import LIMINAL_KNOWLEDGE_BASE

DEBUG_AGENT = os.getenv("DEBUG_AGENT", "").lower() in ("1", "true", "yes")

class AgentService:
    def __init__(self, session: AsyncSession, user_id: str):
        self.session = session
        self.user_id = user_id
        self.settings = get_settings()

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
            # Azure specific URL structure
            full_url = f"{base_url}/deployments/{self.settings.llm_model}/chat/completions"
        elif self.settings.llm_provider.lower() == "groq":
            headers["Authorization"] = f"Bearer {self.settings.llm_api_key}"
            full_url = f"{base_url}/openai/v1/chat/completions"
        elif self.settings.llm_provider.lower() == "local":
            # For local Ollama, the base_url already includes /v1/chat/completions
            if self.settings.llm_api_key:
                headers["Authorization"] = f"Bearer {self.settings.llm_api_key}"
            full_url = base_url
        else: # Default to OpenAI-compatible API
            if self.settings.llm_api_key:
                headers["Authorization"] = f"Bearer {self.settings.llm_api_key}"
            full_url = f"{base_url}/v1/chat/completions"

        if DEBUG_AGENT:
            print(f"DEBUG: LLM Provider: {self.settings.llm_provider}")
            print(f"DEBUG: Requesting URL: {full_url}")
            print(f"DEBUG: Model: {model or self.settings.llm_model}")
            masked_key = self.settings.llm_api_key[:4] + "..." if self.settings.llm_api_key else "None"
            print(f"DEBUG: API Key present: {masked_key}")

        body = {
            "messages": messages, 
            "model": model or self.settings.llm_model, 
            "stream": False,
            "temperature": 0.2, # Low temperature for actions
            # Explicitly disable native tools to prevent "Tool choice is none" errors
            # when the model tries to be smart but we want raw text JSON.
            # Note: Azure/OpenAI might complain if 'tools' isn't passed, so we conditionally add it?
            # Actually, standard OpenAI API allows tool_choice='none' even without tools.
            "tool_choice": "none" 
        }

        async with httpx.AsyncClient(timeout=30.0) as client: # Reduced timeout to 30s
            try:
                resp = await client.post(full_url, json=body, headers=headers, params=params)
                resp.raise_for_status()
                data = resp.json()
                return data.get("choices", [{}])[0].get("message", {}).get("content", "")
            except httpx.HTTPStatusError as e:
                if DEBUG_AGENT:
                    print(
                        f"HTTP Status Error from LLM provider: {e.response.status_code} - {e.response.text}"
                    )
                else:
                    print(f"HTTP Status Error from LLM provider: {e.response.status_code}")
                raise
            except httpx.RequestError as e:
                if DEBUG_AGENT:
                    print(f"Request Error to LLM provider: {e}")
                else:
                    print("Request Error to LLM provider")
                raise


    async def process_request(self, messages: List[Dict[str, str]]) -> str:
        # 1. Supervisor Step
        intent = await self._classify_intent(messages)
        if DEBUG_AGENT:
            print(f"DEBUG: Intent classified as {intent}")

        # 2. Hand off to specialized agent
        if intent == "task_management":
            return await self._handle_task_management(messages)
        elif intent == "general_qa":
            return await self._handle_qa(messages)
        elif intent == "tracking":
            return await self._handle_tracking(messages)
        else:
            # Fallback to simple chat
            return await self._call_llm(messages)

    async def _classify_intent(self, messages: List[Dict[str, str]]) -> str:
        # Refined Supervisor Prompt - Simplified for Llama 3.2
        system_msg = {
            "role": "system",
            "content": """
You are the Supervisor Agent. Classify the user's intent.
Reply with ONE word from this list: TASK, QA, TRACKING, CHAT.

Rules:
- TASK: Creating, deleting, updating, searching tasks. "Buy milk", "Delete task 1".
- QA: Questions about Liminal, productivity, or how-to.
- TRACKING: "What do I do?", "Stale tasks?", "Status?".
- CHAT: Greetings, random thoughts.
"""
        }
        # Context: last 3 messages
        context = messages[-3:] if len(messages) > 3 else messages
        response = await self._call_llm([system_msg] + context)
        
        if DEBUG_AGENT:
            print(f"DEBUG: Supervisor Raw Response: '{response}'")
        
        cleaned = response.strip().upper()
        
        if "TASK" in cleaned:
            return "task_management"
        if "QA" in cleaned:
            return "general_qa"
        if "TRACKING" in cleaned:
            return "tracking"
            
        return "chat"

    async def _handle_task_management(self, messages: List[Dict[str, str]]) -> str:
        system_msg = {
            "role": "system",
            "content": """
You are a Task Database Interface.
You CANNOT create, update, or delete tasks by just writing text.
You MUST output a JSON tool command to perform the action.

Tools:
1. CREATE_TASK(title, priority, priority_score, effort_score, value_score)
   - priority: "low", "medium", "high"
   - priority_score: 1-100 (Default mapping if not specified: Low=20, Medium=50, High=90)
   - effort_score: 1-100 (Default: 50)
   - value_score: 1-100 (Default: 50)
2. DELETE_TASK(id)
3. SEARCH_TASKS(query)

Format:
:::{"tool": "create_task", "args": {"title": "Buy milk", "priority": "medium", "priority_score": 50, "value_score": 50, "effort_score": 20}}:::

If you need more info (e.g. title is missing), ASK the user.
If the user provides values like "value of 40", map it to "value_score": 40.
If the user provides "effort of 30", map it to "effort_score": 30.
If you are ready to act, OUTPUT THE JSON ONLY.
"""
        }
        
        # First attempt
        response = await self._call_llm([system_msg] + messages)
        if DEBUG_AGENT:
            print(f"DEBUG: Task Agent Raw Response: '{response}'")
        
        # Regex to find JSON block: matches ::: { ... } ::: or ::: { ... } ::: with variable whitespace
        json_match = re.search(r":::\s*(\{.*?\})\s*:::", response, re.DOTALL)

        # Retry logic: If LLM claims to have acted but didn't output JSON
        if not json_match and ("created" in response.lower() or "deleted" in response.lower() or "added" in response.lower()):
             # It likely hallucinated. Force it.
             retry_msg = {
                 "role": "system",
                 "content": "ERROR: You did not output the JSON command. Output the JSON command now."
             }
             response = await self._call_llm([system_msg] + messages + [retry_msg])
             if DEBUG_AGENT:
                 print(f"DEBUG: Task Agent Retry Response: '{response}'")
             json_match = re.search(r":::\s*(\{.*?\})\s*:::", response, re.DOTALL)

        if json_match:
            try:
                json_str = json_match.group(1)
                tool_call = json.loads(json_str)
                
                tool_name = tool_call.get("tool")
                args = tool_call.get("args", {})
                
                result_text = ""
                refresh_needed = False
                
                if tool_name == "create_task":
                    # Ensure effort_score maps to estimated_duration if needed, or vice-versa
                    # But the model has effort_score, so let's stick to that.
                    task = await crud.create_task(self.session, TaskCreate(**args), self.user_id)
                    result_text = f"Successfully created task: '{task.title}' (ID: {task.id})."
                    refresh_needed = True
                    
                elif tool_name == "search_tasks":
                    tasks = await crud.search_tasks(self.session, self.user_id, args.get("query", ""))
                    if not tasks:
                        result_text = "No tasks found."
                    else:
                        result_text = "Found:\n" + "\n".join([f"- {t.title} (ID: {t.id})" for t in tasks])
                        result_text += "\nPlease specify which ID to act on."
                        
                elif tool_name == "delete_task":
                    task_id = args.get("id")
                    if task_id:
                        task = await crud.get_task_by_id(self.session, task_id, self.user_id)
                        if task:
                            await crud.delete_task(self.session, task)
                            result_text = f"Deleted task '{task.title}'."
                            refresh_needed = True
                        else:
                            result_text = "Task not found."
                    else:
                        result_text = "Missing Task ID."

                tool_result_msg = {
                    "role": "system", 
                    "content": f"Tool execution result: {result_text}"
                }
                
                # Generate final response based on tool result
                final_response = await self._call_llm([system_msg] + messages + [tool_result_msg])
                
                if refresh_needed:
                    final_response += " :::{\"action\": \"refresh_board\"}:::"
                
                return final_response

            except Exception as e:
                if DEBUG_AGENT:
                    print(f"Tool execution failed: {e}")
                return "I encountered an error executing that command."
        
        return response

    async def _handle_qa(self, messages: List[Dict[str, str]]) -> str:
        system_msg = {
            "role": "system",
            "content": f"""
You are the Q&A Agent.
Use the following Knowledge Base to answer questions:

{LIMINAL_KNOWLEDGE_BASE}

Be helpful and concise.
"""
        }
        return await self._call_llm([system_msg] + messages)

    async def _handle_tracking(self, messages: List[Dict[str, str]]) -> str:
        # Enhanced Tracking Logic
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
            "content": f"""
You are the Task Tracking Agent.
Your goal is to help the user stay on top of things.
Use the provided context. If there are stale tasks, proactively mention them.
{context_str}
"""
        }
        return await self._call_llm([system_msg] + messages)