# ISOL Meeting Captions — Web Client

Live meeting captions and translation for your team. Captures meeting audio via the browser's screen share API and streams it to the ISOL backend for real-time transcription + translation.

## Quick Start (local dev)

```bash
npm install
cp .env.example .env.local
# edit .env.local with your values
npm run dev
```

For local development with Cloudflare Pages Functions (auth endpoints):
```bash
npx wrangler pages dev dist --kv CF_KV_OTP
# In another terminal:
npm run build -- --watch
```

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `VITE_WSS_URL` | Frontend + CF Pages | WebSocket backend URL e.g. `wss://wss.isol.live` |
| `RESEND_API_KEY` | CF Pages (secret) | Resend API key for sending OTP emails |
| `JWT_SECRET` | CF Pages (secret) | 32+ char random string for signing JWTs |
| `CF_KV_OTP` | CF Pages KV binding | KV namespace for OTP storage |
| `ALLOWED_EMAIL_DOMAINS` | CF Pages (optional) | Comma-separated allowed domains, or `*` for any |

## Deployment (Cloudflare Pages)

1. Push to GitHub (`isol-b2b-web` repo under `Isol-hub` org)
2. Go to Cloudflare Pages → Create Project → Connect GitHub → select `isol-b2b-web`
3. Build settings:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Create a KV namespace in Cloudflare Workers → name it `isol-otp`
5. In Pages project settings → Functions → KV namespace bindings → add `CF_KV_OTP` → select `isol-otp`
6. Add environment variables (Settings → Environment Variables):
   - `RESEND_API_KEY` → your Resend key (mark as secret)
   - `JWT_SECRET` → 32-char random string (mark as secret)
   - `VITE_WSS_URL` → `wss://wss.isol.live`
7. `_redirects` is already in `/public` — Cloudflare Pages handles SPA routing automatically
8. Point `app.isol.live` → Cloudflare Pages (add custom domain in Pages project settings)

## How to Create a Workspace / Invite Users

**Pilot (manual):**
- Workspace slug is auto-derived from the user's email domain (e.g. `acme.com` → `/acme-com`)
- Set `ALLOWED_EMAIL_DOMAINS=acme.com` in CF Pages env to restrict to one company
- Send users the link: `https://app.isol.live/` — they enter their work email, get a code, done

**Multi-tenant (future):** Store workspaces in D1 or a database with explicit domain→slug mappings.

---

## Pilot Admin Guide

### What link do users get?
`https://app.isol.live/` — They enter their work email and receive a 6-digit code.

### What browsers are supported?
- Chrome 74+ (recommended)
- Edge 79+
- Firefox — audio capture limited
- Safari — `getDisplayMedia` audio not supported

### How does audio capture work?
User clicks "Start captions" → browser shows a native dialog to share a screen, window, or tab. They must **check "Share tab audio"** or **"Share system audio"** in the dialog. Audio is then streamed to the ISOL backend.

### Privacy statement
> Audio is streamed for live captioning and is not stored.

Audio chunks are sent in real-time to the ISOL WebSocket backend for transcription and translation. No audio is persisted on any server. Session tokens expire after 7 days.

---

## Architecture

```
Browser
├── getDisplayMedia({ audio: true })  — captures meeting audio
├── ScriptProcessorNode               — converts Float32 → Int16 PCM @ 16kHz
├── WebSocket → isol-wss              — streams audio chunks (200ms)
└── Renders subtitles from { original, translation } messages

Cloudflare Pages
├── /functions/api/auth/request-otp   — generates + emails OTP (Resend)
├── /functions/api/auth/verify-otp    — validates OTP, issues JWT (HS256)
└── dist/                             — static SPA (Vite + React)
```
