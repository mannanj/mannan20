### Task 269: Replace LLM reveal-gate with Turnstile-only reveal + post-reveal LLM opportunity parsing

Currently `src/components/contact-form.tsx` gates revealing contact info on an LLM call (`/api/validate-contact`, OpenRouter) deciding whether the visitor typed enough info (name/email/reason) before revealing. Now that Turnstile bot protection exists (this session's work — `src/hooks/use-turnstile.ts`, `turnstile-worker/`), the LLM is no longer needed as a gatekeeper; Turnstile can be the sole reveal gate. Mannan wants the LLM's role moved from *pre-reveal gate* to *post-reveal, non-blocking opportunity surfacing*.

#### New flow (as described by Mannan)
- [ ] Reveal contact info once Turnstile verifies (remove the current LLM-based `isSuccess` gate from `validate()` in `contact-form.tsx`; the LLM call to `/api/validate-contact` for gating purposes goes away)
- [ ] After reveal, show a new optional capture step: "enter why you're here, your name, etc. (optional)" — a simple textarea, not gating anything, not blocking the already-revealed contact info
- [ ] On submit, send that text to an LLM that *parses* (not gates) it against "particular things I'm looking for" (Mannan to define the actual criteria list — e.g. specific project interest, job/collaboration opportunities, etc.)
- [ ] Surface a personalized thank-you + possible relevant opportunities/next steps based on what the LLM found, back to the visitor

#### Open questions to resolve with Mannan before implementing
- [ ] Exact reveal trigger once the LLM gate is gone — reveal as soon as Turnstile verifies (e.g. on modal open, or after first keystroke), or is some other minimal interaction still required first?
- [ ] What are the "particular things I'm looking for" the new LLM pass should check against? Need Mannan's actual criteria list (job opportunities, collaboration types, specific projects, etc.)
- [ ] What do "surfaced opportunities/actions" actually look like — freeform text, links to specific pages (apply/contact/Calendly), something else?
- [ ] Do the existing bot heuristics in `contact-form.tsx` (`isSuspiciousBehavior` typing-speed/paste detection, `FEATURES.CONTACT_CHALLENGE`) still pull their weight now that Turnstile exists, or should they be removed as redundant?
- [ ] Does `/api/validate-contact` get repurposed for the new post-reveal parsing call, or replaced by a new route (e.g. `/api/contact-intent`)?

#### Build steps (once the above is confirmed)
- [ ] Remove the LLM pre-reveal gate from `contact-form.tsx`; reveal is gated on Turnstile verification only
- [ ] Add the post-reveal optional capture UI (new component or extend `contact-result.tsx`)
- [ ] Add/repurpose an API route for LLM parsing of the post-reveal text against Mannan's criteria
- [ ] Update `src/lib/types.ts` (`LLMValidationResult` etc.) to match the new parse-not-gate response shape
- [ ] Update/replace `e2e/contact-form*.spec.ts` (4 files) for the new flow — the current suite's `mockApi`/`FOUND_ALL`-style fixtures assume gating behavior that no longer exists
- [ ] Mutation-test the new gate (Turnstile-only) and the new LLM parse path per this repo's testing standards

- Location: `src/components/contact-form.tsx`, `src/components/contact-result.tsx`, `src/app/api/validate-contact/route.ts`, `src/lib/types.ts`, `e2e/contact-form.spec.ts` + siblings

Captured only, not started — Mannan said "for now just capture this as a task file only."
