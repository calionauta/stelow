#!/usr/bin/env bash
#
# cali-product-workflow uninstall script
# Removes this package and cleans up configuration
# Handles dual-install pattern: core + stub extension
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  cali-product-workflow Uninstall                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if pi is installed
if ! command -v pi &> /dev/null; then
  echo "⚠️  Warning: 'pi' command not found."
  echo "   Proceeding with cleanup only..."
fi

echo "📦 Removing packages (dual-install pattern)..."
if command -v pi &> /dev/null; then
  # Remove core package
  echo "   → @renatocaliari/cali-product-workflow (core)"
  pi remove npm:@renatocaliari/cali-product-workflow 2>/dev/null || {
    echo "   Note: Core package may not be installed"
  }
  
  # Remove stub extension
  echo "   → @renatocaliari/cali-pw-pi (stub extension)"
  pi remove npm:@renatocaliari/cali-pw-pi 2>/dev/null || {
    echo "   Note: Stub extension may not be installed"
  }
fi
echo ""

echo "🗑️  Cleaning up AGENTS.md..."
if [ -f ~/.pi/agent/AGENTS.md ]; then
  # Check if our AGENTS.md content is present
  if grep -q "Product Workflow for pi" ~/.pi/agent/AGENTS.md 2>/dev/null; then
    rm ~/.pi/agent/AGENTS.md
    echo "   ✅ ~/.pi/agent/AGENTS.md removed"
  else
    echo "   ⚠️ ~/.pi/agent/AGENTS.md exists but seems to be from another source"
    echo "   Skipping. Manual review recommended."
  fi
else
  echo "   ✅ No AGENTS.md found (already clean)"
fi
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Uninstall Complete!                                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "What was removed:"
echo "  • @renatocaliari/cali-product-workflow (core)"
echo "  • @renatocaliari/cali-pw-pi (stub extension)"
echo "  • ~/.pi/agent/AGENTS.md (if it was ours)"
echo ""
echo "What remains:"
echo "  • Supporting packages (pi-subagents, pi-goal, etc.) — remove separately if desired"
echo "  • Project files in ~/cali-product-workflow — delete manually if desired"
echo ""
echo "To fully remove all traces:"
echo "  pi remove npm:pi-subagents npm:pi-goal npm:@plannotator/pi-extension"
echo "  rm -rf ~/cali-product-workflow"
echo ""