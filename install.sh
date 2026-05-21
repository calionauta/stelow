#!/usr/bin/env bash
#
# cali-product-workflow Installer
# Auto-detects ALL installed CLIs and installs for each one.
# Uses Git-based distribution — no npm dependency.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITHUB_REPO="https://github.com/renatocaliari/cali-product-workflow"

# Colors
if [[ -t 1 ]] && command -v tput &>/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
  BOLD="$(tput bold)"  RESET="$(tput sgr0)"
  RED="$(tput setaf 1)" GREEN="$(tput setaf 2)" YELLOW="$(tput setaf 3)" BLUE="$(tput setaf 4)"
else
  BOLD="" RESET="" RED="" GREEN="" YELLOW="" BLUE=""
fi

log_info()    { echo "${BLUE}[info]${RESET} $*"; }
log_success() { echo "${GREEN}[ok]${RESET} $*"; }
log_warn()    { echo "${YELLOW}[warn]${RESET} $*"; }
log_error()   { echo "${RED}[error]${RESET} $*" >&2; }

# CLI Detection
has_cli() {
  local name="$1"
  case "$name" in
    pi)          [[ -d "$HOME/.pi" ]] || command -v pi &>/dev/null ;;
    opencode)    [[ -d "$HOME/.config/opencode" ]] || command -v opencode &>/dev/null ;;
    claude-code) [[ -d "$HOME/.claude" ]] || command -v claude &>/dev/null ;;
    codex)       [[ -d "$HOME/.codex" ]] || command -v codex &>/dev/null ;;
  esac
}

detect_all_clis() {
  if [[ -n "${PRODUCT_WORKFLOW_CLI:-}" ]]; then echo "$PRODUCT_WORKFLOW_CLI"; return; fi
  local clis=""
  has_cli pi          && clis+="pi "
  has_cli opencode    && clis+="opencode "
  has_cli claude-code && clis+="claude-code "
  has_cli codex       && clis+="codex "
  echo "${clis:-generic}"
}

# Print manual AGENTS.md setup instructions
print_agents_setup() {
  echo ""
  log_info "${BOLD}━━ Manual setup ━━${RESET}"
  log_info "Add this to your agent's AGENTS.md / CLAUDE.md:"
  echo ""
  if has_cli pi;          then log_info "  - Pi:          ~/.pi/agent/AGENTS.md"; fi
  if has_cli opencode;    then log_info "  - OpenCode:    ~/.config/opencode/AGENTS.md"; fi
  if has_cli claude-code; then log_info "  - Claude Code: ~/.claude/CLAUDE.md or ./CLAUDE.md"; fi
  if has_cli codex;       then log_info "  - Codex:       ~/.codex/AGENTS.md"; fi
  echo ""
  cat << 'EOF'
\`\`\`
## cali-product-workflow Integration

When working on software projects, trigger the product workflow:

1. **Trigger:** Use \`/skill cali-product-workflow\`
2. **Process:** Follow the 6-phase workflow
3. **Execute:** Only after visual review gate (Plannotator approval)
\`\`\`
EOF
  echo ""
}

# Route to CLI-specific installer
install_for_cli() {
  case "$1" in
    pi) install_pi ;;
    opencode) install_opencode ;;
    claude-code) install_claude_code ;;
    codex) install_codex ;;
    *) install_generic ;;
  esac
}

# Pi
install_pi() {
  log_info "  -> Installing for Pi..."
  if ! command -v pi &>/dev/null; then log_warn "    pi not found. Skipping."; return; fi

  log_info "    Installing core package..."
  pi install "git:github.com/renatocaliari/cali-product-workflow" 2>/dev/null || {
    log_info "    (using local path)"
    pi install "$SCRIPT_DIR" 2>/dev/null || true
  }

  log_info "    Installing Pi extension..."
  pi install "$SCRIPT_DIR/extensions/cali-product-workflow-pi" 2>/dev/null || true

  if [[ -z "${INSTALL_SKILLS_ONLY:-}" ]]; then
    log_info "    Installing supporting packages..."
    for pkg in \
      "npm:pi-subagents" "npm:@capyup/pi-goal" "npm:pi-intercom" \
      "npm:pi-supervisor" "npm:pi-autoresearch" \
      "npm:@juicesharp/rpiv-ask-user-question" \
      "@plannotator/pi-extension"; do
      pi install "$pkg" 2>/dev/null || true
    done
  else
    log_info "    INSTALL_SKILLS_ONLY set -- skipping npm packages"
  fi

  # Clean up duplicate skill locations to avoid conflicts
  rm -rf "$SCRIPT_DIR/.pi/skills/cali-product-workflow" 2>/dev/null || true
  rm -rf "$SCRIPT_DIR/.agents/skills/cali-product-workflow" 2>/dev/null || true
  rm -rf "$HOME/.agents/skills/cali-product-workflow" 2>/dev/null || true

  log_success "  v Pi done"
}

# OpenCode
install_opencode() {
  log_info "  -> Installing for OpenCode..."
  if ! command -v opencode &>/dev/null; then log_warn "    opencode not found. Skipping."; return; fi

  log_info "    Installing skills..."
  npx skills add renatocaliari/cali-product-workflow -a opencode -g -y 2>/dev/null || {
    local skdir="$HOME/.agents/skills"
    mkdir -p "$skdir"
    [[ ! -d "$skdir/cali-product-workflow" ]] && cp -r "$SCRIPT_DIR/skills/cali-product-workflow" "$skdir/"
  }

  log_success "  v OpenCode done"
}

# Claude Code
install_claude_code() {
  log_info "  -> Installing for Claude Code..."
  if ! command -v claude &>/dev/null; then log_warn "    claude not found. Skipping."; return; fi

  log_info "    Installing skills..."
  npx skills add renatocaliari/cali-product-workflow -a claude-code -g -y 2>/dev/null || true

  log_info "    Adding plugin marketplace..."
  if claude plugin marketplace add "$SCRIPT_DIR" 2>/dev/null; then
    log_info "    Plugin marketplace added. Install:"
    log_info "      claude plugin install cali-product-workflow@marketplace-name"
  elif claude plugin marketplace add "$GITHUB_REPO" 2>/dev/null; then
    log_info "    Plugin marketplace added from GitHub. Install:"
    log_info "      claude plugin install cali-product-workflow@marketplace-name"
  else
    log_info "    Add marketplace manually:"
    log_info "      claude plugin marketplace add $GITHUB_REPO"
    log_info "      claude plugin install cali-product-workflow@marketplace-name"
  fi

  log_success "  v Claude Code done"
}

# Codex
install_codex() {
  log_info "  -> Installing for Codex..."
  if ! command -v codex &>/dev/null; then log_warn "    codex not found. Skipping."; return; fi

  log_info "    Installing skills..."
  npx skills add renatocaliari/cali-product-workflow -a codex -g -y 2>/dev/null || true

  log_info "    Adding plugin marketplace..."
  if codex plugin marketplace add "$SCRIPT_DIR" 2>/dev/null; then
    log_info "    Plugin marketplace added. Install:"
    log_info "      codex plugin add cali-product-workflow@marketplace-name"
  elif codex plugin marketplace add "$GITHUB_REPO" 2>/dev/null; then
    log_info "    Plugin marketplace added from GitHub. Install:"
    log_info "      codex plugin add cali-product-workflow@marketplace-name"
  else
    log_info "    Add marketplace manually (plugins feature required):"
    log_info "      codex plugin marketplace add $GITHUB_REPO"
    log_info "      codex plugin add cali-product-workflow@marketplace-name"
  fi

  log_success "  v Codex done"
}

# Generic
install_generic() {
  log_info "  -> Installing skills for all agents..."
  npx skills add renatocaliari/cali-product-workflow -a pi -a opencode -a claude-code -a codex -g -y 2>/dev/null || {
    log_error "    npx skills failed."
    return 1
  }
  log_success "  v Generic done"
}

# Update
update_all() {
  log_info "Updating..."
  npx skills update -y 2>/dev/null || true
  for cli in $(detect_all_clis); do
    case "$cli" in
      pi)          d="$HOME/.pi/agent/skills/cali-product-workflow" ;;
      opencode)    d="$HOME/.config/opencode/skills/cali-product-workflow" ;;
      claude-code) d="$HOME/.claude/skills/cali-product-workflow" ;;
      codex)       d="$HOME/.codex/skills/cali-product-workflow" ;;
    esac
    if [[ -d "${d:-}" ]]; then log_success "  - ${cli}: skills present"
    else log_warn "  - ${cli}: skills missing -- re-run install"; fi
  done
  log_success "Update complete!"
}

# Uninstall
uninstall_all() {
  local clis=$(detect_all_clis)
  log_info "Uninstalling for: $clis"
  for cli in $clis; do
    case "$cli" in
      pi)
        pi remove "git:github.com/renatocaliari/cali-product-workflow" 2>/dev/null || true
        npx skills remove cali-product-workflow -a pi -g -y 2>/dev/null || true
        rm -rf "$HOME/.pi/agent/skills/cali-product-workflow" 2>/dev/null || true
        log_success "  v Pi" ;;
      opencode)
        npx skills remove cali-product-workflow -a opencode -g -y 2>/dev/null || true
        local cfg="$HOME/.config/opencode/opencode.json"
        local skdir="$HOME/.config/opencode/skills"
        if [[ -f "$cfg" ]] && command -v jq &>/dev/null; then
          jq '.skills.paths -= ["'"$skdir"'"]' "$cfg" > "${cfg}.tmp" && mv "${cfg}.tmp" "$cfg" 2>/dev/null || true
        fi
        rm -rf "$skdir/cali-product-workflow" 2>/dev/null || true
        log_success "  v OpenCode" ;;
      claude-code)
        npx skills remove cali-product-workflow -a claude-code -g -y 2>/dev/null || true
        claude plugin uninstall "cali-product-workflow" 2>/dev/null || true
        rm -rf "$HOME/.claude/skills/cali-product-workflow" 2>/dev/null || true
        log_success "  v Claude Code" ;;
      codex)
        npx skills remove cali-product-workflow -a codex -g -y 2>/dev/null || true
        codex plugin remove "cali-product-workflow" 2>/dev/null || true
        rm -rf "$HOME/.codex/skills/cali-product-workflow" 2>/dev/null || true
        log_success "  v Codex" ;;
    esac
  done
  npx skills remove cali-product-workflow -y 2>/dev/null || true
  echo ""
  log_success "Uninstallation complete!"
  log_info "Manual AGENTS.md/CLAUDE.md entries were not removed."
}

# Main
show_help() {
  cat << 'EOF'
cali-product-workflow Installer

Auto-detects ALL your installed AI coding agents and installs for each one.
Uses Git-based distribution -- no npm dependency.

Usage: install.sh [command]

Commands:
  install     Install for all detected CLIs (default)
  update      Update skills
  remove      Uninstall from all detected CLIs
  help        Show this help

Environment:
  INSTALL_SKILLS_ONLY  Skip npm packages (Pi only, skills-only)
  PRODUCT_WORKFLOW_CLI  Limit to one CLI (pi|opencode|claude-code|codex)

Examples:
  ./install.sh                                    # All detected CLIs
  PRODUCT_WORKFLOW_CLI=opencode ./install.sh      # Only OpenCode
  ./install.sh update                              # Update skills
  ./install.sh remove                              # Uninstall from all
EOF
}

main() {
  local cmd="${1:-install}"
  case "$cmd" in
    install|i)
      local clis=$(detect_all_clis)
      echo ""; log_info "Detected CLIs: ${BOLD}$clis${RESET}"; echo ""
      for cli in $clis; do install_for_cli "$cli"; done
      echo ""; log_success "All installations complete!"; print_agents_setup ;;
    update|u) update_all ;;
    remove|uninstall|r) uninstall_all ;;
    help|h|--help|-h) show_help ;;
    *) log_error "Unknown command: $cmd"; show_help; exit 1 ;;
  esac
}

main "$@"
