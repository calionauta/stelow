#!/usr/bin/env bash
#
# 🚀 Cali's Pi Setup — Do Zero ao Um
#
# Installs EVERYTHING from scratch for non-technical users:
#   1. Node.js (if needed)
#   2. pi.dev coding agent
#   3. All extensions (22 packages)
#   4. cali-product-workflow (20 skills)
#   5. Configures settings.json with optimized defaults
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/renatocaliari/cali-product-workflow/main/setup.sh | sh
#
# Or download and run:
#   ./setup.sh
#   ./setup.sh --dry-run    # Preview what will be installed
#   ./setup.sh --skip-node  # Skip Node.js installation
#

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITHUB_REPO="https://github.com/renatocaliari/cali-product-workflow"
MIN_NODE_VERSION=20

# All Pi packages to install (22 total)
PI_PACKAGES=(
  # Core extensions
  "npm:pi-subagents"
  "npm:pi-web-access"
  "npm:pi-intercom"
  "npm:pi-supervisor"
  "npm:pi-agent-browser-native"
  "npm:pi-autoresearch"
  "npm:pi-rewind-hook"
  "npm:pi-skillful"
  "npm:pi-powerline-footer"
  "npm:context-mode"

  # Productivity tools
  "npm:@capyup/pi-goal"
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
  "git:github.com/renatocaliari/cali-product-workflow"
)

# Skills to install from cali-product-workflow
ALL_SKILLS=(
  "cali-product-workflow"
  "cali-product-shape-up"
  "cali-product-interface-brainstorm"
  "cali-product-critique"
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
  "cali-product-delivery-audit"
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
      echo "  • 22 Pi extensions and packages"
      echo "  • 20 cali-product-workflow skills"
      echo "  • Optimized settings.json configuration"
      exit 0
      ;;
  esac
done

# ─── Prerequisites Check ────────────────────────────────────────────────────

check_prereqs() {
  log_step "Step 1/5: Checking Prerequisites"

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
  log_step "Step 2/5: Checking Node.js"

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
  log_step "Step 3/5: Installing pi.dev"

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
  log_step "Step 4/5: Installing Pi Extensions (22 packages)"

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
  log_step "Step 5/5: Installing cali-product-workflow Skills (21 skills)"

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
  elif [[ -d "$HOME/.pi/agent/npm/node_modules/cali-product-workflow/skills" ]]; then
    skills_source="$HOME/.pi/agent/npm/node_modules/cali-product-workflow/skills"
  # Check git clone location
  elif [[ -d "$HOME/.pi/extensions/cali-product-workflow/skills" ]]; then
    skills_source="$HOME/.pi/extensions/cali-product-workflow/skills"
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
        "1": "cali-product-workflow",
        "2": "cali-go-stack",
        "3": "cali-coding-standards",
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
      "1": "cali-product-workflow",
      "2": "cali-go-stack",
      "3": "cali-coding-standards",
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

# ─── Summary ─────────────────────────────────────────────────────────────────

print_summary() {
  echo ""
  echo "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo "${GREEN}${BOLD}  🎉 Setup Complete!${RESET}"
  echo "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
  echo "  ${BOLD}What was installed:${RESET}"
  echo ""
  echo "  ${CYAN}Node.js${RESET}       $(node --version 2>/dev/null || echo 'not found')"
  echo "  ${CYAN}pi.dev${RESET}        $(pi --version 2>/dev/null || echo 'not found')"
  echo "  ${CYAN}Extensions${RESET}    22 packages (subagents, browser, intercom, etc.)"
  echo "  ${CYAN}Skills${RESET}        20 product workflow skills"
  echo "  ${CYAN}Settings${RESET}      Optimized configuration"
  echo ""
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
  echo "       /pw-start \"Build a landing page\""
  echo ""
  echo "  ${BOLD}Useful commands:${RESET}"
  echo ""
  echo "       /pw-menu          Show workflow status"
  echo "       /pw-start         Begin product planning"
  echo "       /skills           List all installed skills"
  echo "       alt+1-5           Toggle skill quick-access"
  echo ""
  echo "  ${BOLD}Docs:${RESET} https://github.com/renatocaliari/cali-product-workflow"
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
  echo "    • 22 Pi extensions"
  echo "    • 20 product workflow skills"
  echo "    • Optimized settings"
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
  print_summary
}

main "$@"
