#!/usr/bin/env bash
set -e

export PATH="/opt/homebrew/bin:$PATH"

echo "=== Setting up Harness Testing Agent (awizemann/harness) ==="

INSTALL_DIR="$HOME/.harness-src"
BIN_DIR="/usr/local/bin"
REPO_URL="https://github.com/awizemann/harness.git"

# 1. Clone or update repository
if [ -d "$INSTALL_DIR" ]; then
    echo "Updating existing Harness repository at $INSTALL_DIR..."
    git -C "$INSTALL_DIR" pull --rebase || true
else
    echo "Cloning $REPO_URL to $INSTALL_DIR..."
    git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# 2. Check for xcodegen
if ! command -v xcodegen &> /dev/null; then
    if command -v brew &> /dev/null; then
        echo "Installing xcodegen via Homebrew..."
        brew install xcodegen || true
    fi
fi

# 3. Generate Xcode project
if command -v xcodegen &> /dev/null; then
    echo "Generating Xcode project with xcodegen..."
    xcodegen generate || true
fi

# 4. Attempt build if Xcode is active
if command -v xcodebuild &> /dev/null; then
    echo "Attempting harness-mcp build..."
    if xcodebuild -project Harness.xcodeproj -scheme HarnessMCP -configuration Debug -derivedDataPath ./.build/derived build 2>/dev/null; then
        BUILT_BIN="$INSTALL_DIR/.build/derived/Build/Products/Debug/harness-mcp"
        if [ -f "$BUILT_BIN" ]; then
            echo "Build successful! Binary: $BUILT_BIN"
            mkdir -p "$BIN_DIR" 2>/dev/null || true
            if [ -w "$BIN_DIR" ]; then
                cp "$BUILT_BIN" "$BIN_DIR/harness-mcp"
                echo "Installed harness-mcp to $BIN_DIR/harness-mcp"
            else
                cp "$BUILT_BIN" "$INSTALL_DIR/harness-mcp"
                echo "Copied binary to $INSTALL_DIR/harness-mcp"
            fi
        fi
    else
        echo "------------------------------------------------------------------"
        echo "Note: xcodebuild requires full Xcode (from App Store / Apple Dev)."
        echo "Current active developer path is: $(xcode-select -p)"
        echo "If Xcode.app is installed, switch active directory using:"
        echo "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
        echo "  ./scripts/setup-harness.sh"
        echo "------------------------------------------------------------------"
    fi
fi

echo "=== Harness Testing Agent setup complete ==="
