import pytest
from app.agents.core import AgentService
from unittest.mock import AsyncMock

def test_sanitize_response():
    service = AgentService(AsyncMock(), "user")
    
    # Case 1: Mixed content
    raw = 'Here is the command: ```json {"tool": "create"} ``` Task created.'
    clean = service._sanitize_response(raw)
    assert clean == "Here is the command:  Task created."
    
    # Case 2: Raw JSON only
    raw = '{"tool": "create_task", "args": {}}'
    clean = service._sanitize_response(raw)
    assert clean == ""
    
    # Case 3: JSON with newlines
    raw = """
    Okay.
    {
      "tool": "create_task"
    }
    Done.
    """
    clean = service._sanitize_response(raw)
    assert "Okay." in clean
    assert "Done." in clean
    assert "tool" not in clean

if __name__ == "__main__":
    test_sanitize_response()
