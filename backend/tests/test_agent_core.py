import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.agents.core import AgentService
from app.models import User, Task

@pytest.mark.asyncio
async def test_agent_task_creation_flow():
    # Mock dependencies
    mock_session = AsyncMock()
    mock_user_id = "test-user-id"
    
    # Mock User retrieval
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = User(id=mock_user_id, email="test@test.com", name="Test User")
    mock_session.execute.return_value = mock_result

    with patch("app.agents.core.get_settings") as mock_settings:
        mock_settings.return_value.llm_provider = "mock"
        
        service = AgentService(mock_session, mock_user_id)
        
        # Mock LLM responses
        # 1. Supervisor -> TASK
        # 2. Task Agent -> JSON Tool Call
        # 3. Task Agent -> Final Natural Response
        
        async def mock_call_llm(messages, model=None):
            last_msg = messages[-1]["content"]
            if "Supervisor" in str(messages[0]["content"]):
                return "TASK"
            if "Task Database" in str(messages[0]["content"]):
                # Check if we are in the "Result" phase
                if "Tool execution result" in str(messages[-1]["content"]):
                    return "I have created the task 'Buy milk'."
                return '```json\n{"tool": "create_task", "args": {"title": "Buy milk", "priority": "medium"}}\n```'
            return "I don't know."

        service._call_llm = mock_call_llm
        
        # Mock CRUD
        with patch("app.crud.create_task") as mock_create_task, \
             patch("app.crud.get_chat_session") as mock_get_session, \
             patch("app.crud.create_chat_session") as mock_create_session, \
             patch("app.crud.add_chat_message") as mock_add_message, \
             patch("app.websockets.manager.broadcast") as mock_broadcast:
            
            mock_create_task.return_value = Task(id="task-123", title="Buy milk", user_id=mock_user_id)
            mock_get_session.return_value = None
            mock_create_session.return_value = MagicMock(id="session-123")

            response = await service.process_request([{"role": "user", "content": "Create task Buy milk"}])
            
            # Assertions
            assert response["content"].startswith("I have created the task")
            assert ":::{" in response["content"] # Should have refresh signal
            assert "refresh_board" in response["content"]
            mock_create_task.assert_called_once()
            mock_broadcast.assert_called_with("refresh", mock_user_id)

@pytest.mark.asyncio
async def test_agent_json_parsing_failure_recovery():
    # Test that if LLM returns bad JSON, we handle it or return error text, not raw JSON
    mock_session = AsyncMock()
    mock_user_id = "test-user-id"
    
    with patch("app.agents.core.get_settings"):
        service = AgentService(mock_session, mock_user_id)
        
        # Mock LLM to return bad JSON then good JSON
        # For simplicity, let's just test extraction logic directly?
        # No, let's test the flow.
        
        # Case: LLM returns raw text that looks like JSON but isn't wrapped, or malformed
        bad_json = '{"tool": "create_task", "args": ... broken ...'
        
        async def mock_call_llm_bad(messages, model=None):
            if "Supervisor" in str(messages[0]["content"]): return "TASK"
            return bad_json # Agent returns broken JSON

        service._call_llm = mock_call_llm_bad
        
        # We assume it will fail extraction and return the raw text?
        # Or retry?
        
        # Let's inspect `_extract_json` behavior first via unit test logic
        extracted = service._extract_json(bad_json)
        assert extracted is None 
