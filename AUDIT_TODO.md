# ISOL Studio — Audit TODO
> Forensic audit completato il 2026-03-13. Aggiornare questo file dopo ogni fix con data e commit hash.

---

## CATEGORIA 1 — LANCIO STANOTTE
*Da completare prima della distribuzione commerciale*

- [x] **A1** — Pagine legali mancanti (`/legal/terms`, `/legal/privacy`) — link in SettingsPage danno 404
- [x] **A2** — Nuovo utente: workspace 404 al primo login — WorkspacePage crasha perché il workspace non esiste finché non si salva una sessione
- [x] **A3** — `Math.random()` per OTP — non è crittograficamente sicuro, usare `crypto.getRandomValues()`
- [x] **A4** — Limite 3 sessioni piano free non applicato server-side — `sessions/save.ts` non conta le sessioni esistenti prima di inserire

---

## CATEGORIA 2 — BLINDAMENTO POST PRIMI UTENTI
*Da completare entro 24–48h dal lancio*

- [x] **B1** — JWKS cache senza TTL — se le chiavi di lsol-auth vengono ruotate, i Worker instance esistenti rifiutano token validi fino al cold-start
- [x] **B2** — Nessuna validazione lunghezza input — `transcript_lines.text`, `comments.text`, `glossary_terms.note` accettano payload illimitati
- [x] **B3** — Studio/Team: limite seat non applicato — `team/invite.ts` non conta i membri esistenti prima di invitare
- [x] **B4** — Scadenza piano non applicata — `plan_expires_at` esiste in DB ma nessun codice fa downgrade automatico se il webhook Stripe è mancato *(centralised in lib/plan.ts)*
- [x] **B5** — Paginazione sessioni mancante — `sessions/index.ts` ha `LIMIT 200` hardcoded, senza cursore o offset
- [x] **B6** — FTS5 non backfillato — sessioni create prima della migration 0008 non sono ricercabili
- [x] **B7** — Error monitoring mancante — zero visibilità sugli errori in produzione (Sentry o equivalente)

---

## CATEGORIA 3 — BLINDAMENTO TRA UNA SETTIMANA
*Da completare entro 7 giorni dal lancio*

- [x] **C1** — CSP + CORS headers — nessun file `_headers` Cloudflare Pages; CORS è `*` su tutti gli endpoint
- [x] **C2** — Audit log — nessun log immutabile per delete workspace, delete session, cambio piano
- [x] **C3** — Data Export UI — sezione "Coming soon" in SettingsPage; librerie jsPDF e docx già installate
- [x] **C4** — TypeScript strict — `noUnusedLocals: false`, `noUnusedParameters: false` in tsconfig.app.json
- [ ] **C5** — Magic strings → constants file — `'pending'`, `'active'`, `'otp_req:'`, `'isol_session'`, `'b2b'` sparsi in 15+ file
- [ ] **C6** — PiP fallback browser — `documentPictureInPicture` non supportato su Firefox/Safari; `isSupported` flag esiste ma UI non gestisce il fallback

---

## Log completamenti

| Data | Item | Commit | Note |
|------|------|--------|------|
| 2026-03-13 | A1 | 8544c33 | LegalPage.tsx con Terms + Privacy GDPR; route /legal/:doc in App.tsx |
| 2026-03-13 | A2 | c632348 | workspace/index.ts GET: INSERT OR IGNORE + re-fetch se workspace null |
| 2026-03-13 | A3 | 33276d0 | request-otp.ts: generateOtp() usa crypto.getRandomValues() invece di Math.random() |
| 2026-03-13 | A4 | a0f892d | sessions/save.ts: batch SELECT plan+count → 403 FREE_LIMIT; WorkspacePage apre PricingModal |
| 2026-03-14 | B1 | 697644f | jwt.ts: JWKS cache con TTL 1h + fallback stale cache su errore re-fetch |
| 2026-03-14 | B2 | 45e1403 | validate.ts utility + assertMaxLen su 4 endpoint; 400 su payload oltre limite |
| 2026-03-14 | B4 | 71fd6c9 | getEffectivePlan() utility in lib/plan.ts; replaces 3 inline checks; workspace GET exposes effective_plan |
| 2026-03-14 | B3 | 907c8a8 | invite.ts: SEAT_LIMITS map (free/pro=1, studio=5, team=20); 403 SEAT_LIMIT response; TeamModal: dynamic seatLimit + upgrade nudge |
| 2026-03-14 | B5 | 7cfd5ac | sessions/index.ts: LIMIT 200→50, before_id cursor param, next_cursor in response; SessionsPage: Load more button |
| 2026-03-14 | B6 | eb02b16 | 0016_fts_backfill.sql: idempotent INSERT WHERE id NOT IN sessions_fts; applied to remote D1 |
| 2026-03-14 | B7 | 87409ff | @sentry/react in main.tsx (disabled when VITE_SENTRY_DSN unset); structured console.error in jwt.ts + ratelimit.ts |
| 2026-03-14 | C1 | 1af18c9 | corsHeaders() in lib/cors.ts (isol.studio only); 28 endpoints migrati; public/_headers con CSP + X-Frame-Options |
| 2026-03-14 | C2 | 837e971 | audit_log table + logAudit() fire-and-forget; 8 endpoint strumentati (save/delete session, workspace, share, member) |
| 2026-03-14 | C3 | — | export.ts GET endpoint (chunked batch); SettingsPage: Export JSON/PDF/Word buttons via jsPDF + docx |
| 2026-03-14 | C4 | — | tsconfig.app.json: noUnusedLocals + noUnusedParameters → true; zero errori |
