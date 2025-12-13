'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User as UserIcon, Loader2, PlusCircle } from 'lucide-react'
import { chatWithLlm, ChatMessage, createTask, TaskCreate } from '@/lib/api'

// System prompt to guide the LLM's behavior
const SYSTEM_PROMPT = `
You are Liminal, an expert ADHD productivity coach. Be concise, encouraging, and direct.
You have access to powerful tools to manage tasks directly.
If the user wants to create, update, or delete tasks, just say so naturally. The system will handle the rest.
`

export default function ChatInterface({ onTaskCreated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! I am Liminal. I can help you add tasks, answer questions, or track your progress.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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
        if (onTaskCreated) onTaskCreated()
        return true
      }
      
      // Server-side signal
      if (command.action === 'refresh_board') {
        if (onTaskCreated) onTaskCreated()
        return true
      }

    } catch (e) {
      console.error("Failed to parse tool action", e)
    }
    return false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Build context: System Prompt + Last 5 messages
      const recentHistory = messages.slice(-5).filter(m => !m.content.includes(':::')) // Filter out raw commands from history if desired, or keep them
      const context: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...recentHistory,
        userMsg
      ]

      const responseContent = await chatWithLlm(context)
      
      // Parse for command
      const commandRegex = /:::({.*}):::/s
      const match = responseContent.match(commandRegex)
      let displayContent = responseContent

      if (match) {
        const jsonCommand = match[1]
        displayContent = responseContent.replace(match[0], '').trim() // Remove command from visible text
        const success = await handleToolAction(jsonCommand)
        
        if (success) {
           // Optionally refresh the task list (requires lifting state or using context/swr)
           // For now, we'll just let the user know via the chat
           displayContent += " (Task created ✓)"
           // Trigger a custom event or use a callback if we need to refresh the parent
           // But since we are inside a component, maybe we can accept an onTaskCreated prop?
           // I'll add that below.
        }
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

  return (
    <div className="flex flex-col h-[400px] bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gray-50/50 p-3 border-b border-gray-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Bot size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Liminal Assistant</h3>
          <p className="text-xs text-muted">Powered by Local AI</p>
        </div>
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
            
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
              msg.role === 'user' 
                ? 'bg-secondary text-white rounded-tr-none' 
                : 'bg-gray-100 text-gray-700 rounded-tl-none'
            }`}>
              {msg.content}
            </div>
          </motion.div>
        ))}
        
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

      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100 bg-white flex gap-2">
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
