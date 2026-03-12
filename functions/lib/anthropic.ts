interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AnthropicRequest {
  model: string
  max_tokens: number
  messages: AnthropicMessage[]
}

interface AnthropicResponse {
  content: { type: string; text: string }[]
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * Call the Anthropic messages API with automatic retry on 429 rate limit errors.
 * Retries up to 3 times with exponential backoff (1s, 2s, 4s).
 * Throws on non-retryable errors.
 */
export async function callAnthropic(
  apiKey: string,
  body: AnthropicRequest
): Promise<AnthropicResponse> {
  const delays = [1000, 2000, 4000]

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (res.status === 429 && attempt < delays.length) {
      await sleep(delays[attempt])
      continue
    }

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Anthropic ${res.status}: ${err}`)
    }

    return res.json() as Promise<AnthropicResponse>
  }

  throw new Error('Anthropic rate limit exceeded after retries')
}
