interface Env {
  ANTHROPIC_API_KEY: string
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { word, sentence } = await request.json<{ word: string; sentence: string }>()
    if (!word || !sentence) {
      return Response.json({ error: 'word and sentence required' }, { status: 400, headers: CORS })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: `The word "${word}" appeared in this spoken context: "${sentence}"

Respond ONLY with a valid JSON object (no markdown, no code blocks) with these exact fields:
{
  "definition": "brief dictionary definition, 1-2 sentences",
  "context": "what this word means specifically in this sentence and why it was used, 1-2 sentences",
  "register": "one of: formal / informal / technical / neutral"
}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      return Response.json({ error: 'AI definition failed' }, { status: 500, headers: CORS })
    }

    const data = await response.json<{ content: { type: string; text: string }[] }>()
    const text = data.content.find(c => c.type === 'text')?.text ?? '{}'

    let parsed: { definition: string; context: string; register: string }
    try {
      // Strip potential markdown code fences if the model ignores the instruction
      const clean = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { definition: text, context: '', register: 'neutral' }
    }

    return Response.json(parsed, { status: 200, headers: CORS })
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
