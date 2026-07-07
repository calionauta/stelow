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

# 2. Pi extension is bundled in main package; nothing to install separately.
echo ""

# Sync cli-tools to all sub-skills
echo "🔧 Syncing cli-tools to all sub-skills..."
"$SCRIPT_DIR/sync-cli-tools.sh" || {
  echo "   Note: cli-tools sync skipped (non-fatal)"
}
echo ""

# Optional enhancement tools (cymbal + sem)
# ---------------------------------------------------------------------------
# Detect (and offer to install) the two optional external tools that stelow
# uses to enrich scope-execution analysis. Both default to install on macOS
# with Homebrew; on other platforms we surface install instructions and skip.
#
#   cymbal — codebase navigation (symbol search, refs, impact/trace/impls)
#            Benefits stelow's tech-planning (impact analysis) and
#            scope-execution `[TARGET_FILES]` authoring.
#            Fallback when unavailable: find / git / grep.
#
#   sem    — entity-level diff (functions, types, methods, not raw lines)
#            Benefits Execution Critique (post-execution) and the 4-class
#            overlap report in scope-executor Step 8.
#            Fallback when unavailable: git diff (raw line-level only).
#
# Decision state is persisted to `.stelow/tools.json` so downstream stages can
# read it without re-detecting. See docs/scope-execution-strategy.md for the
# full rationale.
# ---------------------------------------------------------------------------
echo "🔍 Detecting optional enhancement tools..."
echo "   Both tools enrich stelow's scope-execution analysis (4-class overlap"
echo "   report, [TARGET_FILES] authoring, Execution Critique). They are NOT"
echo "   required — stelow works without them via documented fallbacks."
echo ""

HAS_CYMBAL=false
HAS_SEM=false

# cymbal — detect
if command -v cymbal &> /dev/null; then
  echo "✅ cymbal: already installed"
  HAS_CYMBAL=true
else
  echo "   • cymbal (codebase navigation): not detected"
fi

# sem — detect
if command -v sem &> /dev/null; then
  echo "✅ sem: already installed"
  HAS_SEM=true
else
  echo "   • sem (entity-level diff): not detected"
fi

echo ""

# Install prompts (interactive shells: ask, default Y; non-interactive: auto-Y)
IS_TTY=0
if [ -t 0 ]; then IS_TTY=1; fi

if [[ "$OSTYPE" == "darwin"* ]] && command -v brew &> /dev/null; then
  if ! $HAS_CYMBAL; then
    if [ $IS_TTY -eq 1 ]; then
      read -p "Install cymbal? [Y/n] " -r INSTALL_CYMBAL
      INSTALL_CYMBAL=${INSTALL_CYMBAL:-Y}
    else
      echo "Non-interactive mode: defaulting to install cymbal (Y)."
      INSTALL_CYMBAL=Y
    fi
    if [[ "$INSTALL_CYMBAL" =~ ^[Yy]$ ]]; then
      echo "   → brew install 1broseidon/tap/cymbal"
      brew install 1broseidon/tap/cymbal >/dev/null 2>&1 \
        && { echo "   ✅ cymbal installed"; HAS_CYMBAL=true; } \
        || echo "   ⚠️ cymbal install failed (skipping; manual: brew install 1broseidon/tap/cymbal)"
    else
      echo "   ⏭️ cymbal: skipped by user"
    fi
  fi

  if ! $HAS_SEM; then
    if [ $IS_TTY -eq 1 ]; then
      read -p "Install sem? [Y/n] " -r INSTALL_SEM
      INSTALL_SEM=${INSTALL_SEM:-Y}
    else
      echo "Non-interactive mode: defaulting to install sem (Y)."
      INSTALL_SEM=Y
    fi
    if [[ "$INSTALL_SEM" =~ ^[Yy]$ ]]; then
      echo "   → brew install sem"
      brew install sem >/dev/null 2>&1 \
        && { echo "   ✅ sem installed"; HAS_SEM=true; } \
        || echo "   ⚠️ sem install failed (skipping; manual: brew install sem)"
    else
      echo "   ⏭️ sem: skipped by user"
    fi
  fi
else
  if ! $HAS_CYMBAL || ! $HAS_SEM; then
    echo "   ⚠️ Auto-install unavailable on this platform (macOS + Homebrew required)."
    echo "   Manual install: see https://github.com/nicobailon/pi-subagents (cymbal)"
    echo "                    or  https://github.com/bcongdon/sem (sem)"
  fi
fi

# Persist detection state for downstream stages
mkdir -p .stelow
TOOLS_JSON_PATH=".stelow/tools.json"
CYMBAL_VAL="false"
SEM_VAL="false"
$HAS_CYMBAL && CYMBAL_VAL="true"
$HAS_SEM && SEM_VAL="true"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%S)

cat > "$TOOLS_JSON_PATH" <<EOF
{
  "cymbal": $CYMBAL_VAL,
  "sem": $SEM_VAL,
  "detected_at": "$TIMESTAMP"
}
EOF

echo ""
echo "📝 Tool state saved to $TOOLS_JSON_PATH"
echo "   Downstream stages read this to decide whether to use cymbal/sem."
echo ""


echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Setup Complete!                                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Installed packages:"
echo "  • @renatocaliari/stelow (core - skills, Pi extension, adapters)"
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