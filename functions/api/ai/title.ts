interface Env { ANTHROPIC_API_KEY: string }

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { lines } = await request.json<{ lines: string[] }>()
    if (!lines?.length) {
      return Response.json({ error: 'No lines provided' }, { status: 400, headers: CORS })
    }

    const rawText = lines.slice(0, 10).join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 32,
        messages: [
          {
            role: 'user',
            content: `Generate a concise 3-6 word title that describes the main topic of this speech transcript. Return ONLY the title — no quotes, no punctuation at the end, no commentary.\n\nTranscript:\n${rawText}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic title error:', err)
      return Response.json({ error: `Anthropic ${response.status}` }, { status: 500, headers: CORS })
    }

    const data = await response.json<{ content: { type: string; text: string }[] }>()
    const title = data.content.find(c => c.type === 'text')?.text?.trim() ?? ''

    return Response.json({ title }, { status: 200, headers: CORS })
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
