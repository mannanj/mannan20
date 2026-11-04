# Jev player strategy review (v2 game, 2026-11-03)

Sources: `bird-event.tsx`, `chicken-game-v2.tsx` (`hit`, click dispatcher), `chicken-orbs.ts`, `martians.ts`, `martian-layer.tsx`, `escape-stages.ts`, `space-gate.tsx`; TypeSafe docs (Box, Noul, Images, Confidence, Jaggedness, Models); the current `strategy.mjs`; three Jev probes on `9-qa/independent-r2/09b-hawkgrab-d.png` and `13b-jupiter-d.png` (~$0.002 spent).

## 1. Correctness against the real mechanics

- **Clicking the chicken while gripped scores 0.** `hit()` returns early when `isGripping` (`grab | right | recoil | left`). Only talon taps score (`birdScoreClick` → `hit(..., source)` = 1 × skin multiplier each). "After release keep clicking the chicken (free clicks)" is half right: `BIRD_CALM_FREE_CLICKS = 25` only means the chicken keeps its pre-grab speed snapshot for 25 clicks or 60 s; those clicks score normally, they are not bonus. Nothing is free.
- **Talon counts:** hawk 25 + 25, eagle 50 + 50, phoenix 100 + 100 (front = right talon first, then `recoil` 700 ms, then back = left). Every talon tap scores, so the grab is not lost time if the clicks land.
- **The red X is a hint, not a marker.** It appears only after **10 s without a tap** (`BIRD_HINT_DELAY_MS`), resets on `freed-right`, and the "click the claw" label needs 30 s more. A well-played run never sees it. Do not key the strategy on the X; the counter label is the anchor that is always there (`front claw n / N` / `back claw n / N`, yellow).
- **Hit-square geometry (`talonHits`):** squares are `max(56 px, 0.9 × talon height)` centred on `xMark` (0.55, 0.7) of the right talon frame and (0.45, 0.7) of the left. Relative to the chicken's hold point `(cx, cy)` (chicken rect 70 × 140, `fit` = 1 at 1280 × 800), the square centres are:
  hawk front `(cx − 9, cy − 49)`, back `(cx + 11, cy − 63)`; eagle front `(cx − 10, cy − 47)`, back `(cx + 12, cy − 60)`; phoenix front `(cx − 14, cy − 60)`, back `(cx + 15, cy − 77)`.
  In words: **the top edge of the chicken box, at its centre x (±10 px)**; a 56 px square tolerates ±28 px. The counter is placed with its vertical centre on the square's centre, 10 px left of the front square and 20 px right of the back square (`COUNTER_GAP`), so **front square centre = counter right edge + 38 px, back square centre = counter left edge − 48 px**, same y as the counter.
- **After release:** `hover` 5 s (bird stationary, not clickable), `depart` ≈ 1 s (clickable, still stationary), `recede` 10 s (clickable, moving away and shrinking to 2 %, fading from 85 %). 25 bird clicks in that ≈ 11 s window drop the feather at the bird's current position; it falls 2.2 s and stays on the ground. This is the tightest timing in the game and the feather is the whole skin economy: miss it and there is no x1.25 / x2. Each bird click also scores 1 × mult, so it is never a detour.
- **Orbs:** exactly three in a game (500 / 750 / 1250, `orbFiredRef`), 30 s lifetime, drifting, kept out of the HUD. `Multiply x3` = 2 clones for 12–15 s, each clone click scores → ~+80 pts. `Cursor x5` = 4 extra cursors at ±30 px in an X; each extra cursor that lands inside the 70 × 140 rect scores separately, so a centre aim yields up to 5 per click for 30 s (+100 ms per click, so ~45–60 s in practice) → +400–600 pts, the best item before the skins. `Cursor x3` = triangle at 21 px → 3 per click. Both together become anchor + ring 6 (r 40) + ring 8 (r 78): most ring points miss a 70 px-wide chicken, so x3 on top of x5 is worth less than 3 ×, still positive. Verdict: orbs are worth a 1–2 s detour, and they are time-critical; they are also the only reason to aim at the centre rather than the belly.
- **Skins:** multiplier applies to every scoring click including talon and bird clicks and stacks with orbs. Hawk x1.25 at ~2,100 saves ~20 % of the remaining 23k clicks; eagle x2 at ~10,100; Martian x3 at 17,000+. Phoenix x3 arrives after 25,000, irrelevant for the goal. `USE_ORDER` ranking phoenix = martian = 3 is right.
- **Martian economics:** `MARTIAN_CLICKS_GOAL = 100`, counter global and in `localStorage`; first walker 7 s after Jupiter, then every 14–26 s, each stays 26 s, max 2 on screen, 190–230 px tall and nearly static (hop on click). 100 non-scoring clicks ≈ 30–40 s at 3–4 clicks/s ≈ 150–250 pts forgone at x2. Gain: 8,000 pts at x3 instead of x2 = 1,333 fewer scoring clicks ≈ 6–8 min. Do it, immediately on arrival, and stop when the ring reads 100 / the bag badge appears. **Wording bug:** they are grey/white photoreal spacesuited figures, not "green or teal aliens" (Jev: 0.47 on the Jupiter frame). There are also 7 small background Martians that are not clickable; the clickable walkers are the large ones (≥ 0.2 of screen height) with a light beam while walking in.
- **Toss:** needs a 1.5 s hold (`HOLD_MS`); Playwright clicks never toss. Split pieces score 1 each anyway. Not a risk, no rule needed beyond "no mouse.down without up".
- **Gate:** `hit()` ignores clicks while `gateRef !== 'none'`; the gate shows once (rocket → Moon) and always shows "Scene ready / start". Stop asking chicken questions while the gate is up.
- **Cosmos gating:** the eagle fires at 10,000 and cosmos waits until the bird is not busy (calm counts as busy) or 10,500. No action needed, but expect a ~60 s calm window after the eagle before the scene changes.
- **Leaderboard:** `LEADERBOARD_OPEN_GUARD_MS = 900` blocks opens right after a hit, so the panel only opens when the player clicks the toggle zone. Keep the no-aim zone and ask `board_open` rarely (see §3).

## 2. Priority order and timing

| # | State | Action | Numbers |
|---|---|---|---|
| 1 | gate visible | start if ready; wait; skip after 20 s | one-time, no clicks meanwhile |
| 2 | board open | click toggle | ask only when the chicken box is missing/low or every 3 s |
| 3 | orb on screen (score 480–1,300 or ≤ 30 s since an orb Noul was positive) | 2 clicks on the orb, lead by drift | 30 s lifetime; three in the whole game |
| 4 | bird gripping | 4–6 clicks on the active talon square per answer, re-locate every answer | progress = counter n rising; switch target source after 2 answers without progress |
| 5 | bird departing/receding (5 s after `freed-left`) | 5+ clicks per answer on the bird body, lead by its motion | 25 clicks within ~11 s; abandon when the bird is gone |
| 6 | feather on ground / falling | 2 clicks | then badge → bag → Use best → close (existing `bagCooldownMs` is fine) |
| 7 | Jupiter and a large walker on screen and martian counter < 100 | 3–4 clicks per answer on the walker | until the badge appears; costs ≤ 250 pts, saves ~7 min |
| 8 | otherwise | chicken: 2–3 clicks on a moving chicken, 5 on a slow one, centre aim | back off to 1 click/250 ms on the ground |

Time budget to pass the phoenix: scoring clicks ≈ 1,400 (0–2k with orbs) + 6,400 (x1.25) + 3,500 (x2) + 2,667 (x3) + 200 phoenix talon clicks ≈ **14,000 landed clicks**. At 2.5 landed clicks/s that is ~95 min, at 4/s ~60 min. The proposal's "run once on prod" should be planned as a ~1–1.5 h run, not minutes, and the first run should stop at ~2,500 (hawk freed, feather used) to measure landed clicks/s per segment before committing.

## 3. Question design

Jev bills the image **once per question** (measured: 480 w 1 q = 1,078 tok, 3 q = 1,928; 640 w 1,666 / 3,104; 960 w 3,366 / 6,504; question text ≈ 35 tok each, wording length barely matters). "Image sent once, many questions" is free in latency, not in tokens, so every Noul must earn its place. Gate by state the player already knows (score read from the DOM for scheduling only, same as the existing truth hooks; log it):

- **Every frame:** `chicken` Box only. Wording: `the cartoon rainbow rubber chicken in \`screen\`, with the board, plane or rocket it rides if any; not the score, not the baby chicks`. Treat `confidence < 0.5` as "not visible" instead of a separate `visible` Noul (saves one image unit per frame).
- **Scene Choice:** once every 10 s or when the chicken box confidence drops. It is reliable (jupiter 1.00 in the probe) and drives the gating below. Add `jupiter` and `gate` criteria to `SCENES`.
- **Orb Noul + Box:** only while score ∈ [480, 1,300] or ≤ 30 s after a positive, every 2nd frame.
- **Grip Noul:** only when score ≥ 1,950 / 9,950 / 24,950 and that bird is not finished, every 2nd frame, until positive; then every frame while gripping (`Is a large bird holding the cartoon chicken in its claws in \`screen\`?` scored 0.92 at 640; the banner Noul `Is the text "help the chicken escape!" shown at the top of \`screen\`?` scored 0.99 and is the cheaper, more literal detector).
- **Talon location, in this order:** (a) `counter` Box: `the yellow text label reading "front claw N / M" or "back claw N / M" in \`screen\`` (conf 0.95–0.98 in both sizes, position correct at 960 and 480) → click at counter right + 38 px (front) or counter left − 48 px (back), counter centre y; (b) `talon` Box on a **full-resolution 400 px crop** centred on the chicken box top (`the bird's yellow scaly foot gripping the top of the chicken's head in \`screen\``); (c) chicken-box geometry: centre x, top edge + 8 px. Skip the `talon_x` question: at 640 it was 0.63 and the X rarely exists. The 640 full frame put the talon ~50 px too high; the 960 frame was right. 40 px targets need the crop, not a bigger frame.
- **Progress check:** read `front claw n` from the DOM counter (or the bird `data-phase`) after each click burst; the n must rise by ≥ 1 per burst. Two bursts without progress → next source in the list above; `freed-right` → re-ask (the counter jumps to the other side).
- **Bird Noul/Box:** only after `freed-left`, from +4.5 s to +16 s; Box: `the large brown photoreal bird in \`screen\`, not the cartoon chicken` (0.90–0.94).
- **Feather Noul:** only for 20 s after the 25th bird click; `badge` Noul every 5 s only in that window; `bag_open`/`use_*` only after the bag click.
- **Martian Noul/Box:** only in the `jupiter` scene with counter < 100: `Is a large grey spacesuited figure, about a quarter of the screen tall, standing on the rocky ground in \`screen\`?` + Box `the largest grey spacesuited figure standing on the ground in \`screen\`, not the rainbow chicken`; accept only boxes with height ≥ 0.15.
- **Gate Nouls:** only in the rocket stage until started, every 1 s. **Board Noul:** every 3 s or when the chicken is missing.
- Average load this gives: ~1.4 questions per frame instead of 7–10.

## 4. Cost

- Recommended: 480-wide full frame (≈ 1,040 tok per question) for the chicken Box and gated Nouls; 400 px full-res crop (≈ 950 tok) for talon/feather/orb precision when the full-frame box confidence is < 0.6. Minimum image side is 280 px, so 480 × 300 is legal; 640 bought no accuracy over 480 in the probe.
- At 4 requests/s × ~1.4 questions × 1,040 tok ≈ 5.8k tok/s ≈ 350k tok/min ≈ **$0.015/min**, so a 90-min full run ≈ $1.3 plus crops (~20 %) ≈ **$1.6**. The proposal as written (7–10 questions on every 640 frame) is ~10–16k tok per request ≈ $0.10–0.15/min ≈ $9–13 for the same run and blows the $5 budget.
- One request in flight at ~230 ms (640) / ~200 ms (480) gives ≈ 4 frames/s; 2–3 clicks per answer along the velocity-predicted path is right. Do not add a second in-flight request until the hit rate on a 480 frame is measured; it doubles cost for a stale frame.

## 5. Failure modes and guards

- **Grip stall (the 4-minute loss):** detect via counter n unchanged for 2 bursts (~1.5 s); rotate counter-offset → crop Box → geometry; after 10 s take a 960 frame once; after 20 s log a screenshot and keep rotating, never fall back to the chicken (it scores 0 while gripped).
- **Missed feather:** bird clicks < 25 when the bird is gone → log it, continue; skins are lost for the run, so the bird burst gets the highest click count (5–6 per answer, 50 ms gap).
- **Orb missed:** two bursts without the orb vanishing → ignore that orb for 30 s (orbs drift; lead by the last two boxes).
- **Gate:** skip at 20 s; while the gate is up send no chicken questions (saves ~80 requests).
- **Martian:** stop after 60 s per walker or when the box height < 0.15 (background decoy); stop entirely at counter 100.
- **Global:** score flat for 30 s outside gate/grip → one 960 full-frame re-ask, cursor park, then continue; score flat for 90 s → stop the run (no reload: score is not persisted).
- **API:** 429/529 → exponential backoff; 400 image reject → log and drop the frame; never retry a 422 (malformed question).
- **Log per request:** rule, question ids, box/noul values, image size, tokens, latency, clicks sent, DOM hits delta, score; **per segment** (0–500, 500–2k, 2k–10k, 10k–17k, 17k–25k, phoenix): minutes, landed clicks/s, tokens, $ per 1,000 pts.

## 6. Prod run risks and caps

- **Cost blowup:** hard caps in the player: `MAX_TOKENS` (e.g. 40M ≈ $1.70) and `PLAY_MINUTES`; abort when either trips. Log cumulative tokens every minute; compare with the console afterwards (it lagged on 2026-11-02).
- **Partial / unfair scores:** run the measurement run with `SUBMIT_SCORE=0`. Only post the full run, once, as `My Name Jev`; skin multipliers vs leaderboard fairness is an open decision of Mannan's, so a 25k agent score with x3 should be confirmed with him before posting. Posting happens at the end only; a crash mid-run posts nothing (verify that path).
- **Platform:** one real browser tab, no polling of mannan.is from curl (Vercel security checkpoint). Keep the Playwright profile for the run so `martian-clicks` and the unlocked skins survive a restart.
- **Time:** 60–95 min is the realistic duration; schedule it as such, not as "8 min + 15 %".
