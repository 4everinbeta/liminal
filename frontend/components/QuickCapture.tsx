'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Plus, Check, Loader2, Send, Sparkles, Rocket, Tags, ListTodo, Wand2, Pencil, Trash2 } from 'lucide-react'
import {
  createTask,
  updateTask,
  parseQuickCapture,
  getThemes,
  createTheme,
  chatWithLlm,
  type ChatMessage as ApiChatMessage,
  TaskCreate,
  Theme,
} from '@/lib/api'
import { useAppStore, INITIAL_CHAT_MESSAGES, type ChatMessage as UiChatMessage } from '@/lib/store'

interface QuickCaptureProps {
  onTaskCreated?: () => void
}

type TaskDraft = TaskCreate & { description?: string; notes?: string; theme_name?: string }

const valueOptions = [40, 60, 80, 90]
const effortOptions = [25, 50, 75, 90]
const priorityOptions = [30, 60, 90]

type Intent = 'new' | 'update' | 'general'

const classifyIntent = (text: string): Intent => {
  const lower = text.toLowerCase()
  const updateHints = /(update|change|edit)\s+(task|item|card)/i
  if (updateHints.test(lower)) return 'update'

  const newHints = /(add|create|new)\s+(task|item|card)/i
  const kvHints = /(v:\d+|e:\d+|p:\d+|!high|!medium|!low|theme:)/i
  if (newHints.test(lower) || kvHints.test(lower)) return 'new'

  return 'general'
}
const themePalette = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444']

export default function QuickCapture({ onTaskCreated }: QuickCaptureProps) {
  const [input, setInput] = useState('')
  const { chatMessages, appendChatMessage, setChatMessages } = useAppStore()
  const [isSending, setIsSending] = useState(false)
  const [draft, setDraft] = useState<TaskDraft | null>({
    title: '', // Added missing title property
    priority: 'medium',
    priority_score: 50,
    status: 'backlog',
    value_score: 50,
    effort_score: 50,
    estimated_duration: 50,
  })
  const [themes, setThemes] = useState<Theme[]>([])
  const [newThemeName, setNewThemeName] = useState('')
  const [taskReady, setTaskReady] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [pendingThemeName, setPendingThemeName] = useState<string | null>(null)
  const [updateTaskId, setUpdateTaskId] = useState('')
  const [updateMode, setUpdateMode] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadThemes = async () => {
      try {
        const t = await getThemes()
        setThemes(t)
      } catch (err) {
        console.error('Failed to load themes', err)
      }
    }
    loadThemes()
  }, [])

  // Ensure a starting assistant message exists when the store is empty (fresh session)
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages(INITIAL_CHAT_MESSAGES)
    }
  }, [chatMessages.length, setChatMessages])

  useEffect(() => {
    if (chatRef.current) {
      if (typeof chatRef.current.scrollTo === 'function') {
        chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
      } else {
        chatRef.current.scrollTop = chatRef.current.scrollHeight
      }
    }
  }, [chatMessages])

  const readyForDetails = useMemo(() => {
    if (!draft) return { needsValue: true, needsEffort: true, needsTheme: true, needsPrioritize: true }
    return {
      needsValue: !draft.value_score || draft.value_score === 50,
      needsEffort: !draft.effort_score,
      needsPriority: !draft.priority_score || draft.priority_score === 50,
      needsTheme: !draft.theme_id && !draft.theme_name,
      needsPrioritize: draft.status === 'backlog',
    }
  }, [draft])

  const resetDraft = () => {
    setDraft({
      title: '', // Added missing title property
      priority: 'medium',
      priority_score: 50,
      status: 'backlog',
      value_score: 50,
      effort_score: 50,
      estimated_duration: 50,
    })
    setTaskReady(false)
    setStatusMessage(null)
    setEditMode(false)
    setPendingThemeName(null)
    setUpdateMode(false)
    setUpdateTaskId('')
  }

  const appendMessage = (message: UiChatMessage) => appendChatMessage(message)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isSending) return

    const userText = input.trim()
    setInput('')
    appendMessage({ role: 'user', content: userText })
    setIsSending(true)
    setStatusMessage(null)

    // Intent router
    const intent = classifyIntent(userText)
    if (intent === 'general') {
      appendMessage({
        role: 'assistant',
        content:
          'I capture tasks. Say “create task <name> v:80 e:30 p:70 theme:XYZ” to add one, or “update task <id> …” to change an existing task.',
      })
      setIsSending(false)
      return
    }

    // Detect theme creation intent
    const themeMatch = userText.match(/(?:new|create) theme (.+)/i)
    if (themeMatch) {
      const name = themeMatch[1].trim()
      setPendingThemeName(name)
      appendMessage({ role: 'assistant', content: `Create a new theme "${name}"? Tap Create Theme below to confirm.` })
      setIsSending(false)
      return
    }

    // Detect update intent
    if (intent === 'update') {
      setUpdateMode(true)
      appendMessage({
        role: 'assistant',
        content: 'I can update an existing task. Provide the task ID or paste it below, then adjust fields and click Apply Update.',
      })
      setIsSending(false)
      return
    }

    // Theme hint (theme: Design)
    const themeHint = userText.match(/theme\s*:\s*([^,]+)/i)
    const hintedThemeName = themeHint ? themeHint[1].trim() : undefined

    // Build initial draft from quick syntax
    const parsed = parseQuickCapture(userText)
    const prioritizeHint = /prioriti[sz]e|do now|today|queue|start|focus/i.test(userText)
    const baseDraft: TaskDraft = {
      priority: parsed.priority || draft?.priority || 'medium',
      priority_score: parsed.priority_score ?? draft?.priority_score ?? 50,
      status: prioritizeHint ? 'in_progress' : parsed.status || draft?.status || 'backlog',
      value_score: parsed.value_score ?? draft?.value_score ?? 50,
      estimated_duration: parsed.estimated_duration ?? draft?.estimated_duration ?? parsed.effort_score,
      effort_score: parsed.effort_score ?? draft?.effort_score,
      title: parsed.title || draft?.title || userText,
      description: draft?.description,
      notes: draft?.notes,
      theme_id: draft?.theme_id,
      theme_name: hintedThemeName || draft?.theme_name,
    }

    // If everything is provided in key/value, no LLM needed
    const hasRequired = Boolean(
      baseDraft.title &&
      baseDraft.effort_score &&
      baseDraft.value_score &&
      baseDraft.priority_score
    )
    const themeNeeded = Boolean(baseDraft.theme_name) && !themes.some(t => t.title.toLowerCase() === baseDraft.theme_name?.toLowerCase())

    try {
      if (themeNeeded) {
        setPendingThemeName(baseDraft.theme_name || null)
        appendMessage({
          role: 'assistant',
          content: `I don't see a theme named "${baseDraft.theme_name}". Existing themes: ${themes
            .map(t => t.title)
            .join(', ') || 'none'}. Create it?`,
        })
        setDraft(baseDraft)
        setTaskReady(true)
      } else if (!hasRequired) {
        setDraft({ ...baseDraft, status: 'backlog' })
        setTaskReady(true)
        appendMessage({
          role: 'assistant',
          content:
            'I only have enough for a minimal task in the Threshold. To prioritize, provide: priority (1-100), value (1-100), and effort (1-100).',
        })
      } else {
        setDraft(baseDraft)
        setTaskReady(true)
        appendMessage({
          role: 'assistant',
          content: 'Draft is ready. Review the fields below and confirm to create the task.',
        })
      }
    } catch (err) {
      console.error('LLM or draft preparation failed', err)
      appendMessage({
        role: 'assistant',
        content: 'I could not prepare the draft. You can fill the fields manually below and click Confirm.',
      })
      setDraft(baseDraft)
      setTaskReady(true)
    } finally {
      setIsSending(false)
    }
  }

  const confirmTask = async () => {
    if (!draft || !draft.title) return
    setIsSending(true)
    setStatusMessage(null)
    try {
      const hasRequired = Boolean(draft.value_score && draft.effort_score && draft.priority_score)
      const statusToSave = hasRequired && draft.theme_id ? 'in_progress' : 'backlog'
      const created = await createTask({
        title: draft.title,
        description: draft.description,
        notes: draft.notes,
        priority: draft.priority,
        priority_score: draft.priority_score,
        status: statusToSave,
        estimated_duration: draft.estimated_duration,
        effort_score: draft.effort_score,
        value_score: draft.value_score,
        theme_id: draft.theme_id,
        initiative_id: draft.initiative_id,
      })
      setStatusMessage('Task created')
      appendMessage({ role: 'assistant', content: `Created "${created.title}". Need another change?` })
      onTaskCreated?.()
      resetDraft()
    } catch (err) {
      console.error('Failed to create task', err)
      setStatusMessage('Task creation failed')
      appendMessage({ role: 'assistant', content: 'Task creation failed. Check the backend and try again.' })
    } finally {
      setIsSending(false)
    }
  }

  const handleUpdateTask = async () => {
    if (!updateTaskId.trim()) {
      appendMessage({ role: 'assistant', content: 'Please provide a Task ID to update.' })
      return
    }
    if (!draft) return
    setIsSending(true)
    try {
      await updateTask(updateTaskId.trim(), {
        title: draft.title,
        description: draft.description,
        notes: draft.notes,
        priority: draft.priority,
        priority_score: draft.priority_score,
        status: draft.status,
        estimated_duration: draft.estimated_duration,
        effort_score: draft.effort_score,
        value_score: draft.value_score,
        theme_id: draft.theme_id,
      })
      appendMessage({ role: 'assistant', content: 'Update applied.' })
      setStatusMessage('Task updated')
      onTaskCreated?.()
    } catch (err) {
      console.error('Update failed', err)
      appendMessage({ role: 'assistant', content: 'Update failed. Check the task ID and try again.' })
    } finally {
      setIsSending(false)
    }
  }

  const handleCreateTheme = async () => {
    const name = pendingThemeName || newThemeName
    if (!name.trim()) return
    const color = themePalette[themes.length % themePalette.length]
    try {
      const theme = await createTheme({ title: name.trim(), color, priority: 'medium' })
      setThemes((prev) => [...prev, theme])
      appendMessage({ role: 'assistant', content: `Created theme "${theme.title}". Assign it in the draft below.` })
      setPendingThemeName(null)
      setNewThemeName('')
    } catch (err) {
      console.error('Failed to create theme', err)
      appendMessage({ role: 'assistant', content: 'Could not create that theme.' })
    }
  }

  const refineWithLlm = async () => {
    if (!draft) return
    setIsSending(true)
    try {
      const llmDraft = await getLlmDraft(draft, themes)
      setDraft({ ...draft, ...llmDraft })
      appendMessage({
        role: 'assistant',
        content: llmDraft.message || 'Refined the draft. Review and confirm when ready.',
      })
    } catch (err) {
      console.error('LLM refine failed', err)
      appendMessage({ role: 'assistant', content: 'Could not refine via LLM. Adjust manually.' })
    } finally {
      setIsSending(false)
    }
  }

  const handlePrioritizeToggle = () => {
    if (!draft) return
    const nextStatus = draft.status === 'backlog' ? 'in_progress' : 'backlog'
    setDraft({ ...draft, status: nextStatus })
  }

  const handleValueSelect = (value: number) => draft && setDraft({ ...draft, value_score: value })
  const handleEffortSelect = (value: number) => draft && setDraft({ ...draft, effort_score: value, estimated_duration: value })
  const handlePrioritySelect = (value: number) =>
    draft &&
    setDraft({
      ...draft,
      priority_score: value,
      priority: value >= 67 ? 'high' : value >= 34 ? 'medium' : 'low',
    })

  const handleThemeSelect = (themeId: string) => draft && setDraft({ ...draft, theme_id: themeId, theme_name: undefined })

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4">
        <div className="flex items-center justify-between text-xs text-muted mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} /> <span>Chat Intake</span>
          </div>
          <span className="uppercase text-[10px] tracking-wide">Quick Add</span>
        </div>

        <div ref={chatRef} className="space-y-3 max-h-56 overflow-y-auto pr-2">
          {chatMessages.map((msg, idx) => (
            <div key={`${msg.role}-${idx}`} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`rounded-2xl px-3 py-2 text-sm shadow-sm border ${
                  msg.role === 'assistant'
                    ? 'bg-gray-50 text-gray-800 border-gray-100'
                    : 'bg-primary text-white border-primary/70'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="pt-3 flex gap-3 items-end">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Liminal (e.g., 'Draft investor update v:80 e:30m !high' or 'Create theme Focus Sprints')"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e as unknown as React.FormEvent)
                }
              }}
              className="w-full min-h-[64px] p-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted/70"
            />
            <div className="text-[10px] text-muted/70 flex gap-3 mt-2">
              <span>
                <strong>v:80</strong> value (1-100)
              </span>
              <span>
                <strong>e:30</strong> effort (1-100)
              </span>
              <span>
                <strong>p:80</strong> priority
              </span>
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="h-10 w-12 flex items-center justify-center rounded-xl bg-primary text-white shadow-sm disabled:opacity-50"
          >
            {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </form>

        {statusMessage && (
          <div className="text-xs text-green-600 flex items-center gap-2 mt-2">
            <Check size={14} /> {statusMessage}
          </div>
        )}

        {/* Theme creation prompt */}
        {(pendingThemeName || newThemeName) && (
          <div className="mt-3 flex items-center gap-2">
            <input
              value={pendingThemeName || newThemeName}
              onChange={(e) => {
                setPendingThemeName(e.target.value)
                setNewThemeName(e.target.value)
              }}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
              placeholder="Theme name"
            />
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm"
              onClick={handleCreateTheme}
              disabled={isSending}
            >
              Create Theme
            </button>
          </div>
        )}

        {/* Update existing task panel */}
        {updateMode && (
          <div className="mt-4 border border-gray-200 rounded-xl p-3 bg-gray-50/60 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Pencil size={14} /> Update existing task
            </div>
            <input
              value={updateTaskId}
              onChange={(e) => setUpdateTaskId(e.target.value)}
              placeholder="Task ID"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
            {draft && <EditableFields draft={draft} setDraft={setDraft} />}
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-50"
                onClick={handleUpdateTask}
                disabled={isSending}
              >
                Apply Update
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-gray-200 text-sm"
                onClick={() => {
                  setUpdateMode(false)
                  setUpdateTaskId('')
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Draft panel */}
        {draft && taskReady && (
          <div className="mt-4 border border-gray-200 rounded-xl p-3 bg-gray-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Wand2 size={14} /> Draft ready — confirm to create
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1 rounded-lg bg-primary text-white text-xs disabled:opacity-50"
                  onClick={confirmTask}
                  disabled={isSending}
                >
                  Create Task
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-lg bg-gray-200 text-xs"
                  onClick={() => setEditMode((v) => !v)}
                >
                  {editMode ? 'Hide fields' : 'Edit fields'}
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-lg bg-gray-100 text-xs"
                  onClick={refineWithLlm}
                  disabled={isSending}
                >
                  Refine (LLM)
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-lg bg-gray-100 text-xs flex items-center gap-1"
                  onClick={resetDraft}
                >
                  <Trash2 size={12} /> Reset
                </button>
              </div>
            </div>

            {editMode && <EditableFields draft={draft} setDraft={setDraft} />}

            <div className="grid md:grid-cols-2 gap-3">
              <QuickActionCard title="Value (1-100)" icon={<Rocket size={14} />} description="Higher = more impact.">
                <div className="flex flex-wrap gap-2">
                  {valueOptions.map((v) => (
                    <button
                      key={v}
                      data-testid={`value-${v}`}
                      className={`px-3 py-1 rounded-lg text-sm border ${
                        draft.value_score === v ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700'
                      }`}
                      onClick={() => handleValueSelect(v)}
                      type="button"
                    >
                      v:{v}
                    </button>
                  ))}
                </div>
              </QuickActionCard>

              <QuickActionCard title="Effort (1-100)" icon={<ListTodo size={14} />} description="Estimate effort/complexity.">
                <div className="flex flex-wrap gap-2">
                  {effortOptions.map((v) => (
                    <button
                      key={v}
                      data-testid={`effort-${v}`}
                      className={`px-3 py-1 rounded-lg text-sm border ${
                        draft.effort_score === v ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700'
                      }`}
                      onClick={() => handleEffortSelect(v)}
                      type="button"
                    >
                      e:{v}
                    </button>
                  ))}
                </div>
              </QuickActionCard>

              <QuickActionCard title="Priority (1-100)" icon={<Tags size={14} />} description="Higher = more urgency/importance.">
                <div className="flex gap-2 flex-wrap">
                  {priorityOptions.map((p) => (
                    <button
                      key={p}
                      className={`px-3 py-1 rounded-lg text-sm border ${
                        draft.priority_score === p ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-700'
                      }`}
                      onClick={() => handlePrioritySelect(p)}
                      type="button"
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handlePrioritizeToggle}
                    className={`px-3 py-1 rounded-lg text-sm border ${
                      draft.status === 'backlog' ? 'bg-white text-gray-700' : 'bg-emerald-500 text-white border-emerald-500'
                    }`}
                  >
                    {draft.status === 'backlog' ? 'Add to prioritized queue' : 'In prioritized queue'}
                  </button>
                </div>
              </QuickActionCard>

              <QuickActionCard title="Themes" icon={<Plus size={14} />} description="Assign to a theme or add one.">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {themes.map((theme) => (
                      <button
                        key={theme.id}
                        className={`px-3 py-1 rounded-lg text-sm border ${
                          draft.theme_id === theme.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700'
                        }`}
                        onClick={() => handleThemeSelect(theme.id)}
                        type="button"
                      >
                        {theme.title}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={newThemeName}
                      onChange={(e) => setNewThemeName(e.target.value)}
                      placeholder="New theme name"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm"
                      onClick={handleCreateTheme}
                    >
                      Create
                    </button>
                  </div>
                </div>
              </QuickActionCard>
            </div>

            {(readyForDetails.needsValue || readyForDetails.needsEffort || readyForDetails.needsTheme) && (
              <div className="mt-2 text-xs text-muted">
                Missing details? Use quick buttons or edit fields above. I’ll only create after you confirm.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function QuickActionCard({
  title,
  icon,
  description,
  children,
}: {
  title: string
  icon: ReactNode
  description: string
  children: ReactNode
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/60">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1">
        {icon} {title}
      </div>
      <div className="text-xs text-muted mb-2">{description}</div>
      {children}
    </div>
  )
}

function EditableFields({ draft, setDraft }: { draft: TaskDraft; setDraft: (t: TaskDraft) => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-muted">Title</label>
        <input
          value={draft.title || ''}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
          placeholder="Task title"
        />
        <label className="block text-xs font-semibold text-muted">Description</label>
        <textarea
          value={draft.description || ''}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm min-h-[60px]"
          placeholder="What is the task about?"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-muted">Notes</label>
        <textarea
          value={draft.notes || ''}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm min-h-[60px]"
          placeholder="Context, blockers, acceptance criteria..."
        />
        <label className="block text-xs font-semibold text-muted">Status</label>
        <select
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskDraft['status'] })}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
        >
          <option value="backlog">Backlog</option>
          <option value="in_progress">Prioritized</option>
          <option value="todo">Todo</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </select>
      </div>
    </div>
  )
}

async function getLlmDraft(seed: TaskDraft, themes: Theme[]) {
  const prompt = [
    'You are Liminal, an ADHD-friendly planner assistant.',
    'Given a user ask, return concise JSON with fields: title, description, notes, value_score (1-100), effort_score (1-100), priority_score (1-100), status (backlog|in_progress|todo|blocked|done).',
    'Prefer concise, actionable titles. Keep descriptions under 2 sentences.',
    'Themes available: ' + (themes.map((t) => t.title).join(', ') || 'none') + '.',
    'Do not include extra text outside JSON.',
  ].join(' ')

  const messages: ApiChatMessage[] = [
    { role: 'system', content: prompt },
    {
      role: 'user',
      content: `Seed: ${JSON.stringify(seed)}`,
    },
  ]

  const content = await chatWithLlm(messages as any)
  let parsed: Partial<TaskDraft> = {}
  try {
    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      parsed = JSON.parse(match[0])
    }
  } catch (err) {
    console.error('Failed to parse LLM JSON', err)
  }

  return { ...parsed, message: content }
}
