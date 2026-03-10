import { useRef, useState, useCallback, useEffect } from 'react'

export type AudioCaptureState = 'idle' | 'requesting' | 'active' | 'error'
export type AudioSource = 'display' | 'microphone'

interface AudioCaptureOptions {
  chunkMs?: number           // default 200ms
  onChunk: (pcm: ArrayBuffer) => void
  onError: (msg: string) => void
}

export function useAudioCapture({ chunkMs = 200, onChunk, onError }: AudioCaptureOptions) {
  const [state, setState] = useState<AudioCaptureState>('idle')
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)

  const start = useCallback(async (source: AudioSource = 'display') => {
    setState('requesting')
    try {
      let stream: MediaStream

      if (source === 'microphone') {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
      } else {
        // Request display media with system audio
        // video: true is required by spec (Safari throws TypeError with video: false)
        // We stop video tracks immediately after getting audio
        stream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: true,
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          preferCurrentTab: false,
        })

        // Stop video tracks immediately — we only need audio
        stream.getVideoTracks().forEach((t: MediaStreamTrack) => t.stop())

        // If no audio track, error out
        if (!stream.getAudioTracks().length) {
          stream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
          throw new Error('No audio track — make sure to check "Share tab audio" or "Share system audio" in the browser dialog.')
        }
      }

      streamRef.current = stream
      const audioCtx = new AudioContext({ sampleRate: 16000 })
      ctxRef.current = audioCtx

      const src = audioCtx.createMediaStreamSource(stream)
      // ScriptProcessorNode requires power-of-2 buffer size
      const rawSize = (audioCtx.sampleRate * chunkMs) / 1000
      const bufferSize = Math.pow(2, Math.round(Math.log2(rawSize))) as 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (ev) => {
        const input = ev.inputBuffer.getChannelData(0)
        // Convert Float32 → Int16 PCM
        const pcm = new Int16Array(input.length)
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]))
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        onChunk(pcm.buffer)
      }

      src.connect(processor)
      processor.connect(audioCtx.destination)

      // Handle remote stop (user closes share dialog or revokes mic permission)
      stream.getAudioTracks()[0].addEventListener('ended', () => {
        stop()
        onError(source === 'microphone'
          ? 'Microphone access was revoked.'
          : 'Audio capture stopped by browser.')
      })

      setState('active')
    } catch (err: any) {
      setState('error')
      if (err.name === 'NotAllowedError') {
        onError(source === 'microphone'
          ? 'Microphone permission denied. Please allow access.'
          : 'Permission denied. Please allow screen/audio sharing.')
      } else if (err.name === 'NotFoundError') {
        onError('No audio source found.')
      } else {
        onError(err.message ?? 'Failed to start audio capture.')
      }
    }
  }, [chunkMs, onChunk, onError])

  const stop = useCallback(() => {
    processorRef.current?.disconnect()
    processorRef.current = null
    ctxRef.current?.close()
    ctxRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setState('idle')
  }, [])

  // Stop all audio resources when the component unmounts (e.g. navigating away
  // while a session is active). Without this, ScriptProcessorNode keeps running
  // on Chrome's main thread and screen-capture streams stay alive, freezing the browser.
  useEffect(() => () => { stop() }, [stop])

  return { state, start, stop }
}
