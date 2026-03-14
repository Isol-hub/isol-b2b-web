import * as Sentry from '@sentry/react'

/**
 * Drop-in replacement for fetch() that reports 5xx responses to Sentry.
 * 4xx responses are not reported (expected: auth errors, validation, limits).
 * The response is always returned unchanged — callers handle it normally.
 */
export async function sentryFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status >= 500) {
    Sentry.captureException(new Error(`API ${res.status}: ${typeof input === 'string' ? input : input.toString()}`), {
      extra: {
        status: res.status,
        method: init?.method ?? 'GET',
        url: typeof input === 'string' ? input : input.toString(),
      },
    })
  }
  return res
}
