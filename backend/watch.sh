#!/bin/bash

echo "Watching for Java file changes..."
echo "Auto-compiling when files are saved..."
echo ""

watchexec -w src/main/java -e java -- ./mvnw compile
