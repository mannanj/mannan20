### Task 270: Turn the post-reveal intent capture into an inline conversation thread

Captured only, not started — Mannan said "spend a moment ideating a new task file for this, don't jump into it."

Follows directly from task-269 (`src/components/contact-intent-form.tsx`, `src/app/api/contact-intent/route.ts`), which shipped a single-shot optional capture: one textarea, one debounced auto-submit, one freeform thank-you reply. Mannan now wants that turned into a lightweight back-and-forth conversation that still visually looks like one plain input box.

#### What Mannan asked for (verbatim intent, cleaned up)
- [ ] Remove the separate "(Optional) Share what brought you here today" header line — fold that copy into the textarea's placeholder instead, so there's just one input, no header above it.
- [ ] Drop the current debounce/staleness-guard machinery (`DEBOUNCE_MS`, `MAX_PENDING_MS`, `pendingSinceRef`, `latestTextRef`, `inFlightTextRef`) in favor of something simpler suited to a turn-based exchange rather than continuous validate-as-you-type.
- [ ] Loosen the LLM's job from "classify into 5 fixed categories, then thank" to "recognize any legitimate response, including types outside the current taxonomy" — i.e. more open-ended intent recognition, not a fixed enum.
- [ ] After a reply comes back, the user's submitted message + the AI's reply become **view-only** and stay visible, stacked in order, inside the same input container — the user cannot edit a past turn once it's been answered.
- [ ] A new editable area appears below that history for the next turn. If the AI's reply was itself a question, the user can answer it there, continuing the thread.
- [ ] While waiting for a new reply, show a loading indicator at the bottom-right of the input (this part already exists as of the task-269 follow-up fix — must carry forward into the new design, not regress).
- [ ] Visually, all of this must look like it's happening **inside one plain input box** — the existing textarea's look (border, radius, background, padding, font) must not change.

#### Why this needs design thought before code (the hard part)
A native `<textarea>` cannot have mixed read-only/editable regions — its content is one flat, fully-editable string. "View-only past turns + editable latest turn, all inside what looks like a single textarea" cannot be built with a real `<textarea>` alone. This needs a look-alike custom component: a bordered container styled identically to today's textarea, containing (a) rendered, non-editable past turns (plain divs/paragraphs, not form elements) stacked in scroll order, and (b) a real, small, unstyled-border textarea or content-editable line pinned at the bottom for the active turn — visually seamless, structurally two different things. Get the container styling (border, radius, background, padding, font, scroll behavior) pixel-identical to what's live today so nothing about the box itself appears to change.

#### Open questions to resolve with Mannan before implementing
- [ ] Submit trigger for each turn: keep the current auto-fire-after-a-pause behavior (implied by "we will load and show something" — i.e. still automatic, no button), or move to an explicit trigger (Enter to send, Shift+Enter for a newline)?
- [ ] Visual treatment of past turns: plain stacked text (current green-text style for AI replies, default color for the user's own past message), or something more distinct (e.g. a subtle label/prefix distinguishing "you" vs the reply)?
- [ ] Does conversation history persist across modal close/reopen within a session (the whole modal currently unmounts on close, resetting all local state), or is each reopen a fresh start? If it should persist, where does that state live — the existing `AppContext`, or something new?
- [ ] Is there a turn limit, or a point where the thread should visually "wrap up" (e.g. after N exchanges)? Relatedly: `/api/contact-intent` is rate-limited to 10 requests/hour/IP — a real back-and-forth could burn through that fast; does the limit need to change for multi-turn use, or is 10 turns/hour actually the right ceiling?
- [ ] Should the LLM's ability to ask a follow-up question be an explicit, deliberate feature (system-prompt instruction: "you may ask one clarifying question if genuinely useful"), or should it just emerge naturally from a more open-ended prompt? Needs explicit criteria either way — an LLM given free rein to "ask questions" can easily turn a one-line thank-you flow into an interrogation, which would contradict the "keep it short and professional" bar just re-established in task-269.

#### Lessons from task-269 this build must not repeat
- [ ] Every tracked status that has a UI implication must actually render something. Task-269 shipped a `'sending'` status that was tracked in state but never rendered — from the user's side, submitting looked like a no-op. Whatever new status states this thread UI introduces (e.g. per-turn sending/error), each one needs a real visual before calling the work done.
- [ ] Keep the AI's copy short, professional, and non-presumptuous by default — no unsolicited "I'd love to learn more about your project" filler. This applies doubly here since the whole point of this task is to let the AI *legitimately* ask something when it's warranted — the system prompt needs to draw a clear line between "ask when genuinely useful" and "pad every reply with a question."
- [ ] Screenshot-verify every new visual state (idle, sending, view-only past turn, follow-up prompt, error) against a real or stubbed LLM response before considering this done — don't ship a state that was only exercised in code review.

- Location: `src/components/contact-intent-form.tsx`, `src/app/api/contact-intent/route.ts`, `src/lib/types.ts` (`ContactIntentResult` shape will likely need a turn/history-aware redesign), possibly `src/context/app-context.tsx` if history needs to persist across modal reopen.
