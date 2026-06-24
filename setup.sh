#!/usr/bin/env bash
#
# 🚀 Cali's Pi Setup — Do Zero ao Um
#
# Installs EVERYTHING from scratch for non-technical users:
#   1. Node.js (if needed)
#   2. pi.dev coding agent
#   3. All extensions
#   4. stelow (25 skills)
#   5. Configures settings.json with optimized defaults
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/renatocaliari/stelow/main/setup.sh | sh
#
# Or download and run:
#   ./setup.sh
#   ./setup.sh --dry-run    # Preview what will be installed
#   ./setup.sh --skip-node  # Skip Node.js installation
#

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITHUB_REPO="https://github.com/renatocaliari/stelow"
MIN_NODE_VERSION=20

# All Pi packages to install
PI_PACKAGES=(
  # Core extensions
  "npm:pi-subagents"
  "npm:pi-web-access"
  "npm:pi-intercom"
  "npm:pi-supervisor"
  "npm:pi-agent-browser-native"
  # "npm:pi-autoresearch" — DEPRECATED, use subagent + acceptance with benchmark verify
  "npm:pi-rewind-hook"
  "npm:pi-skillful"
  "npm:pi-powerline-footer"

  # Productivity tools

  {"source":"npm:@juicesharp/rpiv-ask-user-question","extensions":["+index.ts"]}
  "npm:@juicesharp/rpiv-todo"
  "npm:@juicesharp/rpiv-i18n"

  # Pi tools (file finder + wayfinder)
  {"source":"npm:@ff-labs/pi-fff","extensions":["-src/index.ts"]}
  {"source":"npm:@deevus/pi-wayfinder","extensions":["-src/index.ts"]}

  # Plannotator (visual review gate)
  {"source":"npm:@plannotator/pi-extension","skills":[]}

  # Themes
  {"source":"git:https://github.com/hasit/pi-community-themes","themes":["+themes/gruvbox-dark-soft.json"]}

  # Git packages
  "https://github.com/dbachelder/pi-btw"
  "git:github.com/PriNova/pi-agent-codebase-workflows"
  "git:github.com/renatocaliari/pi-tool-repair-layer"
  "git:github.com/renatocaliari/stelow"
)

# Skills to install from stelow
ALL_SKILLS=(
  "stelow"
  "cali-product-shape-up"
  "cali-product-interface-alternatives"
  "cali-product-plan-critique"
  "cali-product-codebase-critique"
  "cali-product-ux-critique"
  "cali-product-coding-standards"
  "cali-product-tech-planning"
  "cali-product-job-to-be-done"
  "cali-product-discovery"
  "cali-product-opportunity-mapping"
  "cali-product-multi-method-market-analysis"
  "cali-product-evolutionary-principles"
  "cali-product-pricing"
  "cali-product-ads"
  "cali-product-trust-building"
  "cali-product-promotions"
  "cali-product-business-models"
  "cali-product-health"
  "cali-product-marketplace-playbook"
  "cali-product-open-source"
  "cali-product-scope-executor"
  "cali-product-testing-ai-code"
  "cali-product-testing-execution"
  "cali-product-execution-critique"
)

# ─── Colors & Output ─────────────────────────────────────────────────────────

if [[ -t 1 ]] && command -v tput &>/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
  BOLD="$(tput bold)"  RESET="$(tput sgr0)"
  RED="$(tput setaf 1)" GREEN="$(tput setaf 2)" YELLOW="$(tput setaf 3)"
  BLUE="$(tput setaf 4)" CYAN="$(tput setaf 6)"
else
  BOLD="" RESET="" RED="" GREEN="" YELLOW="" BLUE="" CYAN=""
fi

log_info()    { echo "${BLUE}ℹ${RESET}  $*"; }
log_success() { echo "${GREEN}✓${RESET}  $*"; }
log_warn()    { echo "${YELLOW}⚠${RESET}  $*"; }
log_error()   { echo "${RED}✗${RESET}  $*" >&2; }
log_step()    { echo ""; echo "${CYAN}${BOLD}━━━ $* ━━━${RESET}"; }

# ─── Flags ───────────────────────────────────────────────────────────────────

DRY_RUN=false
SKIP_NODE=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)    DRY_RUN=true ;;
    --skip-node)  SKIP_NODE=true ;;
    --help|-h)
      echo "Usage: ./setup.sh [--dry-run] [--skip-node]"
      echo ""
      echo "Options:"
      echo "  --dry-run     Preview what will be installed without making changes"
      echo "  --skip-node   Skip Node.js installation check"
      echo ""
      echo "This script installs:"
      echo "  • Node.js >= 20 (if not installed)"
      echo "  • pi.dev coding agent"
      echo "  • Pi extensions and packages"
      echo "  • 24 stelow skills"
      echo "  • Optimized settings.json configuration"
      exit 0
      ;;
  esac
done

# ─── Prerequisites Check ────────────────────────────────────────────────────

check_prereqs() {
  log_step "Step 1/10: Checking Prerequisites"

  # Check macOS/Linux
  if [[ "$(uname)" != "Darwin" && "$(uname)" != "Linux" ]]; then
    log_error "This script supports macOS and Linux only."
    log_info "For Windows, use WSL2: https://aka.ms/wsl"
    exit 1
  fi

  # Check curl
  if ! command -v curl &>/dev/null; then
    log_error "curl is required but not installed."
    exit 1
  fi
  log_success "curl found"

  # Check git
  if ! command -v git &>/dev/null; then
    log_warn "git not found. Installing..."
    if [[ "$(uname)" == "Darwin" ]]; then
      xcode-select --install 2>/dev/null || true
    else
      sudo apt-get update && sudo apt-get install -y git
    fi
  fi
  log_success "git found"

  # Check jq (needed for settings.json)
  if ! command -v jq &>/dev/null; then
    log_warn "jq not found. Installing..."
    if [[ "$(uname)" == "Darwin" ]]; then
      if command -v brew &>/dev/null; then
        brew install jq
      else
        log_error "Please install Homebrew first: https://brew.sh"
        log_info "Then run: brew install jq"
        exit 1
      fi
    else
      sudo apt-get update && sudo apt-get install -y jq
    fi
  fi
  log_success "jq found"
}

# ─── Node.js ─────────────────────────────────────────────────────────────────

check_node() {
  log_step "Step 2/10: Checking Node.js"

  if [[ "$SKIP_NODE" == "true" ]]; then
    log_warn "Skipping Node.js check (--skip-node)"
    return
  fi

  if command -v node &>/dev/null; then
    local node_version
    node_version=$(node --version | sed 's/v//' | cut -d. -f1)
    if [[ "$node_version" -ge "$MIN_NODE_VERSION" ]]; then
      log_success "Node.js $(node --version) found (>= v${MIN_NODE_VERSION} required)"
      return
    else
      log_warn "Node.js $(node --version) found but v${MIN_NODE_VERSION}+ required"
    fi
  else
    log_warn "Node.js not found"
  fi

  log_info "Installing Node.js via nvm..."
  if [[ "$(uname)" == "Darwin" ]]; then
    # macOS — try Homebrew first
    if command -v brew &>/dev/null; then
      log_info "Using Homebrew..."
      brew install node
    else
      # Fallback to nvm
      log_info "Using nvm..."
      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
      nvm install --lts
    fi
  else
    # Linux — use nvm
    log_info "Using nvm..."
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install --lts
  fi

  # Verify
  if ! command -v node &>/dev/null; then
    log_error "Node.js installation failed. Please install manually:"
    log_info "  https://nodejs.org/"
    exit 1
  fi
  log_success "Node.js $(node --version) installed"
}

# ─── Pi.dev ──────────────────────────────────────────────────────────────────

install_pi() {
  log_step "Step 3/10: Installing pi.dev"

  if command -v pi &>/dev/null; then
    local current_version
    current_version=$(pi --version 2>/dev/null || echo "unknown")
    log_success "pi.dev already installed ($current_version)"
    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "[dry-run] Would update to latest"
    else
      log_info "Updating to latest..."
      npm update -g @earendil-works/pi-coding-agent 2>/dev/null || true
    fi
    return
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[dry-run] Would install pi.dev"
    return
  fi

  log_info "Installing pi.dev..."
  npm install -g --ignore-scripts @earendil-works/pi-coding-agent

  if ! command -v pi &>/dev/null; then
    log_error "pi.dev installation failed. Please install manually:"
    log_info "  npm install -g @earendil-works/pi-coding-agent"
    exit 1
  fi
  log_success "pi.dev $(pi --version 2>/dev/null || echo 'installed') ready"
}

# ─── Pi Extensions ───────────────────────────────────────────────────────────

install_extensions() {
  log_step "Step 4/10: Installing Pi Extensions"

  local installed=0
  local failed=0

  for pkg in "${PI_PACKAGES[@]}"; do
    # Extract package name for display
    local display_name
    if [[ "$pkg" == *"source"* ]]; then
      display_name=$(echo "$pkg" | grep -o '"source":"[^"]*"' | cut -d'"' -f4)
    elif [[ "$pkg" == http* ]]; then
      display_name=$(basename "$pkg")
    else
      display_name=$(echo "$pkg" | sed 's/^npm://' | sed 's|^git:||')
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "  [dry-run] Would install: $display_name"
      continue
    fi

    if pi install "$pkg" 2>/dev/null; then
      log_success "  $display_name"
      ((installed++)) || true
    else
      log_warn "  $display_name (may already be installed)"
      ((installed++)) || true
    fi
  done

  if [[ "$DRY_RUN" == "false" ]]; then
    log_success "Installed $installed extensions"
  fi
}

# ─── Skills ──────────────────────────────────────────────────────────────────

install_skills() {
  log_step "Step 5/10: Installing stelow Skills (25 skills)"

  local skills_dir="$HOME/.agents/skills"
  if [[ "$DRY_RUN" == "false" ]]; then
    mkdir -p "$skills_dir"
  fi

  local installed=0

  # Try to find the skills source
  local skills_source=""

  # Check if we're in the repo
  if [[ -d "$SCRIPT_DIR/skills" ]]; then
    skills_source="$SCRIPT_DIR/skills"
  # Check if installed via pi
  elif [[ -d "$HOME/.pi/agent/npm/node_modules/stelow/skills" ]]; then
    skills_source="$HOME/.pi/agent/npm/node_modules/stelow/skills"
  # Check git clone location
  elif [[ -d "$HOME/.pi/extensions/stelow/skills" ]]; then
    skills_source="$HOME/.pi/extensions/stelow/skills"
  fi

  if [[ -z "$skills_source" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "[dry-run] Would clone skills from GitHub"
      return
    fi
    log_warn "Skills source not found. Cloning from GitHub..."
    local tmp_dir
    tmp_dir=$(mktemp -d)
    git clone --depth 1 "$GITHUB_REPO" "$tmp_dir" 2>/dev/null
    skills_source="$tmp_dir/skills"
  fi

  for skill in "${ALL_SKILLS[@]}"; do
    local src="$skills_source/$skill"
    local dst="$skills_dir/$skill"

    if [[ -d "$src" ]]; then
      if [[ "$DRY_RUN" == "true" ]]; then
        log_info "  [dry-run] Would install: $skill"
      else
        rm -rf "$dst"
        cp -r "$src" "$skills_dir/"
        log_success "  $skill"
      fi
      ((installed++)) || true
    else
      log_warn "  $skill (source not found)"
    fi
  done

  if [[ "$DRY_RUN" == "false" ]]; then
    log_success "Installed $installed skills to $skills_dir"
  fi
}

# ─── Settings.json ───────────────────────────────────────────────────────────

configure_settings() {
  log_step "Configuring pi settings.json"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[dry-run] Would configure settings.json"
    return
  fi

  local settings_dir="$HOME/.pi/agent"
  local settings_file="$settings_dir/settings.json"
  if [[ "$DRY_RUN" == "false" ]]; then
    mkdir -p "$settings_dir"
  fi

  if [[ -f "$settings_file" ]]; then
    log_info "Existing settings.json found — merging..."
  fi

  # Create or merge settings
  local tmp=$(mktemp)

  if [[ -f "$settings_file" ]] && command -v jq &>/dev/null; then
    # Merge: keep existing, add missing keys
    jq '
      .theme //= "atom-one-light" |
      .defaultProvider //= "commandcode" |
      .defaultModel //= "deepseek/deepseek-v4-flash" |
      .steeringMode //= "all" |
      .followUpMode //= "all" |
      .hideThinkingBlock //= true |
      .defaultThinkingLevel //= "high" |
      .doubleEscapeAction //= "tree" |
      .powerline //= "full" |
      .compaction.enabled //= true |
      .retry.enabled //= true |
      .retry.maxRetries //= 3 |
      .retry.baseDelayMs //= 1000 |
      .retry.provider.maxRetryDelayMs //= 30000 |
      .provider.timeoutMs //= 180000 |
      .terminal.clearOnShrink //= true |
      .terminal.showTerminalProgress //= true |
      .editorPaddingX //= 0 |
      .showHardwareCursor //= false |
      .treeFilterMode //= "default" |
      .skillful.hiddenSkills //= [] |
      .skillful.toggleSlots //= {
        "1": "stelow",
        "2": "cali-go-stack",
        "3": "cali-product-coding-standards",
        "4": "cali-product-testing-execution",
        "5": "cali-github-releases"
      } |
      .skillful.toggleModifier //= "alt"
    ' "$settings_file" > "$tmp" && mv "$tmp" "$settings_file"
  else
    # Create fresh settings
    cat > "$settings_file" << 'SETTINGS_EOF'
{
  "theme": "atom-one-light",
  "defaultProvider": "commandcode",
  "defaultModel": "deepseek/deepseek-v4-flash",
  "steeringMode": "all",
  "followUpMode": "all",
  "hideThinkingBlock": true,
  "defaultThinkingLevel": "high",
  "doubleEscapeAction": "tree",
  "powerline": "full",
  "compaction": { "enabled": true },
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "baseDelayMs": 1000,
    "provider": { "maxRetryDelayMs": 30000 }
  },
  "provider": { "timeoutMs": 180000 },
  "terminal": {
    "clearOnShrink": true,
    "showTerminalProgress": true
  },
  "editorPaddingX": 0,
  "showHardwareCursor": false,
  "treeFilterMode": "default",
  "skillful": {
    "hiddenSkills": [],
    "toggleSlots": {
      "1": "stelow",
      "2": "cali-go-stack",
      "3": "cali-product-coding-standards",
      "4": "cali-product-testing-execution",
      "5": "cali-github-releases"
    },
    "toggleModifier": "alt"
  }
}
SETTINGS_EOF
  fi

  log_success "settings.json configured"
}

# ─── Optional External Tools ──────────────────────────────────────────────────

# Counters for the final summary
SUMMARY_OK=()
SUMMARY_FAIL=()
SUMMARY_SKIP=()

record_ok()   { SUMMARY_OK+=("$1"); }
record_fail() { SUMMARY_FAIL+=("$1"); }
record_skip() { SUMMARY_SKIP+=("$1"); }

confirm_optional() {
  # Returns 0 (yes/install) or 1 (no/skip). Skips in non-interactive mode.
  local label="$1"
  if [[ "$DRY_RUN" == "true" ]]; then return 1; fi
  if [[ "$ASSUME_YES" == "1" ]]; then return 0; fi
  if [[ ! -t 0 ]]; then return 1; fi  # no TTY = skip
  read -p "  Install $label? [Y/n] " -n 1 -r
  echo ""
  [[ ! $REPLY =~ ^[Nn]$ ]]
}

install_cymbal() {
  log_step "Step 6/10: cymbal (codebase navigation)"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[dry-run] Would install cymbal via brew/go"
    record_skip "cymbal"
    return
  fi
  if command -v cymbal &>/dev/null; then
    log_success "cymbal already installed."
    record_ok "cymbal"
    return
  fi

  if ! confirm_optional "cymbal"; then
    log_info "cymbal skipped. Workflow will fall back to find + git log."
    record_skip "cymbal"
    return
  fi

  if [[ "$(uname -s)" == "Darwin" ]] && command -v brew &>/dev/null; then
    if brew install 1broseidon/tap/cymbal; then
      record_ok "cymbal"
    else
      log_warn "cymbal brew install failed — workflow will fall back to find + git log."
      record_fail "cymbal (brew install failed)"
    fi
  elif command -v go &>/dev/null; then
    if go install github.com/1broseidon/cymbal@latest; then
      record_ok "cymbal"
    else
      log_warn "cymbal go install failed — workflow will fall back to find + git log."
      record_fail "cymbal (go install failed)"
    fi
  else
    log_warn "cymbal requires brew (macOS) or Go installed. See https://github.com/1broseidon/cymbal for manual install."
    record_fail "cymbal (no brew/Go on PATH)"
  fi
}

install_ctx7() {
  log_step "Step 7/10: ctx7 (library docs fetcher)"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[dry-run] Would install ctx7 (requires interactive OAuth)"
    record_skip "ctx7"
    return
  fi
  if command -v ctx7 &>/dev/null; then
    log_success "ctx7 already installed."
    record_ok "ctx7"
    return
  fi

  if ! confirm_optional "ctx7 (requires interactive OAuth setup)"; then
    log_info "ctx7 skipped. Workflow will skip live library docs."
    record_skip "ctx7"
    return
  fi

  if ! command -v npx &>/dev/null; then
    log_warn "npx not available — install Node.js first, then run 'npx ctx7 setup' manually."
    record_fail "ctx7 (no npx)"
    return
  fi

  log_info "Running 'npx ctx7 setup' — follow the OAuth prompts."
  if npx ctx7 setup; then
    record_ok "ctx7"
  else
    log_warn "ctx7 setup failed or cancelled. See https://github.com/upstash/context7 for manual install."
    record_fail "ctx7 (setup failed or cancelled)"
  fi
}

install_safe_change() {
  log_step "Step 8/10: safe-change (pre-planning regression check)"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[dry-run] Would install safe-change via npx skills"
    record_skip "safe-change"
    return
  fi
  if ! command -v npx &>/dev/null; then
    log_info "npx not available — skipping safe-change."
    record_skip "safe-change (no npx)"
    return
  fi

  if ! confirm_optional "safe-change"; then
    record_skip "safe-change"
    return
  fi

  if npx skills add PrinNova/pi-agent-codebase-workflows -g 2>&1 | tail -5; then
    record_ok "safe-change"
  else
    log_warn "safe-change install failed. See https://github.com/PriNova/pi-agent-codebase-workflows for manual install."
    record_fail "safe-change (npx install failed)"
  fi
}

install_herdr_plugin() {
  log_step "Step 9/10: Herdr stelow-board plugin (split-pane TUI)"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[dry-run] Would install herdr plugin if herdr CLI detected"
    record_skip "herdr stelow-board"
    return
  fi
  if ! command -v herdr &>/dev/null; then
    log_info "herdr CLI not detected — skipping stelow-board plugin install."
    log_info "Install herdr from https://herdr.dev/, then run: herdr plugin install renatocaliari/stelow-board"
    record_skip "herdr stelow-board (no herdr CLI)"
    return
  fi

  if ! confirm_optional "herdr stelow-board plugin"; then
    record_skip "herdr stelow-board"
    return
  fi

  # Find the herdr plugins directory
  local plugin_dir
  plugin_dir=$(find ~/.config/herdr/plugins -type d -name "stelow-board" -path "*/integrations/herdr/*" 2>/dev/null | head -1)

  if herdr plugin install renatocaliari/stelow-board; then
    # Discover plugin dir after install. herdr stores it at:
    #   ~/.config/herdr/plugins/github/stelow.board-<hash>/integrations/herdr/stelow-board/
    # The hash suffix changes per install, so we glob for the directory.
    local plugin_dir
    plugin_dir=$(find ~/.config/herdr/plugins -type d \
      \( -name "stelow-board" -path "*/integrations/herdr/*" -o \
         -name "stelow-board" -path "*/stelow-board*" \) 2>/dev/null \
      | head -1)

    if [[ -n "$plugin_dir" ]] && [[ -f "$plugin_dir/Cargo.toml" ]]; then
      log_info "Building stelow-board binary (cargo build --release)..."
      if command -v cargo &>/dev/null; then
        (cd "$plugin_dir" && cargo build --release 2>&1) && {
          if [[ -x "$plugin_dir/target/release/stelow-board" ]]; then
            log_success "stelow-board binary built at $plugin_dir/target/release/stelow-board"
            record_ok "herdr stelow-board (built)"
          else
            log_warn "Build succeeded but binary not found at target/release/stelow-board"
            record_fail "herdr stelow-board (binary missing after build)"
          fi
        } || {
          log_warn "cargo build --release failed. See above for details."
          record_fail "herdr stelow-board (build failed)"
        }
      else
        log_warn "Rust/Cargo not found. Install from https://rustup.rs/ then run: cd '$plugin_dir' && cargo build --release"
        record_fail "herdr stelow-board (no cargo)"
      fi
    else
      # Plugin dir not found — install still succeeded but we can't find the source
      record_ok "herdr stelow-board"
      log_info "Plugin installed. To build the binary: find the plugin directory and run 'cargo build --release'"
    fi
  else
    log_warn "stelow-board plugin install failed. See https://herdr.dev/docs/plugins/ for troubleshooting."
    record_fail "herdr stelow-board (plugin install failed)"
  fi
}

detect_muxy() {
  log_step "Step 10/10: Muxy.app detection (macOS-only, open-source under MIT)"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[dry-run] Would detect Muxy.app"
    record_skip "Muxy.app"
    return
  fi
  if [[ -d "/Applications/Muxy.app" ]] || command -v muxy &>/dev/null; then
    log_success "Muxy.app detected."
    log_info "To load the stelow-board extension: Muxy → Extensions modal → Create, pick integrations/muxy/stelow-board/."
    log_info "See https://muxy.app/docs/extensions/get-started for details."
    record_ok "Muxy.app"
  else
    log_info "Muxy.app not detected (optional). Install from https://muxy.app/ if you want the webview panel."
    record_skip "Muxy.app (not installed)"
  fi
}

# ─── Summary ─────────────────────────────────────────────────────────────────

print_summary() {
  echo ""
  echo "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo "${GREEN}${BOLD}  🎉 Setup Complete!${RESET}"
  echo "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
  echo "  ${BOLD}Core stack:${RESET}"
  echo ""
  echo "  ${CYAN}Node.js${RESET}       $(node --version 2>/dev/null || echo 'not found')"
  echo "  ${CYAN}pi.dev${RESET}        $(pi --version 2>/dev/null || echo 'not found')"
  echo "  ${CYAN}Extensions${RESET}    (subagents, browser, intercom, etc.)"
  echo "  ${CYAN}Skills${RESET}        25 product workflow skills"
  echo "  ${CYAN}Settings${RESET}      Optimized configuration"
  echo ""

  if [[ ${#SUMMARY_OK[@]} -gt 0 || ${#SUMMARY_FAIL[@]} -gt 0 || ${#SUMMARY_SKIP[@]} -gt 0 ]]; then
    echo "  ${BOLD}Optional tools:${RESET}"
    echo ""
    for item in "${SUMMARY_OK[@]}"; do
      echo "  ${GREEN}✅${RESET} ${item}"
    done
    for item in "${SUMMARY_FAIL[@]}"; do
      echo "  ${RED}❌${RESET} ${item}"
    done
    for item in "${SUMMARY_SKIP[@]}"; do
      echo "  ${YELLOW}⏭ ${RESET} ${item}"
    done
    echo ""
  fi

  echo "  ${BOLD}What's next:${RESET}"
  echo ""
  echo "  1. ${BOLD}Start pi:${RESET}"
  echo "       pi"
  echo ""
  echo "  2. ${BOLD}Authenticate:${RESET} (choose one)"
  echo "       export ANTHROPIC_API_KEY=sk-ant-..."
  echo "       # OR"
  echo "       pi /login"
  echo ""
  echo "  3. ${BOLD}Test the workflow:${RESET}"
  echo "       /sw-start \"Build a landing page\""
  echo ""
  echo "  ${BOLD}Useful commands:${RESET}"
  echo ""
  echo "       /sw-status          Show workflow status"
  echo "       /sw-start         Begin product planning"
  echo "       /skills           List all installed skills"
  echo "       alt+1-5           Toggle skill quick-access"
  echo ""
  echo "  ${BOLD}Docs:${RESET} https://github.com/renatocaliari/stelow"
  echo ""
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
  echo ""
  echo "${CYAN}${BOLD}🚀 Cali's Pi Setup — Do Zero ao Um${RESET}"
  echo ""

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "${YELLOW}  [DRY RUN MODE — no changes will be made]${RESET}"
    echo ""
  fi

  echo "  This script will install:"
  echo "    • Node.js (if needed)"
  echo "    • pi.dev coding agent"
  echo "    • Pi extensions"
  echo "    • 25 product workflow skills"
  echo "    • Optimized settings"
  echo "    • cymbal (codebase navigation) — brew/go"
  echo "    • ctx7 (library docs) — OAuth setup"
  echo "    • safe-change (pre-planning regression check)"
  echo "    • stelow-board Herdr plugin (if herdr CLI detected)"
  echo "    • Muxy.app detection (manual install from https://muxy.app/)"
  echo ""

  if [[ "$DRY_RUN" == "false" ]]; then
    read -p "  Continue? [Y/n] " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Nn]$ ]]; then
      echo "  Cancelled."
      exit 0
    fi
  fi

  check_prereqs
  check_node
  install_pi
  install_extensions
  install_skills
  configure_settings
  install_cymbal
  install_ctx7
  install_safe_change
  install_herdr_plugin
  detect_muxy
  print_summary
}

main "$@"
