### Task 302: 8-digit sign-in code alongside the magic link
- [x] D1 migration 0010: hashed code + attempt counters on magic_tokens, per-email attempt window
- [x] cloud-worker: issue code with each link, verify-code routes (site + cloud), email shows code + never-share line
- [x] Site: `/api/auth/verify-code`, shared sign-in UI with Enter code / Resend on the sent screen
- [x] Header menu + readings sign-in forms use the same flow
- [ ] Calendar, MeetTime, Chat, civic-signal office sign-in forms
- [ ] Tests: unit (limits, expiry, single use, wrong email), e2e, prod smoke
- [ ] Deploy: migration → cloud-worker → site → sibling apps
- Location: `cloud-worker/`, `src/app/api/auth/`, `src/components/auth/`, `src/lib/cloudflare-auth.ts`
