# ISOL Studio — Audit TODO
> Forensic audit completato il 2026-03-13. Aggiornare questo file dopo ogni fix con data e commit hash.

---

## CATEGORIA 1 — LANCIO STANOTTE
*Da completare prima della distribuzione commerciale*

- [x] **A1** — Pagine legali mancanti (`/legal/terms`, `/legal/privacy`) — link in SettingsPage danno 404
- [x] **A2** — Nuovo utente: workspace 404 al primo login — WorkspacePage crasha perché il workspace non esiste finché non si salva una sessione
- [ ] **A3** — `Math.random()` per OTP — non è crittograficamente sicuro, usare `crypto.getRandomValues()`
- [ ] **A4** — Limite 3 sessioni piano free non applicato server-side — `sessions/save.ts` non conta le sessioni esistenti prima di inserire

---

## CATEGORIA 2 — BLINDAMENTO POST PRIMI UTENTI
*Da completare entro 24–48h dal lancio*

- [ ] **B1** — JWKS cache senza TTL — se le chiavi di lsol-auth vengono ruotate, i Worker instance esistenti rifiutano token validi fino al cold-start
- [ ] **B2** — Nessuna validazione lunghezza input — `transcript_lines.text`, `comments.text`, `glossary_terms.note` accettano payload illimitati
- [ ] **B3** — Studio/Team: limite seat non applicato — `team/invite.ts` non conta i membri esistenti prima di invitare
- [ ] **B4** — Scadenza piano non applicata — `plan_expires_at` esiste in DB ma nessun codice fa downgrade automatico se il webhook Stripe è mancato
- [ ] **B5** — Paginazione sessioni mancante — `sessions/index.ts` ha `LIMIT 200` hardcoded, senza cursore o offset
- [ ] **B6** — FTS5 non backfillato — sessioni create prima della migration 0008 non sono ricercabili
- [ ] **B7** — Error monitoring mancante — zero visibilità sugli errori in produzione (Sentry o equivalente)

---

## CATEGORIA 3 — BLINDAMENTO TRA UNA SETTIMANA
*Da completare entro 7 giorni dal lancio*

- [ ] **C1** — CSP + CORS headers — nessun file `_headers` Cloudflare Pages; CORS è `*` su tutti gli endpoint
- [ ] **C2** — Audit log — nessun log immutabile per delete workspace, delete session, cambio piano
- [ ] **C3** — Data Export UI — sezione "Coming soon" in SettingsPage; librerie jsPDF e docx già installate
- [ ] **C4** — TypeScript strict — `noUnusedLocals: false`, `noUnusedParameters: false` in tsconfig.app.json
- [ ] **C5** — Magic strings → constants file — `'pending'`, `'active'`, `'otp_req:'`, `'isol_session'`, `'b2b'` sparsi in 15+ file
- [ ] **C6** — PiP fallback browser — `documentPictureInPicture` non supportato su Firefox/Safari; `isSupported` flag esiste ma UI non gestisce il fallback

---

## Log completamenti

| Data | Item | Commit | Note |
|------|------|--------|------|
| 2026-03-13 | A1 | 8544c33 | LegalPage.tsx con Terms + Privacy GDPR; route /legal/:doc in App.tsx |
| 2026-03-13 | A2 | c632348 | workspace/index.ts GET: INSERT OR IGNORE + re-fetch se workspace null |
