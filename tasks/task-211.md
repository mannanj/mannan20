### Task 211: Anchor the header to the bottom of the viewport once the user visits the Taken article — as a visceral, lingering connection to the piece

**Concept.** "Taken" is the article about what your browser told the page about you before you said yes. The article *takes something from you* the moment you arrive. The header should mirror that: once you land on `/garden/article/taken`, the global header detaches from the top of the screen and re-anchors to the **bottom** of the viewport — and stays there, on every subsequent page, until the user explicitly chooses to stop the tracking. A literal, visceral residue of the visit. You can't unsee that you were seen.

**The dismissal is the point.** The header doesn't auto-clear on navigation, refresh, or tab close. The only way out is an explicit affordance — an `×` / "Stop tracking" / "Exit" button rendered on the header itself — and clicking it restores the header to the top. That deliberate act is the meaning of the feature: you decide when to consent again.

---

#### Subtasks

##### Tracking state (the "seen" flag)

- [ ] Add a single persisted boolean: "user has been tracked." Naming proposal: `taken:tracked` in `localStorage` (persists across tabs / sessions; matches the metaphor — once seen, always seen, until you actively opt out).
  - Why localStorage over cookie: no server roundtrip needed, no middleware coupling, and the "visceral" effect should survive new tabs.
  - Why not sessionStorage: the visceral feeling should *outlive* the session — closing the tab should not undo it.
- [ ] Set `taken:tracked = "1"` on mount of the Taken article body (`src/components/garden/taken-body.tsx`) — but **only after** the access gate is passed (`TakenAccessGate`), so password-locked previews don't trigger it.
- [ ] Clearing the flag = the explicit dismissal action. No other code path clears it.
- [ ] Expose a tiny client hook `useTakenTracked()` in `src/hooks/use-taken-tracked.ts` returning `{ tracked, dismiss }`. Initial render must be SSR-safe — return `false` until hydration to avoid layout flash.

##### Header repositioning

- [ ] Header today is `fixed top-0 w-screen border-b border-white h-[66px] z-[99]` (`src/components/header.tsx:536`). When `tracked` is true, switch to `fixed bottom-0` and flip the border to `border-t border-white`. Same height, same z-index.
- [ ] Add a smooth transition on the swap so it doesn't snap. Slide-down animation when the flag flips on (200–300ms), slide-up when dismissed.
- [ ] Audit anything that assumes the header is at the top:
  - Page top padding / scroll-anchoring (`pt-40` etc.) — when header is at the bottom, content can extend further up; consider whether to leave existing top padding alone (acceptable — the header just moves, the page doesn't restructure) or compensate with bottom padding so footer-ish content isn't covered.
  - `useScrollSpy` (`src/hooks/use-scroll-spy.ts`) — verify Intersection Observer thresholds don't depend on top placement; they shouldn't, but confirm.
  - Modals / overlays with their own z-index. Header is `z-[99]`; check that command palette, contact modal, keyboard-commands modal still layer correctly when header is at the bottom.
  - The page magnifier (`src/components/garden/page-magnifier.tsx`) — currently modified, may overlap a bottom header.
- [ ] Mobile: the bottom-anchored header should sit above the iOS Safari URL bar / address bar UI. Use `padding-bottom: env(safe-area-inset-bottom)` on the header so it clears the home indicator, and verify on a real device or DevTools mobile emulation.

##### The dismissal affordance

- [ ] Add an `×` (or compact "Stop tracking" / "Exit" — pick one and keep it consistent) on the right edge of the header, **only visible when `tracked` is true**. Place it at the far right next to the existing nav cluster, not overlapping the Garden expand affordance.
- [ ] Hover/focus state with a tooltip: "Stop tracking" — matches the existing tooltip pattern at `src/components/header.tsx:580–583`.
- [ ] On click: call `dismiss()` → flag clears → header animates back to the top. No confirmation dialog (the click itself is the deliberate act).
- [ ] Accessibility: real `<button>`, `aria-label="Stop tracking and return header to top"`, focusable in keyboard order.

##### Cohesion with the article's tone

- [ ] The header, while bottom-anchored, should feel *slightly* different from its top-anchored self — a subtle visual shift that says "this is now a residue, not a navbar." Options to evaluate (pick one, don't stack):
  - Slightly reduced opacity / muted background
  - Thin top border in a different hue (e.g., the Taken article's accent)
  - A faint left-aligned pill that just says "Tracked" — clickable, opens a small popover with "Read what we collected" (links back to `/garden/article/taken`) and "Stop tracking"
- [ ] Whichever variant is chosen, it must not feel like an alert/banner. It's still the header. It's just *worn* now.

##### Edge cases & tests

- [ ] What if the user visits Taken, dismisses, then visits again — does the header re-anchor to the bottom? **Yes.** Each visit re-arms the flag. Confirmed-by-design.
- [ ] What if the user visits Taken in one tab and is on `/` in another? The flag is in `localStorage` — both tabs sync via the `storage` event. Listen for it in the hook so the other tab's header animates without a refresh.
- [ ] What about the access gate? If the user lands on `/garden/article/taken` but never passes the password gate, **do not** set the flag. The visceral connection is to having actually *been read*, not to having loaded the URL.
- [ ] SSR: the server doesn't know the flag, so the header always renders at the top in HTML. After hydration, if `tracked` is true, the header animates down. Ensure the animation reads as intentional, not as a layout glitch.
- [ ] Visit logging interaction: the visits-worker shouldn't double-count the Taken visit just because we're now reading from `localStorage`. Existing middleware logging is unchanged; confirm no new fetches are introduced.

##### Validation

- [ ] Manually walk the full flow: home → garden → Taken (pass gate) → header drops to bottom → navigate to `/`, `/garden`, another article → header is still at the bottom on each. Click `×` on `/`. Header returns to top with animation. Visit Taken again. Header drops again.
- [ ] Test on iOS Safari (real device if possible) for safe-area inset and the address bar collapse/expand interaction.
- [ ] Test in two tabs: dismiss in one, watch the other animate.
- [ ] Verify lighthouse / no CLS regressions on the Taken page from the header swap.
- [ ] Visually confirm the dismissal button never overlaps the Garden expand chevron.

##### Out of scope (do not do here)

- No telemetry / analytics on dismiss rate. (Could be a follow-on; right now it would dilute the metaphor.)
- No "Tracked since {date}" display. The piece is about being seen, not about quantifying the duration.
- No server-side persistence of the flag. It is intentionally browser-local — that's part of the message.

---

- Location: `src/components/header.tsx`, `src/components/garden/taken-body.tsx`, `src/components/garden/taken-access-gate.tsx`, `src/hooks/use-taken-tracked.ts` (new), `src/app/globals.css` (transition keyframes if needed)

[Task-211]
