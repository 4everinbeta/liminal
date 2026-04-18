import json
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from semantic_kernel import Kernel
from semantic_kernel.contents import ChatMessageContent, AuthorRole, ChatHistory
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion, OpenAIChatCompletion
from openai import AsyncOpenAI

from ..config import get_settings
from ..models import TaskParseResponse, Priority

class TaskParsingService:
    def __init__(self):
        self.settings = get_settings()
        self.kernel = Kernel()
        self._setup_ai_service()

    def _setup_ai_service(self):
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
            if base_url.endswith("/chat/completions"):
                base_url = base_url.replace("/chat/completions", "")
            if provider == "groq" and "openai/v1" not in base_url:
                base_url = base_url.rstrip("/") + "/openai/v1"

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
            raise ValueError(f"Unsupported LLM provider: {provider}")

        self.kernel.add_service(service)

    async def parse_task(self, input_text: str) -> TaskParseResponse:
        prompt = f"""Extract task details from this natural language input: "{input_text}"

Respond ONLY with a JSON object containing these keys:
- title (string, required)
- due_date_natural (string or null, e.g. "tomorrow", "Friday at 2pm")
- estimated_duration (integer or null, minutes only)
- priority (string or null: "high", "medium", "low")
- priority_score (integer or null, 1-100)
- effort_score (integer or null, 1-100)
- value_score (integer or null, 1-100)

If a detail is missing, use null.
Recognize modifiers like "!high", "30m", "tomorrow".

Example input: "Call Mom tomorrow 15m !high"
Example response: {{"title": "Call Mom", "due_date_natural": "tomorrow", "estimated_duration": 15, "priority": "high", "priority_score": 90, "effort_score": 30, "value_score": 50}}
"""
        chat_service = self.kernel.get_service("chat")
        
        chat_history = ChatHistory()
        chat_history.add_user_message(prompt)

        # Simple chat completion
        response = await chat_service.get_chat_message_content(
            chat_history=chat_history,
            settings=chat_service.instantiate_prompt_execution_settings()
        )

        content = response.content
        # Basic JSON extraction
        try:
            # Strip markdown code blocks if present
            if content.startswith("```json"):
                content = content.replace("```json", "", 1).split("```")[0].strip()
            elif content.startswith("```"):
                content = content.replace("```", "", 1).split("```")[0].strip()
            
            data = json.loads(content)
            
            # Ensure priority is valid enum
            priority = data.get("priority")
            if priority not in ["high", "medium", "low"]:
                priority = None
            
            return TaskParseResponse(
                title=data.get("title") or input_text,
                due_date_natural=data.get("due_date_natural"),
                estimated_duration=data.get("estimated_duration"),
                priority=priority,
                priority_score=data.get("priority_score"),
                effort_score=data.get("effort_score"),
                value_score=data.get("value_score")
            )
        except (json.JSONDecodeError, Exception):
            # Fallback to just the title
            return TaskParseResponse(title=input_text)
