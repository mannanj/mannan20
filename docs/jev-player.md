# Jev plays the chicken game

`scripts/jev-player.mjs` is an automated player and test harness for `/game` driven by TypeSafe's Jev model (vision, `jev-latest`).

## What we used it for (2026-11-02)

A real-browser regression and demo run of the escape-vehicle stages on prod behind `?variant=2`: Jev played with its own clicks (no score boosting), reached every stage (ground → surf → pilot → rocket → Moon) and posted 1,098 to the agent leaderboard. It also tested the v2 leaderboard hardening. With the panel forced open 7 times in 90s, Jev closed it every time it saw it, 273 ms on average, while keeping an 88% hit rate.

## Strategy (scripts/jev/strategy.mjs)

`STRATEGY` lists the priority order; `QUESTIONS`, `THRESHOLDS` and `TIMING` hold the wording, cut-offs and click counts, and `decide()` turns one batched answer set into one action. Each frame is one screenshot with only the questions the current state needs (`questionKeys`).

1. Gate: "Scene ready / start?" gets the start arrow; "Downloading scene" waits, skip only after 20s stuck.
2. Leaderboard open: close it.
3. Ability orbs (Multiply, Cursor, Frenzy, Chain Lightning) and golden eggs: click first.
4. Bird grip: the "help the chicken escape!" banner is the detector. Chicken clicks score 0 while gripped, so it taps the talon. Sources rotate when the claw counter does not rise for 2 bursts: the yellow counter label (front: right edge +38px, back: left edge -48px, used only when it agrees with the chicken box), a talon Box, then the top of the chicken box. Bursts of 8 clicks, 30ms apart, led by the target's velocity.
5. Bird receding: 8-click bursts on the bird for the 25 clicks that drop the feather; then click the feather.
6. Bag: the badge Noul opens it, per-item "has row" Nouls plus a Use-button Box pick the highest-ranked unworn skin (phoenix = martian x3 > eagle x2 > hawk x1.25); a use counts only once the row disappears; never downgrades; backoff on empty bag visits.
7. Martians (score >= 16,900): grey spacesuited figures, burst clicks until the item lands.
8. Otherwise single clicks on the chicken (golden chickens preferred), 3 per answer moving, 5 slow, aim at the centre; never press and hold.

Stop guards: `stopReason:'stuck'` when the score does not rise for `STUCK_SECONDS` (30; x3 during a grip), plus the run time. Ground truth (`window.__chicken`) is used only for logging, the stuck guard, grip progress (claw counts) and scheduling.

## Run it

```sh
TYPESAFE_API_KEY=$(security find-generic-password -a "$USER" -s typesafe-chicken-game -w) PLAY_MINUTES=4 node scripts/jev/player.mjs
```

- Env options: `GAME_URL` (default `https://mannan.is/game?variant=2`), `SUBMIT_SCORE=0` to skip posting, `FORCE_BOARD_EVERY_S=12` to test closing the leaderboard (needs the v2 `openSheet` hook), `OUT_DIR` (default `~/Desktop`).
- The score posts to the agent board as **My Name Jev**. The name's owner cookie is kept in the keychain (`chicken-game-jev-owner`), so later runs keep the name.
- The first demo posted as `jev`. That row's owner cookie was lost, so renaming it needs a direct state-worker edit.

## Cost

Price: $0.042 per million input tokens; output is free.

### Screenshot size (start=100, 25s, old player, 1 in flight)

| Width x JPEG q | tokens/request | hit rate | box IoU |
|---|---|---|---|
| 1280 x 70 | 3,290 | 0.98 | 0.57 |
| 960 x 70 | 2,170 | 0.94 | 0.62 |
| **960 x 50 (chosen)** | **2,160** | **0.97** | **0.58** |
| 640 x 70 | 1,310 | 0.32 | 0.30 |
| 640 x 50 | 1,310 | 0.41 | 0.30 |
| 480 x 70 | 1,010 | 0.18 | 0.21 |

640 and below lose the chicken box (hit rate collapses); 960 x 50 keeps hit rate and IoU within 10% of 1280 at 66% of the tokens. In flight: 1 gave 0.94-0.98 hit rate, 2 gave 0.79 with the old player (stale frames), but the new player leads each click by the target velocity, and 2 in flight measured 443 score/min at 0.64 hit rate against 199 score/min at 1 in flight, so the default is 2, dropping to 1 during a grip or bag visit. Crop re-asks were removed (IoU gain 0.05 for 25% more requests). Measured tokens per request stay about flat as questions are added (28 questions at 960: ~2.9k), so batching still pays.

### Before / after (ground chicken, start=100)

| | Old player | New player |
|---|---|---|
| Tokens/min | 1.68M | 0.42M |
| $/min | 0.070 | 0.018 |
| Score/min | ~320 | 443 |
| Score per $ | ~4.6k | ~25k |

## Clip results (local, `scripts/jev/clip.mjs`, videos in `~/Desktop/jev-clips/strategy/`)

| Scenario | Result | Metric |
|---|---|---|
| hawk-free | PASS | 7-13.5s (limit 25) |
| hawk-feather | PASS | feather, bag, Use, x1.25 |
| eagle-free | PASS | 9.4-27.8s (limit 45) |
| eagle-feather | PASS | x2 |
| phoenix-free | PASS | 30.5s (limit 80) |
| phoenix-feather | PASS | x3 |
| orb-collect (multiply) | PASS | clones in 4-6s |
| cursor-x5 / cursor-x3 | PASS | buffs active in 6s |
| plane-exit | PASS | reaches rocket, 0.82 hit rate |
| gate-start | PASS (direct start only) | reaches Moon live; no slow-download simulation, gate questions never fired |
| cosmos | PASS | plays through, ~112 score/min |
| martian | PASS | 100 clicks, item, x3 in 65s |
| skin-upgrade | PASS | hawk then eagle, ends on eagle |
| leaderboard-close | PASS | closed on first sight |

Iterations that mattered: banner-only grip detector (a "bird holding" Noul stayed true during hover); counter anchor sanity-checked against the chicken box (the counter clamps at the screen edge); velocity lead plus 8-click bursts (hawk-free 26s to 7-13s); Use-button Box wording and right-edge aim (the first Box covered the whole row); bag opens backed off on empty visits; Martian wording (they are small grey spacesuited figures, and the Jupiter scene description needed rewording).

## Full-game estimate (not yet run)

Measured: ~443 score/min on the ground at 1 point per click, $0.018/min. Skin multipliers scale it: hawk x1.25 (554/min), eagle x2 (885/min), Martian x3 (1,329/min).

| Segment | Math | Minutes |
|---|---|---|
| 0-2,000 (surf, pilot, rocket, gate, Moon, orbs) | 2,000 / 443 + ~1 min stage overhead | 5.5 |
| Hawk: free + feather + bag | 12s + 25s + 10s | 0.8 |
| 2,000-10,000 at x1.25 | 8,000 / 554 | 14.4 |
| Eagle: free + feather + bag | 28s + 40s | 1.1 |
| 10,000-17,000 at x2 incl. cosmos | 7,000 / 885 + ~2 min cosmos | 9.9 |
| Jupiter Martian item | measured | 1.1 |
| 17,000-25,000 at x3 | 8,000 / 1,329 | 6.0 |
| Phoenix: free + feather | 31s + 40s | 1.2 |
| **Total** | | **~40 min** |

Plan for ~46 min with 15% headroom, about $0.85 of Jev. The game's new pacing curve will shorten this; re-estimate after it is deployed. Total Jev spend for building and testing this: about $0.45 (10.6M input tokens).

## New orbs, eggs and the pacing build (2026-11-03, local clips in `~/Desktop/jev-clips/new/`)

Added: orb wording for Multiply x5-x100, Frenzy x2 and Chain Lightning, asked on every frame from score 250 (the new scheduler spawns them at any score); a golden-egg Noul plus Box (the first 14s of an egg wave are left alone so up to 3 eggs hatch, after that eggs are clicked); a golden-chicken Noul plus Box (golden chickens are preferred targets, asked only after an egg was seen); the bag opens only within 90s of a feather/Martian pickup or a grip (an empty bag no longer gets opened and left open); `MAX_TOKENS` (25M) stops a run with `stopReason:'tokens'`.

| Clip | Result | Metric |
|---|---|---|
| plane-exit | PASS | pilot, then rocket |
| gate-start | PASS (direct start) | reaches Moon live |
| hawk-free / eagle-free / phoenix-free | PASS | 5s / 24s / 30s |
| hawk / eagle / phoenix feather | PASS | x1.25 / x2 / x3 |
| martian | PASS | x3 |
| leaderboard-close | PASS | |
| frenzy / chain | PASS | active in 4-7s |
| eggs | PASS | 2 golden chickens hatched in 18s |
| multiply-x5 / x10 / x25 / x100 | PASS | clones in 5-6s |
| orb-collect, cursor-x5, skin-upgrade | PASS | |

## Full prod playthrough (2026-11-03, `https://mannan.is/game?variant=2`)

25-minute cap, no stall: 1,544s, **score 195,278** posted as My Name Jev, 15,827 clicks, stages none, surf, pilot, rocket, moon, cosmos, Jupiter. Hawk grab at 98s (x1.25 worn at 128s), eagle at 472s (its feather was missed, so no x2), phoenix grab at 838s (phoenix feather used at 927s, x3), Martian item used at 958s. 4,881 requests, 10.35M input tokens, $0.43 ($0.017/min, 7,587 points/min, about 449k points per $). The earlier 40-minute estimate was for the old pacing; with the new scheduler the game reaches 25,000 in about 14 minutes. Video: `~/Desktop/jev-plays-chicken-2026-11-04T03-39-40.mp4`.
Where it lost time: the eagle feather (bird window missed, no x2), 48 bag opens for 136 bag frames, and 475 idle frames.
