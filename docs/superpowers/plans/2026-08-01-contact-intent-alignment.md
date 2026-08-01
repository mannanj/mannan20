# Contact Intent Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing post-reveal terminal chat into an honest, progressively streamed alignment mirror with an explicitly consented, freshly human-verified callback request.

**Architecture:** Preserve Turnstile-gated contact reveal, pause-to-submit, the three-turn ceiling, and the terminal transcript. Split pure validation/protocol logic from the React state machine; proxy OpenRouter's live SSE through a bounded NDJSON protocol; add a separate `/api/contact-request` boundary that validates a fresh single-use Turnstile token before asking Resend to deliver a plain-text callback request.

**Tech Stack:** Next.js 15 route handlers, React 19, TypeScript, Bun tests, Playwright, OpenRouter Chat Completions streaming, Upstash rate limiting, Cloudflare Turnstile siteverify Worker, Resend.

**Authoritative artifacts:** `docs/superpowers/specs/2026-08-01-contact-intent-alignment-design.md`, `plans/007-contact-intent-alignment.md`, and `tasks/task-281.md`.

**Isolation:** Work only in `.worktrees/contact-intent-alignment` on `feat/contact-intent-alignment`. Never stage the post-commit hook's untracked `public/data/dev-commits.json` or `public/data/metadata.json`, and never alter unrelated main-checkout changes.

---

## File ownership map

- Modify `src/lib/types.ts`: shared turn, stream-frame, and callback request types.
- Replace `src/lib/contact-intent-logic.ts`: history bounds, best-effort question rule, complete-sentence stream normalization, and NDJSON framing/parsing.
- Replace `src/lib/contact-intent-logic.test.ts`: pure protocol and policy tests.
- Create `src/lib/contact-request.ts`: callback field/transcript validation and fixed plain-text email body.
- Create `src/lib/contact-request.test.ts`: callback normalization, limits, and header-isolation tests.
- Create `src/lib/turnstile-verification.ts`: reusable safe call to the existing siteverify Worker.
- Create `src/lib/turnstile-verification.test.ts`: missing/invalid/success/error verification cases.
- Modify `src/lib/rate-limit.ts`: distinct reflection and callback limiters with memory fallback.
- Replace `src/app/api/contact-intent/route.ts`: DeepSeek V4 Flash SSE consumer and bounded NDJSON producer.
- Create `src/app/api/contact-request/route.ts`: validation, fresh Turnstile proof, rate limit, and Resend acceptance.
- Create `src/app/api/contact-request/route.test.ts`: injected route-orchestration tests with no external calls.
- Modify `src/components/contact-form.tsx`: reuse the shared Turnstile verifier without changing reveal behavior.
- Modify `src/hooks/use-turnstile.ts`: expose token/reset safely for a second callback widget; preserve existing defaults.
- Replace `src/components/contact-intent-form.tsx`: truthful transcript, progressive reflection reader, and callback form state machine.
- Modify `e2e/helpers/contact-form.ts`: framed reflection and callback mocks.
- Replace focused assertions in `e2e/contact-form-intent-thread.spec.ts`, `e2e/contact-form-edge-cases.spec.ts`, `e2e/contact-form-adversarial.spec.ts`, and `e2e/contact-form-mobile.spec.ts`.

### Task 1: Pure intent and stream protocol

**Files:**
- Modify: `src/lib/types.ts`
- Replace: `src/lib/contact-intent-logic.ts`
- Replace: `src/lib/contact-intent-logic.test.ts`

- [x] **Step 1: Write failing tests for the exact protocol**

Replace the old two-sentence/120-character assumptions with tests for:

- `sanitizeHistory` accepting only alternating user/assistant text, keeping at most six entries, and capping user content at 1000 and assistant content at 480 characters;
- `historyUsedQuestion` returning true when any assistant entry contains `?`, not only when the last character is `?`;
- `validateModelSentence(sentence, questionUsed, responseQuestionCount)` rejecting a second thread question and a second question mark in one response;
- `takeCompleteSentences(buffer, remaining)` returning only completed sentences, retaining the unfinished suffix, and never exceeding the 480-character total;
- `encodeFrame` and `parseFrame` implementing the exact `meta`, `text`, `done`, and safe `error` grammar;
- frame size over 4 KiB, client buffer over 8 KiB, unknown fields/types, duplicate `meta`, trailing frames, and model text over 480 characters failing closed;
- UTF-8 text and XSS-looking strings remaining inert JSON text.

Use these public types in `src/lib/types.ts`:

```ts
export interface ContactIntentTurn {
  userText: string;
  aiReply: string;
}

export type ContactStreamFrame =
  | { type: 'meta'; version: 1 }
  | { type: 'text'; value: string }
  | { type: 'done' }
  | { type: 'error'; code: 'upstream' };

export interface ContactRequestPayload {
  contact: string;
  reason: string;
  transcript: ContactIntentTurn[];
  turnstileToken: string;
}
```

- [x] **Step 2: Run the focused test and verify red**

Run: `bun test src/lib/contact-intent-logic.test.ts`

Expected: FAIL because the new sentence/protocol exports do not exist.

- [x] **Step 3: Implement the pure policy functions**

Export these constants and functions from `src/lib/contact-intent-logic.ts`:

```ts
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_MODEL_TEXT_LENGTH = 480;
export const MAX_HISTORY_ENTRIES = 6;
export const MAX_FRAME_BYTES = 4096;
export const MAX_STREAM_BUFFER_BYTES = 8192;

export function sanitizeHistory(raw: unknown): ContactIntentHistoryEntry[];
export function historyUsedQuestion(history: ContactIntentHistoryEntry[]): boolean;
export function validateModelSentence(
  sentence: string,
  questionUsed: boolean,
  responseQuestionCount: number,
): { valid: boolean; questionCount: number };
export function takeCompleteSentences(
  buffer: string,
  remaining: number,
): { complete: string; rest: string };
export function encodeFrame(frame: ContactStreamFrame): string;
export function parseFrame(line: string): ContactStreamFrame | null;
```

Sentence splitting recognizes `.`, `!`, or `?` followed by whitespace/end and keeps any unfinished suffix. If upstream ends with a non-empty suffix and room remains, trim it and append `.` before validation. A sentence is rejected if it would exceed the remaining limit, contains a question when `questionUsed` is true, or causes the response to contain more than one `?`. Error frames expose only `upstream`.

- [x] **Step 4: Run tests and inspect legacy references**

Run: `bun test src/lib/contact-intent-logic.test.ts`

Expected: PASS.

Run: `rg -n "alreadyAskedQuestion|normalizeResult|parseContentFallback|MAX_RESPONSE_MESSAGE_LENGTH" src e2e`

Expected: remaining matches are confined to route/component/tests scheduled below.

- [x] **Step 5: Commit Task 1 after the required staged scan**

Stage only the three Task 1 files, inspect `git diff --cached --name-status` and `git diff --cached`, run the pinned Gitleaks binary against the staged feature-worktree index, then commit with `Refactor contact intent stream protocol`.

### Task 2: Stream actual DeepSeek output through the framed route

**Files:**
- Modify: `src/lib/rate-limit.ts`
- Replace: `src/app/api/contact-intent/route.ts`
- Test: `src/lib/contact-intent-logic.test.ts`

- [x] **Step 1: Add failing SSE-normalization fixtures**

Add pure fixtures covering OpenRouter keep-alive comments, `data: [DONE]`, content deltas split across chunks, a top-level mid-stream `error`, malformed JSON, `finish_reason: "error"`, and a normal stop. The parser must ignore comments, extract only `choices[0].delta.content`, and never forward reasoning or provider error text. Add a `buildOpenRouterRequest` assertion proving the exact model is `deepseek/deepseek-v4-flash`, `stream` is `true`, reasoning is disabled, sanitized history is bounded, and the prompt changes after a prior assistant question.

- [x] **Step 2: Run the focused test and verify red**

Run: `bun test src/lib/contact-intent-logic.test.ts`

Expected: FAIL until `consumeOpenRouterSseLine` or the equivalent pure parser exists.

- [x] **Step 3: Add independent reflection and callback rate limits**

In `src/lib/rate-limit.ts`, follow the existing Upstash/memory fallback pattern. Add `limitContactReflection(ip)` at 10/hour and `limitContactRequest(ip)` at 4/hour with distinct prefixes and memory keys. Do not remove or change existing limiter behavior.

- [x] **Step 4: Implement the streaming route**

`POST /api/contact-intent` must:

1. safely parse JSON and require a non-empty string `message` at most 1000 characters;
2. sanitize bounded history and compute `questionUsed`;
3. rate-limit before provider invocation and return safe 429 JSON with `retry-after`;
4. require `OPENROUTER_API_KEY`, returning generic 503 when absent;
5. call `https://openrouter.ai/api/v1/chat/completions` with the tested `buildOpenRouterRequest` result: `model: "deepseek/deepseek-v4-flash"`, `stream: true`, reasoning disabled, bounded messages, and no tool call;
6. prompt one short calibrated reflection/next step or one question, while forbidding thanks, Mannan impersonation, delivery/persistence claims, pressure, unsupported fit, and a question after `questionUsed`;
7. require an upstream body and proxy it into a new `ReadableStream`;
8. emit `meta` first, then only complete validated `text` sentences, then exactly one `done` on clean completion;
9. emit one safe `error` and close on malformed/upstream error, second-question violation, overflow, or disconnect;
10. abort the upstream request when the client cancels or the 480-character cap is reached;
11. set `application/x-ndjson; charset=utf-8`, `no-store`, and `X-Content-Type-Options: nosniff`.

Do not log prompts, history, deltas, provider response bodies, or generated text. The implementation follows the official OpenRouter streaming contract: SSE comments are ignorable, `delta.content` carries text, and mid-stream errors arrive in-band.

- [x] **Step 5: Verify route compilation and focused tests**

Run: `bun test src/lib/contact-intent-logic.test.ts`

Expected: PASS.

Run: `bun run typecheck`

Expected: no errors in the logic, limiter, or route. Temporary component type errors caused by the changed response contract are allowed only until Task 4.

- [x] **Step 6: Commit Task 2**

Stage only the Task 2 paths, inspect the full staged diff, run the pinned staged Gitleaks scan, and commit with `Stream honest contact alignment responses`.

### Task 3: Validate fresh human proof and callback payloads

**Files:**
- Create: `src/lib/turnstile-verification.ts`
- Create: `src/lib/turnstile-verification.test.ts`
- Modify: `src/components/contact-form.tsx`
- Create: `src/lib/contact-request.ts`
- Create: `src/lib/contact-request.test.ts`

- [x] **Step 1: Write failing Turnstile verifier tests**

Test blank tokens, missing worker URL, non-OK responses, invalid JSON, `{ success: false }`, thrown network errors, and `{ success: true }`. The verifier receives an injectable `fetcher` in tests and returns only `true` or `false`; it never returns provider details.

- [x] **Step 2: Write failing callback normalization tests**

Cover:

- contact trimmed and required at 3–254 characters;
- reason trimmed and required at 10–1000 characters;
- token required but excluded from the email body;
- transcript being an array of at most three `{ userText, aiReply }` completed turns;
- user/assistant/serialized transcript caps of 1000/480/4000;
- partial/error entries, extra keys, non-string values, and overflow rejected;
- fixed email subject/body labels with visitor input only in the body;
- CRLF normalized to LF so visitor text cannot create mail headers.

- [x] **Step 3: Run both tests and verify red**

Run: `bun test src/lib/turnstile-verification.test.ts src/lib/contact-request.test.ts`

Expected: FAIL because both modules are absent.

- [x] **Step 4: Implement reusable verification**

Create:

```ts
export async function verifyTurnstileToken(
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean>;
```

Read `NEXT_PUBLIC_TURNSTILE_WORKER_URL`, POST `{ token }`, apply a bounded abort timeout, and return `data.success === true`. Update `src/components/contact-form.tsx` to import this helper; reveal behavior and copy must remain unchanged.

- [x] **Step 5: Implement callback normalization and email construction**

Export `normalizeContactRequest(raw): ContactRequestPayload | null` and `buildContactRequestEmail(payload): string`. The email body begins `Portfolio callback request`, labels the contact and reason, then lists each completed turn under fixed `Visitor` and `AI reflection` labels. Do not export any function that accepts recipient/from/subject values from visitor data.

- [x] **Step 6: Run focused tests and typecheck**

Run: `bun test src/lib/turnstile-verification.test.ts src/lib/contact-request.test.ts`

Expected: PASS.

Run: `bun run typecheck`

Expected: no Task 3 errors and no change to existing contact reveal behavior.

- [x] **Step 7: Commit Task 3**

Stage only the five Task 3 paths, inspect the staged diff, run the pinned staged Gitleaks scan, and commit with `Validate consented contact requests`.

### Task 4: Add the server-only callback request route

**Files:**
- Create: `src/app/api/contact-request/route.ts`
- Create: `src/app/api/contact-request/route.test.ts`
- Modify: `src/lib/rate-limit.ts` only if `limitContactRequest` was not completed in Task 2
- Test: `src/lib/contact-request.test.ts`

- [x] **Step 1: Add failing orchestration tests around injected boundaries**

Export `handleContactRequest(request, deps)` from the route module, where `deps` supplies `verifyToken`, `limit`, `send`, and server-owned configuration. Test it in `route.test.ts`: validation occurs before external calls; invalid/replayed token prevents email; rate limit prevents email; missing `RESEND_API_KEY` or recipient configuration fails safely; `sendEmail` rejection returns 503; and provider acceptance returns `{ submitted: true }`. `POST` calls the same handler with production dependencies.

- [x] **Step 2: Run the focused test and verify red**

Run: `bun test src/app/api/contact-request/route.test.ts src/lib/contact-request.test.ts`

Expected: FAIL until the route orchestration seam is implemented.

- [x] **Step 3: Implement `/api/contact-request`**

The route must parse once, normalize the callback payload, verify the fresh Turnstile token through `verifyTurnstileToken`, rate-limit by IP, and require `RESEND_API_KEY`. Use `CONTACT_REQUEST_TO` when configured and otherwise the site's existing public contact address as a fixed server-owned fallback. Call `sendEmail` with fixed subject `Portfolio callback request`, fixed server-owned headers, and the pure plain-text body. Return safe JSON statuses:

- 400 for invalid fields/transcript;
- 403 `{ error: "verification-required" }` for missing/invalid/expired/replayed proof;
- 429 for callback rate limit;
- 503 `{ error: "submission-unavailable" }` for configuration or provider failure;
- 200 `{ submitted: true }` only when Resend accepts the request.

Never echo visitor data or operational/provider details and never log the payload.

- [x] **Step 4: Run focused tests and typecheck**

Run: `bun test src/app/api/contact-request/route.test.ts src/lib/contact-request.test.ts src/lib/turnstile-verification.test.ts`

Expected: PASS.

Run: `bun run typecheck`

Expected: no callback route errors.

- [x] **Step 5: Commit Task 4**

Stage only the callback route and any explicitly owned helper/test change, inspect the staged diff, run the pinned staged Gitleaks scan, and commit with `Add human-verified callback requests`.

### Task 5: Implement the truthful client state machine

**Files:**
- Modify: `src/hooks/use-turnstile.ts`
- Replace: `src/components/contact-intent-form.tsx`
- Modify only if required by verified focus behavior: `src/components/contact-result.tsx`

- [x] **Step 1: Preserve the existing terminal shell and define explicit states**

Use:

```ts
type IntentStatus =
  | 'editing'
  | 'interpreting'
  | 'reflecting'
  | 'ready'
  | 'interpretation_error'
  | 'callback_editing'
  | 'callback_sending'
  | 'callback_sent'
  | 'callback_error';
```

Keep the current 900 ms debounce, 3-second mobile ceiling, Enter/Shift+Enter behavior, IME handling, locked transcript, three-turn cap, and monospace visual language. Change the placeholder/examples and render the exact pre-typing AI disclosure. Locally append `Thanks.` immediately when a turn locks; do not wait for or accept a model-authored thank-you.

- [x] **Step 2: Implement the strict NDJSON client reader**

Read with a streaming `TextDecoder`, preserve split UTF-8, cap incomplete data at 8 KiB, require `meta` first, accept text until one terminal frame, cap displayed output at 480 characters, and reject unknown/duplicate/trailing frames. While waiting show `Looking for possible overlap…`; once text arrives switch to the non-live green reflection. A clean `done` commits the assistant reply to callback transcript history. Error/EOF before `done` keeps partial text as `Incomplete reflection`, excludes it from transcript, preserves the user turn for retry, and announces `Couldn't interpret that just now.` Retrying clears partial output first.

- [x] **Step 3: Enforce the best-effort question UI rule**

Track whether a completed visible assistant turn contains `?`. If a later streamed response contains another question, treat it as an interpretation error before committing that response. Keep the server history field bounded and derived only from completed visible turns. Do not describe this as tamper-proof.

- [x] **Step 4: Add distinct direct and callback choices**

After the first user turn—even if interpretation fails—show `Contact Mannan directly` without an API call and `Ask Mannan to contact me`. The latter expands visible labelled contact/reason inputs, prefilled editable reason, exact transcript disclosure, and a second `useTurnstile` instance. Extend `useTurnstile` only enough to support an optional action label and expose its token/reset; existing reveal callers retain current defaults.

- [x] **Step 5: Implement accessible validation and callback submission**

Validate contact/reason locally with the same bounds, connect field errors through `aria-describedby`, and focus the first error. Disable final submission until a fresh callback Turnstile token exists. POST exactly `{ contact, reason, transcript, turnstileToken }`. On 403, preserve fields, reset the widget, and announce `Human verification expired. Please verify again.` On provider acceptance show `Submitted for delivery to Mannan.` On other failure preserve fields and show `Couldn't submit this. You can retry or contact Mannan directly above.` Prevent duplicate submit while pending or after success.

- [x] **Step 6: Keep screen-reader output quiet and lifecycle safe**

Use one polite live region for state transitions only; streamed token/sentence text is not live. Abort interpretation/callback requests on unmount, ignore late state updates, preserve keyboard paths, and ensure reopening the modal resets the optional interaction as before.

- [x] **Step 7: Run typecheck and all focused units**

Run:

```bash
bun run typecheck
bun test src/lib/contact-intent-logic.test.ts src/lib/contact-request.test.ts src/lib/turnstile-verification.test.ts
```

Expected: PASS.

- [x] **Step 8: Commit Task 5**

Stage only the client-owned paths, inspect the staged diff, run the pinned staged Gitleaks scan, and commit with `Build truthful contact alignment flow`.

### Task 6: Rewrite focused browser tests and visual evidence

**Files:**
- Modify: `e2e/helpers/contact-form.ts`
- Replace assertions in: `e2e/contact-form-intent-thread.spec.ts`
- Replace assertions in: `e2e/contact-form-edge-cases.spec.ts`
- Replace assertions in: `e2e/contact-form-adversarial.spec.ts`
- Replace assertions in: `e2e/contact-form-mobile.spec.ts`
- Preserve unrelated reveal tests in: `e2e/contact-form.spec.ts`

- [x] **Step 1: Add framed-stream and callback mocks**

The helper must emit controllable NDJSON frames, split UTF-8 bytes across chunks, stop before `done`, inject malformed/oversized frames, record intent bodies, mock a fresh callback Turnstile widget/token, and record `/api/contact-request` bodies/responses. Do not use real OpenRouter, Turnstile, or Resend calls.

- [x] **Step 2: Prove the truthful primary flow**

Tests cover pre-typing provider disclosure; local `Thanks.` before the first remote frame; honest `Looking for possible overlap…`; progressive actual reflection; no model thank-you; bounded history; one-question heuristic; and the three-turn ceiling. The exact provider request contract is covered by the pure Task 2 test rather than a source-string assertion.

- [x] **Step 3: Prove callback consent and fresh verification**

Tests cover no callback request from typing/interpretation/direct contact; prefilled but editable reason; exact transcript disclosure; field bounds; focus to first error; callback button disabled without a fresh token; exact callback payload; 403 resetting verification without clearing fields; provider acceptance wording; generic failure wording; duplicate-submit prevention; and transcript excluding incomplete reflections.

- [x] **Step 4: Preserve adversarial, mobile, and lifecycle guarantees**

Update XSS/unicode/overflow cases to NDJSON, add malformed/unknown/duplicate/trailing/oversized frames, split UTF-8, upstream error after partial text, close during each request, modal reopen reset, continuous soft-keyboard debounce ceiling, IME, iPhone layout, reduced motion, and the non-chattery live-region assertion.

- [x] **Step 5: Run focused Playwright and inspect screenshots**

Run:

```bash
bunx playwright test \
  e2e/contact-form.spec.ts \
  e2e/contact-form-intent-thread.spec.ts \
  e2e/contact-form-edge-cases.spec.ts \
  e2e/contact-form-adversarial.spec.ts \
  e2e/contact-form-mobile.spec.ts
```

Expected: PASS. Capture and inspect desktop/mobile screenshots of initial disclosure, local thanks/loading, progressive reflection, incomplete reflection, callback editing/verification, provider acceptance, and callback failure. Ensure no private/operational data or browser metadata enters tracked screenshots.

- [x] **Step 6: Commit Task 6**

Stage only the focused test files and deliberately reviewed screenshots, inspect the staged content for personal/operational data, run the pinned staged Gitleaks scan, and commit with `Test contact alignment and callback consent`.

### Task 7: Independent implementation review and final verification

**Files:**
- Modify: `plans/007-contact-intent-alignment.md`
- Modify: `tasks/task-281.md`
- Inspect: only task-281 implementation/test artifacts

- [ ] **Step 1: Run broad local gates**

Run:

```bash
bun run typecheck
bun run test:unit
bun run build
```

Expected: all pass. If build is blocked only by an unavailable external service or environment value, record the exact safe failure and use the strongest available non-production substitute; do not invent a pass.

- [ ] **Step 2: Prove the scoped diff and privacy boundary**

Inspect `git diff 3605f35..HEAD` limited to the plan's owned paths. Confirm the chicken-game `/api/validate-contact` path is unchanged; no credentials, local paths, visitor samples, raw provider errors, or post-commit-generated public data are tracked; visitor fields cannot control mail headers; and no interpretation state claims delivery.

- [ ] **Step 3: Obtain one independent OpenAI implementation review**

Use an adequately routed read-only reviewer to inspect the committed diff, stream parser, cancellation/error cases, best-effort question claims, fresh Turnstile enforcement, callback validation/header isolation, delivery wording, accessibility, and test coverage. Reconcile every material finding and rerun affected gates.

- [ ] **Step 4: Run the final completion check**

Repeat focused unit tests, focused Playwright, typecheck, build or its recorded substitute, pinned staged Gitleaks, credential-ignore checks, legacy-model search, model-slug search, and full scoped diff review. All work-plan milestones require inspected evidence before `PROVEN`.

- [ ] **Step 5: Update durable state and commit**

Increment the work-plan revision atomically; record safe commit/test/review evidence without absolute machine paths, secrets, personal data, or raw logs; mark the final goal `PROVEN` only if every completion milestone and final check passed. Stage only `plans/007-contact-intent-alignment.md` and `tasks/task-281.md`, inspect, scan, and commit with `Verify contact intent alignment`.
