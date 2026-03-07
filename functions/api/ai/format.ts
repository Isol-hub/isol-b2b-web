interface Env {
  ANTHROPIC_API_KEY: string
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', it: 'Italian', es: 'Spanish', fr: 'French', de: 'German',
  pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', ru: 'Russian', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi', tr: 'Turkish',
  sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', cs: 'Czech',
  ro: 'Romanian', hu: 'Hungarian', uk: 'Ukrainian', he: 'Hebrew', id: 'Indonesian',
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { lines, targetLang } = await request.json<{ lines: string[]; targetLang?: string }>()
    if (!lines?.length) {
      return Response.json({ error: 'No lines provided' }, { status: 400, headers: CORS })
    }

    const rawText = lines.join(' ')
    const langName = targetLang ? (LANG_NAMES[targetLang] ?? targetLang) : null
    const langInstruction = langName && langName !== 'English'
      ? `\nCRITICAL: The transcript is in ${langName}. Output the entire document in ${langName} — do not translate or switch to any other language.\n`
      : ''

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `You are an expert editorial assistant. Below is a raw live speech transcript — unpunctuated, unstructured, captured in real time.${langInstruction}
Transform it into a professionally formatted document while remaining 100% faithful to the speaker's exact words. Your job is editorial structure, not rewriting.

Rules (all mandatory):
1. Keep every single word from the original — do not add, remove, paraphrase, or substitute any content
2. Add proper punctuation: periods, commas, question marks, em-dashes, ellipses where natural
3. Capitalize sentence starts, proper nouns, and acronyms
4. Add a document title at the top (## Title — infer from content)
5. Add section headings where the topic clearly shifts (### Section)
6. Break into short, readable paragraphs (3–6 sentences each)
7. **Bold** key terms, names, decisions, or phrases that deserve emphasis — use sparingly (max 1–2 per paragraph)
8. When the speaker enumerates items naturally, format them as a bullet list (- item)
9. Preserve the speaker's voice, rhythm, and intent exactly
10. Return ONLY the formatted document — no preamble, no commentary, no code blocks

Raw transcript:
${rawText}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      return Response.json({ error: `Anthropic ${response.status}: ${err}` }, { status: 500, headers: CORS })
    }

    const data = await response.json<{ content: { type: string; text: string }[] }>()
    const formatted = data.content.find(c => c.type === 'text')?.text ?? rawText

    return Response.json({ formatted }, { status: 200, headers: CORS })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
