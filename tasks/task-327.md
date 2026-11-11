### Task 327: Chicken game — webcam hand control (prototype, parked for iteration)

Live on mannan.is/game behind the "Hand control" button (top right). Paused for later iteration at Mannan's request (2026-11-11).

Done
- [x] Opt-in ask ("Use my hands", x / Escape / outside closes), 21 MB tracker download with progress bar (MediaPipe tasks-vision 1.1.1, loaded only on yes), video stays on device
- [x] Calibration: 16:9 camera view, five checked steps (camera, hand, move, pinch, swipe), Start unlocks after camera + hand + move + (pinch or swipe); game paused, 3-2-1 countdown, resumes
- [x] Index fingertip moves the cursor; thumb–index pinch or a down-up flick squeezes; cursor holds still during a flick; "Squeeze detected +1 · n" label next to the hand cursor
- [x] CPU tracker on software WebGL (Fable); clock-based countdown; closing always resumes the game
- [x] Tests: hand-gesture + hand-trace unit tests; e2e/chicken-hand-control.spec.ts (photo hand through the real model); real-footage harness with CC0/CC BY-SA clips in e2e/fixtures/hand-clips (Fable report: no false squeezes on the no-pinch clip, ~2 px jitter)
- [x] /game?handtrace=1 guided recorder: 4×12 s labelled segments, Download trace (landmarks only); `bun scripts/hand-trace-report.ts`; traces in e2e/fixtures/hand-traces/ become tests

Next (when we come back)
- [ ] Mannan records a trace on his own webcam; tune thresholds from it and commit it as a fixture
- [ ] Safari: confirm the camera view renders (it was black once; autoplay + play-on-metadata added since)
- [ ] A fist currently reads as a pinch; flick needs ≥ ~10 fps tracking; detection drops on cropped fingertips
- [ ] Preview briefly black at countdown start (video element re-attaches)
- [ ] Re-run e2e/chicken-hand-control.spec.ts on an idle machine (last run was under heavy load)
- Location: `src/components/game/hand-*.ts(x)`, `e2e/chicken-hand-control.spec.ts`, `e2e/fixtures/hand-*`, `scripts/hand-trace-report.ts`
