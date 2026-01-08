# Liminal Architecture Documentation

This document provides comprehensive architectural diagrams for the Liminal ADHD planner application.

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Model](#2-data-model-er-diagram)
3. [Authentication Flow](#3-authentication-flow)
4. [AI Agent Orchestration](#4-ai-agent-orchestration-semantic-kernel)
5. [API Architecture](#5-api-architecture)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Task Lifecycle](#7-task-lifecycle-state-machine)
8. [AI Confirmation Flow](#8-ai-confirmation-flow)
9. [Real-time Updates](#9-real-time-updates-websocket)

---

## 1. System Architecture

Overall infrastructure showing all services and their relationships.

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
    end

    subgraph "Frontend Service"
        NextJS[Next.js 13<br/>App Router]
        WSClient[WebSocket Client]
        OIDC[OIDC Client<br/>oidc-client-ts]
    end

    subgraph "Backend Service"
        FastAPI[FastAPI Application]
        WSServer[WebSocket Server]

        subgraph "API Routers"
            AuthRouter[/auth]
            TaskRouter[/tasks]
            ThemeRouter[/themes]
            InitRouter[/initiatives]
            LLMRouter[/llm]
        end

        subgraph "AI System"
            SKOrch[Semantic Kernel<br/>Orchestrator]
            TaskAgent[Task Agent]
            QAAgent[Q&A Agent]
            TrackAgent[Tracking Agent]
            GenAgent[General Agent]
        end

        subgraph "Data Layer"
            SQLModel[SQLModel ORM]
            AsyncPG[asyncpg Driver]
        end
    end

    subgraph "External Services"
        Keycloak[Keycloak<br/>OIDC Provider]
        AzureOAI[Azure OpenAI]
        OpenAI[OpenAI API]
        Groq[Groq API]
        Ollama[Ollama<br/>Local LLM]
    end

    subgraph "Data Storage"
        PostgreSQL[(PostgreSQL 15<br/>Database)]
        PGVolume[postgres_data<br/>Volume]
    end

    Browser --> NextJS
    Browser --> WSClient
    NextJS --> FastAPI
    WSClient --> WSServer
    NextJS --> OIDC
    OIDC --> Keycloak

    FastAPI --> AuthRouter
    FastAPI --> TaskRouter
    FastAPI --> ThemeRouter
    FastAPI --> InitRouter
    FastAPI --> LLMRouter

    LLMRouter --> SKOrch
    SKOrch --> TaskAgent
    SKOrch --> QAAgent
    SKOrch --> TrackAgent
    SKOrch --> GenAgent

    TaskAgent -.LLM Calls.-> AzureOAI
    TaskAgent -.LLM Calls.-> OpenAI
    TaskAgent -.LLM Calls.-> Groq
    TaskAgent -.LLM Calls.-> Ollama

    QAAgent -.LLM Calls.-> AzureOAI
    QAAgent -.LLM Calls.-> OpenAI

    AuthRouter --> SQLModel
    TaskRouter --> SQLModel
    ThemeRouter --> SQLModel
    InitRouter --> SQLModel
    LLMRouter --> SQLModel

    SQLModel --> AsyncPG
    AsyncPG --> PostgreSQL
    PostgreSQL --> PGVolume

    WSServer -.Broadcasts.-> WSClient

    style SKOrch fill:#e1f5ff
    style PostgreSQL fill:#336791,color:#fff
    style Keycloak fill:#4d4d4d,color:#fff
    style FastAPI fill:#009688,color:#fff
    style NextJS fill:#000,color:#fff
```

---

## 2. Data Model (ER Diagram)

Database schema showing all entities and their relationships.

```mermaid
erDiagram
    User ||--o{ Task : "owns"
    User ||--o{ Theme : "owns"
    User ||--o{ FocusSession : "has"
    User ||--o{ ChatSession : "has"
    User ||--o| Settings : "has"

    Theme ||--o{ Initiative : "contains"
    Initiative ||--o{ Task : "aligns with"

    Task ||--o{ Task : "parent/child"

    ChatSession ||--o{ ChatMessage : "contains"

    User {
        uuid id PK
        string email UK
        string name
        string hashed_password
        datetime created_at
        datetime updated_at
    }

    Task {
        uuid id PK
        uuid user_id FK
        uuid theme_id FK "nullable"
        uuid initiative_id FK "nullable"
        uuid parent_id FK "nullable, self-ref"
        string title
        text description
        enum status "backlog|todo|in_progress|blocked|done"
        int priority "high=90, medium=50, low=25"
        int effort_score "1-10"
        int value_score "1-10"
        int estimated_duration "minutes"
        int actual_duration "minutes, nullable"
        datetime due_date "nullable"
        datetime completed_at "nullable"
        datetime created_at
        datetime updated_at
    }

    Theme {
        uuid id PK
        uuid user_id FK
        string name
        string color_code "hex color"
        text description
        datetime created_at
    }

    Initiative {
        uuid id PK
        uuid user_id FK
        uuid theme_id FK
        string name
        text description
        datetime start_date "nullable"
        datetime end_date "nullable"
        datetime created_at
    }

    FocusSession {
        uuid id PK
        uuid user_id FK
        uuid task_id FK "nullable"
        datetime start_time
        datetime end_time "nullable"
        int duration_minutes
        boolean completed
        text notes "nullable"
    }

    ChatSession {
        uuid id PK
        uuid user_id FK
        string title "nullable"
        datetime created_at
        datetime updated_at
    }

    ChatMessage {
        uuid id PK
        uuid session_id FK
        string role "user|assistant|system"
        text content
        json metadata "nullable"
        datetime created_at
    }

    Settings {
        uuid id PK
        uuid user_id FK
        string theme "calm|dark|playful"
        int focus_duration "minutes, default 25"
        int break_duration "minutes, default 5"
        boolean sound_enabled "default true"
        json preferences "additional settings"
        datetime updated_at
    }
```

---

## 3. Authentication Flow

OIDC authentication flow with Keycloak and JWT token management.

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant NextJS as Next.js Frontend
    participant FastAPI as FastAPI Backend
    participant Keycloak as Keycloak OIDC
    participant DB as PostgreSQL

    Note over User,DB: Initial Login Flow
    User->>Browser: Click "Login"
    Browser->>NextJS: Navigate to /login
    NextJS->>Browser: Redirect to OIDC provider
    Browser->>Keycloak: Authorization request<br/>(PKCE flow)
    Keycloak->>User: Show login page
    User->>Keycloak: Enter credentials
    Keycloak->>Browser: Redirect to /auth/callback<br/>with auth code
    Browser->>NextJS: /auth/callback?code=...
    NextJS->>Keycloak: Exchange code for tokens<br/>(with PKCE verifier)
    Keycloak->>NextJS: ID token + Access token
    NextJS->>FastAPI: POST /auth/oidc/callback<br/>with ID token
    FastAPI->>FastAPI: Verify token signature
    FastAPI->>DB: Find or create user
    DB->>FastAPI: User record
    FastAPI->>FastAPI: Generate internal JWT
    FastAPI->>NextJS: JWT + user info
    NextJS->>Browser: Store JWT in cookie
    Browser->>User: Redirect to dashboard

    Note over User,DB: Authenticated Request Flow
    User->>Browser: View tasks
    Browser->>NextJS: GET /
    NextJS->>FastAPI: GET /tasks<br/>Authorization: Bearer JWT
    FastAPI->>FastAPI: Verify JWT signature
    FastAPI->>DB: Query user's tasks
    DB->>FastAPI: Task records
    FastAPI->>NextJS: Task list JSON
    NextJS->>Browser: Render task list
    Browser->>User: Display tasks

    Note over User,DB: Token Refresh Flow
    Browser->>FastAPI: Request with expired JWT
    FastAPI->>Browser: 401 Unauthorized
    Browser->>NextJS: Token expired
    NextJS->>Keycloak: Refresh token request
    Keycloak->>NextJS: New access token
    NextJS->>FastAPI: Retry with new token
    FastAPI->>Browser: Success response
```

---

## 4. AI Agent Orchestration (Semantic Kernel)

Multi-agent system with handoff pattern and confirmation flow.

```mermaid
graph TB
    subgraph "User Interface"
        UserInput[User Chat Input]
        UserConfirm[User Confirmation<br/>yes/no/confirm]
    end

    subgraph "Orchestration Layer"
        SKOrch[SK Orchestrator]
        GroupChat[Agent Group Chat]
        ConfirmState[Confirmation State<br/>pending_confirmation]
    end

    subgraph "Specialized Agents"
        TaskAgent[Task Agent<br/>Creates, completes, updates tasks]
        QAAgent[Q&A Agent<br/>Answers feature questions]
        TrackAgent[Tracking Agent<br/>Shows progress, suggests next steps]
        GenAgent[General Agent<br/>Routing & casual conversation]
    end

    subgraph "Agent Tools/Plugins"
        CreateTask[create_task]
        CompleteTask[complete_task]
        UpdateTask[update_task]
        SearchTask[search_tasks]
        GetContext[get_user_context]
    end

    subgraph "Backend Services"
        TaskService[Task Service]
        DB[(Database)]
        WS[WebSocket<br/>Broadcast]
    end

    UserInput --> SKOrch
    SKOrch --> GroupChat

    GroupChat --> TaskAgent
    GroupChat --> QAAgent
    GroupChat --> TrackAgent
    GroupChat --> GenAgent

    TaskAgent --> CreateTask
    TaskAgent --> CompleteTask
    TaskAgent --> UpdateTask
    TaskAgent --> SearchTask

    TrackAgent --> SearchTask
    TrackAgent --> GetContext

    CreateTask --> ConfirmState
    CompleteTask --> ConfirmState
    UpdateTask --> ConfirmState

    ConfirmState --> UserConfirm
    UserConfirm -->|"yes"| SKOrch
    UserConfirm -->|"no"| SKOrch

    SKOrch -->|Execute Action| TaskService
    TaskService --> DB
    TaskService --> WS

    GetContext --> TaskService

    style SKOrch fill:#e1f5ff
    style TaskAgent fill:#c8e6c9
    style QAAgent fill:#fff9c4
    style TrackAgent fill:#ffccbc
    style GenAgent fill:#d1c4e9
    style ConfirmState fill:#ffccbc,stroke:#f00,stroke-width:3px
```

### Agent Responsibilities

| Agent | Purpose | Tools | Handoff To |
|-------|---------|-------|------------|
| **Task Agent** | Task CRUD operations | create_task, complete_task, update_task, search_tasks | General Agent (casual chat) |
| **Q&A Agent** | Feature explanations, tips | None (LLM only) | Task Agent (if action needed) |
| **Tracking Agent** | Progress reports, stale tasks | search_tasks, get_user_context | Task Agent (if updates needed) |
| **General Agent** | Routing, greetings, unknown | None | Any specialized agent |

---

## 5. API Architecture

RESTful API endpoints organized by domain.

```mermaid
graph LR
    subgraph "Client Requests"
        HTTPReq[HTTP/HTTPS Request]
    end

    subgraph "FastAPI Application"
        CORS[CORS Middleware]
        Auth[JWT Auth Middleware]

        subgraph "Route Handlers"
            AuthRoutes["/auth/*<br/>Login, register, tokens"]
            UserRoutes["/users/*<br/>Profile, preferences"]
            TaskRoutes["/tasks/*<br/>CRUD, status updates"]
            ThemeRoutes["/themes/*<br/>Strategic themes"]
            InitRoutes["/initiatives/*<br/>Key initiatives"]
            LLMRoutes["/llm/*<br/>Chat, agent queries"]
            WSRoute["/ws<br/>WebSocket connection"]
        end

        subgraph "Business Logic"
            AuthService[Auth Service]
            TaskService[Task Service]
            ThemeService[Theme Service]
            InitService[Initiative Service]
            AgentService[Agent Service<br/>SK Orchestrator]
        end

        subgraph "Data Access"
            ORM[SQLModel ORM]
            DBSession[Async Session]
        end
    end

    subgraph "External Dependencies"
        DB[(PostgreSQL)]
        LLM[LLM Providers]
        OIDC[OIDC Provider]
    end

    HTTPReq --> CORS
    CORS --> Auth

    Auth --> AuthRoutes
    Auth --> UserRoutes
    Auth --> TaskRoutes
    Auth --> ThemeRoutes
    Auth --> InitRoutes
    Auth --> LLMRoutes
    Auth --> WSRoute

    AuthRoutes --> AuthService
    UserRoutes --> AuthService
    TaskRoutes --> TaskService
    ThemeRoutes --> ThemeService
    InitRoutes --> InitService
    LLMRoutes --> AgentService

    AuthService --> ORM
    TaskService --> ORM
    ThemeService --> ORM
    InitService --> ORM
    AgentService --> TaskService

    ORM --> DBSession
    DBSession --> DB

    AuthService --> OIDC
    AgentService --> LLM

    style FastAPI fill:#009688,color:#fff
```

### Key Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Create new user (local auth) | No |
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/oidc/callback` | Handle OIDC callback | No |
| GET | `/users/me` | Get current user profile | Yes |
| GET | `/tasks` | List user's tasks | Yes |
| POST | `/tasks` | Create new task | Yes |
| PATCH | `/tasks/{id}` | Update task | Yes |
| DELETE | `/tasks/{id}` | Delete task | Yes |
| POST | `/tasks/{id}/complete` | Mark task complete | Yes |
| GET | `/themes` | List themes | Yes |
| POST | `/themes` | Create theme | Yes |
| GET | `/initiatives` | List initiatives | Yes |
| POST | `/initiatives` | Create initiative | Yes |
| POST | `/llm/chat` | Send message to AI agent | Yes |
| GET | `/llm/sessions` | List chat sessions | Yes |
| WS | `/ws` | WebSocket for real-time updates | Yes |

---

## 6. Frontend Architecture

Next.js 13 App Router component hierarchy and state management.

```mermaid
graph TB
    subgraph "App Router Structure"
        RootLayout[app/layout.tsx<br/>Root Layout]

        HomePage[app/page.tsx<br/>Dashboard]
        BoardPage[app/board/page.tsx<br/>Kanban Board]
        FocusPage[app/focus/page.tsx<br/>Focus Mode]
        LoginPage[app/login/page.tsx<br/>Login]
        RegisterPage[app/register/page.tsx<br/>Register]
        CallbackPage[app/auth/callback/page.tsx<br/>OIDC Callback]
    end

    subgraph "Shared Components"
        QuickCapture[QuickCapture<br/>Chat-style task input]
        TaskCard[TaskCard<br/>Task display with actions]
        TaskForm[TaskForm<br/>Create/edit form]
        EditModal[EditTaskModal<br/>Inline editing]
        ActionMenu[TaskActionMenu<br/>Complete/delete/update]
        FocusToggle[FocusToggle<br/>Focus mode switch]
        Navigation[Navigation<br/>App header]
    end

    subgraph "State Management"
        Zustand[Zustand Store<br/>lib/store.ts]
        FocusState[isFocusMode: boolean]
    end

    subgraph "API Layer"
        APILib[lib/api.ts]
        FetchTasks[getTasks]
        CreateTask[createTask]
        UpdateTask[updateTask]
        DeleteTask[deleteTask]
        ChatAPI[sendChatMessage]
    end

    subgraph "Real-time Layer"
        WSManager[WebSocket Manager]
        WSEvents[task.created<br/>task.updated<br/>task.completed]
    end

    RootLayout --> HomePage
    RootLayout --> BoardPage
    RootLayout --> FocusPage
    RootLayout --> LoginPage
    RootLayout --> RegisterPage
    RootLayout --> CallbackPage

    HomePage --> QuickCapture
    HomePage --> TaskCard
    HomePage --> FocusToggle

    BoardPage --> TaskCard
    BoardPage --> TaskForm

    TaskCard --> ActionMenu
    TaskCard --> EditModal

    QuickCapture --> ChatAPI
    TaskForm --> CreateTask
    ActionMenu --> UpdateTask
    ActionMenu --> DeleteTask

    FocusToggle --> Zustand
    Zustand --> FocusState
    FocusState --> HomePage
    FocusState --> BoardPage

    HomePage --> FetchTasks
    BoardPage --> FetchTasks

    FetchTasks --> APILib
    CreateTask --> APILib
    UpdateTask --> APILib
    DeleteTask --> APILib
    ChatAPI --> APILib

    WSManager --> WSEvents
    WSEvents --> HomePage
    WSEvents --> BoardPage

    style Zustand fill:#764abc,color:#fff
    style APILib fill:#009688,color:#fff
    style WSManager fill:#ff6f00,color:#fff
```

### Component Responsibilities

| Component | Purpose | Key Props/State |
|-----------|---------|-----------------|
| **QuickCapture** | Chat-style task input with AI | `onSubmit`, `placeholder` |
| **TaskCard** | Display task with priority/effort | `task`, `onUpdate`, `onDelete` |
| **TaskForm** | Create/edit form with validation | `initialTask?`, `onSubmit`, `onCancel` |
| **EditTaskModal** | Inline task editing modal | `task`, `isOpen`, `onClose` |
| **TaskActionMenu** | Dropdown menu for task actions | `task`, `onComplete`, `onDelete` |
| **FocusToggle** | Toggle focus mode on/off | `isFocusMode` (from Zustand) |

---

## 7. Task Lifecycle (State Machine)

Task status transitions and business rules.

```mermaid
stateDiagram-v2
    [*] --> backlog: Task created

    backlog --> todo: User prioritizes
    backlog --> done: Quick complete

    todo --> in_progress: User starts work
    todo --> backlog: Deprioritize
    todo --> done: Quick complete

    in_progress --> blocked: Impediment found
    in_progress --> done: Work completed
    in_progress --> todo: Pause work

    blocked --> in_progress: Unblocked
    blocked --> todo: Reassess priority
    blocked --> backlog: Long-term block

    done --> todo: Reopen task
    done --> [*]: Archive (future feature)

    note right of backlog
        Default status on creation
        Low cognitive load
    end note

    note right of todo
        Ready to work
        Appears in daily view
    end note

    note right of in_progress
        Active work
        Tracks actual_duration
        Focus mode eligible
    end note

    note right of blocked
        Waiting on dependency
        Separate view to reduce clutter
    end note

    note right of done
        Completed tasks
        Tracks completed_at timestamp
        Contributes to streak
    end note
```

### Status Rules

| Status | Description | Shown in Focus Mode | Can Edit | Can Delete |
|--------|-------------|---------------------|----------|------------|
| **backlog** | Ideas, someday/maybe | No | Yes | Yes |
| **todo** | Ready to work, prioritized | Yes | Yes | Yes |
| **in_progress** | Currently working on | Yes (highlighted) | Yes | No |
| **blocked** | Waiting on external dependency | No | Yes | Yes |
| **done** | Completed | No | No | Yes |

---

## 8. AI Confirmation Flow

Prevents accidental task creation with explicit user confirmation.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API as /llm/chat
    participant SKOrch as SK Orchestrator
    participant Agent as Task Agent
    participant TaskSvc as Task Service
    participant DB as Database

    Note over User,DB: Step 1: User Request
    User->>Frontend: "Create a task to review PRs"
    Frontend->>API: POST /llm/chat<br/>{message: "Create..."}
    API->>SKOrch: Process message
    SKOrch->>Agent: Route to Task Agent
    Agent->>Agent: Analyze intent<br/>(create task)
    Agent->>SKOrch: Return response with<br/>pending_confirmation marker
    SKOrch->>SKOrch: Extract pending confirmation:<br/>{action: "create_task", params: {...}}
    SKOrch->>API: Response + confirmation payload
    API->>Frontend: {<br/>  message: "I'll create task 'Review PRs'...",<br/>  pending_confirmation: {...}<br/>}
    Frontend->>User: Show message + confirm buttons<br/>[Yes] [No]

    Note over User,DB: Step 2: User Confirms
    User->>Frontend: Click "Yes"
    Frontend->>API: POST /llm/chat<br/>{message: "yes", execute_pending: true}
    API->>SKOrch: Execute pending action
    SKOrch->>Agent: create_task(title="Review PRs", ...)
    Agent->>TaskSvc: Call create_task plugin
    TaskSvc->>DB: INSERT INTO tasks
    DB->>TaskSvc: Task record
    TaskSvc->>Agent: Success
    Agent->>SKOrch: Task created confirmation
    SKOrch->>SKOrch: Clear pending_confirmation
    SKOrch->>API: Success response
    API->>Frontend: {<br/>  message: "✓ Task created!",<br/>  pending_confirmation: null<br/>}
    Frontend->>User: Show success + refresh task list

    Note over User,DB: Alternative: User Cancels
    User->>Frontend: Click "No"
    Frontend->>API: POST /llm/chat<br/>{message: "no"}
    API->>SKOrch: Cancel pending action
    SKOrch->>SKOrch: Clear pending_confirmation
    SKOrch->>API: Cancellation response
    API->>Frontend: {<br/>  message: "Okay, cancelled.",<br/>  pending_confirmation: null<br/>}
    Frontend->>User: Show cancellation message

    Note over User,DB: Edge Case: Repeated Confirmation
    User->>Frontend: "yes" again (no pending action)
    Frontend->>API: POST /llm/chat<br/>{message: "yes", execute_pending: true}
    API->>SKOrch: No pending action found
    SKOrch->>API: "Nothing to confirm"
    API->>Frontend: {message: "Nothing pending"}
    Frontend->>User: Show clarification message
```

### Confirmation Keywords

| Keyword | Action | Case-Sensitive |
|---------|--------|----------------|
| `yes` | Confirm | No |
| `y` | Confirm | No |
| `confirm` | Confirm | No |
| `do it` | Confirm | No |
| `create it` | Confirm | No |
| `no` | Cancel | No |
| `cancel` | Cancel | No |
| `nevermind` | Cancel | No |

---

## 9. Real-time Updates (WebSocket)

Event broadcasting for live UI updates across sessions.

```mermaid
sequenceDiagram
    participant User1 as User (Browser 1)
    participant User2 as User (Browser 2)
    participant Frontend1 as Frontend 1
    participant Frontend2 as Frontend 2
    participant WSServer as WebSocket Server
    participant API as Task API
    participant DB as Database

    Note over User1,DB: Connection Establishment
    User1->>Frontend1: Load page
    Frontend1->>WSServer: WS connect<br/>ws://localhost:8000/ws?token=JWT
    WSServer->>WSServer: Verify JWT
    WSServer->>Frontend1: Connection accepted
    Note over Frontend1: Subscribed to user's events

    User2->>Frontend2: Load page (same user)
    Frontend2->>WSServer: WS connect<br/>ws://localhost:8000/ws?token=JWT
    WSServer->>Frontend2: Connection accepted

    Note over User1,DB: Task Creation Event
    User1->>Frontend1: Create task "Write docs"
    Frontend1->>API: POST /tasks<br/>{title: "Write docs"}
    API->>DB: INSERT INTO tasks
    DB->>API: Task record
    API->>WSServer: Broadcast event<br/>{type: "task.created", data: {...}}
    WSServer->>Frontend1: task.created event
    WSServer->>Frontend2: task.created event
    Frontend1->>User1: Add task to UI (optimistic)
    Frontend2->>User2: Add task to UI (live update)

    Note over User1,DB: Task Update Event
    User2->>Frontend2: Mark task as "in_progress"
    Frontend2->>API: PATCH /tasks/123<br/>{status: "in_progress"}
    API->>DB: UPDATE tasks
    DB->>API: Updated task
    API->>WSServer: Broadcast event<br/>{type: "task.updated", data: {...}}
    WSServer->>Frontend1: task.updated event
    WSServer->>Frontend2: task.updated event
    Frontend1->>User1: Update task status (live)
    Frontend2->>User2: Update task status (optimistic)

    Note over User1,DB: Task Completion Event
    User1->>Frontend1: Complete task
    Frontend1->>API: POST /tasks/123/complete
    API->>DB: UPDATE tasks<br/>SET status='done', completed_at=NOW()
    DB->>API: Completed task
    API->>WSServer: Broadcast event<br/>{type: "task.completed", data: {...}}
    WSServer->>Frontend1: task.completed event
    WSServer->>Frontend2: task.completed event
    Frontend1->>User1: Move to done, update streak
    Frontend2->>User2: Move to done, update streak

    Note over User1,DB: Disconnection Handling
    User1->>Frontend1: Close browser tab
    Frontend1->>WSServer: WS disconnect
    WSServer->>WSServer: Remove from active connections
    Note over Frontend2,WSServer: Frontend2 still connected
```

### WebSocket Event Types

| Event Type | Payload | Trigger | Frontend Action |
|------------|---------|---------|-----------------|
| `task.created` | `{task: Task}` | POST /tasks | Add task to list |
| `task.updated` | `{task: Task}` | PATCH /tasks/{id} | Update task in place |
| `task.completed` | `{task: Task}` | POST /tasks/{id}/complete | Move to done, update stats |
| `task.deleted` | `{task_id: UUID}` | DELETE /tasks/{id} | Remove from list |
| `focus_session.started` | `{session: FocusSession}` | POST /focus/start | Show focus timer |
| `focus_session.completed` | `{session: FocusSession}` | POST /focus/complete | Update session stats |

---

## Deployment Architecture

Production deployment topology for Railway/cloud environments.

```mermaid
graph TB
    subgraph "Edge Layer"
        CDN[CDN/Edge Network<br/>Static Assets]
        LB[Load Balancer<br/>HTTPS Termination]
    end

    subgraph "Application Layer"
        FE1[Frontend Instance 1<br/>Next.js SSR]
        FE2[Frontend Instance 2<br/>Next.js SSR]
        BE1[Backend Instance 1<br/>FastAPI + WS]
        BE2[Backend Instance 2<br/>FastAPI + WS]
    end

    subgraph "External Services"
        OIDC[Keycloak/Auth0<br/>OIDC Provider]
        LLM[OpenAI/Azure<br/>LLM API]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Managed DB)]
        Redis[(Redis<br/>Session/Cache)]
    end

    subgraph "Observability"
        Logs[Logging<br/>CloudWatch/DataDog]
        Metrics[Metrics<br/>Prometheus/Grafana]
        Alerts[Alerts<br/>PagerDuty]
    end

    CDN --> FE1
    CDN --> FE2
    LB --> FE1
    LB --> FE2
    LB --> BE1
    LB --> BE2

    FE1 --> BE1
    FE1 --> BE2
    FE2 --> BE1
    FE2 --> BE2

    BE1 --> PG
    BE2 --> PG
    BE1 --> Redis
    BE2 --> Redis
    BE1 --> OIDC
    BE2 --> OIDC
    BE1 --> LLM
    BE2 --> LLM

    BE1 --> Logs
    BE2 --> Logs
    FE1 --> Logs
    FE2 --> Logs

    Metrics --> Alerts

    style PG fill:#336791,color:#fff
    style Redis fill:#dc382d,color:#fff
    style LB fill:#4caf50,color:#fff
```

---

## Technology Stack Summary

### Frontend
- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript 5.1
- **Styling**: Tailwind CSS 3.3
- **State**: Zustand
- **Animation**: Framer Motion
- **Auth**: oidc-client-ts (OAuth2 PKCE)
- **Testing**: Playwright (E2E), Vitest + RTL (component)

### Backend
- **Framework**: FastAPI 0.100+
- **Language**: Python 3.11+
- **ORM**: SQLModel (SQLAlchemy 2.0 + Pydantic)
- **Database Driver**: asyncpg (async PostgreSQL)
- **AI**: Semantic Kernel 1.0+
- **Auth**: python-jose (JWT), Authlib (OIDC)
- **Testing**: pytest + pytest-asyncio

### Infrastructure
- **Database**: PostgreSQL 15
- **Auth Provider**: Keycloak (self-hosted) or Auth0/Authentik
- **LLM Providers**: Azure OpenAI, OpenAI, Groq, Ollama
- **Containerization**: Docker + Docker Compose
- **Deployment**: Railway (IaC templates provided)

---

## Related Documentation

- [README.md](../README.md) - Project overview and setup
- [CLAUDE.md](../CLAUDE.md) - Development guide for AI assistance
- [frontend/TESTING.md](../frontend/TESTING.md) - Frontend testing guide
- [infra/railway/README.md](../infra/railway/README.md) - Deployment guide

---

**Last Updated**: 2026-01-07
**Version**: 1.0
**Maintainer**: Liminal Development Team
