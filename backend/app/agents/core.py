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
from .tools import ToolCall, CreateTaskArgs, DeleteTaskArgs, SearchTasksArgs, UpdateTaskArgs, CompleteTaskArgs
from ..websockets import manager

DEBUG_AGENT = os.getenv("DEBUG_AGENT", "").lower() in ("1", "true", "yes")
USE_SK_ORCHESTRATOR = os.getenv("USE_SK_ORCHESTRATOR", "true").lower() in ("1", "true", "yes")

class AgentService:
    def __init__(self, session: AsyncSession, user_id: str):
        self.session = session
        self.user_id = user_id
        self.settings = get_settings()
        self.user_context = None
        self._sk_orchestrator = None

    async def _fetch_user_context(self):
        from sqlmodel import select
        from ..models import User
        stmt = select(User).where(User.id == self.user_id)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            self.user_context = {
                "name": user.name or "User",
            }

    async def process_request(self, messages: List[Dict[str, str]], session_id: Optional[str] = None) -> Dict[str, Any]:
        await self._fetch_user_context()

        user_msg_content = messages[-1]["content"] if messages else ""

        # Use Semantic Kernel orchestrator if enabled
        if USE_SK_ORCHESTRATOR:
            return await self._process_with_sk_orchestrator(user_msg_content, session_id)

        # Legacy implementation
        chat_session = None
        if session_id:
            chat_session = await crud.get_chat_session(self.session, session_id, self.user_id)

        if not chat_session:
            chat_session = await crud.create_chat_session(self.session, self.user_id, title=user_msg_content[:30])

        if user_msg_content:
            await crud.add_chat_message(self.session, chat_session.id, "user", user_msg_content)

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
            
        if response:
            await crud.add_chat_message(self.session, chat_session.id, "assistant", response)

        return {
            "content": response, 
            "session_id": chat_session.id,
            "confirmation_options": ["Yes", "No", "Edit"] if "Would you like me to create this task?" in response else None
        }

    async def _process_with_sk_orchestrator(self, message: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process request using Semantic Kernel orchestrator.

        Args:
            message: User's message
            session_id: Optional chat session ID

        Returns:
            Dict with content and session_id
        """
        from .sk_orchestrator import SKOrchestrator
        from .sk_agents import create_task_agent, create_qa_agent, create_tracking_agent, create_general_agent

        # Get or create chat session
        chat_session = None
        if session_id:
            chat_session = await crud.get_chat_session(self.session, session_id, self.user_id)

        if not chat_session:
            chat_session = await crud.create_chat_session(self.session, self.user_id, title=message[:30])

        # Save user message
        if message:
            await crud.add_chat_message(self.session, chat_session.id, "user", message)

        # Initialize SK orchestrator (lazy initialization)
        if not self._sk_orchestrator:
            if DEBUG_AGENT:
                print("SK: Initializing orchestrator and agents")

            self._sk_orchestrator = SKOrchestrator(self.session, self.user_id, chat_session.id if chat_session else None)

            # Get context for agents
            user_context = await self._sk_orchestrator.get_active_tasks_context()

            # Create and register agents
            task_agent = create_task_agent(self._sk_orchestrator.kernel, user_context)
            qa_agent = create_qa_agent(self._sk_orchestrator.kernel)
            tracking_agent = create_tracking_agent(self._sk_orchestrator.kernel)
            general_agent = create_general_agent(self._sk_orchestrator.kernel)

            # Register in order of priority (General is fallback)
            self._sk_orchestrator.register_agent(task_agent)
            self._sk_orchestrator.register_agent(qa_agent)
            self._sk_orchestrator.register_agent(tracking_agent)
            self._sk_orchestrator.register_agent(general_agent)

            # Create group chat
            self._sk_orchestrator.create_group_chat()

        # Process message
        response = await self._sk_orchestrator.process_request(message)
        
        # Ensure response is valid
        if not response or not response.strip():
            response = "I'm not sure how to help with that."

        clean_response = response

        # Save assistant response
        if response:
            if "pending_confirmation:" in response:
                # Remove the JSON part
                clean_response = response.split("pending_confirmation:")[0].strip()
                
                # If the model output NOTHING but the confirmation marker, add a default message
                if not clean_response:
                    clean_response = "I've prepared that task. Does it look correct? (Reply 'yes' to confirm)"

            await crud.add_chat_message(self.session, chat_session.id, "assistant", clean_response)

        return {
            "content": clean_response, 
            "session_id": chat_session.id,
            "pending_confirmation": self._sk_orchestrator.pending_confirmation if self._sk_orchestrator else None,
            "confirmation_options": ["Yes", "No", "Edit"] if self._sk_orchestrator and self._sk_orchestrator.pending_confirmation else None
        }

    async def _call_llm(self, messages: List[Dict[str, str]], model: Optional[str] = None) -> str:
        base_url = self.settings.llm_base_url
        if not base_url:
            raise Exception("LLM base URL not configured")

        headers = {"Content-Type": "application/json"}
        params = None
        
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
        else:
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
        try:
            code_block = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL | re.IGNORECASE)
            if code_block:
                return json.loads(code_block.group(1))
            
            start = text.find('{')
            end = text.rfind('}')
            if start != -1 and end != -1 and end > start:
                json_str = text[start:end+1]
                return json.loads(json_str)
                
            return None
        except json.JSONDecodeError:
            return None

    def _sanitize_response(self, text: str) -> str:
        """
        Remove JSON code blocks and raw tool JSON from the text to ensure 
        only natural language reaches the user. Handles nested braces.
        """
        # 1. Remove markdown blocks first
        text = re.sub(r"```(?:json)?\s*\{.*?\}\s*```", "", text, flags=re.DOTALL | re.IGNORECASE)

        # 2. Iteratively remove JSON objects that contain "tool":
        while True:
            start = text.find('{')
            if start == -1:
                break
            
            balance = 0
            end = -1
            for i in range(start, len(text)):
                char = text[i]
                if char == '{':
                    balance += 1
                elif char == '}':
                    balance -= 1
                    if balance == 0:
                        end = i
                        break
            
            if end != -1:
                json_candidate = text[start:end+1]
                if '"tool":' in json_candidate or "'tool':" in json_candidate:
                    text = text[:start] + text[end+1:]
                else:
                    # Strip any top-level JSON just to be safe
                    text = text[:start] + text[end+1:]
            else:
                break
        
        return text.strip()

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
        # Fetch recent tasks to provide context
        recent_tasks = await crud.get_tasks(self.session, self.user_id)
        # Limit to most recent 10 non-completed tasks for context
        active_tasks = [t for t in recent_tasks if t.status != TaskStatus.done][:10]

        task_context = ""
        if active_tasks:
            task_context = "\n\n**Current Active Tasks (for reference):**\n"
            for task in active_tasks:
                task_context += f"- {task.title} (ID: {task.id}, Status: {task.status})\n"

        system_msg = {"role": "system", "content": TASK_AGENT_SYSTEM_PROMPT + task_context}

        response = await self._call_llm([system_msg] + messages)
        tool_data = self._extract_json(response)

        if not tool_data and ('"tool":' in response or "'tool':" in response):
             retry_msg = {
                 "role": "system",
                 "content": "ERROR: JSON parsing failed. Output VALID JSON ONLY inside markdown code blocks."
             }
             response = await self._call_llm([system_msg] + messages + [retry_msg])
             tool_data = self._extract_json(response)

        if not tool_data:
            if '"tool":' in response:
                return "I'm sorry, I tried to perform that action but got confused. Could you try again?"
            return response

        if tool_data:
            try:
                tool_call = ToolCall(**tool_data) 
                
                result_text = ""
                refresh_needed = False
                
                if tool_call.tool == "create_task":
                    from datetime import datetime
                    from ..utils.date_parser import parse_natural_date, format_date_for_user, get_weekday_name

                    args = CreateTaskArgs(**tool_call.args)

                    # Pre-validate dates and handle past date confirmation
                    if args.due_date_natural:
                        parsed_due = parse_natural_date(args.due_date_natural)
                        if not parsed_due:
                            return f"I couldn't understand the due date '{args.due_date_natural}'. Could you rephrase? (e.g., 'tomorrow', 'next Monday', 'January 15')"

                        # Check if past date (user preference: require confirmation)
                        if parsed_due < datetime.utcnow():
                            # Check if user already confirmed
                            last_msg = messages[-1]["content"].lower() if messages else ""
                            if "yes" not in last_msg and "confirm" not in last_msg:
                                weekday = get_weekday_name(parsed_due)
                                return f"The date '{args.due_date_natural}' is in the past. Did you mean next {weekday} instead? Reply 'yes' to confirm past date or provide a new date."

                    if args.start_date_natural:
                        parsed_start = parse_natural_date(args.start_date_natural)
                        if not parsed_start:
                            return f"I couldn't understand the start date '{args.start_date_natural}'. Could you rephrase?"

                    # Create task
                    task = await crud.create_task(self.session, TaskCreate(**args.dict()), self.user_id)
                    await manager.broadcast("refresh", self.user_id)

                    # Build confirmation with date info
                    parts = [f"Successfully created task: '{task.title}'"]
                    if task.priority_score:
                        parts.append(f"Priority: {task.priority_score}")
                    if task.effort_score:
                        parts.append(f"Effort: {task.effort_score}")
                    if task.due_date:
                        parts.append(f"Due: {format_date_for_user(task.due_date)}")
                    if task.start_date:
                        parts.append(f"Starts: {format_date_for_user(task.start_date)}")

                    result_text = " | ".join(parts) + "."
                    refresh_needed = True
                    
                elif tool_call.tool == "search_tasks":
                    args = SearchTasksArgs(**tool_call.args)
                    search_results = await crud.search_tasks(self.session, self.user_id, args.query)

                    if not search_results:
                        result_text = "No tasks found."
                    else:
                        # Format results with similarity scores
                        result_text = "Found:\n"
                        for task, score in search_results:
                            match_type = "exact match" if score == 100.0 else f"{score:.0f}% match"
                            result_text += f"- {task.title} (ID: {task.id}, {match_type})\n"

                        # Add guidance for ambiguous matches
                        if len(search_results) > 1 or (search_results and search_results[0][1] < 100.0):
                            result_text += "\nMultiple or fuzzy matches found. Please confirm which task you meant."
                        
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

                elif tool_call.tool == "complete_task":
                    args = CompleteTaskArgs(**tool_call.args)
                    task = await crud.get_task_by_id(self.session, args.id, self.user_id)
                    if task:
                        await crud.update_task(self.session, task, {"status": "done"})
                        await manager.broadcast("refresh", self.user_id)
                        result_text = f"Marked task '{task.title}' as complete."
                        refresh_needed = True
                    else:
                        result_text = "Task not found."

                elif tool_call.tool == "update_task":
                    args = UpdateTaskArgs(**tool_call.args)
                    task = await crud.get_task_by_id(self.session, args.id, self.user_id)
                    if task:
                        update_dict = {}
                        if args.status:
                            update_dict["status"] = args.status
                        if args.priority_score:
                            update_dict["priority_score"] = args.priority_score
                        if args.effort_score:
                            update_dict["effort_score"] = args.effort_score
                        if args.title:
                            update_dict["title"] = args.title
                        if args.notes:
                            update_dict["notes"] = args.notes

                        if update_dict:
                            await crud.update_task(self.session, task, update_dict)
                            await manager.broadcast("refresh", self.user_id)
                            result_text = f"Updated task '{task.title}'."
                            refresh_needed = True
                        else:
                            result_text = "No updates provided."
                    else:
                        result_text = "Task not found."

                tool_result_msg = {
                    "role": "system",
                    "content": f"Tool execution result: {result_text}"
                }
                
                final_response = await self._call_llm([system_msg] + messages + [tool_result_msg])
                
                clean_response = self._sanitize_response(final_response)
                if not clean_response and refresh_needed:
                    clean_response = "Action completed successfully."

                if refresh_needed:
                    clean_response += " :::{\"action\": \"refresh_board\"}:::"
                
                return clean_response

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
