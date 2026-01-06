"""
Base classes for handoff orchestration pattern.

Implements the Agent interface and response types for the multi-agent system.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class AgentResponse:
    """
    Response from an agent after handling a request.

    Attributes:
        content: Natural language response to show the user
        tool_calls: List of tool calls to execute (JSON format)
        handoff_to: Name of agent to hand off to (None if staying with current agent)
        state_updates: Updates to conversation state
        refresh_needed: Whether UI should refresh (for task operations)
    """
    content: str
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    handoff_to: Optional[str] = None
    state_updates: Dict[str, Any] = field(default_factory=dict)
    refresh_needed: bool = False


@dataclass
class AgentTool:
    """
    Tool that an agent can use.

    Attributes:
        name: Tool identifier (e.g., "create_task")
        description: What the tool does
        parameters: JSON schema for tool parameters
    """
    name: str
    description: str
    parameters: Dict[str, Any]


class Agent(ABC):
    """
    Base class for all agents in the handoff orchestration system.

    Each agent is responsible for a specific domain (tasks, QA, tracking, etc.)
    and can hand off to other agents when appropriate.
    """

    def __init__(self, session: Any, user_id: str):
        """
        Initialize agent with database session and user context.

        Args:
            session: AsyncSession for database operations
            user_id: Current user's ID
        """
        self.session = session
        self.user_id = user_id

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for this agent (e.g., "task_agent")"""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable description of what this agent does"""
        pass

    @abstractmethod
    async def can_handle(self, message: str, state: Dict[str, Any]) -> float:
        """
        Determine if this agent can handle the given message.

        Args:
            message: User's message
            state: Current conversation state

        Returns:
            Confidence score (0.0 to 1.0) that this agent can handle the message
            0.0 = cannot handle, 1.0 = definitely can handle
        """
        pass

    @abstractmethod
    async def handle(self, message: str, state: Dict[str, Any]) -> AgentResponse:
        """
        Handle the user's message and return a response.

        Args:
            message: User's message
            state: Current conversation state (includes history, pending actions, etc.)

        Returns:
            AgentResponse with content, optional tool calls, and state updates
        """
        pass

    @abstractmethod
    def get_tools(self) -> List[AgentTool]:
        """
        Get list of tools this agent can use.

        Returns:
            List of AgentTool objects
        """
        pass

    def should_handoff(self, message: str, state: Dict[str, Any]) -> Optional[str]:
        """
        Determine if this agent should hand off to another agent.

        Override this method to implement handoff logic.

        Args:
            message: User's message
            state: Current conversation state

        Returns:
            Name of agent to hand off to, or None to stay with current agent
        """
        return None
