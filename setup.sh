#!/bin/bash

echo "Installing dependencies..."
pnpm i

echo "Configuring git hooks..."
git config core.hooksPath .githooks

echo "Setup complete! Run ./run.sh to start the development servers."
