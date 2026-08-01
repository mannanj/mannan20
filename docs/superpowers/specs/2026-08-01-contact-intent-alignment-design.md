# Contact Intent Alignment Design

Date: 2026-08-01
Status: accepted under the autonomous `work` authorization; independent review findings reconciled

## Purpose

The contact modal already reveals Mannan's email and phone after human verification. The optional area beneath those details should make uncertain, early-stage contact more comfortable and help a visitor recognize possible mutual interest. It must not pretend that typing into the assistant contacts Mannan.

Success means the visitor can express an unfinished thought, receive a short and calibrated reflection of possible overlap, and retain control over whether to contact Mannan directly, explicitly invite a response, continue once or twice, or leave.

## Approaches considered

### 1. Scripted intent menu

Offer fixed choices such as role, project, collaboration, speaking, or reconnecting, followed by fixed guidance. This is maximally predictable and cheap, but it turns an open-ended personal-site interaction into a category picker and handles ambiguous or unusual opportunities poorly.

### 2. Constrained alignment mirror with explicit handoff (selected)

Accept free text, acknowledge it locally, and use a tightly prompted model only to reflect plausible overlap or ask one useful question. Keep contacting Mannan as a separate, explicit user action. This preserves openness while preventing the model from impersonating Mannan or inventing delivery.

### 3. Full conversational lead agent

Let an agent interview, qualify, collect details, and decide when to notify Mannan. This could gather more structured information, but it shifts power away from the visitor, adds commitment and friction, and creates too much room for false authority on a personal site.

## Interaction design

### Initial state

The existing email and phone remain the primary actions. Beneath them, the terminal field uses a prompt such as `What could we explore together?` with quiet supporting examples in the placeholder: a project, role, collaboration, idea, invitation, introduction, reconnection, or something else. Examples are invitations, not categories.

No data is sent while the field is empty. Before typing, adjacent copy says: `AI interpretation: your text is sent to DeepSeek through OpenRouter. Don't include confidential information.` The existing pause-to-submit behavior remains so the interaction stays lightweight; Enter may submit immediately and Shift+Enter inserts a newline.

### Interpretation sequence

Once text is submitted, the UI immediately locks and echoes the visitor's text, then renders `Thanks.` locally. This is an acknowledgment of input only. It does not come from the model and does not imply delivery to Mannan.

The next line shows a spinner and `Looking for possible overlap…`. This label accurately describes the request to the model. When response text starts arriving, the progress label gives way to the streamed reflection in the existing green terminal-output treatment. The UI exposes the state through an `aria-live` region and does not fake model tokens before they arrive.

If interpretation fails, the visitor's text stays visible and editable or retryable. The UI says `Couldn't interpret that just now.` It does not say the message failed to send, because no message was being sent to Mannan.

### Model behavior

OpenRouter uses `deepseek/deepseek-v4-flash` without reasoning mode for low latency. The model receives the bounded conversation history and is instructed to produce one concise, useful contribution:

- reflect a specific plausible overlap with Mannan's work or interests when supported by context;
- offer one concrete next step that preserves visitor choice; or
- ask one brief clarifying question when the visitor's idea is too vague to act on.

It must not thank the visitor, speak as Mannan, promise a reply, claim delivery or persistence, manufacture excitement, infer unsupported fit, classify the visitor, or pressure them to disclose contact details. One response may contain at most one question mark. If any sanitized assistant turn in the visible client-supplied history contains a question mark, the prompt forbids another question and the client rejects a second questioning response. This is a best-effort experience rule, not a security guarantee: an adversarial caller can omit client history, and no persistence is added merely to make this conversational constraint tamper-proof. The response has a server-enforced complete-sentence ceiling that avoids mid-sentence character slicing.

### Visitor-directed next actions

After the first interpretation, two paths remain visibly distinct:

1. `Contact Mannan directly` keeps attention on the email and phone already shown above; no additional submission occurs.
2. `Ask Mannan to contact me` expands a small form inside the same modal.

The callback form asks for one contact field and a reason. The current conversation can prefill the reason, but the visitor must be able to edit and review it. Immediately above submission, disclose: `This sends your contact details, reason, and this short conversation to Mannan.` The action label is `Send to Mannan`, making the state change explicit.

The expanded callback form obtains a fresh Turnstile token separate from the token already consumed during contact reveal. The final request includes that token, and the Next route verifies it through the existing siteverify Worker before attempting email. Missing, invalid, expired, or replayed proof returns `Human verification expired. Please verify again.` and resets the callback widget without clearing visitor fields.

When the email provider accepts the request, show `Submitted for delivery to Mannan.` This claims provider acceptance, not recipient delivery. On failure, keep every field intact and show `Couldn't submit this. You can retry or contact Mannan directly above.`

## Architecture and boundaries

### `ContactIntentForm`

Owns the client state machine, terminal transcript, honest status copy, streaming reader, turn limit, and expansion of the callback form. It does not decide whether an opportunity is aligned and does not send email directly.

States are explicit rather than inferred from partial data:

`editing → interpreting → reflecting → ready`

with `interpretation_error`, `callback_editing`, `callback_sending`, `callback_sent`, and `callback_error` branches.

### `/api/contact-intent`

Validates and bounds input/history, rate-limits by IP, invokes DeepSeek V4 Flash, and streams only the final answer text to the client. It owns prompt construction and output bounds. It does not persist the visitor's content or forward it to Mannan. It transmits only the bounded inference input to OpenRouter/DeepSeek; content reaches Mannan only through the separately disclosed, explicit callback submission.

Use UTF-8 NDJSON with `Content-Type: application/x-ndjson; charset=utf-8`. Each line is exactly one frame:

- `{"type":"meta","version":1}` begins a valid stream;
- `{"type":"text","value":"..."}` carries actual normalized provider text;
- `{"type":"done"}` is the only successful completion marker; or
- `{"type":"error","code":"upstream"}` ends an unsuccessful stream without provider details.

Each encoded frame is at most 4 KiB, the client retains at most 8 KiB of an incomplete line, and total visible model text is capped at 480 characters on both server and client. A streaming `TextDecoder` preserves UTF-8 characters split across network chunks. The client requires one `meta` first, accepts text frames until one terminal frame, and rejects trailing or unknown frames. If the upstream disconnects after partial text, keep the partial reflection visible with an `Incomplete reflection` label, enter `interpretation_error`, and exclude that partial assistant text from callback transcript data. Retrying clears the partial reflection before a new request. If OpenRouter streaming cannot be reliably normalized, the fallback is an honest non-streamed response while retaining the same state labels; simulated typing is out of scope.

### `/api/contact-request`

Accepts an explicitly submitted contact method, reason, bounded transcript, and fresh Turnstile token. It verifies the single-use token through the existing siteverify Worker, validates required fields and limits, rate-limits independently, and uses the existing server-only `sendEmail` utility to notify `CONTACT_REQUEST_TO`, defaulting to the already-public site contact address. It returns success only when the email provider accepts the request. It does not place secrets or operational details in client responses.

The contact method is trimmed, 3–254 characters, and may be an email address, telephone number, or messaging handle; the reason is trimmed, 10–1000 characters. The transcript contains at most three user and three completed assistant turns, caps user turns at 1000 characters and assistant turns at 480 characters, and caps the serialized transcript at 4000 characters. Partial/error output is excluded. Visitor values appear only in the plain-text body under fixed labels and can never control recipient, sender, reply-to, subject, or other headers. HTML rendering is unnecessary.

### Pure logic

Move request normalization, output sentence-boundary trimming, callback validation, and stream-frame parsing into small pure functions with unit tests. Keep React rendering separate from protocol and policy logic.

## Privacy and safety

- The interpretation path discloses beside the empty input, before typing, that text is sent to DeepSeek through OpenRouter and warns against confidential information.
- The callback path separately discloses exactly what will be sent to Mannan.
- Callback submission requires affirmative action; typing or model interpretation never triggers it.
- Contact details remain server-bound and are not sent back to DeepSeek unless the visitor included them in the conversation text themselves.
- Input, history, response, and callback fields are length-bounded. React renders model and visitor content as text only.
- Rate limits apply to both interpretation and callback endpoints.

## Error handling

- Empty input stays local and triggers no request.
- A rate-limited interpretation keeps the visitor's text and offers retry later.
- A broken or malformed model stream ends in `interpretation_error` without fabricating a completion.
- An empty model response removes the spinner and offers the visitor their direct/callback choices without inventing text.
- Callback validation errors are field-specific and preserve entered values.
- Provider failure is reported as not submitted; the UI treats `sendEmail` success as provider acceptance and never claims recipient delivery.
- Missing, invalid, expired, or replayed callback Turnstile proof prevents email and preserves the entered callback fields.

## Accessibility contract

The callback inputs have visible labels. Each field error is connected with `aria-describedby`, and a failed submit moves focus to the first invalid field. One polite live region announces state transitions such as interpretation started, interpretation complete, callback verification required, callback accepted, or callback failed. Streamed text remains visually progressive but is not itself live, avoiding token-by-token screen-reader chatter. Keyboard-only operation covers immediate Enter submission, Shift+Enter newline insertion, callback expansion, verification, final submit, retry, and direct-contact links.

## Testing and verification

Unit tests cover history sanitization, the defined best-effort one-question heuristic, safe complete-sentence bounds, callback validation, Turnstile-proof handling, and the exact stream framing/parsing grammar. Route tests mock OpenRouter, siteverify, and Resend boundaries where practical.

Playwright covers the pre-typing AI disclosure, immediate `Thanks.`, honest loading text, progressively streamed reflection, split UTF-8 chunks, malformed/oversized/incomplete streams, no second thank-you, the three-turn ceiling, interpretation error recovery, callback disclosure and explicit submit, rejected missing reason/contact, missing/invalid/replayed Turnstile proof, provider acceptance, failed submission, XSS-safe rendering, keyboard navigation, focus-on-first-error, and non-chattery live-region behavior. Existing mobile input-storm coverage remains.

Final verification includes unit tests, focused contact e2e tests, typecheck, production build when environment permits, secret scan before commit, and desktop/mobile screenshots.

## Explicit non-goals

- No autonomous qualification score or hidden opportunity categories.
- No CRM, analytics capture, or general transcript persistence.
- No automatic callback request inferred from conversation text.
- No simulated token stream or vague `Sending…` label during interpretation.
- No deployment or production secret mutation in this work.
