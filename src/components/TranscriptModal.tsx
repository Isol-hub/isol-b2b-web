import { useState, useMemo, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'

interface TranscriptLine {
  text: string
  time: Date
}

type ViewMode = 'ai' | 'raw' | 'dialogue' | 'notes'
type FileFormat = 'txt' | 'md' | 'json' | 'pdf' | 'docx' | 'ics'

interface Props {
  transcript: TranscriptLine[]
  targetLang: string
  aiFormatted?: string
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

  const body = sections.map(sec => {
    const t = formatTime(sec[0].time)
    const bullets = sec.map(l => `  • ${l.text}`).join('\n')
    return `[${t}]\n${bullets}`
  }).join('\n\n')

  return `# Meeting Notes\n${date}\nDuration: ~${duration} min\n\n---\n\n${body}`
}

function generateIcs(transcript: TranscriptLine[]): string {
  if (!transcript.length) return ''
  const start = transcript[0].time
  const end = transcript[transcript.length - 1].time
  const stamp = new Date()

  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const desc = transcript.map(l => l.text).join('\\n').replace(/[,;]/g, (c) => `\\${c}`)

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ISOL//Meeting Transcript//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `DTSTAMP:${fmt(stamp)}`,
    `UID:isol-${Date.now()}@isol.live`,
    'SUMMARY:ISOL Session Transcript',
    `DESCRIPTION:${desc}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

async function downloadPdf(content: string, filename: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18
  const maxW = pageW - margin * 2
  let y = margin + 6

  for (const rawLine of content.split('\n')) {
    const isH1 = rawLine.startsWith('# ')
    const isH2 = rawLine.startsWith('## ')
    const isH3 = rawLine.startsWith('### ')

    const text = isH1 ? rawLine.slice(2) : isH2 ? rawLine.slice(3) : isH3 ? rawLine.slice(4) : rawLine

    if (isH1) { doc.setFontSize(18); doc.setFont('helvetica', 'bold') }
    else if (isH2) { doc.setFontSize(14); doc.setFont('helvetica', 'bold') }
    else if (isH3) { doc.setFontSize(12); doc.setFont('helvetica', 'bold') }
    else { doc.setFontSize(11); doc.setFont('helvetica', 'normal') }

    if (rawLine.trim() === '') { y += 4; continue }

    const wrapped = doc.splitTextToSize(text, maxW)
    for (const wLine of wrapped) {
      if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin + 6 }
      doc.text(wLine, margin, y)
      y += isH1 ? 9 : isH2 ? 7 : isH3 ? 6.5 : 6
    }
    if (isH1 || isH2) y += 3
  }

  doc.save(filename)
}

async function downloadDocx(content: string, filename: string) {
  const children: Paragraph[] = []

  for (const rawLine of content.split('\n')) {
    if (rawLine.startsWith('# ')) {
      children.push(new Paragraph({ text: rawLine.slice(2), heading: HeadingLevel.HEADING_1 }))
    } else if (rawLine.startsWith('## ')) {
      children.push(new Paragraph({ text: rawLine.slice(3), heading: HeadingLevel.HEADING_2 }))
    } else if (rawLine.startsWith('### ')) {
      children.push(new Paragraph({ text: rawLine.slice(4), heading: HeadingLevel.HEADING_3 }))
    } else if (rawLine.trim() === '') {
      children.push(new Paragraph({ children: [new TextRun('')] }))
    } else {
      children.push(new Paragraph({ children: [new TextRun({ text: rawLine, size: 24 })] }))
    }
  }

  const doc = new Document({
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function serialize(content: string, lines: TranscriptLine[], format: FileFormat, mode: ViewMode): string {
  if (format === 'json') {
    if (mode === 'dialogue') {
      return JSON.stringify(detectSpeakers(lines).map(l => ({ speaker: l.speaker, text: l.text, time: l.time.toISOString() })), null, 2)
    }
    return JSON.stringify(lines.map(l => ({ text: l.text, time: l.time.toISOString() })), null, 2)
  }
  if (format === 'ics') return generateIcs(lines)
  return content
}

export default function TranscriptModal({ transcript, targetLang, aiFormatted, onClose }: Props) {
  const [mode, setMode] = useState<ViewMode>(aiFormatted ? 'ai' : 'dialogue')
  const [format, setFormat] = useState<FileFormat>('md')
  const [downloading, setDownloading] = useState(false)

  const generated = useMemo(() => {
    if (mode === 'ai') return aiFormatted ?? toNotes(transcript)
    if (mode === 'raw') return toRaw(transcript)
    if (mode === 'dialogue') return toDialogue(transcript)
    return toNotes(transcript)
  }, [mode, transcript, aiFormatted])

  const [edited, setEdited] = useState<string | null>(null)
  const content = edited ?? generated

  const switchMode = useCallback((m: ViewMode) => { setMode(m); setEdited(null) }, [])

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      const base = `isol-${mode}-${new Date().toISOString().slice(0, 10)}`

      if (format === 'pdf') {
        await downloadPdf(content, `${base}.pdf`)
      } else if (format === 'docx') {
        await downloadDocx(content, `${base}.docx`)
      } else if (format === 'ics') {
        const data = generateIcs(transcript)
        const blob = new Blob([data], { type: 'text/calendar' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${base}.ics`; a.click()
        URL.revokeObjectURL(url)
      } else {
        const mime = format === 'json' ? 'application/json' : 'text/plain'
        const data = serialize(content, transcript, format, mode)
        const blob = new Blob([data], { type: mime })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${base}.${format}`; a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setDownloading(false)
    }
  }, [content, transcript, format, mode])

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'rgba(124,58,237,0.25)' : 'transparent',
    color: active ? '#c4b5fd' : 'rgba(238,242,255,0.45)',
    borderBottom: active ? '2px solid rgba(167,139,250,0.7)' : '2px solid transparent',
  })

  const FORMAT_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '5px 11px', borderRadius: 7, fontSize: 11, fontWeight: 700,
    border: `1px solid ${active ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.08)'}`,
    cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
    color: active ? '#c4b5fd' : 'rgba(238,242,255,0.40)',
  })

  const FORMAT_LABELS: { id: FileFormat; label: string }[] = [
    { id: 'txt', label: '.txt' },
    { id: 'md', label: '.md' },
    { id: 'pdf', label: 'PDF' },
    { id: 'docx', label: 'Word' },
    { id: 'json', label: 'JSON' },
    { id: 'ics', label: '📅 Calendar' },
  ]

  const binaryFormat = format === 'pdf' || format === 'docx' || format === 'ics'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(7,7,26,0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 760,
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
        <div style={{ display: 'flex', gap: 4, padding: '12px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {aiFormatted && (
            <button style={{
              ...TAB_STYLE(mode === 'ai'),
              background: mode === 'ai' ? 'rgba(124,58,237,0.30)' : 'transparent',
              borderBottom: mode === 'ai' ? '2px solid #a78bfa' : '2px solid transparent',
            }} onClick={() => switchMode('ai')}>
              ✦ AI Enhanced
            </button>
          )}
          {(['raw', 'dialogue', 'notes'] as ViewMode[]).map(m => (
            <button key={m} style={TAB_STYLE(mode === m)} onClick={() => switchMode(m)}>
              {m === 'raw' ? '📄 Raw' : m === 'dialogue' ? '💬 Dialogue' : '📝 Notes'}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center', paddingBottom: 8, flexWrap: 'wrap' }}>
            {FORMAT_LABELS.map(({ id, label }) => (
              <button key={id} style={FORMAT_STYLE(format === id)} onClick={() => setFormat(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode description */}
        <div style={{ padding: '10px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <p style={{ fontSize: 12, color: 'rgba(238,242,255,0.40)', lineHeight: 1.5 }}>
            {mode === 'ai' && 'AI-formatted text with punctuation, titles and paragraph structure. Edit before exporting.'}
            {mode === 'raw' && 'Timestamped lines exactly as captured. Edit freely before downloading.'}
            {mode === 'dialogue' && 'Speakers detected automatically from pauses (A, B, C…). Edit names before exporting.'}
            {mode === 'notes' && 'Content reorganized into sections by topic pauses. Add titles, highlights, action items.'}
            {format === 'ics' && ' · Calendar file opens in Apple Calendar, Google Calendar, Outlook.'}
          </p>
        </div>

        {/* Editable content — hidden for binary/calendar formats */}
        {binaryFormat ? (
          <div style={{
            flex: 1, minHeight: 160,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10, color: 'rgba(238,242,255,0.35)',
          }}>
            <span style={{ fontSize: 36 }}>
              {format === 'pdf' ? '📄' : format === 'docx' ? '📝' : '📅'}
            </span>
            <span style={{ fontSize: 14 }}>
              {format === 'ics'
                ? `${transcript.length} lines · ${Math.round((transcript[transcript.length - 1]?.time.getTime() - transcript[0]?.time.getTime()) / 60000) || 0} min session`
                : `Click Download to generate the ${format.toUpperCase()} file`}
            </span>
            {format === 'ics' && (
              <span style={{ fontSize: 12, color: 'rgba(238,242,255,0.25)', textAlign: 'center', maxWidth: 320 }}>
                The session time and full transcript will be added to your calendar event.
              </span>
            )}
          </div>
        ) : (
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
        )}

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          gap: 12,
        }}>
          <button
            onClick={() => setEdited(null)}
            disabled={edited === null || binaryFormat}
            style={{
              background: 'none', color: 'var(--text-dim)', fontSize: 13,
              textDecoration: 'underline', opacity: (edited === null || binaryFormat) ? 0.3 : 1,
            }}
          >
            Reset edits
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} className="btn-icon" style={{ fontSize: 13, padding: '9px 18px' }}>Cancel</button>
            <button onClick={handleDownload} disabled={downloading} style={{
              background: 'linear-gradient(135deg,#7c3aed,#0ea5e9)',
              color: '#fff', fontWeight: 700, fontSize: 14,
              padding: '10px 28px', borderRadius: 12, border: 'none',
              cursor: downloading ? 'default' : 'pointer',
              opacity: downloading ? 0.7 : 1,
              boxShadow: '0 0 24px rgba(124,58,237,0.35)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {downloading ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Generating…
                </>
              ) : (
                `↓ Download ${FORMAT_LABELS.find(f => f.id === format)?.label ?? format}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
