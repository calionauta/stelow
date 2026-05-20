#!/usr/bin/env bash
#
# pi-product-workflow setup script
# Installs all required dependencies for this package
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  pi-product-workflow Setup                                  ║"
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
  "npm:pi-goal"
  "npm:pi-intercom"
  "npm:pi-supervisor"
  "npm:pi-autoresearch"
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

echo "📦 Installing this package..."
pi install "$PACKAGE_DIR" 2>/dev/null || true
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Setup Complete!                                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Run: pi"
echo "  2. Use: /skill:cali-product-workflow"
echo ""
echo "Optional: Enable auto-trigger (adds context to ALL projects):"
echo "  cp ~/pi-product-workflow/AGENTS.md ~/.pi/agent/AGENTS.md"
echo ""
echo "  To disable: rm ~/.pi/agent/AGENTS.md"
echo ""
echo "  Or see: docs/ABOUT-AUTO-TRIGGER.md"
echo ""