#!/bin/zsh
# Builds samsung-rgb and starts it at login as a LaunchAgent.
set -euo pipefail
cd "${0:A:h}"
label=local.samsung-rgb
bin=~/.local/bin/samsung-rgb
plist=~/Library/LaunchAgents/$label.plist
mkdir -p ~/.local/bin ~/Library/LaunchAgents ~/Library/Logs
launchctl bootout gui/$UID/$label 2>/dev/null || true
clang -O2 -Wall -Wextra samsung-rgb.c -o $bin -framework IOKit -framework CoreFoundation
cat > $plist <<P
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>Label</key><string>$label</string>
<key>ProgramArguments</key><array><string>$bin</string><string>watch</string></array>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
<key>ThrottleInterval</key><integer>60</integer>
<key>StandardOutPath</key><string>$HOME/Library/Logs/samsung-rgb.log</string>
<key>StandardErrorPath</key><string>$HOME/Library/Logs/samsung-rgb.log</string>
</dict></plist>
P
plutil -lint -s $plist
for i in 1 2 3 4 5; do launchctl bootstrap gui/$UID $plist && break; sleep 1; done
launchctl print gui/$UID/$label >/dev/null
echo installed
