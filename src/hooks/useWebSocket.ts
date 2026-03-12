import { useRef, useState, useCallback, useEffect } from 'react'
import { getToken } from '../lib/auth'

export type WsState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export interface SubtitleMessage {
  line_final: string
  line_next: string
  original_text?: string
  type?: string
  is_final?: boolean
  // Fase 2: populated by pipeline when online diarization is active
  speaker_id?: string | null
  speaker_confidence?: number | null
}

interface UseWebSocketOptions {
  url: string
  targetLang: string
  onMessage: (msg: SubtitleMessage) => void
  onStateChange?: (s: WsState) => void
  /** If set, connects as a viewer (no audio) to the given session */
  viewerSessionId?: string
  /** Called when the server sends end_of_session (host stopped) */
  onSessionEnd?: () => void
}

const PING_INTERVAL = 25_000
const INITIAL_RECONNECT_DELAY = 1_000
const MAX_RECONNECT_DELAY = 30_000

export function useWebSocket({ url, targetLang, onMessage, onStateChange, viewerSessionId, onSessionEnd }: UseWebSocketOptions) {
  const [state, setState] = useState<WsState>('disconnected')
  const [sessionId, setSessionId] = useState<string>('')
  const [viewerCount, setViewerCount] = useState<number>(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectDelay = useRef(INITIAL_RECONNECT_DELAY)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const pingTimer = useRef<ReturnType<typeof setInterval>>()
  const shouldReconnect = useRef(false)
  const onSessionEndRef = useRef(onSessionEnd)
  const receivedHello = useRef(false)
  const noHelloCloseCount = useRef(0)

  useEffect(() => { onSessionEndRef.current = onSessionEnd }, [onSessionEnd])

  const setWsState = useCallback((s: WsState) => {
    setState(s)
    onStateChange?.(s)
  }, [onStateChange])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    setWsState('connecting')

    const token = getToken()
    let wsUrl = `${url}?token=${token ?? ''}&target_lang=${targetLang}`
    if (viewerSessionId) {
      wsUrl += `&session_id=${viewerSessionId}&viewer=1`
    }
    console.log('[WS] connecting →', wsUrl)
    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] open')
      setWsState('connected')
      reconnectDelay.current = INITIAL_RECONNECT_DELAY
      receivedHello.current = false
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
        if (msg.type !== 'pong') console.log('[WS] msg:', msg)
        if (msg.type === 'pong') return
        // Capture session_id from hello message
        if (msg.type === 'hello' && msg.session_id) {
          setSessionId(msg.session_id)
          receivedHello.current = true
          noHelloCloseCount.current = 0
          return
        }
        // Server sent end_of_session (silence timeout or host stopped).
        // Viewers: host has stopped — don't reconnect.
        // Host sessions: the server-side EOS may be a false alarm (e.g. AudioContext
        // suspended during a YouTube pause). Don't kill reconnect here; the user's
        // explicit Stop button calls close() which sets shouldReconnect = false.
        if (msg.type === 'end_of_session') {
          if (viewerSessionId) shouldReconnect.current = false
          onSessionEndRef.current?.()
          return
        }
        if (msg.type === 'viewer_count') {
          setViewerCount(msg.count ?? 0)
          return
        }
        if (msg.type === 'subtitle' || msg.line_final !== undefined || msg.line_next !== undefined) {
          onMessage(msg as SubtitleMessage)
        }
      } catch { /* ignore malformed */ }
    }

    ws.onerror = (e) => {
      console.log('[WS] error', e)
      setWsState('error')
    }

    ws.onclose = (e) => {
      console.log('[WS] close — code:', e.code, 'reason:', e.reason, 'wasClean:', e.wasClean, 'shouldReconnect:', shouldReconnect.current)
      clearInterval(pingTimer.current)
      // Viewer-only: if the connection closes without ever receiving `hello`,
      // the session room is gone. After 3 such attempts, treat it as session ended.
      if (viewerSessionId && shouldReconnect.current && !receivedHello.current) {
        noHelloCloseCount.current += 1
        if (noHelloCloseCount.current >= 3) {
          shouldReconnect.current = false
          setWsState('disconnected')
          onSessionEndRef.current?.()
          return
        }
      }
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
  }, [url, targetLang, onMessage, setWsState, viewerSessionId])

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
    noHelloCloseCount.current = 0
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

  return { state, sessionId, viewerCount, open, close, sendChunk }
}
