# Real hand clips for hand-control validation

Free-licensed footage of real hands used to check the chicken game's hand control (`src/components/game/hand-gesture.ts`) against real fingers, not synthetic frames. Run `./fetch.sh` to download them into this folder (they are not committed except the two small CC clips noted below).

| file | gesture class | source | licence |
|---|---|---|---|
| a_pointing.mp4 | index finger pointing, hand closes into a fist twice (no pinch intended) | https://mixkit.co/free-stock-video/pointing-hand-on-grey-cheker-board-background-47367/ | Mixkit Free Video License (no redistribution as-is, so download it) |
| b_pinch_ok.mp4 | thumb–index pinch held (OK sign), hand small in frame | https://mixkit.co/free-stock-video/woman-displaying-the-ok-hand-signal-11471/ | Mixkit Free Video License |
| b_touch_gestures.mp4 | mixed touchscreen gestures on chroma green: points, taps, pinch-zooms | https://mixkit.co/free-stock-video/making-different-specific-movements-on-a-green-background-28301/ | Mixkit Free Video License |
| c_snap.ogv (committed) | thumb + middle pressed, then one finger snap, side view | https://commons.wikimedia.org/wiki/File:Snapping_fingers.ogv | CC0, Mx. Granger |
| d_flick_snap.ogv (committed) | four finger snaps, each with a fast down-up hand flick | https://commons.wikimedia.org/wiki/File:Alt_Finger_Snap.ogv | CC BY-SA 3.0, Bequw |
| e_negative_counting.webm | counting 1 to 5 on the fingers, no pinches (negative) | https://commons.wikimedia.org/wiki/File:Finger-counting_in_Dutch.webm | CC BY-SA 4.0, S. Perquin |

Not found with a free licence: a close-up repeated thumb–index pinch, a three-finger pinch facing the camera, and a single-hand down-up flick without a snap.

Each clip is scaled and padded to 640x480 at 30 fps and fed to Chromium as the fake webcam (`--use-file-for-fake-video-capture`, y4m), either straight into tasks-vision 1.1.1 for landmark timelines or, prefixed with an 18 s synthetic calibration segment, into the running game.
