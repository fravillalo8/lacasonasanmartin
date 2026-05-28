import { useEffect, useRef } from 'react'

const BASE = import.meta.env.VITE_API_URL ?? ''

export type SSEHandler = (type: string, data: unknown) => void

export function useSSE(onEvent: SSEHandler) {
  const handlerRef = useRef<SSEHandler>(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    const token = localStorage.getItem('inv_token') || ''
    if (!token) return

    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout>
    let alive = true

    function connect() {
      if (!alive) return
      es = new EventSource(`${BASE}/api/events?token=${encodeURIComponent(token)}`)

      es.onmessage = (e) => {
        try {
          const { type, data } = JSON.parse(e.data)
          handlerRef.current(type, data)
        } catch { /* malformed event */ }
      }

      es.onerror = () => {
        es?.close()
        if (alive) reconnectTimer = setTimeout(connect, 4000)
      }
    }

    connect()
    return () => {
      alive = false
      clearTimeout(reconnectTimer)
      es?.close()
    }
  }, [])
}
