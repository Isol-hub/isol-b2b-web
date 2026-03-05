import { useRef, useState, useCallback, useEffect } from 'react'
import { getToken } from '../lib/auth'

export type WsState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export interface SubtitleMessage {
  line_final: string
  line_next: string
  original_text?: string
  type?: string
  is_final?: boolean
}

interface UseWebSocketOptions {
  url: string
  targetLang: string
  onMessage: (msg: SubtitleMessage) => void
  onStateChange?: (s: WsState) => void
}

const PING_INTERVAL = 25_000
const INITIAL_RECONNECT_DELAY = 1_000
const MAX_RECONNECT_DELAY = 30_000

export function useWebSocket({ url, targetLang, onMessage, onStateChange }: UseWebSocketOptions) {
  const [state, setState] = useState<WsState>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectDelay = useRef(INITIAL_RECONNECT_DELAY)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const pingTimer = useRef<ReturnType<typeof setInterval>>()
  const shouldReconnect = useRef(false)

  const setWsState = useCallback((s: WsState) => {
    setState(s)
    onStateChange?.(s)
  }, [onStateChange])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    setWsState('connecting')

    const token = getToken()
    const wsUrl = `${url}?token=${token ?? ''}&target_lang=${targetLang}`
    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      setWsState('connected')
      reconnectDelay.current = INITIAL_RECONNECT_DELAY
      // Heartbeat ping
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, PING_INTERVAL)
    }

    ws.onmessage = (ev) => {
      try {
        const msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : null
        if (!msg) return
        if (msg.type === 'pong') return
        if (msg.type === 'subtitle' || msg.line_final !== undefined || msg.line_next !== undefined) {
          onMessage(msg as SubtitleMessage)
        }
      } catch { /* ignore malformed */ }
    }

    ws.onerror = () => {
      setWsState('error')
    }

    ws.onclose = () => {
      clearInterval(pingTimer.current)
      if (shouldReconnect.current) {
        setWsState('reconnecting')
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_DELAY)
          connect()
        }, reconnectDelay.current)
      } else {
        setWsState('disconnected')
      }
    }
  }, [url, targetLang, onMessage, setWsState])

  const sendChunk = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data)
    }
  }, [])

  const open = useCallback(() => {
    shouldReconnect.current = true
    connect()
  }, [connect])

  const close = useCallback(() => {
    shouldReconnect.current = false
    clearTimeout(reconnectTimer.current)
    clearInterval(pingTimer.current)
    wsRef.current?.close()
    wsRef.current = null
    setWsState('disconnected')
  }, [setWsState])

  // Cleanup on unmount
  useEffect(() => () => {
    shouldReconnect.current = false
    clearTimeout(reconnectTimer.current)
    clearInterval(pingTimer.current)
    wsRef.current?.close()
  }, [])

  return { state, open, close, sendChunk }
}
