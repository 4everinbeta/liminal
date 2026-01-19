/**
 * API client for Liminal backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
console.log('API_BASE_URL:', API_BASE_URL);

const authRequired = (() => {
  const value = (process.env.NEXT_PUBLIC_AUTH_REQUIRED || '').toLowerCase();
  if (value === 'false' || value === '0' || value === 'no') return false;
  return true;
})();

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('liminal_token');
};

const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('liminal_token', token);
};

const clearToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('liminal_token');
};

export interface Theme {
  id: string;
  title: string;
  color: string;
  priority: 'high' | 'medium' | 'low';
  user_id: string;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done';
  priority: 'high' | 'medium' | 'low';
  priority_score?: number; // 1-100
  start_date?: string;
  due_date?: string;
  value_score: number; // 1-100
  order: number;
  estimated_duration?: number; // legacy
  effort_score?: number; // 1-100
  actual_duration?: number;
  theme_id?: string;
  initiative_id?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  notes?: string;
  priority?: 'high' | 'medium' | 'low';
  priority_score?: number;
  status?: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done';
  start_date?: string;
  due_date?: string;
  start_date_natural?: string;
  due_date_natural?: string;
  estimated_duration?: number;
  effort_score?: number;
  value_score?: number;
  theme_id?: string;
  initiative_id?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  if (!token && authRequired) throw new Error('Not authenticated')

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  return fetch(url, { ...options, headers } as RequestInit)
}

export async function registerUser(idToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Registration failed');
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetchWithAuth(url, options);
  
  if (response.status === 401) {
    clearToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (response.status === 403) {
      // Check if it's the "User not registered" case
      const errorData = await response.clone().json().catch(() => ({}));
      if (errorData.detail === "User not registered") {
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/register')) {
              window.location.href = '/register';
          }
          throw new Error('User not registered');
      }
  }

  if (!response.ok) {
    let message = 'An unexpected error occurred';
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        message = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : JSON.stringify(errorData.detail);
      }
    } catch {
      message = `Request failed: ${response.status} ${response.statusText}`;
    }
    throw new Error(message);
  }
  
  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}

/**
 * Tasks
 */
export async function createTask(data: TaskCreate): Promise<Task> {
  return request<Task>(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getTasks(): Promise<Task[]> {
  return request<Task[]>(`${API_BASE_URL}/tasks`);
}

export async function updateTask(taskId: string, data: Partial<Task>): Promise<Task> {
  return request<Task>(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  return request<void>(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

/**
 * Themes
 */
export async function getThemes(): Promise<Theme[]> {
  return request<Theme[]>(`${API_BASE_URL}/themes`);
}

export async function createTheme(data: Pick<Theme, 'title' | 'color' | 'priority'> & { order?: number }): Promise<Theme> {
  return request<Theme>(`${API_BASE_URL}/themes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTheme(themeId: string, data: Partial<Theme>): Promise<Theme> {
  return request<Theme>(`${API_BASE_URL}/themes/${themeId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTheme(themeId: string): Promise<void> {
  return request<void>(`${API_BASE_URL}/themes/${themeId}`, {
    method: 'DELETE',
  });
}

/**
 * Quick Capture Parser
 */
export function parseQuickCapture(input: string): TaskCreate {
  let title = input.trim();
  let priority_score = 50;
  let priority: 'high' | 'medium' | 'low' = 'medium';
  let estimated_duration: number | undefined;
  let value_score = 50;

  // Priority (allow !high/!medium/!low as shorthand)
  const priorityMatch = title.match(/!(high|medium|low)/i);
  if (priorityMatch) {
    const label = priorityMatch[1].toLowerCase();
    priority_score = label === 'high' ? 90 : label === 'medium' ? 60 : 30;
    priority = label as typeof priority;
    title = title.replace(/!(high|medium|low)/i, '').trim();
  }
  const priorityNumMatch = title.match(/p:(\d+)/i);
  if (priorityNumMatch) {
    priority_score = Math.min(100, Math.max(1, parseInt(priorityNumMatch[1])));
    priority = priority_score >= 67 ? 'high' : priority_score >= 34 ? 'medium' : 'low';
    title = title.replace(/p:\d+/i, '').trim();
  }

  // Duration (e:30 or 30m)
  const timeMatch = title.match(/(?:e:|)(\d+\.?\d*)(m|h|min|mins|hour|hours)\b/i);
  if (timeMatch) {
    const value = parseFloat(timeMatch[1]);
    const unit = timeMatch[2].toLowerCase();
    estimated_duration = (unit.startsWith('h')) ? Math.round(value * 60) : Math.round(value);
    title = title.replace(/(?:e:|)(\d+\.?\d*)(m|h|min|mins|hour|hours)\b/i, '').trim();
  }

  // Value Score (v:80)
  const valueMatch = title.match(/v:(\d+)/i);
  if (valueMatch) {
    value_score = Math.min(100, Math.max(1, parseInt(valueMatch[1])));
    title = title.replace(/v:(\d+)/i, '').trim();
  }

  return {
    title,
    priority,
    priority_score,
    estimated_duration,
    effort_score: estimated_duration,
    value_score,
    status: 'backlog',
  };
}

/**
 * Lightweight LLM client for local/dev use (OpenAI-compatible).
 */
export async function chatWithLlm(messages: ChatMessage[], sessionId?: string): Promise<{ content: string; session_id: string; pending_confirmation?: any; confirmation_options?: string[] }> {
  const data = await request<{ content: string; session_id: string; pending_confirmation?: any; confirmation_options?: string[] }>(`${API_BASE_URL}/llm/chat`, {
    method: 'POST',
    body: JSON.stringify({ messages, session_id: sessionId }),
  });
  return data;
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`${API_BASE_URL}/llm/history/${sessionId}`);
}

export async function clearChatHistory(sessionId: string): Promise<void> {
  return request<void>(`${API_BASE_URL}/llm/history/${sessionId}`, {
    method: 'DELETE',
  });
}
