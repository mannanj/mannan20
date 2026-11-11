#!/bin/sh
set -e
cd "$(dirname "$0")"
UA="mannan20-hand-clips/1.0"
get() { [ -s "$1" ] || curl -fsSL -A "$UA" -o "$1" "$2"; }
get a_pointing.mp4 https://assets.mixkit.co/videos/47367/47367-720.mp4
get b_pinch_ok.mp4 https://assets.mixkit.co/videos/11471/11471-720.mp4
get b_touch_gestures.mp4 https://assets.mixkit.co/videos/28301/28301-720.mp4
get c_snap.ogv https://upload.wikimedia.org/wikipedia/commons/5/5e/Snapping_fingers.ogv
get d_flick_snap.ogv https://upload.wikimedia.org/wikipedia/commons/d/d1/Alt_Finger_Snap.ogv
get e_negative_counting.webm https://upload.wikimedia.org/wikipedia/commons/9/97/Finger-counting_in_Dutch.webm
ls -la
