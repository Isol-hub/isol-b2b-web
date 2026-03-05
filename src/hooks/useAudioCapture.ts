import { useRef, useState, useCallback } from 'react'

export type AudioCaptureState = 'idle' | 'requesting' | 'active' | 'error'

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

  const start = useCallback(async () => {
    setState('requesting')
    try {
      // Request display media with system audio
      const display = await (navigator.mediaDevices as any).getDisplayMedia({
        video: false,
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        preferCurrentTab: false,
      })

      // If no audio track, error out
      if (!display.getAudioTracks().length) {
        display.getTracks().forEach((t: MediaStreamTrack) => t.stop())
        throw new Error('No audio track — make sure to check "Share tab audio" or "Share system audio" in the browser dialog.')
      }

      streamRef.current = display
      const audioCtx = new AudioContext({ sampleRate: 16000 })
      ctxRef.current = audioCtx

      const source = audioCtx.createMediaStreamSource(display)
      // ScriptProcessorNode (legacy but universally supported)
      const bufferSize = Math.round((audioCtx.sampleRate * chunkMs) / 1000)
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

      source.connect(processor)
      processor.connect(audioCtx.destination)

      // Handle remote stop (user closes share dialog)
      display.getAudioTracks()[0].addEventListener('ended', () => {
        stop()
        onError('Audio capture stopped by browser.')
      })

      setState('active')
    } catch (err: any) {
      setState('error')
      if (err.name === 'NotAllowedError') {
        onError('Permission denied. Please allow screen/audio sharing.')
      } else if (err.name === 'NotFoundError') {
        onError('No audio source found. Try sharing a tab with audio.')
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

  return { state, start, stop }
}
