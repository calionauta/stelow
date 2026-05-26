#!/usr/bin/env bash
#
# cali-product-workflow Installer
# Flattens 20 skills to ~/.agents/skills/ (DotAgents Protocol).
# Distribution to each harness via agent-sync (or manual config).
#
# Skills: 1 orchestrator + 19 subskills = 20 total flat
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITHUB_REPO="https://github.com/renatocaliari/cali-product-workflow"
SKILLS_DIR="$HOME/.agents/skills"

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

# List of all 20 skills (1 orchestrator + 19 subskills)
ALL_SKILLS=(
  "cali-product-workflow"
  "cali-product-shape-up"
  "cali-product-interface-brainstorm"
  "cali-product-plan-critique"
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
)

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

1. **Trigger:** Use `/skill cali-product-workflow`
2. **Process:** Follow the 11-phase workflow
3. **Execute:** Only after visual review gate (Plannotator approval)
\`\`\`
EOF
  echo ""
  log_info "${BOLD}━━ agent-sync (optional) ━━${RESET}"
  log_info "To distribute skills to each harness, install agent-sync:"
  echo ""
  log_info "  pipx install agent-sync"
  log_info "  agent-sync setup"
  log_info "  agent-sync push"
  echo ""
  log_warn "Without agent-sync, skills are available at ~/.agents/skills/"
  log_warn "and must be configured manually in each harness."
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

# Install skills to ~/.agents/skills/ (flat)
install_skills_flat() {
  log_info "Installing 20 skills to ~/.agents/skills/..."
  mkdir -p "$SKILLS_DIR"

  local installed=0
  local skipped=0
  for skill in "${ALL_SKILLS[@]}"; do
    local src="$SCRIPT_DIR/skills/$skill"
    local dst="$SKILLS_DIR/$skill"
    if [[ -d "$src" ]]; then
      # Clean remove + fresh copy to avoid orphaned files
      rm -rf "$dst"
      cp -r "$src" "$SKILLS_DIR/"
      if [[ -f "$dst/SKILL.md" ]]; then
        log_success "    $skill"
        ((installed++)) || true
      else
        log_error "    $skill: copied but SKILL.md missing"
        ((installed++)) || true
      fi
    else
      log_warn "    Skill not found: $skill (expected at $src)"
      ((skipped++)) || true
    fi
  done

  log_success "  Installed $installed skills"
  if [[ $skipped -gt 0 ]]; then log_warn "  Skipped $skipped skills (not found)"; fi
}

# Pi
install_pi() {
  log_info "  -> Installing for Pi..."
  if ! command -v pi &>/dev/null; then log_warn "    pi not found. Skipping."; return; fi

  # Install skills (flat to ~/.agents/skills/)
  install_skills_flat

  # Install Pi extension
  log_info "    Installing Pi extension..."
  pi install "$SCRIPT_DIR/extensions/cali-product-workflow" 2>/dev/null || true

  # Install supporting packages
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

  # Clean up project-level duplicates
  rm -rf "$SCRIPT_DIR/.pi/skills/cali-product-workflow" 2>/dev/null || true

  log_success "  v Pi done"
}

# OpenCode
install_opencode() {
  log_info "  -> Installing for OpenCode..."
  if ! command -v opencode &>/dev/null; then log_warn "    opencode not found. Skipping."; return; fi

  # Install skills (flat to ~/.agents/skills/)
  install_skills_flat

  # Copy command files to OpenCode commands directory
  local cmd_src="$SCRIPT_DIR/cli-agents/opencode/commands"
  local cmd_dst="$HOME/.config/opencode/commands"
  if [[ -d "$cmd_src" ]]; then
    mkdir -p "$cmd_dst"
    cp "$cmd_src"/pw-*.md "$cmd_dst/" 2>/dev/null || true
    log_success "    Installed $(ls "$cmd_dst"/pw-*.md 2>/dev/null | wc -l | tr -d ' ') command files"
  fi

  # Configure OpenCode to use ~/.agents/skills/
  local cfg="$HOME/.config/opencode/opencode.json"
  if [[ -f "$cfg" ]] && command -v jq &>/dev/null; then
    if jq -e '.skills.paths // [] | index("~/.agents/skills") == -1' "$cfg" &>/dev/null; then
      log_info "    Adding ~/.agents/skills to OpenCode config..."
      local tmp=$(mktemp)
      jq '.skills.paths = (.skills.paths // []) + ["~/.agents/skills"]' "$cfg" > "$tmp" && mv "$tmp" "$cfg"
    fi
  fi

  log_success "  v OpenCode done"
}

# Claude Code
install_claude_code() {
  log_info "  -> Installing for Claude Code..."
  if ! command -v claude &>/dev/null; then log_warn "    claude not found. Skipping."; return; fi

  # Install skills (flat to ~/.agents/skills/)
  install_skills_flat

  # Copy command files to Claude Code commands directory
  local cmd_src="$SCRIPT_DIR/cli-agents/claude/commands"
  local cmd_dst="$HOME/.claude/commands"
  if [[ -d "$cmd_src" ]]; then
    mkdir -p "$cmd_dst"
    cp "$cmd_src"/pw-*.md "$cmd_dst/" 2>/dev/null || true
    log_success "    Installed $(ls "$cmd_dst"/pw-*.md 2>/dev/null | wc -l | tr -d ' ') command files"
  fi

  # Configure Claude Code to use ~/.agents/skills/
  local cfg="$HOME/.claude/settings.json"
  if [[ -f "$cfg" ]] && command -v jq &>/dev/null; then
    if jq -e '.skills.paths // [] | index("~/.agents/skills") == -1' "$cfg" &>/dev/null; then
      log_info "    Adding ~/.agents/skills to Claude Code config..."
      local tmp=$(mktemp)
      jq '.skills.paths = (.skills.paths // []) + ["~/.agents/skills"]' "$cfg" > "$tmp" && mv "$tmp" "$cfg"
    fi
  fi

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

  # Install skills (flat to ~/.agents/skills/)
  install_skills_flat

  # Copy command files to Codex commands directory
  local cmd_src="$SCRIPT_DIR/cli-agents/codex/commands"
  local cmd_dst="$HOME/.codex/commands"
  if [[ -d "$cmd_src" ]]; then
    mkdir -p "$cmd_dst"
    cp "$cmd_src"/pw-*.md "$cmd_dst/" 2>/dev/null || true
    log_success "    Installed $(ls "$cmd_dst"/pw-*.md 2>/dev/null | wc -l | tr -d ' ') command files"
  fi

  # Configure Codex to use ~/.agents/skills/
  local cfg="$HOME/.codex/settings.json"
  if [[ -f "$cfg" ]] && command -v jq &>/dev/null; then
    if jq -e '.skills.paths // [] | index("~/.agents/skills") == -1' "$cfg" &>/dev/null; then
      log_info "    Adding ~/.agents/skills to Codex config..."
      local tmp=$(mktemp)
      jq '.skills.paths = (.skills.paths // []) + ["~/.agents/skills"]' "$cfg" > "$tmp" && mv "$tmp" "$cfg"
    fi
  fi

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

# Generic (no CLI detected)
install_generic() {
  log_info "  -> Installing skills for all agents..."
  install_skills_flat
  log_success "  v Generic done"
}

# Update
update_all() {
  log_info "Updating skills in $SKILLS_DIR..."
  for skill in "${ALL_SKILLS[@]}"; do
    local src="$SCRIPT_DIR/skills/$skill"
    local dst="$SKILLS_DIR/$skill"
    if [[ -d "$src" ]]; then
      rm -rf "$dst"
      cp -r "$src" "$SKILLS_DIR/"
      log_success "  - $skill"
    else
      log_warn "  - $skill: not in source, keeping existing"
    fi
  done

  # Reinstall command files + Pi extension per CLI
  local clis=$(detect_all_clis)
  for cli in $clis; do
    case "$cli" in
      opencode|claude-code|codex)
        local cmd_dir
        case "$cli" in
          opencode) cmd_dir="$HOME/.config/opencode/commands" ;;
          claude-code) cmd_dir="$HOME/.claude/commands" ;;
          codex) cmd_dir="$HOME/.codex/commands" ;;
        esac
        local cmd_src="$SCRIPT_DIR/cli-agents/$cli/commands"
        if [[ -d "$cmd_src" ]]; then
          mkdir -p "$cmd_dir"
          cp "$cmd_src"/pw-*.md "$cmd_dir/" 2>/dev/null || true
          log_success "  - $cli: $(ls "$cmd_dir"/pw-*.md 2>/dev/null | wc -l | tr -d ' ') command files"
        fi
        ;;
      pi)
        if command -v pi &>/dev/null; then
          log_info "  Reinstalling Pi extension..."
          pi install "$SCRIPT_DIR/extensions/cali-product-workflow" 2>/dev/null || true
        fi
        ;;
    esac
  done

  echo ""
  log_info "To get the latest from GitHub before next update:"
  log_info "  cd $SCRIPT_DIR && git pull origin main && ./install.sh update"
  echo ""
  log_success "Update complete!"
}

# Uninstall
uninstall_all() {
  local clis=$(detect_all_clis)
  log_info "Uninstalling for: $clis"
  log_info "Removing skills from $SKILLS_DIR..."
  
  for skill in "${ALL_SKILLS[@]}"; do
    rm -rf "$SKILLS_DIR/$skill"
  done
  
  for cli in $clis; do
    case "$cli" in
      pi)
        pi remove "git:github.com/renatocaliari/cali-product-workflow" 2>/dev/null || true
        rm -rf "$HOME/.pi/agent/skills/cali-product-workflow" 2>/dev/null || true
        log_success "  v Pi" ;;
      opencode)
        local cfg="$HOME/.config/opencode/opencode.json"
        if [[ -f "$cfg" ]] && command -v jq &>/dev/null; then
          jq 'delpaths([["skills","paths"]])' "$cfg" > "${cfg}.tmp" && mv "${cfg}.tmp" "$cfg" 2>/dev/null || true
        fi
        log_success "  v OpenCode" ;;
      claude-code)
        claude plugin uninstall "cali-product-workflow" 2>/dev/null || true
        log_success "  v Claude Code" ;;
      codex)
        codex plugin remove "cali-product-workflow" 2>/dev/null || true
        log_success "  v Codex" ;;
    esac
  done

  echo ""
  log_success "Uninstallation complete!"
  log_info "Manual AGENTS.md/CLAUDE.md entries were not removed."
}

# Main
show_help() {
  cat << 'EOF'
cali-product-workflow Installer

Flattens 20 skills to ~/.agents/skills/ (DotAgents Protocol).
Distribution to each harness via agent-sync or manual config.

Usage: install.sh [command]

Commands:
  install     Install for all detected CLIs (default)
  update      Update skills
  remove      Uninstall from all detected CLIs
  help        Show this help

Environment:
  INSTALL_SKILLS_ONLY  Skip npm packages (Pi only, skills-only)
  PRODUCT_WORKFLOW_CLI  Limit to one CLI (pi|opencode|claude-code|codex)

Skills installed (20 total):
  - cali-product-workflow (orchestrator)
  - 4 workflow skills (shape-up, interface-brainstorm, plan-critique, tech-planning)
  - 5 strategic analysis skills
  - 8 domain library skills
  - 2 execution skills

Examples:
  ./install.sh                                    # All detected CLIs
  PRODUCT_WORKFLOW_CLI=opencode ./install.sh      # Only OpenCode
  ./install.sh update                              # Update skills
  ./install.sh remove                              # Uninstall from all

Optional (for automatic distribution):
  pipx install agent-sync
  agent-sync setup
  agent-sync push
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