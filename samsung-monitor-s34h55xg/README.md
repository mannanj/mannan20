# Samsung S34H55xG on Apple Silicon

On macOS 26.2 over a USB-C to HDMI hub, macOS drives this monitor with a TV-style signal
(YCbCr, limited range) although full-range RGB is available.

## Set up on another Mac
Apple Silicon only. Needs Apple's command line tools (`xcode-select --install`).

    git clone https://github.com/mannanj/mannan20.git
    cd mannan20/samsung-monitor-s34h55xg
    ./install.sh

Later: `git pull && ./install.sh`. With any other monitor it does nothing.

## Commands

    make                       build ./samsung-rgb
    ./samsung-rgb status       show the current signal
    ./samsung-rgb fix          switch to RGB now
    ./samsung-rgb undo         go back to YCbCr
    ./install.sh               re-apply automatically (checks every 10 s, starts at login)

Remove the automatic part: `launchctl bootout gui/$UID/local.samsung-rgb`, then delete
`~/Library/LaunchAgents/local.samsung-rgb.plist` and `~/.local/bin/samsung-rgb`.
Log: `~/Library/Logs/samsung-rgb.log`. It uses private macOS calls, so an update may break it.

## Not fixed by software
The EDID read through the hub lists 3440x1440 at 60 and 50 Hz only, and the hub gives 2 HBR2
lanes (8.64 Gbps). 60 Hz 8-bit RGB needs 7.7; 100 Hz needs roughly 12. For 100 Hz, try a USB-C
to DisplayPort cable straight from the Mac, if the monitor has a DisplayPort input.

## Alternatives considered
- `/Library/Displays` EDID overrides: reported ignored on Apple Silicon.
- `com.apple.windowserver.displays.plist` LinkDescription: reported failing on macOS 26.1 beta
  (https://gist.github.com/GetVladimir/c89a26df1806001543bef4c8d90cc2f8).
- BetterDisplay can change color mode (https://github.com/waydabber/BetterDisplay/discussions/1473).
