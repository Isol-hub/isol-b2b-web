import { useState, useMemo, useCallback } from 'react'

interface TranscriptLine {
  text: string
  time: Date
}

type ViewMode = 'raw' | 'dialogue' | 'notes'
type FileFormat = 'txt' | 'md' | 'json'

interface Props {
  transcript: TranscriptLine[]
  targetLang: string
  onClose: () => void
}

const SPEAKER_GAP_MS = 3500
const SPEAKERS = ['Speaker A', 'Speaker B', 'Speaker C', 'Speaker D']

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour12: false })
}

function detectSpeakers(lines: TranscriptLine[]): { text: string; speaker: string; time: Date }[] {
  let spIdx = 0
  return lines.map((line, i) => {
    if (i > 0) {
      const gap = line.time.getTime() - lines[i - 1].time.getTime()
      if (gap > SPEAKER_GAP_MS) spIdx = (spIdx + 1) % SPEAKERS.length
    }
    return { text: line.text, speaker: SPEAKERS[spIdx], time: line.time }
  })
}

function toRaw(lines: TranscriptLine[]): string {
  return lines.map(l => `[${formatTime(l.time)}] ${l.text}`).join('\n')
}

function toDialogue(lines: TranscriptLine[]): string {
  const withSpeakers = detectSpeakers(lines)
  const sections: string[] = []
  let currentSpeaker = ''
  let buffer: string[] = []

  for (const { text, speaker, time } of withSpeakers) {
    if (speaker !== currentSpeaker) {
      if (buffer.length) sections.push(`${currentSpeaker}:\n  ${buffer.join(' ')}`)
      currentSpeaker = speaker
      buffer = [`[${formatTime(time)}] ${text}`]
    } else {
      buffer.push(text)
    }
  }
  if (buffer.length) sections.push(`${currentSpeaker}:\n  ${buffer.join(' ')}`)
  return sections.join('\n\n')
}

function toNotes(lines: TranscriptLine[]): string {
  if (!lines.length) return ''
  const date = lines[0].time.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const duration = Math.round((lines[lines.length - 1].time.getTime() - lines[0].time.getTime()) / 60000)

  // Group into sections by pauses > 8 seconds
  const sections: TranscriptLine[][] = []
  let current: TranscriptLine[] = []
  for (let i = 0; i < lines.length; i++) {
    if (i > 0 && lines[i].time.getTime() - lines[i - 1].time.getTime() > 8000) {
      if (current.length) sections.push(current)
      current = []
    }
    current.push(lines[i])
  }
  if (current.length) sections.push(current)

  const body = sections.map((sec, i) => {
    const t = formatTime(sec[0].time)
    const bullets = sec.map(l => `  • ${l.text}`).join('\n')
    return `[${t}]\n${bullets}`
  }).join('\n\n')

  return `# Meeting Notes\n${date}\nDuration: ~${duration} min\n\n---\n\n${body}`
}

function serialize(content: string, lines: TranscriptLine[], format: FileFormat, mode: ViewMode): string {
  if (format === 'json') {
    if (mode === 'dialogue') {
      return JSON.stringify(detectSpeakers(lines).map(l => ({ speaker: l.speaker, text: l.text, time: l.time.toISOString() })), null, 2)
    }
    return JSON.stringify(lines.map(l => ({ text: l.text, time: l.time.toISOString() })), null, 2)
  }
  return content
}

function mime(format: FileFormat): string {
  return format === 'json' ? 'application/json' : 'text/plain'
}

function ext(format: FileFormat): string {
  return format === 'md' ? 'md' : format === 'json' ? 'json' : 'txt'
}

export default function TranscriptModal({ transcript, targetLang, onClose }: Props) {
  const [mode, setMode] = useState<ViewMode>('dialogue')
  const [format, setFormat] = useState<FileFormat>('md')

  const generated = useMemo(() => {
    if (mode === 'raw') return toRaw(transcript)
    if (mode === 'dialogue') return toDialogue(transcript)
    return toNotes(transcript)
  }, [mode, transcript])

  const [edited, setEdited] = useState<string | null>(null)
  const content = edited ?? generated

  // Reset edits when mode changes
  const switchMode = useCallback((m: ViewMode) => { setMode(m); setEdited(null) }, [])

  const handleDownload = useCallback(() => {
    const data = serialize(content, transcript, format, mode)
    const blob = new Blob([data], { type: mime(format) })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `isol-${mode}-${new Date().toISOString().slice(0, 10)}.${ext(format)}`
    a.click()
    URL.revokeObjectURL(url)
  }, [content, transcript, format, mode])

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'rgba(124,58,237,0.25)' : 'transparent',
    color: active ? '#c4b5fd' : 'rgba(238,242,255,0.45)',
    borderBottom: active ? '2px solid rgba(167,139,250,0.7)' : '2px solid transparent',
  })

  const FORMAT_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    border: `1px solid ${active ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.08)'}`,
    cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
    color: active ? '#c4b5fd' : 'rgba(238,242,255,0.45)',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(7,7,26,0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 740,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(167,139,250,0.20)',
        borderRadius: 20,
        backdropFilter: 'blur(32px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(124,58,237,0.12)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh',
        overflow: 'hidden',
      }}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>Edit & Export Transcript</h2>
            <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{transcript.length} lines · {targetLang.toUpperCase()}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-dim)', fontSize: 22, padding: '2px 8px', borderRadius: 8 }}>×</button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '12px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {(['raw', 'dialogue', 'notes'] as ViewMode[]).map(m => (
            <button key={m} style={TAB_STYLE(mode === m)} onClick={() => switchMode(m)}>
              {m === 'raw' ? '📄 Raw' : m === 'dialogue' ? '💬 Dialogue' : '📝 Notes'}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 8 }}>
            {(['txt', 'md', 'json'] as FileFormat[]).map(f => (
              <button key={f} style={FORMAT_STYLE(format === f)} onClick={() => setFormat(f)}>
                .{f}
              </button>
            ))}
          </div>
        </div>

        {/* Mode description */}
        <div style={{ padding: '10px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <p style={{ fontSize: 12, color: 'rgba(238,242,255,0.40)', lineHeight: 1.5 }}>
            {mode === 'raw' && 'Timestamped lines exactly as captured. Edit freely before downloading.'}
            {mode === 'dialogue' && 'Speakers detected automatically from pauses (A, B, C…). Edit names and attribution before exporting.'}
            {mode === 'notes' && 'Content reorganized into sections by topic pauses. Add titles, highlights, action items.'}
          </p>
        </div>

        {/* Editable content */}
        <textarea
          value={content}
          onChange={e => setEdited(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            padding: '20px 24px',
            color: 'rgba(238,242,255,0.85)',
            fontSize: 14,
            fontFamily: mode === 'raw' ? 'monospace' : "'Georgia', serif",
            lineHeight: 1.8,
            resize: 'none',
            outline: 'none',
            minHeight: 320,
            overflowY: 'auto',
          }}
          spellCheck={false}
        />

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          gap: 12,
        }}>
          <button
            onClick={() => setEdited(null)}
            disabled={edited === null}
            style={{
              background: 'none', color: 'var(--text-dim)', fontSize: 13,
              textDecoration: 'underline', opacity: edited === null ? 0.3 : 1,
            }}
          >
            Reset edits
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} className="btn-icon" style={{ fontSize: 13, padding: '9px 18px' }}>Cancel</button>
            <button onClick={handleDownload} style={{
              background: 'linear-gradient(135deg,#7c3aed,#0ea5e9)',
              color: '#fff', fontWeight: 700, fontSize: 14,
              padding: '10px 28px', borderRadius: 12, border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(124,58,237,0.35)',
            }}>
              ↓ Download .{format}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
