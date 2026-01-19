'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User as UserIcon, Loader2, PlusCircle, RefreshCcw } from 'lucide-react'
import { chatWithLlm, ChatMessage, createTask, TaskCreate, getChatHistory } from '@/lib/api'
import { useAppStore } from '@/lib/store'

// System prompt to guide the LLM's behavior
const SYSTEM_PROMPT = `
You are Liminal, an expert ADHD productivity coach. Be concise, encouraging, and direct.
You have access to powerful tools to manage tasks directly.
If the user wants to create, update, or delete tasks, just say so naturally. The system will handle the rest.
`

interface ChatInterfaceProps {
  onTaskCreated?: () => void
}

export default function ChatInterface({ onTaskCreated }: ChatInterfaceProps) {
  const { triggerUpdate } = useAppStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load session on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('liminal_chat_session_id')
    if (savedSessionId) {
      setSessionId(savedSessionId)
      setLoading(true)
      getChatHistory(savedSessionId)
        .then(history => {
            if (history && history.length > 0) {
                // Map backend history to frontend format if needed, but they match closely
                setMessages(history)
            } else {
                // Fallback initial message
                setMessages([{ role: 'assistant', content: 'Welcome back! How can I help?' }])
            }
        })
        .catch(() => {
            // If failed (e.g. 404), clear session
            localStorage.removeItem('liminal_chat_session_id')
            setSessionId(null)
            setMessages([{ role: 'assistant', content: 'Hello! I am Liminal. I can help you add tasks, answer questions, or track your progress.' }])
        })
        .finally(() => setLoading(false))
    } else {
       setMessages([{ role: 'assistant', content: 'Hello! I am Liminal. I can help you add tasks, answer questions, or track your progress.' }])
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, pendingConfirmation])

  const handleReset = () => {
      localStorage.removeItem('liminal_chat_session_id')
      setSessionId(null)
      setPendingConfirmation(null)
      setMessages([{ role: 'assistant', content: 'Hello! I am Liminal. I can help you add tasks, answer questions, or track your progress.' }])
  }

  const handleToolAction = async (jsonString: string) => {
    try {
      const command = JSON.parse(jsonString)
      
      // Client-side fallback (legacy)
      if (command.action === 'create_task') {
        const taskData: TaskCreate = {
          title: command.data.title,
          priority: command.data.priority || 'medium',
          estimated_duration: command.data.estimated_duration || 30,
          value_score: command.data.value_score || 50,
          status: 'backlog'
        }
        await createTask(taskData)
        triggerUpdate()
        if (onTaskCreated) onTaskCreated()
        return true
      }
      
      // Server-side signal
      if (command.action === 'refresh_board') {
        triggerUpdate()
        if (onTaskCreated) onTaskCreated()
        return true
      }

    } catch (e) {
      console.error("Failed to parse tool action", e)
    }
    return false
  }

  const handleSubmit = async (e?: React.FormEvent, messageOverride?: string) => {
    if (e) e.preventDefault()
    
    const textToSend = messageOverride || input
    if (!textToSend.trim() || loading) return

    const userMsg: ChatMessage = { role: 'user', content: textToSend.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setPendingConfirmation(null) // Clear confirmation on new message

    try {
      // Build context: System Prompt + Last 5 messages
      const recentHistory = messages.slice(-5).filter(m => !m.content.includes(':::')) 
      const context: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...recentHistory,
        userMsg
      ]

      const response = await chatWithLlm(context, sessionId || undefined)
      
      if (response.session_id && response.session_id !== sessionId) {
          setSessionId(response.session_id)
          localStorage.setItem('liminal_chat_session_id', response.session_id)
      }

      // Check for pending confirmation in response
      if (response.pending_confirmation) {
          setPendingConfirmation(response.pending_confirmation)
      }

      const responseContent = response.content
      
      // Parse for commands (non-greedy, global to handle multiple blocks)
      const commandRegex = /:::\s*(\{[\s\S]*?\})\s*:::/g
      let match
      let displayContent = responseContent
      let actionTaken = false

      // First, extract all commands
      const commands: string[] = []
      displayContent = displayContent.replace(commandRegex, (match, group1) => {
        commands.push(group1)
        return '' // Remove from display
      }).trim()

      // Execute commands
      for (const jsonCommand of commands) {
         const success = await handleToolAction(jsonCommand)
         if (success) actionTaken = true
      }

      if (actionTaken) {
           displayContent += " (Task created ✓)"
      }

      const assistantMsg: ChatMessage = { role: 'assistant', content: displayContent }
      setMessages(prev => [...prev, assistantMsg])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to my brain.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleEditConfirmation = () => {
      if (!pendingConfirmation || !pendingConfirmation.details) return
      
      const d = pendingConfirmation.details
      let editMsg = `Modify pending task: Change title to "${d.title}"`
      if (d.priority_score) editMsg += `, priority to ${d.priority_score}`
      // Pre-fill input for user to tweak
      setInput(editMsg)
      setPendingConfirmation(null) // Dismiss buttons so user can edit
      // Focus input would be ideal here but sticking to React state flow
  }

  return (
    <div className="flex flex-col h-[400px] bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gray-50/50 p-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Bot size={18} />
            </div>
            <div>
            <h3 className="text-sm font-semibold text-gray-700">Liminal Coach</h3>
            <p className="text-xs text-muted">Powered by Local AI</p>
            </div>
        </div>
        <button 
            onClick={handleReset}
            className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
            title="Start New Chat"
        >
            <RefreshCcw size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
            }`}>
              {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-secondary text-white rounded-tr-none' 
                : 'bg-gray-100 text-gray-700 rounded-tl-none'
            }`}>
              {msg.content}
            </div>
          </motion.div>
        ))}
        
        {pendingConfirmation && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start pl-11 gap-2">
                <button 
                    onClick={() => handleSubmit(undefined, "Yes")}
                    className="px-4 py-1.5 bg-green-600 text-white text-xs rounded-full hover:bg-green-700 transition-colors shadow-sm"
                >
                    Yes
                </button>
                <button 
                    onClick={() => handleSubmit(undefined, "No")}
                    className="px-4 py-1.5 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 transition-colors shadow-sm"
                >
                    No
                </button>
                <button 
                    onClick={handleEditConfirmation}
                    className="px-4 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-full hover:bg-gray-300 transition-colors shadow-sm"
                >
                    Edit
                </button>
            </motion.div>
        )}
        
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Bot size={16} />
             </div>
             <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2 flex items-center">
                <Loader2 size={16} className="animate-spin text-gray-400" />
             </div>
          </motion.div>
        )}
      </div>

      <form onSubmit={(e) => handleSubmit(e)} className="p-3 border-t border-gray-100 bg-white flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type 'Add task buy milk'..."
          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}