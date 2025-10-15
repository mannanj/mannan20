#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

osascript -e "tell application \"Terminal\"
    do script \"cd '$SCRIPT_DIR' && npm start\"
    activate
end tell"

osascript -e "tell application \"Terminal\"
    do script \"cd '$SCRIPT_DIR' && npm run ws-server\"
    activate
end tell"

echo "Started Angular dev server and WebSocket server in separate terminals"
