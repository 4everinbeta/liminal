# Semantic Kernel Implementation Guide

## Overview

This project uses Microsoft's **Semantic Kernel** framework to implement a multi-agent orchestration system with handoff capabilities.

## Architecture

```
User Request
     ↓
SKOrchestrator (Semantic Kernel AgentGroupChat)
     ↓
  ┌──┴──────────────┬──────────────┬──────────────┐
  ↓                 ↓              ↓              ↓
TaskAgent      QAAgent      TrackingAgent    GeneralAgent
(ChatCompletionAgent instances)
```

## Components

### 1. SKOrchestrator (`app/agents/sk_orchestrator.py`)

**Responsibilities:**
- Initializes Semantic Kernel
- Configures AI service (Azure OpenAI, OpenAI, Groq, Local)
- Creates and manages `AgentGroupChat`
- Handles pending confirmations (multi-step flows)
- Executes confirmed actions (create/complete/update tasks)

### 2. Agents (`app/agents/sk_agents.py`)

Each agent is a `ChatCompletionAgent` with specific instructions:

#### TaskAgent
- Task creation (with confirmation)
- Task completion
- Task updates
- Task search (fuzzy matching)
- Task deletion

#### QAAgent
- Answers questions about Liminal
- Explains features
- Provides productivity tips
- Hands off to TaskAgent when user wants to create tasks

#### TrackingAgent
- Shows current progress
- Identifies stale tasks
- Suggests next actions
- Provides motivation

#### GeneralAgent
- Handles greetings
- Casual conversation
- Routes to specialized agents

## Feature Flag

The SK orchestrator is controlled by an environment variable:

```bash
# Enable SK orchestrator (default)
USE_SK_ORCHESTRATOR=true

# Disable SK orchestrator (use legacy implementation)
USE_SK_ORCHESTRATOR=false
```

## Confirmation Flow

The SK implementation uses a special marker for pending confirmations:

### Task Creation Flow

**Step 1: User Request**
```
User: "Create task to review code by Friday"
```

**Step 2: Agent Asks for Confirmation**
```
TaskAgent: "I'll create a task with these details:
- Title: Review code
- Priority: 50 (Medium)
- Effort: 50 (Medium)
- Value: 50 (Medium)
- Due: Friday
- Start: Not set
Would you like me to create this task? (Reply 'yes' to confirm)

pending_confirmation: {"action": "create_task", "details": {...}}
"
```

**Step 3: Orchestrator Detects Marker**
- Extracts `pending_confirmation` JSON
- Stores in orchestrator state
- Strips marker from user-facing response

**Step 4: User Confirms**
```
User: "Yes"
```

**Step 5: Orchestrator Executes Action**
- Calls `crud.create_task()` with stored details
- Broadcasts websocket refresh
- Returns success message

## Handoff Pattern

Agents can hand off to each other by mentioning the target agent:

```python
# In QAAgent instructions
"If user asks to create a task → Say 'Let me hand this to the Task Agent'"

# Semantic Kernel's AgentGroupChat automatically handles the handoff
```

## Configuration

### Required Environment Variables

**CRITICAL**: The SK orchestrator requires proper LLM configuration. The default `LLM_PROVIDER=local` will NOT work in production without a running LLM server.

**Minimum Required Variables:**
```bash
LLM_PROVIDER=openai  # or azure, groq, local
LLM_MODEL=gpt-4      # or your model name
```

### Supported LLM Providers

The SK orchestrator supports multiple providers:

#### Azure OpenAI
```bash
LLM_PROVIDER=azure
LLM_BASE_URL=https://your-resource.openai.azure.com  # Required
LLM_API_KEY=your-api-key                              # Required
AZURE_OPENAI_API_VERSION=2024-02-01                   # Optional (defaults to 2024-02-01)
LLM_MODEL=gpt-4                                       # Required
```

#### OpenAI
```bash
LLM_PROVIDER=openai
LLM_API_KEY=your-api-key  # Required (set as OPENAI_API_KEY)
LLM_MODEL=gpt-4           # Required
```

#### Groq
```bash
LLM_PROVIDER=groq
LLM_BASE_URL=https://api.groq.com/openai/v1  # Required
LLM_API_KEY=your-api-key                     # Optional (set as GROQ_API_KEY)
LLM_MODEL=llama-3-70b-8192                   # Required
```

#### Local (LM Studio, Ollama, etc.)
```bash
LLM_PROVIDER=local
LLM_BASE_URL=http://localhost:1234/v1  # Required - must be accessible
LLM_MODEL=llama-3-8b                    # Required
LLM_API_KEY=not-needed                  # Optional
```

## Debug Logging

Enable detailed logging:

```bash
DEBUG_AGENT=true
```

This logs:
- Agent initialization
- Message routing
- Pending confirmations
- Tool executions

## Testing

### Manual Testing

1. **Start the backend:**
```bash
docker-compose up --build backend
```

2. **Test task creation:**
```
POST /api/chat
{
  "message": "Create task to review code by Friday",
  "user_id": "your-user-id"
}
```

3. **Confirm:**
```
POST /api/chat
{
  "message": "yes",
  "user_id": "your-user-id",
  "session_id": "session-id-from-step-2"
}
```

### Unit Testing

```python
# Test SK orchestrator
from app.agents.sk_orchestrator import SKOrchestrator
from app.agents.sk_agents import create_task_agent

orchestrator = SKOrchestrator(session, user_id)
task_agent = create_task_agent(orchestrator.kernel)
orchestrator.register_agent(task_agent)
orchestrator.create_group_chat()

response = await orchestrator.process_request("Create task X")
assert "pending_confirmation:" in response
```

## Migration from Legacy Implementation

The legacy implementation (custom routing) is still available:

```bash
# Switch to legacy
USE_SK_ORCHESTRATOR=false
```

Both implementations share the same:
- Database models
- CRUD operations
- Websocket broadcasts
- API endpoints

## Troubleshooting

### "No agents registered"
**Cause:** `create_group_chat()` called before registering agents
**Fix:** Ensure `register_agent()` is called for all agents first

### "LLM provider not configured"
**Cause:** Missing environment variables
**Fix:** Set `LLM_PROVIDER`, `LLM_BASE_URL`, and `LLM_API_KEY`

### "Pending confirmation not executing"
**Cause:** User's confirmation message not recognized
**Fix:** Ensure message contains "yes", "confirm", or similar keywords

### Double task creation
**Cause:** Agent outputting JSON on initial request instead of confirmation
**Fix:** Check agent instructions - should only output `pending_confirmation` marker on initial request

## Performance Considerations

### Lazy Initialization
- SK orchestrator initialized on first request per session
- Agents created once and reused
- Kernel and AI service cached

### Token Usage
- Each agent has detailed instructions (200-300 tokens)
- Group chat maintains full conversation history
- Consider truncating history after 10-20 messages

### Latency
- SK adds minimal overhead (<50ms)
- Main latency is LLM API calls (1-3 seconds)
- Consider caching for repeated queries

## Future Enhancements

1. **Persistent State**
   - Store pending confirmations in database
   - Survive server restarts

2. **Agent Plugins**
   - Add Semantic Kernel plugins for tools
   - Enable more complex workflows

3. **Streaming Responses**
   - Use SK's streaming support
   - Show agent responses in real-time

4. **Multi-Agent Collaboration**
   - TaskAgent + TrackingAgent work together
   - QAAgent provides context for TaskAgent

5. **Agent Metrics**
   - Track which agent handles each request
   - Measure handoff frequency
   - Identify bottlenecks
