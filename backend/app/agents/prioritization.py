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

def _extract_json_from_response(response_str: str) -> Optional[Dict[str, Any]]:
    import json
    # Handle markdown code fences
    if "```json" in response_str:
        response_str = response_str.split("```json")[1].split("```")[0]
    
    try:
        return json.loads(response_str)
    except json.JSONDecodeError:
        return None

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
                f"- ID: {task.id}\n"
                f"  Title: {task.title}\n"
                f"  Status: {task.status.value}\n"
                f"  Priority: {task.priority.value} ({task.priority_score})\n"
                f"  Due: {due_date_str}\n"
                f"  Estimated Duration: {task.estimated_duration or 'N/A'} minutes\n"
                f"  Value Score: {task.value_score}\n"
                f"  Effort Score: {task.effort_score}\n"
                f"  Feedback: {task.ai_suggestion_status.value}\n\n"
            )
        
        prompt = f"""You are an AI assistant designed to help a user with ADHD prioritize tasks.
Your goal is to suggest ONE single 'Do This Now' task from their current active tasks.
The user needs a clear, actionable suggestion to overcome decision paralysis.

**Prioritization Principles (critical for ADHD user):**
1. **Urgency above all else:** Tasks with impending deadlines or that are overdue are highest priority.
2. **Smallest next step:** Prefer tasks with smaller estimated durations to build momentum, especially if there are no urgent tasks.
3. **Value:** Consider tasks with higher value if urgency and effort are equal.
4. **Capacity:** Take into account the user's current estimated capacity for today. If capacity is low, suggest a quick win.
5. **Learn from Feedback:** Pay attention to the 'Feedback' field. If a task was 'accepted' previously, it's a good candidate. If 'dismissed', avoid suggesting it again immediately unless urgency has increased significantly.

**User's Current Capacity:** {current_capacity}

**User's Active Tasks:**
{task_list_str}
Based on these principles, which ONE task should the user do NOW?
Explain your reasoning briefly, focusing on urgency and momentum.

**Respond ONLY in the following JSON format:**
```json
{{
  "suggested_task_id": "string",
  "reasoning": "string" // Max 3 sentences, concise, actionable
}}
```
"""
        return prompt

    async def get_list_prioritization_prompt(self, tasks: List[Task], current_capacity: str) -> str:
        """
        Generates a prompt for the LLM to score all active tasks.
        """
        task_list_str = ""
        for task in tasks:
            due_date_str = task.due_date.strftime("%Y-%m-%d %H:%M") if task.due_date else "No due date"
            task_list_str += (
                f"- ID: {task.id}\n"
                f"  Title: {task.title}\n"
                f"  Status: {task.status.value}\n"
                f"  Priority: {task.priority.value} ({task.priority_score})\n"
                f"  Due: {due_date_str}\n"
                f"  Estimated Duration: {task.estimated_duration or 'N/A'} minutes\n"
                f"  Value Score: {task.value_score}\n"
                f"  Effort Score: {task.effort_score}\n"
                f"  Feedback: {task.ai_suggestion_status.value}\n\n"
            )

        prompt = f"""You are an AI assistant designed to help a user with ADHD prioritize their entire task list.
Your goal is to assign an 'AI Relevance Score' (0-100) to each task.
High scores (80-100) mean "Do This Now". Low scores (0-20) mean "Can wait".

**Prioritization Principles (critical for ADHD user):**
1. **Urgency above all else:** Tasks with impending deadlines or that are overdue get the highest scores.
2. **Smallest next step:** Prefer tasks with smaller estimated durations to build momentum.
3. **Contextual Value:** Higher value tasks get a boost.
4. **Capacity:** If capacity is low, favor 'Quick Wins' (small effort).
5. **Learn from Feedback:** Pay attention to the 'Feedback' field. Tasks marked 'accepted' should maintain high relevance. Tasks marked 'dismissed' should generally receive lower scores unless their urgency has significantly increased.

**User's Current Capacity:** {current_capacity}

**User's Active Tasks:**
{task_list_str}
Assign a score to EVERY task listed above. Explain the overall prioritization strategy in one sentence.

**Respond ONLY in the following JSON format:**
```json
{{
  "scores": [
    {{ "task_id": "string", "score": number }},
    ...
  ],
  "strategy_summary": "string"
}}
```
"""
        return prompt

    async def update_task_scores(self) -> Optional[Dict[str, Any]]:
        """
        Calculates and updates AI relevance scores for all active tasks.
        """
        # Get active tasks
        tasks = await crud.get_tasks(self.session, self.user_id)
        active_tasks = [t for t in tasks if t.status not in [TaskStatus.done, TaskStatus.paused, TaskStatus.blocked]]

        if not active_tasks:
            return None

        # Get current capacity
        capacity_hours = 8 
        minutes_done_today = 0
        for task in tasks:
            if task.status == TaskStatus.done and task.updated_at and (datetime.utcnow() - task.updated_at) < timedelta(days=1):
                minutes_done_today += (task.estimated_duration or 0)
        
        remaining_capacity_minutes = (capacity_hours * 60) - minutes_done_today
        current_capacity = f"{remaining_capacity_minutes // 60} hours and {remaining_capacity_minutes % 60} minutes remaining today."

        # Generate prompt
        prompt = await self.get_list_prioritization_prompt(active_tasks, current_capacity)

        # Call LLM
        try:
            result = await self.kernel.invoke_prompt(prompt, service_id="chat")
            data = _extract_json_from_response(str(result))
            
            if data and "scores" in data:
                # Update tasks in DB
                for score_entry in data["scores"]:
                    task_id = score_entry.get("task_id")
                    score = score_entry.get("score")
                    if task_id and score is not None:
                        # Direct update to avoid overhead
                        from sqlmodel import select
                        statement = select(Task).where(Task.id == task_id, Task.user_id == self.user_id)
                        res = await self.session.execute(statement)
                        task = res.scalar_one_or_none()
                        if task:
                            task.ai_relevance_score = score
                
                await self.session.commit()
                return data
            return None
        except Exception as e:
            print(f"Error updating task scores: {e}")
            return None

    async def get_ai_suggestion(self) -> Optional[Dict[str, Any]]:
        """
        Fetches an AI-powered prioritization suggestion by first updating all scores.
        """
        # 1. Update scores for all active tasks
        scoring_data = await self.update_task_scores()
        
        # 2. Get the top task from updated scores
        tasks = await crud.get_tasks(self.session, self.user_id)
        active_tasks = [t for t in tasks if t.status not in [TaskStatus.done, TaskStatus.paused, TaskStatus.blocked]]
        
        if not active_tasks:
            return None
            
        # Find task with highest ai_relevance_score
        top_task = max(active_tasks, key=lambda t: t.ai_relevance_score or 0)
        
        if top_task.ai_relevance_score == 0:
            # If no scores were assigned or all are 0, fallback to basic suggestion
            # This handles cases where update_task_scores failed
            return {
                "suggested_task_id": active_tasks[0].id,
                "reasoning": "Starting with your first task to build momentum."
            }

        return {
            "suggested_task_id": top_task.id,
            "reasoning": scoring_data.get("strategy_summary", "Suggested based on urgency and impact.") if scoring_data else "High impact task for right now."
        }

