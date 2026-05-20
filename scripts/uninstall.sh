#!/usr/bin/env bash
#
# pi-product-workflow uninstall script
# Removes this package and cleans up configuration
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  pi-product-workflow Uninstall                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if pi is installed
if ! command -v pi &> /dev/null; then
  echo "⚠️  Warning: 'pi' command not found."
  echo "   Proceeding with cleanup only..."
fi

echo "📦 Removing package from pi..."
if command -v pi &> /dev/null; then
  pi remove npm:@renatocaliari/pi-product-workflow 2>/dev/null || {
    echo "   Note: Package may not be in settings.json (manual install?)"
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
echo "  • pi-product-workflow package from settings"
echo "  • ~/.pi/agent/AGENTS.md (if it was ours)"
echo ""
echo "What remains:"
echo "  • Dependencies (pi-subagents, pi-goal, etc.) — remove separately if desired"
echo "  • Project files in ~/pi-product-workflow — delete manually if desired"
echo ""
echo "To fully remove all traces:"
echo "  pi remove npm:pi-subagents npm:pi-goal npm:@plannotator/pi-extension"
echo "  rm -rf ~/pi-product-workflow"
echo ""