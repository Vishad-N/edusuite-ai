#!/bin/bash
# ==============================================================================
# Satyadhi Sharma Classes & Tech - macOS 1-Click Desktop Launcher
# Works on all Apple Silicon (M1, M2, M3, M4) and Intel Macs
# ==============================================================================

cd "$(dirname "$0")"

echo ""
echo "======================================================================="
echo "   Satyadhi Sharma Classes & Tech — macOS Desktop Studio"
echo "======================================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "⚠️ Node.js is required to run the local desktop engine on Mac."
    echo "Please download and install Node.js (LTS) from: https://nodejs.org/"
    echo "Opening nodejs.org in your browser..."
    open "https://nodejs.org/"
    read -p "Press any key after installing Node.js to continue..."
fi

# Install dependencies if not already present
if [ ! -d "node_modules" ]; then
    echo "📦 Initializing packages for macOS (Takes 30 seconds on first run)..."
    npm install
fi

# Build web distribution if needed
if [ ! -d "dist" ]; then
    echo "⚡ Compiling application frontend..."
    npm run build
fi

echo "🚀 Starting Satyadhi Sharma Tech Desktop App on Mac..."
npx electron .
