### Task 281: Make the contact-intent experience honest, useful, and visitor-directed

Status: active

#### User intent

The post-reveal contact experience is not a conventional contact form or an AI receptionist. Its purpose is to surface mutually aligned intent or interest on Mannan's personal site while keeping the interaction light, low-commitment, and easy to leave.

Visitors should be able to explore why they came—such as a role, project, collaboration, consulting engagement, creative idea, speaking or media invitation, introduction, shared interest, or reconnection—without having to arrive with a polished proposal. The experience should help them express tentative intent and recognize possible overlap without forcing them into fixed categories.

The visitor keeps the choice and power:

- They may use Mannan's already-revealed email or phone and contact him directly.
- They may explicitly ask Mannan to contact them by providing their own contact details and a meaningful reason.
- They may stop without sending anything to Mannan.

Mannan will not be invited to follow up when no reason is given, unless the visitor already knows him and says enough to establish that existing context.

#### Truthful interaction requirements

- Do not say “Thanks for reaching out” because typing into the assistant has not contacted Mannan.
- Immediately acknowledge submitted text with the neutral local message `Thanks.`—no exclamation point and no manufactured enthusiasm.
- Progressively disclose what is actually happening. Show an honest processing label and spinner while the text is being interpreted, then reveal useful model output as it arrives.
- Never claim that Mannan saw, received, saved, or will answer a message unless the visitor explicitly submits the callback form and that submission succeeds.
- DeepSeek must not repeat the local thank-you. Its only job is to reflect plausible mutual alignment, identify a useful next step, or ask at most one genuinely helpful question.
- Prefer calibrated uncertainty over false-positive enthusiasm. If there is not enough substance to identify overlap, say so lightly and let the visitor choose what to add.

#### Product requirements

- Replace DeepSeek V3.2 with OpenRouter model `deepseek/deepseek-v4-flash`.
- Keep the compact terminal-inspired visual language, but make its states legible and accessible.
- Preserve the existing three-turn ceiling and rate limiting.
- Stream the useful model response rather than waiting silently for one completed block.
- Add an explicit, reviewable “ask Mannan to contact me” path. Require contact details and a reason; disclose that submitting it sends those details and the conversation context to Mannan.
- Require a fresh, single-use Turnstile verification for the callback submission; the reveal token has already been consumed and cannot authorize email delivery.
- Reuse the site's existing server-side email utility. Do not add client-visible credentials or persist data merely for analytics.
- Make failure states truthful: interpretation failure must not erase the visitor's words, and callback failure must not claim delivery.

#### Acceptance

- Focused unit and end-to-end tests cover neutral acknowledgment, honest progress, framed streamed output, no false delivery language, model selection, explicit callback consent, reason/contact validation, fresh Turnstile proof, provider acceptance, and failure.
- Typecheck and the repository unit suite pass.
- The contact modal is screenshot-checked at desktop and mobile widths.
- An independent reviewer finds no unresolved material product, security, accessibility, or correctness issue.

- Design: `docs/superpowers/specs/2026-08-01-contact-intent-alignment-design.md`
- Work plan: `plans/007-contact-intent-alignment.md`
