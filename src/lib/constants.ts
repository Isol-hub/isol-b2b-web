export const LS_SESSION_KEY = 'isol_session'
export const LS_NOTIF_PREFIX = 'isol:notif:'
export const LS_ONBOARDED_PREFIX = 'isol_onboarded_'

export const PLANS = { FREE: 'free', PRO: 'pro', STUDIO: 'studio', TEAM: 'team' } as const
export type Plan = typeof PLANS[keyof typeof PLANS]
