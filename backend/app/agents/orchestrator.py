"""
Orchestrator for handoff pattern - routes requests to specialized agents.

The orchestrator maintains conversation state, determines which agent should
handle each request, and manages handoffs between agents.
"""

import os
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from .base import Agent, AgentResponse
from .. import crud

DEBUG_AGENT = os.getenv("DEBUG_AGENT", "").lower() in ("1", "true", "yes")


class Orchestrator:
    """
    Central orchestrator that routes requests to specialized agents.

    Manages conversation state, agent selection, and handoffs.
    """

    def __init__(self, session: AsyncSession, user_id: str):
        """
        Initialize orchestrator with database session and user context.

        Args:
            session: AsyncSession for database operations
            user_id: Current user's ID
        """
        self.session = session
        self.user_id = user_id
        self.agents: List[Agent] = []
        self._agent_map: Dict[str, Agent] = {}

    def register_agent(self, agent: Agent):
        """
        Register an agent with the orchestrator.

        Args:
            agent: Agent instance to register
        """
        self.agents.append(agent)
        self._agent_map[agent.name] = agent

        if DEBUG_AGENT:
            print(f"Registered agent: {agent.name} - {agent.description}")

    async def process_request(
        self,
        message: str,
        state: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """
        Process a user request by routing to the appropriate agent.

        Args:
            message: User's message
            state: Current conversation state (None for new conversation)

        Returns:
            AgentResponse from the handling agent
        """
        # Initialize state if needed
        if state is None:
            state = {
                "current_agent": None,
                "conversation_history": [],
                "pending_confirmation": None,
                "context": {}
            }

        # Add message to history
        state["conversation_history"].append({"role": "user", "content": message})

        # Check for pending confirmation (multi-step flows)
        if state.get("pending_confirmation"):
            return await self._handle_pending_confirmation(message, state)

        # Determine which agent should handle this request
        agent = await self._route_request(message, state)

        if DEBUG_AGENT:
            print(f"Routing to agent: {agent.name}")

        # Execute agent
        response = await agent.handle(message, state)

        # Update state
        state.update(response.state_updates)
        state["current_agent"] = agent.name
        state["conversation_history"].append({
            "role": "assistant",
            "content": response.content
        })

        # Handle handoff if requested
        if response.handoff_to:
            if DEBUG_AGENT:
                print(f"Handoff requested: {agent.name} → {response.handoff_to}")

            return await self._handle_handoff(
                from_agent=agent,
                to_agent_name=response.handoff_to,
                message=message,
                state=state,
                context=response.state_updates.get("handoff_context", {})
            )

        return response

    async def _route_request(self, message: str, state: Dict[str, Any]) -> Agent:
        """
        Determine which agent should handle the request.

        Uses confidence scoring from each agent to select the best match.

        Args:
            message: User's message
            state: Current conversation state

        Returns:
            Agent that should handle the request
        """
        # If there's a current agent, check if it should continue handling
        current_agent_name = state.get("current_agent")
        if current_agent_name and current_agent_name in self._agent_map:
            current_agent = self._agent_map[current_agent_name]

            # Check if current agent wants to hand off
            handoff_to = current_agent.should_handoff(message, state)
            if handoff_to:
                if DEBUG_AGENT:
                    print(f"Agent {current_agent_name} suggests handoff to {handoff_to}")
                if handoff_to in self._agent_map:
                    return self._agent_map[handoff_to]

            # Check if current agent can still handle
            confidence = await current_agent.can_handle(message, state)
            if confidence > 0.5:  # Stick with current agent if moderately confident
                return current_agent

        # Get confidence scores from all agents
        scores = []
        for agent in self.agents:
            confidence = await agent.can_handle(message, state)
            scores.append((agent, confidence))

            if DEBUG_AGENT:
                print(f"Agent {agent.name}: confidence = {confidence:.2f}")

        # Sort by confidence (highest first)
        scores.sort(key=lambda x: x[1], reverse=True)

        # Return agent with highest confidence
        if scores and scores[0][1] > 0.0:
            return scores[0][0]

        # Fallback to first agent (should be general agent)
        if DEBUG_AGENT:
            print("No agent matched, using fallback")
        return self.agents[0] if self.agents else None

    async def _handle_pending_confirmation(
        self,
        message: str,
        state: Dict[str, Any]
    ) -> AgentResponse:
        """
        Handle user response to a pending confirmation.

        Used for multi-step flows like task creation with confirmation.

        Args:
            message: User's message (likely "yes" or "no")
            state: Current conversation state with pending_confirmation

        Returns:
            AgentResponse from the agent that requested confirmation
        """
        pending = state["pending_confirmation"]
        agent_name = pending.get("agent")

        if not agent_name or agent_name not in self._agent_map:
            # Clear invalid pending confirmation
            state["pending_confirmation"] = None
            return AgentResponse(content="Sorry, I lost track of what we were confirming. Could you try again?")

        agent = self._agent_map[agent_name]

        if DEBUG_AGENT:
            print(f"Handling pending confirmation for {agent_name}")

        # Let the agent handle the confirmation
        response = await agent.handle(message, state)

        # If agent completed the action, clear pending confirmation
        if response.tool_calls or not response.state_updates.get("pending_confirmation"):
            state["pending_confirmation"] = None

        return response

    async def _handle_handoff(
        self,
        from_agent: Agent,
        to_agent_name: str,
        message: str,
        state: Dict[str, Any],
        context: Dict[str, Any]
    ) -> AgentResponse:
        """
        Handle handoff from one agent to another.

        Args:
            from_agent: Agent requesting the handoff
            to_agent_name: Name of agent to hand off to
            message: Original user message
            state: Current conversation state
            context: Additional context from the handoff request

        Returns:
            AgentResponse from the new agent
        """
        if to_agent_name not in self._agent_map:
            return AgentResponse(
                content=f"Sorry, I can't hand off to {to_agent_name} - that agent doesn't exist."
            )

        to_agent = self._agent_map[to_agent_name]

        # Update state with handoff context
        state["handoff_context"] = context
        state["previous_agent"] = from_agent.name
        state["current_agent"] = to_agent_name

        if DEBUG_AGENT:
            print(f"Executing handoff: {from_agent.name} → {to_agent.name}")
            print(f"Handoff context: {context}")

        # Execute the new agent
        response = await to_agent.handle(message, state)

        # Update state
        state.update(response.state_updates)
        state["conversation_history"].append({
            "role": "assistant",
            "content": response.content
        })

        return response
