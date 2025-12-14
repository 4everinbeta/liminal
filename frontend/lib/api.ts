/**
 * API client for Liminal backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
console.log('API_BASE_URL:', API_BASE_URL);

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
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done';
  priority: 'high' | 'medium' | 'low';
  priority_score?: number; // 1-100
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
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  notes?: string;
  priority?: 'high' | 'medium' | 'low';
  priority_score?: number;
  status?: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done';
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

/**
 * Ensure demo user exists and is logged in
 */
async function ensureDemoUser(): Promise<string> {
  const token = getToken();
  if (token) return token;

  const demoUser = {
    email: 'demo@liminal.app',
    name: 'Demo User',
    password: 'demopassword123'
  };

  try {
    // 1. Try to create user (might fail if exists, that's fine)
    await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(demoUser),
    });

    // 2. Login
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + btoa(`${demoUser.email}:${demoUser.password}`)
        }
    });

    if (loginResponse.ok) {
        const data = await loginResponse.json();
        setToken(data.access_token);
        return data.access_token;
    }
  } catch (error) {
    console.error('Failed to auth demo user:', error);
  }
  
  return '';
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await ensureDemoUser();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    const resp = await fetch(url, { ...options, headers } as RequestInit);

    // Dev convenience: auto-renew demo creds on expiry and retry once.
    if (resp.status === 401) {
        clearToken();
        const freshToken = await ensureDemoUser();
        const retryHeaders = {
            ...headers,
            'Authorization': `Bearer ${freshToken}`
        };
        return fetch(url, { ...options, headers: retryHeaders } as RequestInit);
    }

    return resp;
}

/**
 * Tasks
 */
export async function createTask(data: TaskCreate): Promise<Task> {
  const response = await fetchWithAuth(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create task');
  return response.json();
}

export async function getTasks(): Promise<Task[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/tasks`);
  if (!response.ok) throw new Error('Failed to fetch tasks');
  return response.json();
}

export async function updateTask(taskId: string, data: Partial<Task>): Promise<Task> {
  const response = await fetchWithAuth(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update task');
  return response.json();
}

export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete task');
}

/**
 * Themes
 */
export async function getThemes(): Promise<Theme[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/themes`);
  if (!response.ok) throw new Error('Failed to fetch themes');
  const themes = await response.json();
  
  if (themes.length === 0) {
      // Create defaults if empty
      const t1 = await fetchWithAuth(`${API_BASE_URL}/themes`, {
          method: 'POST',
          body: JSON.stringify({ title: 'AI Enablement', color: '#4F46E5' })
      }).then(r => r.json());
      
      const t2 = await fetchWithAuth(`${API_BASE_URL}/themes`, {
          method: 'POST',
          body: JSON.stringify({ title: 'Team Building', color: '#10B981' })
      }).then(r => r.json());
      return [t1, t2];
  }
  return themes;
}

export async function createTheme(data: Pick<Theme, 'title' | 'color' | 'priority'>): Promise<Theme> {
  const response = await fetchWithAuth(`${API_BASE_URL}/themes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create theme');
  return response.json();
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
export async function chatWithLlm(messages: ChatMessage[]): Promise<string> {
  const response = await fetchWithAuth(`${API_BASE_URL}/llm/chat`, {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) throw new Error('Failed to reach LLM');
  const data = await response.json();
  return data?.content || '';
}
