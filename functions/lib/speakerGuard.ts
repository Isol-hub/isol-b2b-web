interface Env {
  DB: D1Database
}

/**
 * Returns true if an automated system may overwrite the speaker assignment
 * for (sessionId, speakerId). Manual overrides (is_user_edited = 1) always win.
 * Only the 'manual' source may overwrite a manual override.
 */
export async function canOverrideSpeaker(
  env: Env,
  sessionId: number,
  speakerId: string,
  incomingSource: string,
): Promise<boolean> {
  if (incomingSource === 'manual') return true
  const row = await env.DB.prepare(
    'SELECT is_user_edited FROM session_speakers WHERE session_id = ? AND speaker_id = ?'
  ).bind(sessionId, speakerId).first()
  if (!row) return true          // no existing record → free to create
  return row.is_user_edited === 0
}
