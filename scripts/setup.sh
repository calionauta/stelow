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
# uses to enrich scope-execution analysis. Cross-platform: tries Homebrew
# (macOS / Linuxbrew), then per-tool installers (PowerShell on Windows,
# curl|sh on macOS/Linux), and falls back to manual instructions.
#
#   cymbal — codebase navigation (symbol search, refs, impact/trace/impls)
#            Benefits stelow's tech-planning (impact analysis) and
#            scope-execution `[TARGET_FILES]` authoring.
#            Fallback when unavailable: find / git / grep.
#
#   sem    — entity-level diff (functions, types, methods, not raw lines)
#            Ataraxy-Labs/sem (formerly bcongdon/sem). Benefits Execution
#            Critique (post-execution) and the 4-class overlap report in
#            scope-executor Step 8.
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

# Cross-platform environment probe — used to pick the right installer path
# for each tool. Bash on Windows surfaces as msys / mingw / cygwin under
# Git Bash; native Windows shells use %OSTYPE% but this setup script targets
# Git Bash for Windows users.
IS_WINDOWS=0
case "$OSTYPE" in
  msys*|mingw*|cygwin*|win32*) IS_WINDOWS=1 ;;
esac

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
  # GNU Parallel ships a `sem` binary too — check we got the real one
  if sem --version 2>/dev/null | grep -qi 'ataraxy\|entity'; then
    echo "✅ sem (Ataraxy-Labs): already installed"
    HAS_SEM=true
  else
    echo "   ⚠️ `sem` command found but appears to be GNU Parallel (not Ataraxy-Labs)"
    echo "      See: docs/scope-execution-strategy.md#name-conflict-with-gnu-parallel"
    HAS_SEM=false
  fi
else
  echo "   • sem (entity-level diff): not detected"
fi

echo ""

# Install prompts (interactive shells: ask, default Y; non-interactive: auto-Y)
IS_TTY=0
if [ -t 0 ]; then IS_TTY=1; fi

# ---------------------------------------------------------------------------
# Per-tool installer function. Cascade by platform: brew → PowerShell (Win)
# → curl|sh (Unix) → manual. Returns 0 if binary is on PATH after attempt.
# ---------------------------------------------------------------------------
attempt_install() {
  local TOOL="$1"            # binary name (cymbal / sem)
  local BREW_FORMULA="$2"    # brew formula (e.g. 1broseidon/tap/cymbal)
  local BREW_TAP="$3"        # brew tap to register first (or "")
  local WIN_PS_URL="$4"      # Windows PowerShell installer URL (or "")
  local UNIX_CURL_URL="$5"   # macOS / Linux curl|sh URL (or "")

  # Already installed — nothing to do
  if command -v "$TOOL" &> /dev/null; then
    echo "   ✅ $TOOL: present"
    return 0
  fi

  # Windows path: PowerShell installer (cymbal has install.ps1; sem uses winget)
  if [ $IS_WINDOWS -eq 1 ]; then
    echo "   platform: Windows (Git Bash)"

    # cymbal install.ps1
    if [ -n "$WIN_PS_URL" ] && [ "$TOOL" = "cymbal" ]; then
      if command -v powershell.exe &> /dev/null || command -v powershell &> /dev/null; then
        local PS_EXE; PS_EXE="$(command -v powershell.exe 2>/dev/null || command -v powershell 2>/dev/null)"
        echo "   → $PS_EXE -ExecutionPolicy Bypass -Command 'irm $WIN_PS_URL | iex'"
        "$PS_EXE" -ExecutionPolicy Bypass -NoProfile -Command "irm $WIN_PS_URL | iex" >/dev/null 2>&1
        if command -v "$TOOL" &> /dev/null; then
          echo "   ✅ $TOOL: installed via PowerShell"
          return 0
        fi
      fi
    fi

    # sem on Windows — Ataraxy ships winget manifest
    if [ "$TOOL" = "sem" ]; then
      if command -v winget &> /dev/null; then
        echo "   → winget install AtaraxyLabs.sem"
        if winget install --id AtaraxyLabs.sem -e --accept-source-agreements --accept-package-agreements >/dev/null 2>&1; then
          if command -v "$TOOL" &> /dev/null; then
            echo "   ✅ $TOOL: installed via winget"
            return 0
          fi
        fi
      fi
      if command -v choco &> /dev/null; then
        echo "   → choco install sem"
        if choco install sem -y --no-progress >/dev/null 2>&1; then
          if command -v "$TOOL" &> /dev/null; then
            echo "   ✅ $TOOL: installed via Chocolatey"
            return 0
          fi
        fi
      fi
    fi
  fi

  # Unix path (macOS, Linux, WSL): Homebrew or Linuxbrew first, then curl|sh
  if command -v brew &> /dev/null; then
    if [ -n "$BREW_TAP" ]; then brew tap "$BREW_TAP" >/dev/null 2>&1 || true; fi
    echo "   → brew install $BREW_FORMULA"
    if brew install "$BREW_FORMULA" >/dev/null 2>&1; then
      if command -v "$TOOL" &> /dev/null; then
        echo "   ✅ $TOOL: installed via Homebrew"
        return 0
      fi
    fi
  fi

  # Universal Unix installer (Ataraxy ships install.sh for sem)
  if [ -n "$UNIX_CURL_URL" ] && command -v curl &> /dev/null; then
    echo "   → curl -fsSL $UNIX_CURL_URL | sh"
    if curl -fsSL "$UNIX_CURL_URL" | sh >/dev/null 2>&1; then
      if command -v "$TOOL" &> /dev/null; then
        echo "   ✅ $TOOL: installed via curl|sh"
        return 0
      fi
    fi
  fi

  # All paths exhausted
  echo "   ⚠️ $TOOL: auto-install failed"
  return 1
}

# ---------------------------------------------------------------------------
# Prompt once per tool (default Y). Non-interactive (CI) → auto-Y.
# ---------------------------------------------------------------------------
confirm_install() {
  local TOOL="$1"; local DESC="$2"
  if [ $IS_TTY -eq 1 ]; then
    read -p "Install $TOOL? $DESC [Y/n] " -r REPLY
    REPLY=${REPLY:-Y}
  else
    echo "Install $TOOL? $DESC [Y/n] (non-interactive default: Y)"
    REPLY=Y
  fi
  if [[ "$REPLY" =~ ^[Yy]$ ]]; then return 0; fi
  echo "   ⏭️ $TOOL: skipped by user"
  return 1
}

# cymbal — benefits tech-planning + [TARGET_FILES] authoring
if ! $HAS_CYMBAL; then
  if confirm_install "cymbal" "Used for [TARGET_FILES] authoring + tech-planning impact analysis."; then
    if attempt_install "cymbal" "1broseidon/tap/cymbal" "1broseidon/tap" \
        "https://raw.githubusercontent.com/1broseidon/cymbal/main/install.ps1" ""; then
      HAS_CYMBAL=true
    else
      echo "      Manual: https://github.com/1broseidon/cymbal#install"
    fi
  fi
fi

# sem — benefits Execution Critique + 4-class overlap report
# Tooltip: Ataraxy-Labs/sem (formerly bcongdon/sem). NOTE: GNU Parallel has
# its own `sem` binary; ours is the entity-level diff tool.
if ! $HAS_SEM; then
  if confirm_install "sem" "Used for Execution Critique + 4-class overlap report (entity-level diff)."; then
    if attempt_install "sem" "sem-cli" "" "" \
        "https://raw.githubusercontent.com/Ataraxy-Labs/sem/main/install.sh"; then
      HAS_SEM=true
    else
      echo "      Manual: https://github.com/Ataraxy-Labs/sem#install"
    fi
  fi
fi

echo ""

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