### Task 306: Chicken Game — Pause (deferred, think first)
- [ ] Decide which item grants pause (NOT the hawk feather: that item became the hawk skin; see `docs/chicken-game-hawk.md`)
- [ ] Decide the separate leaderboard for paused play vs the single-playthrough board
- [ ] Anti-cheese rules and what pausing freezes (list below), then design in depth
- [ ] Only after the above: write `docs/chicken-game-pause.md` and split implementation tasks
- Location: `src/components/game/chicken-game.tsx`, `src/components/game/leaderboard-panel.tsx`, `src/lib/leaderboard-store.ts`, `src/app/api/game/leaderboard/route.ts`, `src/components/inventory/`

Deferred on purpose by Mannan (2026-11-02): "save that functionality for another item... I want a separate leaderboard for paused gameplay than the single playthrough one." Do not design in depth yet.

Considerations to think through:
- Which item pauses (new item, consumable vs permanent, one-per-run vs unlimited, who gets it and when it drops).
- Separate board: `Boards` in `src/lib/leaderboard-store.ts` is `{ human, agent }`; paused play needs a third dimension (a `mode: 'single' | 'paused'` field, new state-worker kind per the state-worker rule). The server today only validates an integer 1..1,000,000, so a run that used pause must be flagged by the client (trust-based) or the board is meaningless.
- Anti-cheese: pausing to wait out hazards or events, idle farming, pausing during hawk/eagle/phoenix talons, pausing at the edge of an event threshold; maybe a max pause time or count.
- What pausing freezes: physics loop, heat decay, speed ramp, orb timers (30s expiry, 15s clone lifetime, 30s cursor buff), hawk/eagle/phoenix durations (calm, depart 5s, recede 10s, hint timers 10s/30s), teleport/hyper windows, audio loops, `performance.now()` based timers (need a shared game clock that stops, not wall time). Which of these should NOT freeze (e.g., score accumulates nothing).
- Click rules while paused (none score), the UI overlay, resume countdown, tab-hidden behavior vs deliberate pause.
- Interaction with skin multipliers and fractional scores.
- Persistence: does a paused run survive reload?
