from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion, OpenAIChatCompletion
from openai import AsyncOpenAI

from ..config import get_settings
from ..models import Task, TaskStatus
from .. import crud

class AIPrioritizationService:
    def __init__(self, session: AsyncSession, user_id: str):
        self.session = session
        self.user_id = user_id
        self.settings = get_settings()
        self.kernel = Kernel()
        self._setup_ai_service()

    def _setup_ai_service(self):
        """Configure the AI service based on settings."""
        provider = self.settings.llm_provider.lower()

        if not self.settings.llm_model:
            raise ValueError("LLM_MODEL environment variable is required")

        if provider == "azure":
            service = AzureChatCompletion(
                deployment_name=self.settings.llm_model,
                endpoint=self.settings.llm_base_url,
                api_key=self.settings.llm_api_key,
                api_version=self.settings.azure_openai_api_version or "2024-02-01",
                service_id="chat"
            )
        elif provider == "openai":
            service = OpenAIChatCompletion(
                service_id="chat",
                ai_model_id=self.settings.llm_model,
                api_key=self.settings.llm_api_key
            )
        elif provider in ["groq", "local"]:
            base_url = self.settings.llm_base_url
            if base_url and base_url.endswith("/chat/completions"):
                base_url = base_url.replace("/chat/completions", "")
            
            if provider == "groq" and base_url and "openai/v1" not in base_url:
                if base_url.endswith("/"):
                    base_url += "openai/v1"
                else:
                    base_url += "/openai/v1"

            custom_client = AsyncOpenAI(
                base_url=base_url,
                api_key=self.settings.llm_api_key or "not-needed"
            )
            service = OpenAIChatCompletion(
                service_id="chat",
                ai_model_id=self.settings.llm_model,
                async_client=custom_client
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}. Must be one of: azure, openai, groq, local")

        self.kernel.add_service(service)

    async def get_prioritization_prompt(self, tasks: List[Task], current_capacity: str) -> str:
        """
        Generates a prompt for the LLM to get a prioritization suggestion.
        """
        task_list_str = ""
        for task in tasks:
            due_date_str = task.due_date.strftime("%Y-%m-%d %H:%M") if task.due_date else "No due date"
            task_list_str += (
                f"- ID: {task.id}
"
                f"  Title: {task.title}
"
                f"  Status: {task.status.value}
"
                f"  Priority: {task.priority.value} ({task.priority_score})
"
                f"  Due: {due_date_str}
"
                f"  Estimated Duration: {task.estimated_duration or 'N/A'} minutes
"
                f"  Value Score: {task.value_score}
"
                f"  Effort Score: {task.effort_score}

"
            )

        prompt = (
            f"You are an AI assistant designed to help a user with ADHD prioritize tasks. "
            f"Your goal is to suggest ONE single 'Do This Now' task from their current active tasks. "
            f"The user needs a clear, actionable suggestion to overcome decision paralysis.

"
            f"**Prioritization Principles (critical for ADHD user):**
"
            f"1. **Urgency above all else:** Tasks with impending deadlines or that are overdue are highest priority.
"
            f"2. **Smallest next step:** Prefer tasks with smaller estimated durations to build momentum, especially if there are no urgent tasks.
"
            f"3. **Value:** Consider tasks with higher value if urgency and effort are equal.
"
            f"4. **Capacity:** Take into account the user's current estimated capacity for today. If capacity is low, suggest a quick win.

"
            f"**User's Current Capacity:** {current_capacity}

"
            f"**User's Active Tasks:**
"
            f"{task_list_str}"
            f"Based on these principles, which ONE task should the user do NOW? "
            f"Explain your reasoning briefly, focusing on urgency and momentum.

"
            f"**Respond ONLY in the following JSON format:**
"
            f"```json
"
            f"{{
"
            f'  "suggested_task_id": "string",
'
            f'  "reasoning": "string" // Max 3 sentences, concise, actionable
'
            f"}}
"
            f"```
"
        )
        return prompt

    async def get_ai_suggestion(self) -> Optional[Dict[str, Any]]:
        """
        Fetches an AI-powered prioritization suggestion.
        """
        # Get active tasks
        tasks = await crud.get_tasks(self.session, self.user_id)
        active_tasks = [t for t in tasks if t.status not in [TaskStatus.done, TaskStatus.paused, TaskStatus.blocked]]

        if not active_tasks:
            return None

        # Get current capacity (placeholder for now, needs real implementation from frontend or monitor)
        # For now, a simple heuristic:
        capacity_hours = 8 # Assume 8 hour workday for simplicity
        minutes_done_today = 0
        for task in tasks:
            if task.status == TaskStatus.done and task.updated_at and (datetime.utcnow() - task.updated_at) < timedelta(days=1):
                minutes_done_today += (task.estimated_duration or 0)
        
        remaining_capacity_minutes = (capacity_hours * 60) - minutes_done_today
        current_capacity = f"{remaining_capacity_minutes // 60} hours and {remaining_capacity_minutes % 60} minutes remaining today."

        # Generate prompt
        prompt = await self.get_prioritization_prompt(active_tasks, current_capacity)

        # Call LLM
        try:
            result = await self.kernel.invoke_prompt(prompt, service_id="chat")
            import json
            suggestion = json.loads(str(result))
            return suggestion
        except Exception as e:
            print(f"Error getting AI suggestion: {e}")
            return None
