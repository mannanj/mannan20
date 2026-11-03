# Jev plays the chicken game

`scripts/jev-player.mjs` is an automated player and test harness for `/game` driven by TypeSafe's Jev model (vision, `jev-latest`).

## What we used it for (2026-11-02)

A real-browser regression and demo run of the escape-vehicle stages on prod behind `?variant=2`: Jev played with its own clicks (no score boosting), reached every stage (ground → surf → pilot → rocket → Moon) and posted 1,098 to the agent leaderboard. It also tested the v2 leaderboard hardening. With the panel forced open 7 times in 90s, Jev closed it every time it saw it, 273 ms on average, while keeping an 88% hit rate.

## Strategy

Each frame sends one screenshot in `state` with all questions batched in one request:
- a Noul asking whether the leaderboard is open, plus a Box locating its toggle (closing it takes priority over play)
- a Noul asking whether the chicken is visible, plus a Box around the chicken and its vehicle
- a Choice naming the scene

Two requests stay in flight (about 120 ms each). The player aims ahead using the chicken's velocity from recent boxes. It parks the cursor in a corner between clicks so the chicken doesn't dodge, and never aims at the leaderboard toggle zone. When a box comes back with low confidence, it crops 420 px around it and asks again. The page's own state is ground truth: it measures hit rate and box IoU, which the overlay draws together with Jev's box and aim. The run is recorded with Playwright plus the game's Web Audio, muxed to MP4.

## Run it

```sh
TYPESAFE_API_KEY=$(security find-generic-password -a "$USER" -s typesafe-chicken-game -w) PLAY_MINUTES=4 node scripts/jev-player.mjs
```

- Env options: `GAME_URL` (default `https://mannan.is/game?variant=2`), `SUBMIT_SCORE=0` to skip posting, `FORCE_BOARD_EVERY_S=12` to test closing the leaderboard (needs the v2 `openSheet` hook), `OUT_DIR` (default `~/Desktop`).
- The score posts to the agent board as **My Name Jev**. The name's owner cookie is kept in the keychain (`chicken-game-jev-owner`), so later runs keep the name.
- The first demo posted as `jev`. That row's owner cookie was lost, so renaming it needs a direct state-worker edit.

## Cost

Price: $0.042 per million input tokens; output is free. Measured per request: a frame costs about 3,165 input tokens, a crop re-ask about 748.

| Run | Requests | Est. tokens |
|---|---|---|
| 1-min test | 592 | ~1.9M |
| 4-min prod demo | 2,434 | ~6.8–7.7M |
| two 30s audio tests | ~500 | ~1.6M |
| 90s leaderboard test | 919 | ~3.0M |
| token measurement | 2 | <0.01M |
| **Total** | **~4,450** | **~13–15M ≈ $0.55–0.63** |

That is roughly 12% of the $4.78 balance. A 4-minute run costs about $0.30. The 1,193 requests rejected with 422 (a malformed scene question in the first smoke test) failed validation and should not have been billed. The console's usage page lagged on 2026-11-02, so check it against this estimate once it updates.
