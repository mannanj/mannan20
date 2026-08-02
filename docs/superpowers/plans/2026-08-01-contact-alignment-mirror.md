# Contact Alignment Mirror Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the post-reveal contact chatbot with a one-shot AI reflection and a separate, explicitly consented email submission.

**Architecture:** Keep Turnstile reveal and the existing contact cards unchanged. Refactor the contact-intent logic into pure validation/formatting helpers, make `/api/contact-intent` return newline-delimited stream events only after validating the complete model result, add a server-only `/api/contact-submission` endpoint, and replace the transcript UI with an explicit state machine. No note is sent to Mannan until the visitor submits the consent form.

**Tech Stack:** Next.js 15 route handlers, React 19, TypeScript, Bun tests, Playwright, Upstash rate limiting, OpenRouter, Resend.

**Protected-worktree rule:** Touch only the files named below. Do not stage, alter, format, or revert the unrelated dirty paths recorded in `tasks/task-281.md`. Do not modify `/api/validate-contact` or the chicken-game flow.

---

## File map

- Modify `src/lib/types.ts`: replace chat result/turn types with reflection and stream-event types.
- Replace `src/lib/contact-intent-logic.ts`: validate provider output, reject question-shaped text, format the visitor-visible reflection, and encode NDJSON events.
- Replace `src/lib/contact-intent-logic.test.ts`: unit coverage for the new reflection contract and removal of history behavior.
- Create `src/lib/contact-submission.ts`: normalize consented visitor fields and build the fixed plain-text email body.
- Create `src/lib/contact-submission.test.ts`: validation and email-body tests.
- Modify `src/lib/rate-limit.ts`: add independent reflection and submission limiters using existing Upstash/memory fallback patterns.
- Replace `src/app/api/contact-intent/route.ts`: one request, no history, exact DeepSeek V4 Flash slug, validated NDJSON stream, safe failures.
- Create `src/app/api/contact-submission/route.ts`: validate, rate-limit, and email a server-controlled recipient.
- Replace `src/components/contact-intent-form.tsx`: explicit reflection and consent UI state machine.
- Modify `e2e/helpers/contact-form.ts`: NDJSON reflection and submission mocks.
- Replace `e2e/contact-form-intent-thread.spec.ts` with `e2e/contact-form-alignment-mirror.spec.ts`: primary behavior and consent tests.
- Modify `e2e/contact-form-edge-cases.spec.ts`, `e2e/contact-form-adversarial.spec.ts`, and `e2e/contact-form-mobile.spec.ts`: remove debounce/chat assumptions and preserve relevant resilience checks.
- Keep `src/components/contact-result.tsx` unchanged unless a test proves spacing or accessibility needs a local wrapper adjustment.

### Task 1: Define and test the reflection contract

**Files:**
- Modify: `src/lib/types.ts`
- Replace: `src/lib/contact-intent-logic.ts`
- Replace: `src/lib/contact-intent-logic.test.ts`

- [ ] **Step 1: Write failing tests for normalized reflection output**

Replace the old history/question tests with cases for valid fields, required fields, length bounds, non-string values, question marks, question-shaped lead-ins, formatting, and stream encoding. Use this public contract in the test imports:

```ts
import {
  MAX_MESSAGE_LENGTH,
  formatReflection,
  normalizeReflection,
  streamReflection,
} from './contact-intent-logic';

expect(normalizeReflection({
  purpose: 'Discuss a product role',
  desiredOutcome: 'Arrange an introductory call',
  missingDetail: 'The company name is not included.',
})).toEqual({
  purpose: 'Discuss a product role',
  desiredOutcome: 'Arrange an introductory call',
  missingDetail: 'The company name is not included.',
});
expect(normalizeReflection({ purpose: 'Why this role?', desiredOutcome: 'Talk' })).toBeNull();
expect(normalizeReflection({ purpose: 'Discuss a role', desiredOutcome: 'Could you talk' })).toBeNull();
expect(formatReflection({ purpose: 'Discuss a role', desiredOutcome: 'Arrange a call' }))
  .toBe('You seem to be reaching out to discuss a role. The next step you want is to arrange a call.');
expect(streamReflection('Clear reflection')).toEqual([
  '{"type":"chunk","text":"Clear "}\n',
  '{"type":"chunk","text":"reflection"}\n',
  '{"type":"done"}\n',
]);
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `bun test src/lib/contact-intent-logic.test.ts`

Expected: FAIL because the old history exports remain and the new reflection exports do not exist.

- [ ] **Step 3: Replace the chat types and implement the pure helpers**

In `src/lib/types.ts`, remove `ContactIntentResult` and `ContactIntentTurn`, then add:

```ts
export interface ContactReflection {
  purpose: string;
  desiredOutcome: string;
  missingDetail?: string;
}

export type ContactReflectionStreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'done' };
```

In `src/lib/contact-intent-logic.ts`, keep `MAX_MESSAGE_LENGTH = 1000`, cap each provider field at 160 characters, require non-empty `purpose` and `desiredOutcome`, allow an optional `missingDetail`, and reject text containing `?` or a case-insensitive lead-in matching `^(who|what|when|where|why|how|can|could|would|will|do|does|did|is|are|may|might|should)\b`. `formatReflection` must build declarative sentences and omit the missing-detail sentence when absent. `streamReflection` must split the validated final string into whitespace-preserving word chunks and append one `done` event.

- [ ] **Step 4: Run focused tests and search for legacy exports**

Run: `bun test src/lib/contact-intent-logic.test.ts`

Expected: PASS.

Run: `rg -n "sanitizeHistory|alreadyAskedQuestion|ContactIntentTurn|MAX_HISTORY_ENTRIES" src e2e`

Expected: matches remain only in files scheduled for replacement in later tasks; none remain in the new logic or test files.

- [ ] **Step 5: Commit the contract**

```bash
git add src/lib/types.ts src/lib/contact-intent-logic.ts src/lib/contact-intent-logic.test.ts
git diff --cached --name-status
bun run security:secrets
git commit -m "Refactor contact intent into reflection contract"
```

### Task 2: Replace the chat route with a validated reflection stream

**Files:**
- Modify: `src/lib/rate-limit.ts`
- Replace: `src/app/api/contact-intent/route.ts`
- Test: `src/lib/contact-intent-logic.test.ts`

- [ ] **Step 1: Add failing assertions for safe event construction**

Add tests proving every emitted line parses as `ContactReflectionStreamEvent`, the final event is exactly `{ type: 'done' }`, and HTML/Markdown-looking strings remain inert JSON text.

- [ ] **Step 2: Run the focused test and verify the new assertion fails**

Run: `bun test src/lib/contact-intent-logic.test.ts`

Expected: FAIL until the encoder produces the exact NDJSON contract.

- [ ] **Step 3: Add independent contact rate limits**

Follow the existing `limitFeedback` pattern in `src/lib/rate-limit.ts`. Add 10 requests/hour/IP for reflection and 4 requests/hour/IP for submission, with distinct Upstash prefixes and distinct memory keys:

```ts
export async function limitContactReflection(ip: string): Promise<LimitResult>;
export async function limitContactSubmission(ip: string): Promise<LimitResult>;
```

- [ ] **Step 4: Replace `/api/contact-intent`**

The route must:

1. safely parse JSON and return 400 for a missing, non-string, blank, or over-1000-character `message`;
2. derive the IP using the repository's last-forwarded-address convention and call `limitContactReflection`;
3. return 429 with `retry-after` when limited;
4. return 503 when `OPENROUTER_API_KEY` is absent;
5. call `https://openrouter.ai/api/v1/chat/completions` with model `deepseek/deepseek-v4-flash`, no history field, and a `record_reflection` tool requiring `purpose` and `desiredOutcome` with optional `missingDetail`;
6. instruct the model to reflect rather than reply, never ask questions, never speak as Mannan, and omit a missing detail when none matters;
7. avoid including provider response bodies in application errors;
8. run tool arguments through `normalizeReflection`, then `formatReflection`;
9. return a `ReadableStream` of `streamReflection(...)` entries with `content-type: application/x-ndjson; charset=utf-8` and `cache-control: no-store`;
10. return a generic 502 JSON error for provider, schema, or parse failures.

The provider request itself is not streamed: validation completes first, and the server then streams only safe visitor-visible interpretation. This preserves the design's trust boundary.

- [ ] **Step 5: Run focused and broad unit checks**

Run: `bun test src/lib/contact-intent-logic.test.ts`

Expected: PASS.

Run: `bun run typecheck`

Expected: temporary failures are allowed only in `src/components/contact-intent-form.tsx` because it still imports the removed chat types; no route or helper error remains.

- [ ] **Step 6: Commit the route**

```bash
git add src/lib/rate-limit.ts src/app/api/contact-intent/route.ts src/lib/contact-intent-logic.test.ts
git diff --cached --name-status
bun run security:secrets
git commit -m "Stream validated contact reflections"
```

### Task 3: Build the explicit contact-submission boundary

**Files:**
- Create: `src/lib/contact-submission.ts`
- Create: `src/lib/contact-submission.test.ts`
- Create: `src/app/api/contact-submission/route.ts`
- Modify: `src/lib/rate-limit.ts` only if Task 2 did not add `limitContactSubmission`

- [ ] **Step 1: Write failing normalization and email tests**

Cover non-object input; blank, non-string, and oversized fields; CRLF normalization; exact returned values; and the exact body format. The central success assertion is:

```ts
const submission = normalizeContactSubmission({
  name: ' Sam ',
  replyContact: ' sam@example.test ',
  reason: ' Discuss a role. ',
});
expect(submission).toEqual({
  name: 'Sam',
  replyContact: 'sam@example.test',
  reason: 'Discuss a role.',
});
expect(buildContactSubmissionEmail(submission!)).toBe(
  'Portfolio contact submission\n\n' +
  'Name: Sam\n' +
  'Reply contact: sam@example.test\n' +
  'Reason:\n' +
  'Discuss a role.'
);
```

- [ ] **Step 2: Run the new test and verify red**

Run: `bun test src/lib/contact-submission.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure submission helper**

Export `MAX_CONTACT_NAME_LENGTH = 100`, `MAX_REPLY_CONTACT_LENGTH = 254`, and `MAX_CONTACT_REASON_LENGTH = 1000`. `normalizeContactSubmission(raw)` returns `{ name, replyContact, reason } | null`, trims outer whitespace, normalizes `\r\n?` to `\n`, requires all three values, and rejects values over their caps. `buildContactSubmissionEmail` uses only fixed labels and body text; it must not build a subject or headers.

- [ ] **Step 4: Implement `/api/contact-submission`**

The route safely parses JSON, validates before rate limiting, uses `limitContactSubmission`, and requires both `RESEND_API_KEY` and `CONTACT_SUBMISSION_TO`. Call:

```ts
await sendEmail({
  to: process.env.CONTACT_SUBMISSION_TO,
  subject: 'Portfolio contact submission',
  text: buildContactSubmissionEmail(submission),
});
```

Return `{ sent: true }` only when `sendEmail` reports `sent: true`. Return generic 400, 429, or 503 responses otherwise. Never use visitor values in headers, never echo the submitted values, and never log the payload.

- [ ] **Step 5: Run tests and typecheck the server boundary**

Run: `bun test src/lib/contact-submission.test.ts src/lib/contact-intent-logic.test.ts`

Expected: PASS.

Run: `bun run typecheck`

Expected: no errors in the submission helper or route; the old client may still be the only failure.

- [ ] **Step 6: Commit the submission boundary**

```bash
git add src/lib/contact-submission.ts src/lib/contact-submission.test.ts src/app/api/contact-submission/route.ts src/lib/rate-limit.ts
git diff --cached --name-status
bun run security:secrets
git commit -m "Add consented contact submission endpoint"
```

### Task 4: Replace the transcript with the alignment-mirror UI

**Files:**
- Replace: `src/components/contact-intent-form.tsx`
- Modify only if required by verified layout: `src/components/contact-result.tsx`

- [ ] **Step 1: Add the new state model and exact copy**

Use:

```ts
type ReflectionStatus =
  | 'draft'
  | 'reflecting'
  | 'reflected'
  | 'reflection-error'
  | 'submitting'
  | 'submitted'
  | 'submission-error';

interface SubmissionFields {
  name: string;
  replyContact: string;
  reason: string;
}
```

Render exact trust copy from the design, a normal multiline textarea, and a `Reflect` button. Typing must never call either endpoint. `Thanks.` appears synchronously when `Reflect` is clicked, and `AI is reading your note to reflect back its apparent purpose. Mannan has not received it.` is the `aria-live` processing status.

- [ ] **Step 2: Implement robust NDJSON reading**

Read `response.body` with a `TextDecoder`, preserve incomplete lines between chunks, accept only `{ type: 'chunk', text: string }` and `{ type: 'done' }`, and require exactly one completion event. Render accumulated chunks under `AI reflection · working`; on completion relabel it `AI reflection`. If parsing, HTTP, reading, or completion fails, clear all partial output, retain the draft, and show `That reflection did not finish. Your note was not sent. You can retry or contact Mannan directly.`

- [ ] **Step 3: Implement edit invalidation and the two choices**

Editing in `reflected` clears the old reflection and returns to `draft`; it never auto-reflects. After a valid reflection, render `Contact directly` as a focus/link action that highlights or focuses the existing contact card without an API call, and `Send this to Mannan` as the control that opens the consent fields. Prefill `reason` from the latest reflected draft.

- [ ] **Step 4: Implement explicit submission**

Show name, reply contact, and editable reason plus the exact consent text. Disable the final button while any field is blank or a request is in flight. POST exactly `{ name, replyContact, reason }` to `/api/contact-submission`. On success show `Sent to Mannan. This does not guarantee a reply.` On failure preserve fields and show `This was not sent. Try again or contact Mannan directly.` Prevent a second successful submit within the modal session.

- [ ] **Step 5: Preserve accessibility and modal lifecycle**

Use associated labels, visible focus states, `aria-live="polite"` for processing and delivery status, `aria-busy` during each request, and no animation dependency. Keep all text rendered as React text. Abort in-flight fetches on unmount so closing during reflection or submission cannot update an unmounted flow. Reopening creates a fresh component state as it does today.

- [ ] **Step 6: Run typecheck and the focused unit suite**

Run: `bun run typecheck`

Expected: PASS.

Run: `bun test src/lib/contact-intent-logic.test.ts src/lib/contact-submission.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the UI**

```bash
git add src/components/contact-intent-form.tsx src/components/contact-result.tsx
git diff --cached --name-status
bun run security:secrets
git commit -m "Replace contact chat with alignment mirror"
```

### Task 5: Rewrite browser coverage around honesty and consent

**Files:**
- Modify: `e2e/helpers/contact-form.ts`
- Delete: `e2e/contact-form-intent-thread.spec.ts`
- Create: `e2e/contact-form-alignment-mirror.spec.ts`
- Modify: `e2e/contact-form-edge-cases.spec.ts`
- Modify: `e2e/contact-form-adversarial.spec.ts`
- Modify: `e2e/contact-form-mobile.spec.ts`

- [ ] **Step 1: Replace response helpers with NDJSON and submission mocks**

Add helpers that fulfill reflection responses as `application/x-ndjson` with one or more chunk events followed by `done`, optionally delay chunks, and record request bodies. Add a submission mock that records its request and returns `{ sent: true }`. Remove JSON `{ message }` helpers.

- [ ] **Step 2: Write primary-flow tests before adjusting the component**

The new alignment-mirror spec must prove:

1. typing and waiting causes zero reflection requests;
2. clicking `Reflect` immediately shows `Thanks.` and the truthful processing copy;
3. safe chunks appear progressively, then finalize under `AI reflection`;
4. request body is exactly `{ message }` with no `history`;
5. editing after reflection clears it and requires a second click;
6. `Contact directly` causes zero submission requests;
7. the consent form pre-fills the latest reflected draft;
8. final submission sends exactly the three visible fields;
9. submission success and failure claims are truthful;
10. interrupted streams remove partial output and preserve the draft;
11. closing and reopening resets all temporary state.

Use stable selectors: `contact-intent-textarea`, `contact-reflect`, `contact-reflection-status`, `contact-reflection`, `contact-direct`, `contact-send-choice`, `contact-submission-name`, `contact-submission-reply`, `contact-submission-reason`, `contact-submission-consent`, `contact-submit`, and `contact-submission-status`.

- [ ] **Step 3: Rewrite edge, adversarial, and mobile expectations**

Remove debounce, soft-keyboard-storm autosend, turn-lock, follow-up-question, and turn-cap tests. Preserve whitespace-disabled behavior, IME entry, Unicode, XSS-as-text, long-input bounds, narrow viewport, reduced-motion, close-during-request, and modal reset. Mobile tests should prove typing remains stable under synthetic keyboard edits and only an explicit button click sends.

- [ ] **Step 4: Run the focused Playwright suite and inspect screenshots**

Run:

```bash
bunx playwright test \
  e2e/contact-form.spec.ts \
  e2e/contact-form-alignment-mirror.spec.ts \
  e2e/contact-form-edge-cases.spec.ts \
  e2e/contact-form-adversarial.spec.ts \
  e2e/contact-form-mobile.spec.ts
```

Expected: PASS with screenshots for draft, reflecting, reflected choices, consent form, submitted, reflection error, and submission error. Inspect each screenshot for clipping, misleading delivery language, focus visibility, and stale transcript UI.

- [ ] **Step 5: Prove legacy behavior is gone**

Run:

```bash
rg -n "ContactIntentTurn|sanitizeHistory|alreadyAskedQuestion|MAX_HISTORY_ENTRIES|TURN_CAP|DEBOUNCE_MS|contact-intent-turn|history:" src e2e
```

Expected: no matches.

- [ ] **Step 6: Commit browser coverage**

```bash
git add e2e/helpers/contact-form.ts e2e/contact-form-intent-thread.spec.ts e2e/contact-form-alignment-mirror.spec.ts e2e/contact-form-edge-cases.spec.ts e2e/contact-form-adversarial.spec.ts e2e/contact-form-mobile.spec.ts e2e/screenshots
git diff --cached --name-status
bun run security:secrets
git commit -m "Test contact alignment mirror consent flow"
```

### Task 6: Broad verification, independent review, and durable closeout

**Files:**
- Modify: `tasks/task-281.md`
- Inspect only: all task-281 implementation and test files

- [ ] **Step 1: Run repository gates**

Run:

```bash
bun run typecheck
bun run test:unit
bun run security:secrets
```

Expected: all pass. The unit baseline must remain at least the recovered 121 tests, plus the new tests.

- [ ] **Step 2: Inspect the complete task diff**

Run `git diff 7462c70..HEAD --` followed by the exact task-281 path list. Confirm no unrelated file, real address, credential, local path, provider response body, visitor-data log, or chicken-game change entered the diff.

- [ ] **Step 3: Obtain one independent OpenAI review**

Route a read-only reviewer at least at the implementation producer's tier. Ask it to inspect the diff for consent/delivery truthfulness, stream completion handling, untrusted input boundaries, exact recipient control, stale chatbot behavior, accessibility, and test gaps. Reconcile every material finding and rerun affected checks.

- [ ] **Step 4: Run the final completion check**

Repeat typecheck, unit tests, focused Playwright, secret scan, legacy-symbol search, staged diff inspection, and local-credential ignore checks. Confirm every milestone in task 281 has inspected evidence.

- [ ] **Step 5: Update and commit the work plan**

Increment the plan revision, record commit IDs and check outputs without absolute machine paths or personal data, mark milestones `PROVEN` only where evidence exists, and set the project to `PROVEN` only after the final check passes.

```bash
git add tasks/task-281.md
git diff --cached --name-status
git diff --cached
bun run security:secrets
git commit -m "Verify contact alignment mirror"
```
