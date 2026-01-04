from typing import Optional, Literal
from pydantic import BaseModel, Field

class CreateTaskArgs(BaseModel):
    title: str
    priority: Literal["low", "medium", "high"] = "medium"
    priority_score: int = Field(default=50, ge=1, le=100)
    effort_score: int = Field(default=50, ge=1, le=100)
    value_score: int = Field(default=50, ge=1, le=100)
    notes: Optional[str] = None
    # Natural language date fields
    start_date_natural: Optional[str] = None
    due_date_natural: Optional[str] = None

class DeleteTaskArgs(BaseModel):
    id: str

class SearchTasksArgs(BaseModel):
    query: str

class ToolCall(BaseModel):
    tool: Literal["create_task", "delete_task", "search_tasks"]
    args: dict
