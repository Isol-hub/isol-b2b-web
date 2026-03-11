import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { getSession, clearSession, getToken } from '../lib/auth'
import { useAudioCapture, type AudioSource } from '../hooks/useAudioCapture'
import { useWebSocket } from '../hooks/useWebSocket'
import type { SubtitleMessage } from '../hooks/useWebSocket'
import DocumentView from '../components/DocumentView'
import HeroQuotes from '../components/HeroQuotes'
import type { CommentItem } from '../components/CommentThread'
import HighlightsSection from '../components/HighlightsSection'
import type { HighlightItem, HighlightCategory } from '../components/HighlightPopup'
import SubtitleView from '../components/SubtitleView'
import { usePip } from '../hooks/usePip'
import TranscriptModal from '../components/TranscriptModal'
import GlossaryPanel from '../components/GlossaryPanel'
import GlossaryListPanel, { type GlossaryItem } from '../components/GlossaryListPanel'
import LanguageSelector from '../components/LanguageSelector'
import ErrorBanner from '../components/ErrorBanner'
import StickyNote from '../components/StickyNote'
import RecoveryBanner from '../components/RecoveryBanner'
import OnboardingModal from '../components/OnboardingModal'
import { LANGUAGES } from '../lib/languages'

// ── Speaker diarization ──────────────────────────────────────────────────────
type SpeakerState = 'confirmed' | 'tentative' | 'overlap' | 'uncertain'
type SpeakerSource = 'heuristic' | 'manual' | 'online' | 'refined' | 'workspace_match'

interface LineAssignment {
  speakerId: string | null
  state: SpeakerState
  source: SpeakerSource
}

interface SpeakerProfile {
  label: string
  color: string
  is_user_edited?: boolean
}

const SPEAKER_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
const TURN_GAP_MS = 2500
const MIN_RELIABLE_SPEAKER_CONFIDENCE = 0.55
// ────────────────────────────────────────────────────────────────────────────

interface TranscriptLine {
  text: string
  time: Date
  /** speaker_id from pipeline diarization — null when unavailable (Phase 1 heuristic only) */
  pipelineSpeakerId?: string | null
  /** low-confidence backend speaker IDs should not suppress the heuristic fallback */
  pipelineSpeakerConfidence?: number | null
}

function buildCommentMap(arr: (CommentItem & { line_index: number | null })[]): Map<number, CommentItem[]> {
  const m = new Map<number, CommentItem[]>()
  arr.forEach(c => {
    const idx = c.line_index ?? -1
    m.set(idx, [...(m.get(idx) ?? []), { id: c.id, author: c.author, body: c.body, created_at: c.created_at }])
  })
  return m
}

export default function WorkspacePage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
  const navigate = useNavigate()
  const session = getSession()

  const [targetLang, setTargetLang] = useState('en')
  const [currentLine, setCurrentLine] = useState('')
  const [error, setError] = useState('')
  const pip = usePip()
  const [sessionActive, setSessionActive] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Default to microphone on mobile (screen capture not available)
  const [audioSource, setAudioSource] = useState<AudioSource>(
    () => 'getDisplayMedia' in navigator.mediaDevices ? 'display' : 'microphone'
  )
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [showModal, setShowModal] = useState(false)
  const [roomCopied, setRoomCopied] = useState(false)
  const [showShareHint, setShowShareHint] = useState(false)
  const shareHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [viewMode, setViewMode] = useState<'raw' | 'ai' | 'notes'>('raw')

  const [glossaryWord, setGlossaryWord] = useState<{ word: string; sentence: string } | null>(null)
  const [showGlossaryList, setShowGlossaryList] = useState(false)
  const [showHighlights, setShowHighlights] = useState(false)
  const [titleSaved, setTitleSaved] = useState(false)

  const [aiFormatted, setAiFormatted] = useState<string | undefined>()
  const [aiFormattedAt, setAiFormattedAt] = useState<number | undefined>()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNotes, setAiNotes] = useState<string | undefined>()
  const [aiNotesLoading, setAiNotesLoading] = useState(false)
  const aiRunningRef = useRef(false)
  const notesRunningRef = useRef(false)
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiRetryAfterRef = useRef<number>(0)
  const notesRetryAfterRef = useRef<number>(0)
  const [aiRetryTick, setAiRetryTick] = useState(0)
  const [notesRetryTick, setNotesRetryTick] = useState(0)
  const targetLangRef = useRef(targetLang)
  useEffect(() => { targetLangRef.current = targetLang }, [targetLang])
  // Refs for fresh values inside debounce callbacks (avoid stale closures)
  const aiFormattedAtRef = useRef<number | undefined>(undefined)
  const notesRunCountRef = useRef(0)
  useEffect(() => { aiFormattedAtRef.current = aiFormattedAt }, [aiFormattedAt])

  const wordIndex = useRef<Map<string, string[]>>(new Map())
  const sessionStartRef = useRef<number>(0)

  // Session history
  interface SessionMeta { id: number; started_at: number; target_lang: string; line_count: number; title?: string; share_token?: string }
  interface SessionDetail {
    session: Record<string, unknown>
    lines: Array<{ line_index: number; text: string; speaker_id?: string | null; speaker_state?: string }>
    highlights: HighlightItem[]
    speakers: Array<{ speaker_id: string; label: string; color: string }>
    comments: Array<CommentItem & { line_index: number | null }>
  }
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [viewingSession, setViewingSession] = useState<SessionDetail | null>(null)
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false)
  const [highlights, setHighlights] = useState<HighlightItem[]>([])

  // Speaker diarization state (live session)
  const [speakerAssignments, setSpeakerAssignments] = useState<LineAssignment[]>([])
  const [speakerLabels, setSpeakerLabels] = useState<Map<string, SpeakerProfile>>(new Map())

  // Speaker map for archived session modal — built from API response
  const speakerAssignmentsRef = useRef<LineAssignment[]>([])
  const speakerProfilesRef = useRef<Map<string, SpeakerProfile>>(new Map())
  const heuristicProcRef = useRef<number>(0)
  const currentTurnSpeakerRef = useRef<string | null>(null)
  // Deduplicate line_final additions: Session Engine sends line_final = <last finalized text>
  // on every partial of the NEXT segment, causing the same text to be added multiple times.
  const lastLineFinalRef = useRef<string>('')

  const [editingTitle, setEditingTitle] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const [sharePending, setSharePending] = useState(false)
  const [shareDurationHours, setShareDurationHours] = useState<number | null>(null)

  // Inline annotations (live session only)
  const [lineComments, setLineComments] = useState<Map<number, CommentItem[]>>(new Map())
  // Archived session comments — separate so live lineComments are never overwritten
  const [archivedComments, setArchivedComments] = useState<Map<number, CommentItem[]>>(new Map())
  const [archivedViewMode, setArchivedViewMode] = useState<'raw' | 'ai' | 'notes'>('raw')
  const [openCommentLine, setOpenCommentLine] = useState<number | null>(null)
  const [commentAuthor, setCommentAuthor] = useState(
    () => localStorage.getItem('isol_commenter_name') || ''
  )
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const commentPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastWssSessionIdRef = useRef<string>('')

  // Sync title input when session detail opens
  useEffect(() => {
    if (viewingSession) {
      setEditingTitle((viewingSession.session.title as string) ?? '')
    }
  }, [viewingSession])

  // Workspace glossary
  const [glossaryItems, setGlossaryItems] = useState<GlossaryItem[]>([])
  const glossaryTermsSet = useMemo(() => new Set(glossaryItems.map(i => i.term)), [glossaryItems])
  const glossaryNotesMap = useMemo(() => new Map(glossaryItems.map(i => [i.term, i.note])), [glossaryItems])

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(() =>
    !localStorage.getItem(`isol_onboarded_${workspaceSlug}`)
  )

  // Draft recovery
  const [recoveryDraft, setRecoveryDraft] = useState<{
    lines: Array<{ text: string }>
    started_at: number
    target_lang: string
  } | null>(null)

  // Auto-switch to AI only the first time format arrives — never override user's choice after that
  const hasAutoSwitchedRef = useRef(false)
  useEffect(() => {
    if (aiFormatted && !hasAutoSwitchedRef.current) {
      hasAutoSwitchedRef.current = true
      setViewMode('ai')
    }
  }, [aiFormatted])

  // Fires after 1.5s silence OR every 5 new lines (handles continuous speech)
  const transcriptLenMod5 = Math.floor(transcript.length / 5)
  useEffect(() => {
    if (transcript.length < 5) return
    if (Date.now() < aiRetryAfterRef.current) return
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current)
    const currentLines = transcript  // capture fresh transcript in closure
    aiDebounceRef.current = setTimeout(() => {
      if (aiRunningRef.current) return
      if (Date.now() < aiRetryAfterRef.current) return
      const formattedAt = aiFormattedAtRef.current
      if (formattedAt !== undefined && currentLines.length <= formattedAt) return
      aiRunningRef.current = true
      setAiLoading(true)
      const snapLength = currentLines.length
      fetch('/api/ai/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ lines: currentLines.map(l => l.text), targetLang: targetLangRef.current }),
      })
        .then(r => {
          if (r.status === 429) {
            r.json().then((body: { resetAt?: number }) => {
              const retryAt = body.resetAt ? body.resetAt * 1000 : Date.now() + 60_000
              aiRetryAfterRef.current = retryAt
              const resetIn = Math.ceil((retryAt - Date.now()) / 60000)
              setError(`AI rate limit reached — retry in ${resetIn}m`)
              const delay = Math.max(5_000, retryAt - Date.now())
              setTimeout(() => { aiRunningRef.current = false; setAiRetryTick(t => t + 1); setError('') }, delay)
            }).catch(() => { aiRunningRef.current = false })
            return null
          }
          if (!r.ok) { r.text().then(t => setError(`AI format error ${r.status}: ${t}`)); return null }
          return r.json()
        })
        .then((data: { formatted?: string } | null) => {
          if (data?.formatted) { setAiFormatted(data.formatted); setAiFormattedAt(snapLength); aiFormattedAtRef.current = snapLength }
        })
        .catch(() => {})
        .finally(() => { setAiLoading(false); aiRunningRef.current = false })
    }, 1500)
  }, [transcript.length, transcriptLenMod5, aiRetryTick])  // eslint-disable-line react-hooks/exhaustive-deps

  // AI notes — same dual-trigger pattern
  const transcriptLenMod8 = Math.floor(transcript.length / 8)
  useEffect(() => {
    if (transcript.length < 5) return
    if (Date.now() < notesRetryAfterRef.current) return
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current)
    const currentLines = transcript
    notesDebounceRef.current = setTimeout(() => {
      if (notesRunningRef.current) return
      if (Date.now() < notesRetryAfterRef.current) return
      notesRunningRef.current = true
      setAiNotesLoading(true)
      fetch('/api/ai/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ lines: currentLines.map(l => l.text), targetLang: targetLangRef.current }),
      })
        .then(r => {
          if (r.status === 429) {
            r.json().then((body: { resetAt?: number }) => {
              const retryAt = body.resetAt ? body.resetAt * 1000 : Date.now() + 60_000
              notesRetryAfterRef.current = retryAt
              const delay = Math.max(5_000, retryAt - Date.now())
              setTimeout(() => { notesRunningRef.current = false; setNotesRetryTick(t => t + 1) }, delay)
            }).catch(() => { notesRunningRef.current = false })
            return null
          }
          return r.ok ? r.json() : null
        })
        .then((data: { notes?: string } | null) => {
          if (data?.notes) setAiNotes(data.notes)
        })
        .catch(() => {})
        .finally(() => { setAiNotesLoading(false); notesRunningRef.current = false })
    }, 2000)
  }, [transcript.length, transcriptLenMod8, notesRetryTick])  // eslint-disable-line react-hooks/exhaustive-deps

  // Speaker heuristic — incremental, runs only during live sessions
  useEffect(() => {
    if (!sessionActive) return
    const start = heuristicProcRef.current
    if (transcript.length <= start) return

    const profiles = speakerProfilesRef.current
    const newAssignments: LineAssignment[] = []

    for (let i = start; i < transcript.length; i++) {
      const pipelineId = transcript[i].pipelineSpeakerId ?? null
      const pipelineConfidence = transcript[i].pipelineSpeakerConfidence ?? null
      const hasReliablePipelineSpeaker = !!pipelineId && (
        pipelineConfidence === null || pipelineConfidence >= MIN_RELIABLE_SPEAKER_CONFIDENCE
      )

      if (hasReliablePipelineSpeaker && pipelineId) {
        // ── Pipeline mode: backend diarization result available ───────────────
        // Ensure a profile exists for this speaker ID (sp-1, sp-2, …).
        if (!profiles.has(pipelineId)) {
          const idx = profiles.size
          profiles.set(pipelineId, {
            label: `Voice ${idx + 1}`,
            color: SPEAKER_COLORS[idx % SPEAKER_COLORS.length],
          })
        }
        currentTurnSpeakerRef.current = pipelineId
        newAssignments.push({ speakerId: pipelineId, state: 'confirmed', source: 'online' })
      } else {
        // ── Heuristic mode: no pipeline speaker — fall back to pause detection ─
        const prevLine = i > 0 ? transcript[i - 1] : null
        const currLine = transcript[i]
        const gapMs = prevLine ? currLine.time.getTime() - prevLine.time.getTime() : Infinity
        const isNewTurn = gapMs > TURN_GAP_MS

        if (isNewTurn) {
          const knownSpeakers = [...profiles.keys()]
          if (knownSpeakers.length === 0) {
            const spId = 'sp-1'
            profiles.set(spId, { label: 'Voice 1', color: SPEAKER_COLORS[0] })
            currentTurnSpeakerRef.current = spId
            newAssignments.push({ speakerId: spId, state: 'tentative', source: 'heuristic' })
          } else if (knownSpeakers.length === 1) {
            const spId = 'sp-2'
            profiles.set(spId, { label: 'Voice 2', color: SPEAKER_COLORS[1] })
            currentTurnSpeakerRef.current = spId
            newAssignments.push({ speakerId: spId, state: 'tentative', source: 'heuristic' })
          } else if (knownSpeakers.length === 2) {
            const other = knownSpeakers.find(s => s !== currentTurnSpeakerRef.current) ?? knownSpeakers[0]
            currentTurnSpeakerRef.current = other
            newAssignments.push({ speakerId: other, state: 'tentative', source: 'heuristic' })
          } else {
            currentTurnSpeakerRef.current = null
            newAssignments.push({ speakerId: null, state: 'uncertain', source: 'heuristic' })
          }
        } else {
          newAssignments.push({
            speakerId: currentTurnSpeakerRef.current,
            state: currentTurnSpeakerRef.current ? 'tentative' : 'uncertain',
            source: 'heuristic',
          })
        }
      }
    }

    heuristicProcRef.current = transcript.length

    setSpeakerAssignments(prev => {
      const next = [...prev, ...newAssignments]
      speakerAssignmentsRef.current = next
      return next
    })
    setSpeakerLabels(new Map(profiles))
  }, [transcript.length, sessionActive])

  const wssUrl = import.meta.env.VITE_WSS_URL ?? 'wss://api.isol.live/audio'

  const handleMessage = useCallback((msg: SubtitleMessage) => {
    // Use original_text (source language) when available — the server may broadcast
    // a translated line_final to all room participants when a viewer with a different
    // target_lang is connected. The host must always save the original transcript.
    const sourceLine = msg.original_text || msg.line_final
    if (sourceLine && sourceLine !== lastLineFinalRef.current) {
      lastLineFinalRef.current = sourceLine
      const entry: TranscriptLine = {
        text: sourceLine,
        time: new Date(),
        // Capture pipeline speaker if backend diarization is active (Phase 3).
        // null/undefined → heuristic will run instead.
        pipelineSpeakerId: msg.speaker_id ?? null,
        pipelineSpeakerConfidence: msg.speaker_confidence ?? null,
      }
      setTranscript(prev => [...prev, entry])
      sourceLine.split(/\s+/).forEach(raw => {
        const w = raw.toLowerCase().replace(/[^\w]/g, '')
        if (w.length < 3) return
        const existing = wordIndex.current.get(w) ?? []
        if (existing.length < 5) wordIndex.current.set(w, [...existing, sourceLine])
      })
    }
    setCurrentLine(msg.line_next || '')
  }, [])

  const ws = useWebSocket({ url: wssUrl, targetLang, onMessage: handleMessage })
  const audio = useAudioCapture({ chunkMs: 200, onChunk: ws.sendChunk, onError: setError })

  // Show share hint for 10 s the first time a sessionId appears, dismiss on copy
  const prevSessionIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (ws.sessionId && !prevSessionIdRef.current) {
      setShowShareHint(true)
      if (shareHintTimerRef.current) clearTimeout(shareHintTimerRef.current)
      shareHintTimerRef.current = setTimeout(() => setShowShareHint(false), 10000)
    }
    if (ws.sessionId) lastWssSessionIdRef.current = ws.sessionId
    prevSessionIdRef.current = ws.sessionId ?? null
  }, [ws.sessionId])

  const fetchSessions = useCallback(async () => {
    if (!workspaceSlug) return
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/sessions?workspace_slug=${workspaceSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json() as { sessions: SessionMeta[] }
      setSessions(data.sessions ?? [])
    } catch { /* silent */ }
  }, [workspaceSlug])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const fetchGlossary = useCallback(async () => {
    if (!workspaceSlug) return
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/glossary?workspace_slug=${workspaceSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json() as { terms: GlossaryItem[] }
      setGlossaryItems(data.terms)
    } catch { /* silent */ }
  }, [workspaceSlug])

  useEffect(() => { fetchGlossary() }, [fetchGlossary])

  // Apply workspace default language on first mount (before any session starts)
  useEffect(() => {
    const token = getToken()
    if (!token || !workspaceSlug) return
    fetch(`/api/workspace?workspace_slug=${workspaceSlug}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((d: { workspace: { default_lang: string } } | null) => {
        if (d?.workspace?.default_lang) setTargetLang(d.workspace.default_lang)
      })
      .catch(() => {})
  }, [workspaceSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch draft on mount — show recovery banner if stale session found
  useEffect(() => {
    const token = getToken()
    if (!token || !workspaceSlug) return
    fetch(`/api/sessions/draft?workspace_slug=${workspaceSlug}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((d: { draft: { lines: Array<{ text: string }>; started_at: number; target_lang: string } | null } | null) => {
        if (d?.draft && d.draft.lines.length > 0) setRecoveryDraft(d.draft)
      })
      .catch(() => {})
  }, [workspaceSlug])

  // Autosave every 30s while session is active
  useEffect(() => {
    if (!sessionActive || transcript.length === 0) return
    const id = setInterval(() => {
      const token = getToken()
      if (!token) return
      fetch('/api/sessions/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          wss_session_id: ws.sessionId ?? undefined,
          target_lang: targetLang,
          started_at: Math.floor(sessionStartRef.current / 1000),
          lines: transcript.map(l => ({ text: l.text })),
        }),
      }).catch(() => {})
    }, 30_000)
    return () => clearInterval(id)
  }, [sessionActive, transcript, targetLang, ws.sessionId])

  // Immediate autosave on page hide/close — keepalive survives tab close
  useEffect(() => {
    const save = () => {
      if (!sessionActive || transcript.length === 0) return
      const token = getToken()
      if (!token) return
      fetch('/api/sessions/draft', {
        method: 'PUT',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          wss_session_id: ws.sessionId ?? undefined,
          target_lang: targetLang,
          started_at: Math.floor(sessionStartRef.current / 1000),
          lines: transcript.map(l => ({ text: l.text })),
        }),
      }).catch(() => {})
    }
    const onBeforeUnload = () => save()
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') save() }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [sessionActive, transcript, targetLang, ws.sessionId])

  // Poll comments so host sees viewer notes
  useEffect(() => {
    if (!ws.sessionId) return
    const fetchComments = () =>
      fetch(`/api/viewer/${ws.sessionId}/comments`)
        .then(r => r.ok ? r.json() : null)
        .then((d: { comments: (CommentItem & { line_index: number | null })[] } | null) => {
          if (d) setLineComments(buildCommentMap(d.comments))
        })
        .catch(() => {})
    fetchComments()
    commentPollRef.current = setInterval(fetchComments, 10_000)
    return () => { if (commentPollRef.current) clearInterval(commentPollRef.current) }
  }, [ws.sessionId])

  const handleSaveGlossaryWord = useCallback(async (word: string, note?: string) => {
    const token = getToken()
    if (!token || !workspaceSlug) return
    try {
      await fetch('/api/glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workspace_slug: workspaceSlug, term: word, note: note ?? null }),
      })
      await fetchGlossary()
    } catch { /* silent */ }
  }, [workspaceSlug, fetchGlossary])

  const handleAddGlossaryTerm = useCallback(async (term: string) => {
    const token = getToken()
    if (!token || !workspaceSlug) return
    try {
      await fetch('/api/glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workspace_slug: workspaceSlug, term, note: null }),
      })
      await fetchGlossary()
    } catch { /* silent */ }
  }, [workspaceSlug, fetchGlossary])

  const handlePatchGlossaryNote = useCallback(async (term: string, note: string | null) => {
    const token = getToken()
    if (!token || !workspaceSlug) return
    // Optimistic update
    setGlossaryItems(prev => prev.map(i => i.term === term ? { ...i, note } : i))
    try {
      await fetch('/api/glossary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workspace_slug: workspaceSlug, term, note }),
      })
    } catch { /* revert on error if needed, silent for now */ }
  }, [workspaceSlug])

  const handleDeleteGlossaryTerm = useCallback(async (term: string) => {
    const token = getToken()
    if (!token || !workspaceSlug) return
    try {
      await fetch(`/api/glossary/${encodeURIComponent(term)}?workspace_slug=${workspaceSlug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setGlossaryItems(prev => prev.filter(i => i.term !== term))
    } catch { /* silent */ }
  }, [workspaceSlug])

  const openSession = useCallback(async (id: number) => {
    const token = getToken()
    if (!token) return
    setSessionDetailLoading(true)
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json() as SessionDetail
      setViewingSession(data)
      setArchivedComments(buildCommentMap(data.comments ?? []))
      setArchivedViewMode(data.session.ai_formatted_text ? 'ai' : 'raw')
    } catch { /* silent */ }
    finally { setSessionDetailLoading(false) }
  }, [])

  const patchSessionTitle = useCallback(async (id: number, title: string) => {
    const token = getToken()
    if (!token) return
    const trimmed = title.trim()
    try {
      await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: trimmed || null }),
      })
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: trimmed || undefined } : s))
      setViewingSession(prev => prev ? { ...prev, session: { ...prev.session, title: trimmed || null } } : prev)
      setTitleSaved(true)
      setTimeout(() => setTitleSaved(false), 1800)
    } catch { /* silent */ }
  }, [])

  const generateShareLink = useCallback(async (sessionId: number, expiresInHours?: number | null) => {
    const token = getToken()
    if (!token) return
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ session_id: sessionId, ...(expiresInHours != null ? { expires_in_hours: expiresInHours } : {}) }),
    })
    if (!res.ok) return
    const data = await res.json() as { token: string }
    setViewingSession(prev => prev ? { ...prev, session: { ...prev.session, share_token: data.token } } : prev)
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, share_token: data.token } : s))
    setSharePending(false)
  }, [])

  const handleCopyShareUrl = useCallback((token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${token}`)
      .then(() => { setShareCopied(true); setTimeout(() => setShareCopied(false), 2400) })
  }, [])

  const saveSession = useCallback(async (
    lines: { text: string; time: Date }[],
    formatted: string | undefined,
    startedAt: number,
    highlightItems: HighlightItem[],
    speakerData?: { assignments: LineAssignment[]; profiles: Map<string, SpeakerProfile> }
  ) => {
    if (!workspaceSlug || lines.length === 0) { setSaveStatus('idle'); return }
    const token = getToken()
    if (!token) { setSaveStatus('idle'); return }
    try {
      const res = await fetch('/api/sessions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          workspace_slug: workspaceSlug,
          target_lang: targetLang,
          started_at: startedAt,
          ended_at: Date.now(),
          transcript_lines: lines.map((l, i) => {
            const a = speakerData?.assignments[i]
            return {
              index: i,
              text: l.text,
              offset_ms: startedAt > 0 ? l.time.getTime() - startedAt : null,
              // Phase 1 convention: end_ms = next segment's start offset (approximate).
              // Last segment → null (session end is unknown at save time).
              // Future pipeline jobs (online diarization, refinement) will supply exact VAD boundaries.
              end_ms: startedAt > 0 && i < lines.length - 1 ? lines[i + 1].time.getTime() - startedAt : null,
              speaker_id: a?.speakerId ?? null,
              speaker_confidence: a?.state === 'confirmed' ? 1.0 : a?.state === 'tentative' ? 0.6 : null,
              speaker_state: a?.state ?? null,
              speaker_source: a?.source ?? null,
            }
          }),
          ai_formatted_text: formatted ?? null,
          wss_session_id: lastWssSessionIdRef.current || undefined,
          highlights: highlightItems.map(h => ({ line_index: h.line_index, text: h.text, category: h.category })),
          speakers: speakerData
            ? [...speakerData.profiles.entries()].map(([id, p]) => ({
                id,
                label: p.label,
                color: p.color,
                source: p.is_user_edited ? 'manual' : 'heuristic',
                is_user_edited: p.is_user_edited ?? false,
              }))
            : [],
        }),
      })
      fetchSessions()
      // Clear draft now that session is saved
      fetch('/api/sessions/draft', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
      if (res.ok) {
        const { session_id } = await res.json() as { session_id: number }
        // Generate AI title from first 10 lines, then patch session
        try {
          const titleRes = await fetch('/api/ai/title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lines: lines.slice(0, 10).map(l => l.text) }),
          })
          if (titleRes.ok) {
            const { title } = await titleRes.json() as { title: string }
            if (title) {
              await fetch(`/api/sessions/${session_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ title }),
              })
              fetchSessions()
            }
          }
        } catch { /* silent */ }
      }
      setSaveStatus('saved')
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current)
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 1800)
    } catch {
      setSaveStatus('error')
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current)
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [workspaceSlug, targetLang, fetchSessions])

  const handleRestoreDraft = useCallback(() => {
    if (!recoveryDraft) return
    setTranscript(recoveryDraft.lines.map(l => ({ text: l.text, time: new Date(recoveryDraft.started_at * 1000) })))
    setTargetLang(recoveryDraft.target_lang)
    setRecoveryDraft(null)
  }, [recoveryDraft])

  const handleDiscardDraft = useCallback(() => {
    setRecoveryDraft(null)
    const token = getToken()
    if (!token) return
    fetch('/api/sessions/draft', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }, [])

  const handleLineEdit = useCallback((index: number, text: string) => {
    setTranscript(prev => prev.map((l, i) => i === index ? { ...l, text } : l))
    if (!ws.sessionId) return
    const token = getToken()
    if (!token) return
    fetch(`/api/viewer/${ws.sessionId}/edits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ line_index: index, text }),
    }).catch(() => {})
  }, [ws.sessionId])

  const handleAddHighlight = useCallback((text: string, lineIndex: number | null, category: HighlightCategory | null) => {
    setHighlights(prev => [...prev, { id: Date.now(), line_index: lineIndex, text, category }])
  }, [])

  const handleRemoveHighlight = useCallback((id: number) => {
    setHighlights(prev => prev.filter(h => h.id !== id))
  }, [])

  const handleSpeakerRename = useCallback((speakerId: string, label: string) => {
    const existing = speakerProfilesRef.current.get(speakerId)
    if (!existing) return
    speakerProfilesRef.current.set(speakerId, { ...existing, label, is_user_edited: true })
    setSpeakerLabels(new Map(speakerProfilesRef.current))
    // Confirm all lines for this speaker (user made an explicit choice)
    setSpeakerAssignments(prev => {
      const next = prev.map(a =>
        a.speakerId === speakerId ? { ...a, state: 'confirmed' as SpeakerState, source: 'manual' as SpeakerSource } : a
      )
      speakerAssignmentsRef.current = next
      return next
    })
  }, [])

  const handleSpeakerSetSame = useCallback((lineIndex: number) => {
    setSpeakerAssignments(prev => {
      if (lineIndex <= 0 || lineIndex >= prev.length) return prev
      const prevA = prev[lineIndex - 1]
      if (!prevA?.speakerId) return prev
      const next = prev.map((a, i) =>
        i === lineIndex
          ? { speakerId: prevA.speakerId, state: 'confirmed' as SpeakerState, source: 'manual' as SpeakerSource }
          : a
      )
      speakerAssignmentsRef.current = next
      return next
    })
  }, [])

  const handleDeleteComment = useCallback(async (commentId: number, lineIndex: number) => {
    if (!ws.sessionId) return
    // Optimistic remove
    setLineComments(prev => {
      const next = new Map(prev)
      const arr = (next.get(lineIndex) ?? []).filter(c => c.id !== commentId)
      if (arr.length === 0) next.delete(lineIndex)
      else next.set(lineIndex, arr)
      return next
    })
    try {
      await fetch(`/api/viewer/${ws.sessionId}/comments/${commentId}`, { method: 'DELETE' })
    } catch { /* silent — already removed from UI */ }
  }, [ws.sessionId])

  const handleEditComment = useCallback(async (commentId: number, lineIndex: number, newBody: string) => {
    if (!ws.sessionId || !newBody.trim()) return
    // Optimistic update
    setLineComments(prev => {
      const next = new Map(prev)
      const arr = (next.get(lineIndex) ?? []).map(c => c.id === commentId ? { ...c, body: newBody.trim() } : c)
      next.set(lineIndex, arr)
      return next
    })
    try {
      await fetch(`/api/viewer/${ws.sessionId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newBody.trim() }),
      })
    } catch { /* silent — already updated in UI */ }
  }, [ws.sessionId])

  const handleAddComment = useCallback(async (lineIndex: number, body: string) => {
    if (!body.trim() || !ws.sessionId) return
    setCommentSubmitting(true)
    const name = commentAuthor.trim() || 'Anonymous'
    localStorage.setItem('isol_commenter_name', name)
    setCommentAuthor(name)
    try {
      const res = await fetch(`/api/viewer/${ws.sessionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: name, body: body.trim(), line_index: lineIndex }),
      })
      if (res.ok) {
        const c = await res.json() as { id: number; line_index: number | null; author: string; body: string; created_at: number }
        setLineComments(prev => {
          const next = new Map(prev)
          const idx = c.line_index ?? -1
          next.set(idx, [...(next.get(idx) ?? []), { id: c.id, author: c.author, body: c.body, created_at: c.created_at }])
          return next
        })
      }
    } finally { setCommentSubmitting(false) }
  }, [ws.sessionId, commentAuthor])

  const handleStart = useCallback(async () => {
    setError(''); setCurrentLine(''); setTranscript([]); setHighlights([])
    setAiFormatted(undefined); setAiFormattedAt(undefined); setAiLoading(false)
    setAiNotes(undefined); setAiNotesLoading(false); setViewMode('raw')
    hasAutoSwitchedRef.current = false
    wordIndex.current.clear()
    sessionStartRef.current = Date.now()
    // Reset speaker state for new session
    setSpeakerAssignments([])
    setSpeakerLabels(new Map())
    speakerAssignmentsRef.current = []
    speakerProfilesRef.current = new Map()
    heuristicProcRef.current = 0
    currentTurnSpeakerRef.current = null
    lastLineFinalRef.current = ''
    ws.open()
    const started = await audio.start(audioSource)
    if (!started) { ws.close(); return }
    setSessionActive(true)
  }, [ws, audio, audioSource])

  const handleStop = useCallback(() => {
    audio.stop(); ws.close()
    setSessionActive(false); setCurrentLine('')
    setSaveStatus('saving')
    if (shareHintTimerRef.current) clearTimeout(shareHintTimerRef.current)
    setShowShareHint(false)
    prevSessionIdRef.current = null
    if (commentPollRef.current) { clearInterval(commentPollRef.current); commentPollRef.current = null }
    setOpenCommentLine(null)
    // Fire-and-forget session save
    setTranscript(prev => {
      saveSession(prev, aiFormatted, sessionStartRef.current, highlights, {
        assignments: speakerAssignmentsRef.current,
        profiles: speakerProfilesRef.current,
      })
      return prev
    })
  }, [audio, ws, saveSession, aiFormatted, highlights])

  const handleLogout = useCallback(() => {
    handleStop(); clearSession()
    navigate('/login', { replace: true })
  }, [handleStop, navigate])

  const handleWordClick = useCallback((word: string, sentence: string) => {
    setGlossaryWord({ word: word.toLowerCase(), sentence })
    setShowGlossaryList(false)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if ((e.target as HTMLElement).isContentEditable) return

      if (e.code === 'Space' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        if (sessionActive) {
          handleStop()
        } else {
          handleStart()
        }
        return
      }
      if (e.code === 'Escape') {
        if (pip.isOpen) pip.close()
        if (glossaryWord) setGlossaryWord(null)
        if (showGlossaryList) setShowGlossaryList(false)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyE') {
        e.preventDefault()
        if (transcript.length > 0) setShowModal(true)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyG') {
        e.preventDefault()
        setShowGlossaryList(v => !v)
        return
      }
      if (e.key === '1') { setViewMode('raw'); return }
      if (e.key === '2') { setViewMode('ai'); return }
      if (e.key === '3') { setViewMode('notes'); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sessionActive, pip.isOpen, pip.close, transcript.length, handleStop, handleStart, glossaryWord, showGlossaryList])

  if (!session) { navigate('/login', { replace: true }); return null }

  const isUnsupported = audioSource === 'display' && !('getDisplayMedia' in navigator.mediaDevices)
  const targetLangLabel = LANGUAGES.find(l => l.code === targetLang)
  const isActive = audio.state === 'active' && ws.state === 'connected'
  const canAi = !!(aiFormatted)

  const statusColor = ws.state === 'error' || audio.state === 'error' ? 'var(--red)'
    : ws.state === 'reconnecting' ? 'var(--orange)'
    : isActive ? 'var(--live)'
    : 'rgba(0,0,0,0.12)'

  const statusLabel = ws.state === 'error' || audio.state === 'error' ? 'Error'
    : ws.state === 'reconnecting' ? 'Reconnecting…'
    : ws.state === 'connecting' ? 'Connecting…'
    : audio.state === 'requesting' ? 'Requesting…'
    : isActive ? 'Live'
    : 'Ready'

  const shareUrl = ws.sessionId
    ? `${window.location.origin}/join/${workspaceSlug}/${ws.sessionId}`
    : ''

  const roomCode = ws.sessionId
    ? (() => {
        const raw = ws.sessionId.replace(/-/g, '').slice(-8).toUpperCase()
        return `${raw.slice(0, 4)}-${raw.slice(4)}`
      })()
    : ''

  const handleCopyRoom = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setRoomCopied(true)
      setTimeout(() => setRoomCopied(false), 2400)
      // Dismiss hint once user has copied
      if (shareHintTimerRef.current) clearTimeout(shareHintTimerRef.current)
      setShowShareHint(false)
    })
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg)',
      isolation: 'isolate',
    }}>

      {/* ━━ SYSTEM BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="header-glass" style={{
        height: 'var(--header-h)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="logo-mark" style={{ width: 24, height: 24 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>i</span>
          </div>
          {!sessionActive
            ? <HeroQuotes fontSize={12} />
            : <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL Studio</span>
          }
        </div>

        {workspaceSlug && (
          <>
            <span style={{ color: 'var(--divider)', fontSize: 14 }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{workspaceSlug}</span>
          </>
        )}

        {/* Session metadata strip */}
        {sessionActive && (
          <>
            <span style={{ color: 'var(--divider)', fontSize: 14, marginLeft: 4 }}>·</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: statusColor, flexShrink: 0,
                transition: 'background 0.3s',
                animation: isActive ? 'livePulse 2s ease-in-out infinite' : undefined,
              }} />
              <span style={{ color: isActive ? 'var(--live)' : 'var(--text-muted)', fontWeight: 600 }}>
                {statusLabel}
              </span>
            </div>
            {ws.viewerCount > 0 && (
              <>
                <span style={{ color: 'var(--divider)', fontSize: 14 }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>👁</span>
                  <span style={{ fontWeight: 600 }}>{ws.viewerCount}</span>
                  <span style={{ color: 'var(--text-muted)' }}>viewer{ws.viewerCount !== 1 ? 's' : ''}</span>
                </span>
              </>
            )}
            {targetLangLabel && (
              <>
                <span style={{ color: 'var(--divider)', fontSize: 14 }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {targetLangLabel.flag} {targetLangLabel.label}
                </span>
              </>
            )}
            {roomCode && (
              <>
                <span style={{ color: 'var(--divider)', fontSize: 14 }}>·</span>
                <span style={{
                  fontFamily: 'monospace', fontSize: 11,
                  letterSpacing: '0.07em', color: 'var(--text-muted)',
                }}>{roomCode}</span>
                <button
                  onClick={handleCopyRoom}
                  style={{
                    background: 'none', border: 'none',
                    color: roomCopied ? 'var(--live)' : 'var(--text-muted)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    padding: '1px 6px', borderRadius: 4,
                    transition: 'color 0.2s',
                  }}
                >
                  {roomCopied ? '✓' : 'Copy'}
                </button>
              </>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />

        <Link
          to={`/${workspaceSlug}/settings`}
          title="Settings"
          className="settings-btn"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </Link>
        <span style={{
          fontSize: 11, color: 'var(--text-muted)',
          maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{session.email}</span>
        <button onClick={handleLogout} className="btn-icon" style={{ fontSize: 11, padding: '4px 10px', height: 28 }}>
          Sign out
        </button>
      </header>

      {/* Draft recovery banner */}
      {recoveryDraft && !sessionActive && (
        <RecoveryBanner
          draft={recoveryDraft}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      {/* ━━ BODY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT RAIL ──────────────────────────────────────── */}
        <aside className="workspace-rail" style={{ padding: '20px 14px' }}>

          {/* CAPTURE */}
          <div>
            <p className="rail-label">Capture</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`source-btn${audioSource === 'display' ? ' active' : ''}`}
                onClick={() => !sessionActive && setAudioSource('display')}
                disabled={sessionActive}
                style={{ opacity: sessionActive ? 0.4 : 1 }}
              >
                <span style={{ fontSize: 14 }}>🖥</span>
                <span>Screen</span>
              </button>
              <button
                className={`source-btn${audioSource === 'microphone' ? ' active' : ''}`}
                onClick={() => !sessionActive && setAudioSource('microphone')}
                disabled={sessionActive}
                style={{ opacity: sessionActive ? 0.4 : 1 }}
              >
                <span style={{ fontSize: 14 }}>🎤</span>
                <span>Mic</span>
              </button>
            </div>
            {isUnsupported && (
              <p style={{ fontSize: 11, color: 'var(--orange)', lineHeight: 1.5, marginTop: 8 }}>
                Screen audio requires Chrome or Edge.
              </p>
            )}
          </div>

          <div className="rail-divider" />

          {/* LANGUAGE */}
          <div>
            <p className="rail-label">Language</p>
            <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={sessionActive} />
          </div>

          <div className="rail-divider" />

          {/* SESSION */}
          <div>
            <p className="rail-label">Session</p>
            {!sessionActive ? (
              <button
                onClick={handleStart}
                disabled={isUnsupported}
                className="btn-primary"
              >
                Start session →
              </button>
            ) : (
              <button onClick={handleStop} className="btn-stop">
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: 'var(--red)', flexShrink: 0, marginRight: 4,
                }} />
                Stop session
              </button>
            )}
          </div>

          {/* SHARE — shown only when session active and sessionId known */}
          {sessionActive && ws.sessionId && (
            <>
              <div className="rail-divider" />
              <div>
                <p className="rail-label">Share</p>

                {/* Room code */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--live)',
                    animation: 'roomPulse 2s ease-in-out infinite',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                    letterSpacing: '0.08em', color: 'var(--text)',
                  }}>{roomCode}</span>
                </div>

                {/* URL input + copy button */}
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <input
                    className="input-field"
                    value={shareUrl}
                    readOnly
                    onFocus={e => e.target.select()}
                    style={{ fontSize: 11, paddingRight: 56, cursor: 'text' }}
                  />
                  <button
                    onClick={handleCopyRoom}
                    style={{
                      position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                      background: roomCopied ? 'rgba(34,197,94,0.10)' : 'rgba(99,102,241,0.08)',
                      border: `1px solid ${roomCopied ? 'rgba(34,197,94,0.20)' : 'rgba(99,102,241,0.20)'}`,
                      color: roomCopied ? 'var(--live)' : 'var(--accent)',
                      borderRadius: 5, padding: '3px 9px',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {roomCopied ? '✓' : 'Copy'}
                  </button>
                </div>

                {/* Hint — shown only the first 10 s after sessionId appears, dismissed on copy */}
                {showShareHint && (
                  <StickyNote>
                    Share this link with participants — they'll join the live room and see captions in their language.
                  </StickyNote>
                )}
              </div>
            </>
          )}

          <div style={{ flex: 1 }} />

          {/* Compact mode toggle */}
          {sessionActive && (
            <button
              onClick={() => pip.isOpen ? pip.close() : pip.open()}
              className="btn-icon"
              style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
              title={pip.isSupported ? undefined : 'Requires Chrome 116+'}
            >
              {pip.isOpen ? '⊞ Show document' : '⧉ Picture-in-Picture'}
            </button>
          )}

          {/* Recent sessions — shown when not in session */}
          {!sessionActive && sessions.length > 0 && (
            <>
              <div className="rail-divider" />
              <div>
                <p className="rail-label">Recent sessions</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {sessions.slice(0, 4).map(s => {
                    const date = new Date(s.started_at)
                    const lang = LANGUAGES.find(l => l.code === s.target_lang)
                    return (
                      <button
                        key={s.id}
                        onClick={() => openSession(s.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          padding: '7px 10px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                          width: '100%',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center' }}>
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.title ?? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                          {s.share_token && (
                            <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4, flexShrink: 0 }}>🔗</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {lang ? `${lang.flag} ${lang.label}` : s.target_lang} · {s.line_count} lines
                        </div>
                      </button>
                    )
                  })}
                </div>
                <Link
                  to={`/${workspaceSlug}/sessions`}
                  style={{
                    display: 'block', marginTop: 8,
                    fontSize: 11, color: 'var(--accent)', textDecoration: 'none',
                    textAlign: 'right', letterSpacing: '0.01em',
                  }}
                >
                  All sessions →
                </Link>
              </div>
            </>
          )}

        </aside>

        {/* ── MAIN CANVAS ────────────────────────────────────── */}
        <main className="workspace-canvas">

          {/* Save status banner */}
          {saveStatus !== 'idle' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 20px',
              background: saveStatus === 'error' ? 'rgba(239,68,68,0.07)' : 'rgba(99,102,241,0.06)',
              borderBottom: `1px solid ${saveStatus === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.12)'}`,
              flexShrink: 0,
              animation: saveStatus === 'saved' ? 'quoteFlipOut 0.35s ease-out 1.4s forwards' : undefined,
            }}>
              {saveStatus === 'saving' && (
                <span style={{
                  width: 10, height: 10, flexShrink: 0,
                  border: '1.5px solid rgba(99,102,241,0.25)',
                  borderTopColor: 'var(--accent)',
                  borderRadius: '50%',
                  animation: 'spin 0.9s linear infinite',
                  display: 'inline-block',
                }} />
              )}
              {saveStatus === 'saved' && (
                <span style={{ color: 'var(--live)', fontSize: 13, lineHeight: 1 }}>✓</span>
              )}
              {saveStatus === 'error' && (
                <span style={{ color: 'var(--red)', fontSize: 13, lineHeight: 1 }}>!</span>
              )}
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: saveStatus === 'error' ? 'var(--red)' : saveStatus === 'saved' ? 'var(--text-dim)' : 'var(--accent)',
              }}>
                {saveStatus === 'saving' && 'Saving session…'}
                {saveStatus === 'saved' && 'Session saved'}
                {saveStatus === 'error' && 'Could not save session'}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 24px 0', flexShrink: 0 }}>
              <ErrorBanner message={error} onDismiss={() => setError('')} />
            </div>
          )}

          {/* Canvas content */}
          {true && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <DocumentView
                transcript={transcript}
                currentLine={currentLine}
                isActive={isActive}
                targetLang={targetLangLabel ? `${targetLangLabel.flag} ${targetLangLabel.label}` : targetLang}
                aiFormatted={aiFormatted}
                aiFormattedAt={aiFormattedAt}
                aiLoading={aiLoading}
                aiNotes={aiNotes}
                aiNotesLoading={aiNotesLoading}
                viewMode={viewMode}
                onViewModeChange={(mode) => {
                  setViewMode(mode)
                  if (mode === 'notes') { setGlossaryWord(null); setShowGlossaryList(false) }
                }}
                onWordClick={handleWordClick}
                isEditable={sessionActive}
                onLineEdit={handleLineEdit}
                lineComments={lineComments}
                openCommentLine={openCommentLine}
                onOpenCommentLine={setOpenCommentLine}
                commentAuthor={commentAuthor}
                onCommentAuthorChange={(n) => { setCommentAuthor(n); localStorage.setItem('isol_commenter_name', n) }}
                onAddComment={handleAddComment}
                commentSubmitting={commentSubmitting}
                isHost={true}
                onDeleteComment={handleDeleteComment}
                onEditComment={handleEditComment}
                sessionStartMs={sessionStartRef.current > 0 ? sessionStartRef.current : undefined}
                highlights={highlights}
                onAddHighlight={handleAddHighlight}
                onRemoveHighlight={handleRemoveHighlight}
              />
            </div>
          )}

          {/* ── FLOATING TOOLBAR ────────────────────────────── */}
          <div className="workspace-toolbar">

            {/* Glossary */}
            <button
              onClick={() => {
                if (glossaryWord) { setGlossaryWord(null); setShowGlossaryList(false) }
                else if (showGlossaryList) { setShowGlossaryList(false) }
                else { setShowGlossaryList(true); setShowHighlights(false) }
              }}
              className={`toolbar-btn${(glossaryWord || showGlossaryList) ? ' active' : ''}`}
              title={glossaryWord ? undefined : 'Open workspace glossary'}
            >
              <span style={{ fontSize: 11 }}>◉</span>
              Glossary{glossaryItems.length > 0 && ` (${glossaryItems.length})`}
            </button>

            <div className="toolbar-sep" />

            {/* Highlights */}
            <button
              onClick={() => {
                if (showHighlights) { setShowHighlights(false) }
                else { setShowHighlights(true); setGlossaryWord(null); setShowGlossaryList(false) }
              }}
              className={`toolbar-btn${showHighlights ? ' active' : ''}`}
            >
              <span>◈</span>
              Highlights{highlights.length > 0 && ` (${highlights.length})`}
            </button>

            <div className="toolbar-sep" />

            {/* Export */}
            <button
              onClick={() => transcript.length > 0 && setShowModal(true)}
              className="toolbar-btn"
              disabled={transcript.length === 0}
            >
              <span>↑</span>
              Export
            </button>

            <div className="toolbar-sep" />

            {/* Share */}
            <button
              onClick={handleCopyRoom}
              className={`toolbar-btn${roomCopied ? ' live-active' : ''}`}
              disabled={!ws.sessionId}
              title={ws.sessionId ? undefined : 'Start a session to get a share link'}
            >
              {roomCopied ? <><span>✓</span> Copied</> : <><span>↗</span> Share</>}
            </button>

          </div>

        </main>

      </div>

      {/* ━━ MOBILE BOTTOM BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Mobile = read-only: audio capture stops in background tabs.
          Sessions and glossary are accessible; hosting is desktop-only. */}
      <div className="mobile-bottom-bar" style={{ gap: 10 }}>
        <button
          onClick={() => setShowGlossaryList(true)}
          className="btn-icon"
          style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
        >
          ◉ Glossary{glossaryItems.length > 0 && ` (${glossaryItems.length})`}
        </button>
        <button
          onClick={() => navigate(`/${workspaceSlug}/sessions`)}
          className="btn-primary"
          style={{ flex: 1, fontSize: 13 }}
        >
          Sessions →
        </button>
      </div>

      {/* ━━ OVERLAYS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {pip.pipWindow && createPortal(
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
          <SubtitleView
            current={currentLine}
            previous={transcript[transcript.length - 1]?.text ?? ''}
            compact
          />
        </div>,
        pip.pipWindow.document.body
      )}

      {showModal && (
        <TranscriptModal
          transcript={transcript}
          targetLang={targetLang}
          aiFormatted={aiFormatted}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Session detail modal */}
      {(viewingSession || sessionDetailLoading) && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={e => { if (e.target === e.currentTarget) { setViewingSession(null); setArchivedComments(new Map()); setSharePending(false); setArchivedViewMode('raw') } }}
        >
          <div style={{
            width: '100%', maxWidth: 700,
            background: 'var(--canvas)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex', flexDirection: 'column',
            maxHeight: '85vh', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '18px 24px',
              borderBottom: '1px solid var(--divider)',
              flexShrink: 0,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Editable session title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <input
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onFocus={e => (e.target.style.borderBottomColor = 'var(--border-accent)')}
                    onBlur={e => {
                      e.target.style.borderBottomColor = 'transparent'
                      if (viewingSession) patchSessionTitle(viewingSession.session.id as number, editingTitle)
                    }}
                    onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    placeholder="Add a title…"
                    style={{
                      fontSize: 15, fontWeight: 700,
                      background: 'none', border: 'none',
                      borderBottom: '1px solid transparent',
                      padding: '1px 0',
                      color: 'var(--text)', fontFamily: 'inherit',
                      flex: 1, cursor: 'text',
                      transition: 'border-color 0.15s',
                      outline: 'none',
                    }}
                  />
                  {titleSaved && (
                    <span style={{ fontSize: 11, color: 'var(--live)', fontWeight: 600, flexShrink: 0 }}>✓ Saved</span>
                  )}
                </div>
                {viewingSession && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(viewingSession.session.started_at as number).toLocaleString()} ·{' '}
                    {viewingSession.lines.length} lines
                  </p>
                )}
              </div>
              <button
                onClick={() => { setViewingSession(null); setArchivedComments(new Map()); setSharePending(false); setArchivedViewMode('raw') }}
                style={{ background: 'none', color: 'var(--text-muted)', fontSize: 20, padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}
              >×</button>
            </div>
            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {sessionDetailLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  Loading…
                </div>
              ) : viewingSession ? (
                <DocumentView
                  transcript={viewingSession.lines.map(l => ({ text: l.text, time: new Date(viewingSession.session.started_at as number) }))}
                  currentLine=""
                  isActive={false}
                  targetLang={viewingSession.session.target_lang as string}
                  hideBanner={true}
                  aiFormatted={viewingSession.session.ai_formatted_text as string | undefined}
                  aiFormattedAt={undefined}
                  aiLoading={false}
                  aiNotes={undefined}
                  aiNotesLoading={false}
                  viewMode={archivedViewMode}
                  onViewModeChange={setArchivedViewMode}
                  isEditable={false}
                  lineComments={archivedComments}
                  openCommentLine={null}
                  onOpenCommentLine={() => {}}
                  commentAuthor={commentAuthor}
                  onCommentAuthorChange={() => {}}
                  onAddComment={async () => {}}
                  commentSubmitting={false}
                  isHost={false}
                  highlights={viewingSession.highlights ?? []}
                />
              ) : null}
            </div>

            {/* Share footer */}
            {viewingSession && (
              <div style={{
                borderTop: '1px solid var(--divider)',
                padding: '14px 24px',
                flexShrink: 0,
              }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10,
                }}>Share</p>
                {viewingSession.session.share_token ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="input-field"
                      readOnly
                      value={`${window.location.origin}/share/${viewingSession.session.share_token as string}`}
                      onFocus={e => e.target.select()}
                      style={{ fontSize: 12, flex: 1 }}
                    />
                    <button
                      onClick={() => handleCopyShareUrl(viewingSession.session.share_token as string)}
                      className="btn-icon"
                      style={{
                        fontSize: 12, flexShrink: 0,
                        color: shareCopied ? 'var(--live)' : undefined,
                      }}
                    >
                      {shareCopied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                ) : sharePending ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      className="input-field"
                      value={shareDurationHours ?? ''}
                      onChange={e => setShareDurationHours(e.target.value === '' ? null : Number(e.target.value))}
                      style={{ fontSize: 12, flex: 1, height: 32 }}
                    >
                      <option value="">No expiry</option>
                      <option value="24">24 hours</option>
                      <option value="168">7 days</option>
                      <option value="720">30 days</option>
                    </select>
                    <button
                      onClick={() => generateShareLink(viewingSession.session.id as number, shareDurationHours)}
                      className="btn-icon"
                      style={{ fontSize: 12, flexShrink: 0, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}
                    >
                      Generate
                    </button>
                    <button
                      onClick={() => setSharePending(false)}
                      className="btn-icon"
                      style={{ fontSize: 12, flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShareDurationHours(null); setSharePending(true) }}
                    className="btn-icon"
                    style={{ fontSize: 12 }}
                  >
                    ↗ Create share link
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Glossary drawer — word lookup */}
      {glossaryWord && (
        <>
          <div className="glossary-backdrop" onClick={() => setGlossaryWord(null)} />
          <div className="glossary-drawer">
            <GlossaryPanel
              word={glossaryWord.word}
              sentences={wordIndex.current.get(glossaryWord.word) ?? [glossaryWord.sentence]}
              currentSentence={glossaryWord.sentence}
              targetLang={targetLang}
              onClose={() => setGlossaryWord(null)}
              savedNote={glossaryNotesMap.get(glossaryWord.word) ?? null}
              isSaved={glossaryTermsSet.has(glossaryWord.word)}
              onSave={handleSaveGlossaryWord}
              savedCount={glossaryItems.length}
              onShowAll={() => { setGlossaryWord(null); setShowGlossaryList(true) }}
            />
          </div>
        </>
      )}

      {/* Glossary drawer — workspace list */}
      {showGlossaryList && !glossaryWord && (
        <>
          <div className="glossary-backdrop" onClick={() => setShowGlossaryList(false)} />
          <div className="glossary-drawer">
            <GlossaryListPanel
              items={[...glossaryItems].sort((a, b) => a.term.localeCompare(b.term))}
              onDelete={handleDeleteGlossaryTerm}
              onPatchNote={handlePatchGlossaryNote}
              onClose={() => setShowGlossaryList(false)}
              onWordClick={(term) => {
                setShowGlossaryList(false)
                const sentences = wordIndex.current.get(term) ?? []
                setGlossaryWord({ word: term, sentence: sentences[sentences.length - 1] ?? '' })
              }}
              onAdd={handleAddGlossaryTerm}
            />
          </div>
        </>
      )}

      {/* Highlights drawer */}
      {showHighlights && (
        <>
          <div className="glossary-backdrop" onClick={() => setShowHighlights(false)} />
          <div className="glossary-drawer">
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--divider)', flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Highlights</span>
              <button
                onClick={() => setShowHighlights(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', lineHeight: 1 }}
              >×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <HighlightsSection
                highlights={highlights}
                onRemove={handleRemoveHighlight}
                onJumpTo={() => setShowHighlights(false)}
              />
            </div>
          </div>
        </>
      )}

      {showOnboarding && workspaceSlug && (
        <OnboardingModal
          workspaceSlug={workspaceSlug}
          onDone={() => setShowOnboarding(false)}
        />
      )}
    </div>
  )
}
