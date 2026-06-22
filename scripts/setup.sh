#!/usr/bin/env bash
#
# stelow setup script
# Installs all required dependencies for this package
# Handles dual-install pattern: core + stub extension
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  stelow Setup                                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if pi is installed
if ! command -v pi &> /dev/null; then
  echo "❌ Error: 'pi' command not found."
  echo ""
  echo "Install pi first:"
  echo "  npm install -g @mariozechner/pi-coding-agent"
  echo ""
  exit 1
fi

echo "✅ pi is installed"
echo ""

# Required packages
REQUIRED_PACKAGES=(
  "npm:pi-subagents"
  "npm:pi-intercom"
  "npm:pi-supervisor"
  "npm:@juicesharp/rpiv-ask-user-question"
  "npm:@plannotator/pi-extension"
)

# Optional packages (warnings only)
OPTIONAL_PACKAGES=(
  "npm:pi-agent-codebase-workflows"
)

echo "📦 Installing required dependencies..."
for pkg in "${REQUIRED_PACKAGES[@]}"; do
  echo "   → $pkg"
  pi install "$pkg" 2>/dev/null || true
done
echo ""

echo "📦 Installing packages (Git-based distribution)..."
# 1. Core package (skills, adapters, etc.)
echo "   → stelow (core)"
pi install "git:github.com/renatocaliari/stelow" 2>/dev/null || {
  echo "   Note: Installing from local source instead"
  pi install "$PACKAGE_DIR" 2>/dev/null || true
}

# 2. Stub extension (lightweight Pi integration)
echo "   → stelow-pi (stub extension)"
pi install "$PACKAGE_DIR/extensions/stelow-pi" 2>/dev/null || true
echo ""

# Sync cli-tools to all sub-skills
echo "🔧 Syncing cli-tools to all sub-skills..."
"$SCRIPT_DIR/sync-cli-tools.sh" || {
  echo "   Note: cli-tools sync skipped (non-fatal)"
}
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Setup Complete!                                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Installed packages:"
echo "  • @renatocaliari/stelow (core - skills, adapters)"
echo "  • @renatocaliari/stelow-pi (stub extension)"
echo ""
echo "Next steps:"
echo "  1. Run: pi"
echo "  2. Use: /skill:stelow-product-orchestrator"
echo ""
echo "Optional: Enable auto-trigger (adds context to ALL projects):"
echo "  cp ~/stelow/AGENTS.md ~/.pi/agent/AGENTS.md"
echo ""
echo "  To disable: rm ~/.pi/agent/AGENTS.md"
echo ""
echo "  Or see: docs/ABOUT-AUTO-TRIGGER.md"
echo ""