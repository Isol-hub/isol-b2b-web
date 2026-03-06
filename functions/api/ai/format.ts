interface Env {
  ANTHROPIC_API_KEY: string
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { lines } = await request.json<{ lines: string[] }>()
    if (!lines?.length) {
      return Response.json({ error: 'No lines provided' }, { status: 400, headers: CORS })
    }

    const rawText = lines.join(' ')

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
            content: `You are formatting a live speech transcript captured in real-time without punctuation or structure.

Please:
1. Add proper punctuation (commas, periods, question marks, exclamation marks)
2. Capitalize sentence starts and proper nouns
3. Add paragraph breaks where topic or speaker shifts
4. Add a brief title at the very start (## format)
5. Add section subtitles where topics shift (### format)
6. Keep ALL the content — do not summarize, shorten or remove any words
7. Return ONLY the formatted text, no explanations, no code blocks

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
