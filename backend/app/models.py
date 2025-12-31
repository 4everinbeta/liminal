from typing import Optional, List
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from enum import Enum

# Enums
class Priority(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"

class TaskStatus(str, Enum):
    backlog = "backlog"  # "The Threshold"
    todo = "todo"        # Deprecated in favor of Theme-based active status? 
                         # Actually, we will map "active" tasks to their Theme Columns
    in_progress = "in_progress"
    blocked = "blocked"
    done = "done"

class AppTheme(str, Enum):
    calm = "calm"
    dark = "dark"
    playful = "playful"

# --- Models ---

class User(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: Optional[str] = Field(default=None, nullable=True)
    # OIDC subject (works for Google/social + username/password via a real IdP like Keycloak).
    google_sub: Optional[str] = Field(default=None, index=True, nullable=True)
    oidc_issuer: Optional[str] = Field(default=None, index=True, nullable=True)
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})
    
    tasks: List["Task"] = Relationship(back_populates="user")
    themes: List["Theme"] = Relationship(back_populates="user")
    initiatives: List["Initiative"] = Relationship(back_populates="user")
    focus_sessions: List["FocusSession"] = Relationship(back_populates="user")
    settings: Optional["Settings"] = Relationship(back_populates="user")

class Settings(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    theme: AppTheme = Field(default=AppTheme.calm)
    focus_duration: int = Field(default=25)
    break_duration: int = Field(default=5)
    sound_enabled: bool = Field(default=True)
    
    user: User = Relationship(back_populates="settings")

class Theme(SQLModel, table=True):
    """High-level strategic themes (e.g., 'AI Enablement', 'Team Building')"""
    id: Optional[str] = Field(default=None, primary_key=True)
    title: str
    color: str = Field(default="#4F46E5") # Hex color for UI
    priority: Priority = Field(default=Priority.medium) # Strategic priority of the theme itself
    order: int = Field(default=0)
    
    user_id: str = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="themes")
    
    initiatives: List["Initiative"] = Relationship(back_populates="theme")
    tasks: List["Task"] = Relationship(back_populates="theme")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

class Initiative(SQLModel, table=True):
    """Key Initiatives that belong to a Theme"""
    id: Optional[str] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    status: str = Field(default="active") # active, on_hold, completed
    
    theme_id: Optional[str] = Field(default=None, foreign_key="theme.id")
    theme: Optional[Theme] = Relationship(back_populates="initiatives")
    
    user_id: str = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="initiatives")
    
    tasks: List["Task"] = Relationship(back_populates="initiative")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

class Task(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    notes: Optional[str] = None  # New field for freeform notes
    
    status: TaskStatus = Field(default=TaskStatus.backlog)
    priority: Priority = Field(default=Priority.medium)
    priority_score: int = Field(default=50, ge=1, le=100)  # 1-100 numeric priority
    due_date: Optional[datetime] = None
    
    # Ranking Metrics
    value_score: int = Field(default=50, ge=1, le=100) # 1-100 Value Score
    
    order: int = Field(default=0)
    
    # ADHD specific fields / effort proxy
    estimated_duration: Optional[int] = None # legacy minutes
    effort_score: int = Field(default=50, ge=1, le=100)  # 1-100 effort proxy
    actual_duration: Optional[int] = None 
    
    # Recursive relation
    parent_id: Optional[str] = Field(default=None, foreign_key="task.id")
    
    # Strategic Alignment
    initiative_id: Optional[str] = Field(default=None, foreign_key="initiative.id")
    initiative: Optional[Initiative] = Relationship(back_populates="tasks")
    
    theme_id: Optional[str] = Field(default=None, foreign_key="theme.id")
    theme: Optional[Theme] = Relationship(back_populates="tasks")
    
    # Relationships
    user_id: str = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="tasks")
    
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

class FocusSession(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    duration: int
    completed: bool = Field(default=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    user_id: str = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="focus_sessions")

# --- API DTOs ---

class TaskCreate(SQLModel):
    title: str
    description: Optional[str] = None
    priority: Priority = Priority.medium
    priority_score: int = Field(default=50, ge=1, le=100)
    status: TaskStatus = TaskStatus.backlog
    due_date: Optional[datetime] = None
    order: int = 0
    estimated_duration: Optional[int] = None
    effort_score: int = Field(default=50, ge=1, le=100)
    actual_duration: Optional[int] = None
    value_score: int = Field(default=50, ge=1, le=100)
    notes: Optional[str] = None
    parent_id: Optional[str] = None
    initiative_id: Optional[str] = None
    theme_id: Optional[str] = None
    # user_id inferred from auth

class ThemeCreate(SQLModel):
    title: str
    color: Optional[str] = None
    priority: Priority = Priority.medium
    order: int = 0
    # user_id inferred from auth

class InitiativeCreate(SQLModel):
    title: str
    description: Optional[str] = None
    theme_id: Optional[str] = None
    # user_id inferred from auth

class UserCreate(SQLModel):
    email: str
    name: Optional[str] = None
    password: Optional[str] = None

class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(SQLModel):
    user_id: Optional[str] = None

class ChatMessage(SQLModel):
    role: str # "system", "user", "assistant"
    content: str

class ChatRequest(SQLModel):
    messages: List[ChatMessage]
    model: Optional[str] = None

class ChatResponse(SQLModel):
    content: str

