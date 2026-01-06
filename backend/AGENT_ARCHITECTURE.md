# Agent Architecture: Handoff Orchestration

## Overview

Implements Microsoft's Handoff Orchestration pattern for AI agents where a central orchestrator routes requests to specialized agents, and agents can hand off to each other based on context.

## Pattern Benefits

1. **Modularity**: Each agent has focused responsibilities
2. **Scalability**: Easy to add new specialized agents
3. **Context Preservation**: Orchestrator maintains conversation state
4. **Flexibility**: Agents can collaborate on complex tasks
5. **Testability**: Each agent can be tested independently

## Architecture

```
User Request
     ↓
Orchestrator (maintains state, routes requests)
     ↓
  ┌──┴──────────────┬──────────────┬──────────────┐
  ↓                 ↓              ↓              ↓
TaskAgent      QAAgent      TrackingAgent    GeneralAgent
  │                 │              │              │
  └─────────────────┴──────────────┴──────────────┘
           (Agents can request handoffs)
                     ↓
                Orchestrator
```

## Components

### 1. Orchestrator (`backend/app/agents/orchestrator.py`)

**Responsibilities:**
- Maintains conversation state and history
- Routes initial requests to appropriate agent
- Handles handoff requests between agents
- Aggregates responses from multiple agents if needed
- Manages conversation context

**State:**
```python
{
  "current_agent": "task_agent",
  "conversation_history": [...],
  "pending_confirmation": {...},  # For multi-step flows
  "context": {...}  # Shared context across agents
}
```

**Methods:**
- `route_request(message, state)` - Determine which agent should handle request
- `execute_agent(agent_name, message, state)` - Execute specific agent
- `handle_handoff(from_agent, to_agent, context)` - Process handoff between agents
- `update_state(updates)` - Update conversation state

### 2. Specialized Agents

Each agent is a class implementing the `Agent` interface:

```python
class Agent(ABC):
    @abstractmethod
    async def can_handle(self, message: str, state: dict) -> bool:
        """Determine if this agent can handle the request"""
        pass

    @abstractmethod
    async def handle(self, message: str, state: dict) -> AgentResponse:
        """Handle the request and return response"""
        pass

    @abstractmethod
    def get_tools(self) -> List[Tool]:
        """Return list of tools this agent can use"""
        pass
```

**AgentResponse:**
```python
@dataclass
class AgentResponse:
    content: str  # Response to user
    tool_calls: List[dict]  # Tools to execute
    handoff_to: Optional[str] = None  # Agent to hand off to
    state_updates: dict = field(default_factory=dict)  # State updates
    refresh_needed: bool = False  # Trigger UI refresh
```

#### a) TaskAgent

**Responsibilities:**
- Task creation (with confirmation flow)
- Task completion
- Task updates
- Task search (fuzzy matching)
- Task deletion

**Tools:**
- `create_task`
- `complete_task`
- `update_task`
- `search_tasks`
- `delete_task`

**Handoff Scenarios:**
- If user asks "What should I work on?" → Handoff to TrackingAgent
- If user asks "How do I use this feature?" → Handoff to QAAgent

#### b) QAAgent

**Responsibilities:**
- Answer questions about Liminal features
- Provide productivity advice
- Explain ADHD-friendly workflows

**Tools:** None (uses knowledge base only)

**Handoff Scenarios:**
- If user mentions creating/completing tasks → Handoff to TaskAgent
- If user asks about their progress → Handoff to TrackingAgent

#### c) TrackingAgent

**Responsibilities:**
- Provide status updates
- Identify stale tasks
- Suggest next actions
- Show progress metrics

**Tools:**
- `get_task_stats`
- `get_stale_tasks`

**Handoff Scenarios:**
- If user wants to work on suggested task → Handoff to TaskAgent
- If user asks how to use features → Handoff to QAAgent

#### d) GeneralAgent (Fallback)

**Responsibilities:**
- Handle greetings, casual conversation
- Provide context-aware suggestions
- Default handler when no specialized agent matches

**Tools:** None

**Handoff Scenarios:**
- Routes to appropriate agent based on conversation flow

## Multi-Step Flows with Confirmation

### Task Creation Flow

```
1. User: "Create task to review code by Friday"
   → TaskAgent

2. TaskAgent analyzes request:
   - Extracts: title, priority, dates
   - Stores in state.pending_confirmation
   - Response: Confirmation message (plain text, no tools)

3. User: "Yes"
   → Orchestrator checks state.pending_confirmation
   → TaskAgent executes create_task tool
   → Clears pending_confirmation
   → Returns success message + refresh
```

### Task Completion with Fuzzy Match

```
1. User: "Complete review code"
   → TaskAgent

2. TaskAgent:
   - Searches tasks with fuzzy match
   - Finds "Review cloud code for Yury" (75% match)
   - Stores match in state.pending_confirmation
   - Response: "I found 'Review cloud code for Yury' (75% match). Is this correct?"

3. User: "Yes"
   → Orchestrator checks state.pending_confirmation
   → TaskAgent executes complete_task with stored task ID
   → Clears pending_confirmation
   → Returns success + refresh
```

## Implementation Plan

### Phase 1: Core Infrastructure
- [ ] Create `Agent` base class
- [ ] Create `AgentResponse` dataclass
- [ ] Create `Orchestrator` class with routing logic
- [ ] Implement state management

### Phase 2: Migrate Existing Agents
- [ ] Convert TaskAgent to new pattern
- [ ] Convert QAAgent to new pattern
- [ ] Convert TrackingAgent to new pattern
- [ ] Add GeneralAgent

### Phase 3: Handoff Logic
- [ ] Implement handoff detection in agent responses
- [ ] Add orchestrator handoff handling
- [ ] Test agent-to-agent handoffs

### Phase 4: Enhanced Features
- [ ] Add confidence scoring to routing
- [ ] Implement multi-agent collaboration
- [ ] Add agent performance metrics
- [ ] Create agent testing framework

## Benefits Over Current Architecture

**Current (Simple Routing):**
- Supervisor classifies → routes to handler function
- No agent collaboration
- No state preservation between turns
- Hard to add complex flows

**New (Handoff Orchestration):**
- Agents can collaborate and hand off
- State preserved across conversation
- Easy to add multi-step flows
- Clear separation of concerns
- Better testability
- Agents can request help from other agents

## Example: Complex Multi-Agent Flow

```
User: "What should I work on? And create a task for it"

1. Orchestrator routes to TrackingAgent
2. TrackingAgent:
   - Analyzes stale tasks
   - Returns: "You have 3 stale tasks. 'Review cloud code' is highest priority"
   - Handoff to TaskAgent for creation

3. Orchestrator hands off to TaskAgent with context
4. TaskAgent:
   - Receives context: "User wants to create task based on 'Review cloud code'"
   - Asks: "Should I create a follow-up task for 'Review cloud code'?"

5. User: "Yes, high priority, due Friday"
6. TaskAgent:
   - Shows confirmation
   - Waits for confirmation
   - Creates task
   - Returns success
```

## Testing Strategy

Each agent can be tested independently:

```python
# Test TaskAgent
task_agent = TaskAgent(session, user_id)
response = await task_agent.handle(
    "Create task to review code",
    {"current_agent": "task_agent", "conversation_history": []}
)
assert response.content.startswith("I'll create a task")
assert response.tool_calls == []  # No tools yet, waiting for confirmation
assert response.state_updates["pending_confirmation"] is not None
```

## Migration Path

1. Keep existing `AgentService` for backward compatibility
2. Implement new `OrchestratorService` alongside
3. Add feature flag to switch between architectures
4. Test new architecture thoroughly
5. Switch default to new architecture
6. Deprecate old architecture
