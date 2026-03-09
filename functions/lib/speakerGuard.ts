interface Env {
  DB: D1Database
}

/**
 * All the things an automated job might want to mutate for a speaker.
 *
 *   label / color      → fields in session_speakers
 *   attribution        → changing which speaker_id a transcript_line belongs to
 *   state_source       → updating speaker_state / speaker_source on transcript_lines
 *   confidence         → updating speaker_confidence on transcript_lines
 *
 * Any phase (heuristic, online, refinement, workspace_match) must declare
 * which mutation it intends. Rules are currently uniform across types,
 * but the parameter is reserved for per-type differentiation.
 */
export type MutationType =
  | 'label'        // rename label in session_speakers
  | 'color'        // change color in session_speakers
  | 'attribution'  // remap transcript_lines.speaker_id to a different speaker
  | 'state_source' // update speaker_state / speaker_source on transcript_lines
  | 'confidence'   // update speaker_confidence on transcript_lines

export interface GuardResult {
  allowed: boolean
  reason?: string
}

/**
 * canMutateSpeaker — single authority for all speaker mutation decisions.
 *
 * Invariants:
 *   1. source = 'manual' always wins. A human decision cannot be undone
 *      by any automated pipeline job.
 *   2. Once is_user_edited = 1, no automated job may mutate:
 *      - label or color in session_speakers
 *      - speaker_id (attribution) on any transcript_line of that speaker
 *      - speaker_state, speaker_source, speaker_confidence on those lines
 *   3. A speaker not yet in session_speakers has no restrictions.
 *
 * Every pipeline phase must call this before writing:
 *   heuristic, online diarization, post-session refinement, workspace_match.
 */
export async function canMutateSpeaker(
  env: Env,
  sessionId: number,
  speakerId: string,
  incomingSource: string,
  _mutationType: MutationType,
): Promise<GuardResult> {
  // Rule 1: manual source always overrides automation
  if (incomingSource === 'manual') return { allowed: true }

  const row = await env.DB.prepare(
    'SELECT is_user_edited FROM session_speakers WHERE session_id = ? AND speaker_id = ?'
  ).bind(sessionId, speakerId).first<{ is_user_edited: number }>()

  // Rule 3: unknown speaker — no restriction yet
  if (!row) return { allowed: true }

  // Rule 2: user has locked this speaker — block all automation
  if (row.is_user_edited === 1) {
    return {
      allowed: false,
      reason: `speaker ${speakerId} is user-edited; automated ${_mutationType} blocked`,
    }
  }

  return { allowed: true }
}

/**
 * @deprecated Use canMutateSpeaker with an explicit MutationType.
 * Kept for backward compatibility until pipeline workers migrate.
 */
export async function canOverrideSpeaker(
  env: Env,
  sessionId: number,
  speakerId: string,
  incomingSource: string,
): Promise<boolean> {
  const result = await canMutateSpeaker(env, sessionId, speakerId, incomingSource, 'attribution')
  return result.allowed
}
