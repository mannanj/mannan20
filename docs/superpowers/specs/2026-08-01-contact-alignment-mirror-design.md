# Contact Alignment Mirror Design

## Status and recovered intent

This design replaces the post-reveal three-turn chatbot created in tasks 269 and 270. Contact details still appear as soon as Turnstile is verified. The optional text area below them becomes a constrained alignment mirror: it acknowledges locally with `Thanks.`, tells the visitor what the system is actually doing, shows only a useful interpretation, and ends with two explicit paths:

1. contact Mannan directly using the already-visible contact information; or
2. deliberately send Mannan the visitor's details and reason for reaching out.

It is not a chatbot, a lead funnel, or a simulation of Mannan speaking in real time.

## Considered approaches

### A. Refine the existing conversation

Keep the terminal transcript, three-turn history, and model-authored replies, but tighten the prompt and add a final send action. This reuses the most code, but the interface still implies a relationship with an assistant and makes it hard to distinguish reflection from delivery. It does not solve the central trust problem.

### B. Use no model

Collect a structured name, contact method, and reason, then offer direct contact or explicit submission. This is easiest to explain and most reliable, but loses the useful moment in which the site helps a visitor make their purpose concrete before deciding whether to send anything.

### C. One-shot alignment mirror — selected

Accept one freeform description, acknowledge it immediately in the browser, ask DeepSeek V4 Flash for a constrained interpretation, then present that interpretation as machine-generated and non-authoritative. The visitor can edit their original text, contact Mannan directly, or explicitly submit details and the original reason. This preserves the useful AI contribution while keeping agency and delivery state legible.

## Experience

### Initial state

Below the revealed email and phone, show one plain text area with the invitation `What are you hoping to connect about?` and a deliberate `Reflect` action. Do not auto-submit while the visitor types. Enter remains ordinary text input behavior; the explicit control initiates processing.

Supporting copy says `Optional. AI can reflect this back before you decide whether to send it. Mannan has not received it.` The existing email and phone links remain the primary direct-contact path.

### Acknowledgement and processing

When the visitor chooses `Reflect`, the browser immediately replaces the invitation with `Thanks.` before waiting on the network. Directly beneath it, a visible status says that an AI is reading the note to reflect back the apparent purpose. The status must not say or imply that Mannan is reading, typing, or has received anything.

The server streams the useful interpretation so the interface can progressively reveal work without manufacturing conversational filler. The visitor's original text stays visible and editable after processing; it is not transformed into a locked chat transcript. Editing a successfully reflected note immediately removes the stale reflection and returns the flow to `draft`. The visitor must deliberately choose `Reflect` again to receive a reflection of the revised text.

### Reflection

The model produces a compact, bounded reflection rather than a reply from Mannan. It may identify:

- the apparent reason for contact;
- the concrete outcome or next step the visitor seems to want;
- one important missing detail, phrased as an observation rather than a follow-up question.

If the message is already clear, the mirror should say so instead of inventing gaps. It must not praise, persuade, classify with internal labels, offer opportunities, make commitments for Mannan, or ask a question. The presentation labels this content `AI reflection` and treats it as a draft the visitor can disagree with. Server validation rejects any returned field containing a question mark or question-shaped lead-in; a missing-detail observation is optional and is omitted when it cannot be stated declaratively.

### Choice and consent

After a successful reflection, preserve two separate choices:

- `Contact directly` keeps the already-visible email and phone prominent and does not transmit visitor data to Mannan.
- `Send this to Mannan` opens a compact submission form for name, reply contact, and reason. The reason is prefilled from the latest reflected draft and remains editable. A short consent line says `This sends your name, reply contact, and reason to Mannan. The AI reflection is not included.`

Only the final `Send to Mannan` action delivers data. Reflection alone never emails Mannan and never records a contact submission. The submission success state says that the note was sent; it must not promise a response. The server sends the original visitor-approved fields, not the model's hidden reasoning. The visible reflection may be included only if the interface explicitly lists it in the consent summary; the first implementation will omit it to keep the payload minimal.

## Architecture and boundaries

### Client component

Replace the thread state machine in `src/components/contact-intent-form.tsx` with a one-shot flow whose states are `draft`, `reflecting`, `reflected`, `reflection-error`, `submitting`, `submitted`, and `submission-error`. The `Reflect` action moves `draft` or `reflection-error` to `reflecting`; success moves to `reflected`; editing from `reflected` moves to `draft` and clears the reflection; opening the consent form preserves `reflected`; the final send moves to `submitting`, then `submitted` or `submission-error`; editing a failed submission moves back to `reflected` while preserving the current fields. Extract pure transition and input-normalization logic when it can be unit tested without React.

The component owns only temporary modal state. Closing and reopening the modal resets it, consistent with the current contact flow. No local storage or analytics event contains the visitor's note.

### Reflection endpoint

Keep `/api/contact-intent` as the reflection endpoint to avoid needless route churn. It accepts one bounded message, applies the existing per-IP rate limit, and calls OpenRouter with `deepseek/deepseek-v4-flash`. The OpenRouter registry in this repository's routing configuration verifies that exact identifier as of 2026-08-01.

The endpoint requests a constrained structured reflection and streams only presentation-safe fields. It never forwards prior conversation history because there is no conversation. The server validates lengths and allowed fields before emitting them. Provider failures return a generic error without provider response bodies, which may contain operational detail.

The old `history` request field, history sanitizer, follow-up-question detector, turn cap, debounce, and transcript selectors are removed. Verification includes a repository search and negative browser assertions so no conversation state, persistence, analytics hook, or legacy request shape remains attached to this route.

### Submission endpoint

Add a dedicated `/api/contact-submission` route. It accepts bounded `name`, `replyContact`, and `reason` strings, rejects missing or malformed fields, rate-limits by IP, and uses the existing server-only `sendEmail` helper to notify Mannan at a server-configured recipient. The recipient and Resend key remain environment variables; no real address or credential is added to tracked files.

The email body is plain text with fixed server-authored labels and bounded visitor values separated by newlines:

```text
Portfolio contact submission

Name: <visitor value>
Reply contact: <visitor value>
Reason:
<visitor value>
```

Visitor values stay in the body and are never interpreted as headers or markup. No visitor input is placed in the subject, recipient, sender, or reply-to headers. The route returns only `sent: true` or a generic safe error. A development environment without email configuration exposes the unavailable state rather than claiming delivery.

The submission endpoint is a new path. `/api/validate-contact` remains untouched because the chicken-game feedback feature still uses it.

## Failure and edge behavior

- Empty or whitespace-only drafts cannot start reflection.
- Oversized input is prevented client-side and rejected server-side.
- A reflection timeout or provider error restores an editable draft and offers a retry while direct contact remains available.
- Stream chunks render in a temporary `AI reflection · working` region. If streaming stops before a valid completion event, that region is cleared, the original draft remains, and the state becomes `reflection-error`; incomplete output is never left looking final.
- A model response that fails the schema is rejected rather than rendered raw.
- Submission failure preserves every entered field and clearly says the note was not sent.
- Duplicate submission is prevented while a request is in flight. A successful form cannot be submitted again within the same modal session.
- All visitor and model text renders as text, never HTML or Markdown.
- IME composition, multiline input, keyboard focus, reduced motion, narrow screens, and screen-reader status announcements remain supported.

## Security and privacy

- Reflection sends the draft to the configured model provider, so nearby copy must say that AI processing occurs before the visitor opts into it.
- The UI must distinguish `processed by AI` from `sent to Mannan` at every state.
- Rate limits apply independently to reflection and submission.
- The server does not log visitor text, model output, email payloads, or provider error bodies.
- Inputs are bounded and normalized, and model output is schema-checked and length-limited.
- The submission email destination is server-controlled; visitors cannot choose arbitrary recipients.
- No new persistence layer is introduced.

## Verification

Pure unit tests cover input normalization, response validation, state transitions, and email text construction. Route tests cover empty, malformed, oversized, rate-limited, provider-failure, invalid-schema, and successful responses without real network calls.

Playwright tests cover:

- no automatic request while typing;
- immediate local `Thanks.` and truthful AI-processing status;
- progressively displayed reflection and the final `AI reflection` label;
- editing and retry after reflection failure;
- direct-contact choice causing no submission request;
- explicit consent form and exact submitted fields;
- success and failure delivery states;
- XSS, long text, Unicode, IME, mobile keyboard, reduced motion, and modal reopen reset;
- absence of the old terminal transcript, follow-up questions, and three-turn behavior.
- editing a reflected draft clearing the stale reflection and requiring an explicit second `Reflect` action;
- the submission reason using the latest reflected draft rather than an older snapshot;
- absence of legacy `history` payloads, state, persistence, or analytics behavior.

Typecheck, the complete unit suite, focused contact Playwright suites, and the repository secret scan must pass. Screenshot evidence covers the draft, reflecting, reflected-choice, submission, submitted, and degraded states.

## Non-goals

- No open-ended conversation, message history, or model persona.
- No automatic lead scoring, CRM, database, analytics, or follow-up automation.
- No promise that Mannan will reply.
- No change to Turnstile reveal behavior, the contact details themselves, or the chicken-game validation flow.
- No production deployment or secret configuration in this work cycle.
