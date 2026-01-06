"""
Semantic Kernel-based orchestrator for agent handoff pattern.

Uses Microsoft Semantic Kernel's AgentGroupChat for multi-agent orchestration
with handoff capabilities.
"""

import os
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from semantic_kernel import Kernel
from semantic_kernel.agents import ChatCompletionAgent, AgentGroupChat
from semantic_kernel.agents.strategies.selection.kernel_function_selection_strategy import (
    KernelFunctionSelectionStrategy
)
from semantic_kernel.agents.strategies.termination.kernel_function_termination_strategy import (
    KernelFunctionTerminationStrategy
)
from semantic_kernel.contents import ChatMessageContent, AuthorRole
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion, OpenAIChatCompletion
from openai import AsyncOpenAI

from ..config import get_settings
from .. import crud

DEBUG_AGENT = os.getenv("DEBUG_AGENT", "").lower() in ("1", "true", "yes")


class SKOrchestrator:
    """
    Semantic Kernel orchestrator for multi-agent conversations.

    Uses AgentGroupChat to manage handoffs between specialized agents.
    """

    def __init__(self, session: AsyncSession, user_id: str):
        """
        Initialize SK orchestrator with database session and user context.

        Args:
            session: AsyncSession for database operations
            user_id: Current user's ID
        """
        self.session = session
        self.user_id = user_id
        self.settings = get_settings()

        # Initialize Semantic Kernel
        self.kernel = Kernel()
        self._setup_ai_service()

        # Initialize agents
        self.agents: List[ChatCompletionAgent] = []
        self.group_chat: Optional[AgentGroupChat] = None

        # Conversation state
        self.pending_confirmation: Optional[Dict[str, Any]] = None
        self.conversation_context: Dict[str, Any] = {}

    def _setup_ai_service(self):
        """Configure the AI service based on settings."""
        provider = self.settings.llm_provider.lower()

        if provider == "azure":
            service = AzureChatCompletion(
                deployment_name=self.settings.llm_model,
                endpoint=self.settings.llm_base_url,
                api_key=self.settings.llm_api_key,
                api_version=self.settings.azure_openai_api_version or "2024-02-01",
                service_id="chat"
            )
        elif provider == "openai":
            # Standard OpenAI
            service = OpenAIChatCompletion(
                service_id="chat",
                ai_model_id=self.settings.llm_model,
                api_key=self.settings.llm_api_key
            )
        elif provider in ["groq", "local"]:
            # Groq and local providers need custom base URL
            # Use AsyncOpenAI client with custom base_url
            custom_client = AsyncOpenAI(
                base_url=self.settings.llm_base_url,
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

        if DEBUG_AGENT:
            print(f"SK: Initialized {provider} service with model {self.settings.llm_model}")

    def register_agent(self, agent: ChatCompletionAgent):
        """
        Register an agent with the orchestrator.

        Args:
            agent: ChatCompletionAgent instance to register
        """
        self.agents.append(agent)

        if DEBUG_AGENT:
            print(f"SK: Registered agent: {agent.name}")

    def create_group_chat(
        self,
        selection_strategy: Optional[KernelFunctionSelectionStrategy] = None,
        termination_strategy: Optional[KernelFunctionTerminationStrategy] = None
    ):
        """
        Create the AgentGroupChat for orchestrating conversations.

        Args:
            selection_strategy: Strategy for selecting which agent speaks next
            termination_strategy: Strategy for determining when conversation ends
        """
        if not self.agents:
            raise ValueError("No agents registered. Call register_agent() first.")

        self.group_chat = AgentGroupChat(
            agents=self.agents,
            selection_strategy=selection_strategy,
            termination_strategy=termination_strategy
        )

        if DEBUG_AGENT:
            print(f"SK: Created group chat with {len(self.agents)} agents")

    async def process_request(
        self,
        message: str,
        chat_history: Optional[List[ChatMessageContent]] = None
    ) -> str:
        """
        Process a user request through the agent group chat.

        Args:
            message: User's message
            chat_history: Previous chat messages (None for new conversation)

        Returns:
            Agent's response as a string
        """
        if not self.group_chat:
            self.create_group_chat()

        # Check for pending confirmation
        if self.pending_confirmation:
            return await self._handle_pending_confirmation(message)

        # Create user message
        user_message = ChatMessageContent(
            role=AuthorRole.USER,
            content=message
        )

        # Add to group chat
        await self.group_chat.add_chat_message(user_message)

        if DEBUG_AGENT:
            print(f"SK: User message: {message}")

        # Get agent responses
        responses = []
        async for response in self.group_chat.invoke():
            if DEBUG_AGENT:
                print(f"SK: {response.name}: {response.content}")

            responses.append(response.content)

            # Check if agent set pending confirmation
            if "pending_confirmation:" in response.content:
                self._extract_pending_confirmation(response.content)

        # Return the last response
        return responses[-1] if responses else "I'm not sure how to help with that."

    async def _handle_pending_confirmation(self, message: str) -> str:
        """
        Handle user response to a pending confirmation.

        Args:
            message: User's response (likely "yes" or "no")

        Returns:
            Agent's response
        """
        # If no pending confirmation, return error
        if not self.pending_confirmation:
            return "I'm not waiting for any confirmation right now. How can I help you?"

        message_lower = message.lower().strip()

        if message_lower in ["yes", "y", "confirm", "create it", "do it"]:
            # User confirmed - execute the pending action
            action = self.pending_confirmation.get("action")
            details = self.pending_confirmation.get("details", {})

            if DEBUG_AGENT:
                print(f"SK: Executing pending action: {action}")
                print(f"SK: Details: {details}")

            # Execute the action
            result = await self._execute_action(action, details)

            # Clear pending confirmation
            self.pending_confirmation = None

            return result

        elif message_lower in ["no", "n", "cancel", "nevermind"]:
            # User cancelled
            self.pending_confirmation = None
            return "Okay, cancelled. What else can I help with?"

        else:
            # User wants to modify - route back to agent
            return await self.process_request(
                f"Modify pending task: {message}",
                chat_history=None
            )

    async def _execute_action(self, action: str, details: Dict[str, Any]) -> str:
        """
        Execute a confirmed action.

        Args:
            action: Action type (e.g., "create_task")
            details: Action details

        Returns:
            Success message
        """
        from ..models import TaskCreate
        from ..websockets import manager

        if action == "create_task":
            # Create task
            task_data = TaskCreate(**details)
            task = await crud.create_task(self.session, task_data, self.user_id)
            await manager.broadcast("refresh", self.user_id)

            return f"✓ Created task: '{task.title}' (Priority: {task.priority_score}, Due: {task.due_date or 'Not set'})"

        elif action == "complete_task":
            # Complete task
            task_id = details.get("id")
            task = await crud.get_task_by_id(self.session, task_id, self.user_id)

            if task:
                await crud.update_task(self.session, task, {"status": "done"})
                await manager.broadcast("refresh", self.user_id)
                return f"✓ Marked '{task.title}' as complete!"
            else:
                return "Error: Task not found."

        elif action == "update_task":
            # Update task
            task_id = details.pop("id")
            task = await crud.get_task_by_id(self.session, task_id, self.user_id)

            if task:
                await crud.update_task(self.session, task, details)
                await manager.broadcast("refresh", self.user_id)
                return f"✓ Updated '{task.title}'"
            else:
                return "Error: Task not found."

        else:
            return f"Error: Unknown action '{action}'"

    def _extract_pending_confirmation(self, content: str):
        """
        Extract pending confirmation from agent response.

        Agents can signal pending confirmation by including a special marker
        in their response: "pending_confirmation: {json_data}"

        Args:
            content: Agent's response content
        """
        import json

        if "pending_confirmation:" in content:
            try:
                # Extract JSON after the marker
                marker = "pending_confirmation:"
                start = content.index(marker) + len(marker)
                json_str = content[start:].strip()

                # Find the JSON object
                brace_count = 0
                end_idx = 0
                for i, char in enumerate(json_str):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = i + 1
                            break

                if end_idx > 0:
                    self.pending_confirmation = json.loads(json_str[:end_idx])

                    if DEBUG_AGENT:
                        print(f"SK: Extracted pending confirmation: {self.pending_confirmation}")

            except (json.JSONDecodeError, ValueError) as e:
                if DEBUG_AGENT:
                    print(f"SK: Failed to extract pending confirmation: {e}")

    async def get_active_tasks_context(self) -> str:
        """
        Get current active tasks for agent context.

        Returns:
            Formatted string of active tasks
        """
        from ..models import TaskStatus

        tasks = await crud.get_tasks(self.session, self.user_id)
        active_tasks = [t for t in tasks if t.status != TaskStatus.done][:10]

        if not active_tasks:
            return "No active tasks."

        context = "**Current Active Tasks:**\n"
        for task in active_tasks:
            context += f"- {task.title} (ID: {task.id}, Status: {task.status})\n"

        return context
