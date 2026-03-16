export const KV_OTP_PREFIX = 'otp:'
export const KV_OTP_REQ_PREFIX = 'otp_req:'
export const KV_OTP_FAIL_PREFIX = 'otp_fail:'
export const KV_RL_PREFIX = 'rl:'

export const MEMBER_STATUS = { PENDING: 'pending', ACTIVE: 'active' } as const

export const PLANS = { FREE: 'free', PRO: 'pro', STUDIO: 'studio', TEAM: 'team' } as const
export type Plan = typeof PLANS[keyof typeof PLANS]

// Internal/test accounts — permanently bypass plan expiry and rate limits
export const INTERNAL_SLUGS = new Set(['text-live-app-gmail-com'])
