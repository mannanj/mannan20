### Task 269: Replace LLM reveal-gate with Turnstile-only reveal + post-reveal LLM opportunity parsing

Currently `src/components/contact-form.tsx` gates revealing contact info on an LLM call (`/api/validate-contact`, OpenRouter) deciding whether the visitor typed enough info (name/email/reason) before revealing. Now that Turnstile bot protection exists (this session's work — `src/hooks/use-turnstile.ts`, `turnstile-worker/`), the LLM is no longer needed as a gatekeeper; Turnstile can be the sole reveal gate. Mannan wants the LLM's role moved from *pre-reveal gate* to *post-reveal, non-blocking opportunity surfacing*.

#### New flow (as described by Mannan)
- [x] Reveal contact info once Turnstile verifies (removed the LLM-based `isSuccess` gate from `validate()` in `contact-form.tsx`; the gate call to `/api/validate-contact` for gating purposes is gone from this flow)
- [x] After reveal, show a new optional capture step: "enter why you're here, your name, etc. (optional)" — a simple textarea, not gating anything, not blocking the already-revealed contact info
- [x] On submit, send that text to an LLM that *parses* (not gates) it against "particular things I'm looking for"
- [x] Surface a personalized thank-you + possible relevant opportunities/next steps based on what the LLM found, back to the visitor

#### Open questions — resolved with Mannan
- [x] Reveal trigger: Turnstile verifies silently on modal open — reveal fires as soon as a token exists and is server-verified, no typing required at all.
- [x] Parse criteria: "Job/collaboration opportunities + specific project interest" — broad coverage: job offers/roles, freelance/consulting/collaboration asks, interest in a specific project/app, speaking/media requests, general networking. Implemented as 5 categories in `ContactIntentCategoryKey` (`job_opportunity`, `collaboration`, `project_interest`, `speaking_media`, `networking`).
- [x] Surfaced opportunities format: freeform personalized text only (no links, no CTA cards) — a short LLM-generated thank-you + next-step sentence.
- [x] Bot heuristics (`isSuspiciousBehavior`, `FEATURES.CONTACT_CHALLENGE`): removed entirely — Turnstile is now the sole bot gate.
- [x] API route: new route `/api/contact-intent` — `/api/validate-contact` was left untouched (see below).

#### Build steps
- [x] Remove the LLM pre-reveal gate from `contact-form.tsx`; reveal is gated on Turnstile verification only
- [x] Add the post-reveal optional capture UI — new component `src/components/contact-intent-form.tsx`, rendered from `contact-result.tsx`
- [x] Add a new API route `src/app/api/contact-intent/route.ts` for LLM parsing of the post-reveal text against the 5 categories above
- [x] Update `src/lib/types.ts` — added `ContactIntentCategoryKey`/`ContactIntentCategory`/`ContactIntentResult` alongside the existing `LLMValidationResult`/`LLMFieldResult` (kept, not removed — see below)
- [x] Update `e2e/contact-form*.spec.ts` (4 files) for the new flow, plus a new shared `e2e/helpers/contact-form.ts` (previously each file duplicated its own `openModal`/`stubTurnstile`)
- [x] Mutation-test the new Turnstile-only gate and the new LLM parse path

#### Discovered mid-implementation: `/api/validate-contact` is NOT dead code
`src/components/game/feedback-popup.tsx` (the chicken game's "unlock contact via feedback" easter egg) independently depends on `/api/validate-contact` + `LLMValidationResult` for its own unrelated gating logic. Deleting that route/type would have broken a live, out-of-scope feature. Resolution: left `/api/validate-contact`, `LLMValidationResult`, `LLMFieldResult`, `feedback-popup.tsx`, and `e2e/chicken-leaderboard-identity.spec.ts` completely untouched. The new flow is purely additive (`ContactIntentResult` + `/api/contact-intent`), not a replacement of the old type/route.

Also removed the now-dead `contactUserInput`/`setContactUserInput` state from `src/context/app-context.tsx` (it only existed to persist the old pre-reveal gate textarea across modal close/reopen; confirmed unused elsewhere via repo-wide grep before removing).

- Location: `src/components/contact-form.tsx`, `src/components/contact-intent-form.tsx`, `src/components/contact-result.tsx`, `src/app/api/contact-intent/route.ts`, `src/lib/types.ts`, `src/context/app-context.tsx`, `src/lib/feature-flags.ts`, `e2e/contact-form.spec.ts` + siblings, `e2e/helpers/contact-form.ts`

Implemented and mutation-tested this session (2026-07-05). All 48 rewritten e2e tests pass; the untouched chicken-game suite (6 tests) still passes.
