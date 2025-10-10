#!/bin/bash

echo "Starting Spring Boot application with hot reload..."
echo "Opening file watcher in new terminal..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR' && ./watch.sh\""

sleep 1

./mvnw spring-boot:run
