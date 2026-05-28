### Task 204: Taken article — switch from time-stagger to scroll-driven progressive disclosure

**Goal:** Replace the current time-based reveal (one observation every 2000ms over ~25s) with scroll-based progressive disclosure. Reader paces themselves; emotional impact builds as they choose to scroll deeper. Inspired by the long-form scroll feel of sinceyouarrived.world, but disclosure tied to viewport entry not timer.

**Why:** The current auto-reveal cadence forces a tempo on the reader. They cannot pause, skim back, or sit with a single observation. The reveal also feels noisy when the reader scrolls past observations that haven't appeared yet. Letting scroll drive disclosure gives the reader agency and lets the dread compound at their own pace.

**Current state to replace:**
- `src/components/garden/taken-body.tsx` — `visibleCount` state + `setTimeout` chain with 350ms first / 2000ms each subsequent reveal (search: `setVisibleCount`, `delay = visibleCount === 0`)
- Conditional rendering gated on `allRevealed` for: barcode block, climax block, sources & confessions, what-was-sent/stored pair, final line
- `taken-fade-up` keyframe in globals.css used by ObsRow (one-shot fade on mount)
- `DossierRule` height driven by `visibleCount / total`

**Target behavior:**
- [ ] All observations exist in DOM from the start (run detection, set state once)
- [ ] Each observation row starts at low opacity / slight translate, fades in when ≥30% of it enters viewport (IntersectionObserver)
- [ ] Once revealed, observation stays visible (no re-fading on scroll-up)
- [ ] Long vertical breathing room between observations so each one occupies its own scroll moment (think `min-h-[60vh]` or equivalent — matches sinceyouarrived feel)
- [ ] Dossier rule fills based on scroll progress through the observations container (not visibleCount)
- [ ] "The list is partial. I see more than I show." paragraph reveals after final observation
- [ ] Barcode + datapoint count reveals on its own scroll moment (CountUp animation triggers on viewport entry)
- [ ] "And one more thing" climax block — already uses IntersectionObserver to freeze metrics; verify it still works with new spacing
- [ ] Sources & Confessions section reveals on scroll
- [ ] What-this-page-sent / stored reveals on scroll
- [ ] "It did this in N seconds. This is what free costs." final line — captures elapsed time on viewport entry
- [ ] Tab-leave banner stays as-is (event-driven, not scroll-driven)
- [ ] Floating stats footer stays as-is (always visible)

**Implementation notes:**
- Build a small `useReveal()` hook returning `{ ref, revealed }` using IntersectionObserver with `{ threshold: 0.3, rootMargin: "0px 0px -10% 0px" }`. Disconnect after first intersection so revealed stays sticky.
- Apply `revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"` with a Tailwind transition class (`transition-all duration-700 ease-out`).
- Optional: vary stagger by giving consecutive observations a `transition-delay` (50–150ms) so when 2–3 enter viewport simultaneously, they cascade rather than pop together.
- Replace the visibleCount/setTimeout effect entirely.
- Dossier rule: switch to a scroll listener computing the % of the observations container that has crossed the viewport midpoint. Use rAF + passive scroll listener, NOT a per-frame React state update — write directly to the rule's `style.height` via a ref.

**Files to touch:**
- `src/components/garden/taken-body.tsx` — main changes
- `src/app/globals.css` — may not need changes if Tailwind transition is enough; can drop `taken-fade-up` if no longer used
- Verify: `taken-stats-footer.tsx` and `taken-banner-in` keyframe stay intact

**Verification:**
- [ ] Manual: load /garden/article/taken, observations should be invisible initially, scroll down slowly — each row fades in as it enters viewport, dossier rule grows with scroll, climax block freezes counters when reached, final line shows elapsed-time at scroll-arrival
- [ ] Verify the page works with reduced-motion preference (skip transition, just opacity-100)
- [ ] Verify on mobile (viewport is short — observations should still feel paced, not crammed)
- [ ] Playwright: scroll to 25%, 50%, 75%, 100% and assert visible observation count grows; final state matches current full-reveal output

**Out of scope:**
- Don't touch detection logic, footer ticker, tab-leave banner, sources/confessions copy
- Don't add new observations
- Don't change visual style of revealed rows — only the trigger mechanism

[Task-204]
