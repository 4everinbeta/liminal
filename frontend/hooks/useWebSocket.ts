import { useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function useWebSocket() {
  const { triggerUpdate } = useAppStore()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const connect = () => {
      const token = localStorage.getItem('liminal_token')
      if (!token) return

      if (wsRef.current?.readyState === WebSocket.OPEN) return

      // Convert http/https to ws/wss
      const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws?token=' + token

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onmessage = (event) => {
        if (event.data === 'refresh') {
          console.log('WS: Refresh signal received')
          triggerUpdate()
        }
      }

      ws.onclose = () => {
        // Simple reconnect logic
        setTimeout(() => connect(), 3000)
      }
      
      ws.onerror = (err) => {
        console.error('WS Error:', err)
        ws.close()
      }
    }

    const handleTokenUpdate = () => {
        console.log('WS: Token updated, reconnecting...')
        if (wsRef.current) {
            wsRef.current.close() // Close intentionally
            wsRef.current = null
        }
        connect()
    }

    window.addEventListener('liminal:token_updated', handleTokenUpdate)
    connect()

    return () => {
      window.removeEventListener('liminal:token_updated', handleTokenUpdate)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [triggerUpdate])
}
