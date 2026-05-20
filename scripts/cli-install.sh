#!/usr/bin/env bash
#
# cali-product-workflow CLI-specific installation helpers
# Uses npx skills for skill management
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="renatocaliari/cali-product-workflow"

# Colors
if [[ -t 1 ]] && command -v tput &>/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
  BOLD="$(tput bold)"
  RESET="$(tput sgr0)"
  GREEN="$(tput setaf 2)"
  YELLOW="$(tput setaf 3)"
  BLUE="$(tput setaf 4)"
else
  BOLD="" RESET="" GREEN="" YELLOW="" BLUE=""
fi

log_info() { echo "${BLUE}[info]${RESET} $*"; }
log_success() { echo "${GREEN}[ok]${RESET} $*"; }
log_warn() { echo "${YELLOW}[warn]${RESET} $*"; }

# ─────────────────────────────────────────────────────────────────────────────
# Skills Management (using npx skills)
# ─────────────────────────────────────────────────────────────────────────────

install_skills() {
  log_info "Installing cali-product-workflow skills via npx skills..."
  
  # Install to all supported agents
  npx skills add "$REPO" \
    -a pi \
    -a opencode \
    -a claude-code \
    -a codex \
    -y
  
  log_success "Skills installed to all detected agents"
}

update_skills() {
  log_info "Updating cali-product-workflow skills..."
  
  npx skills update cali-product-workflow -y || {
    log_warn "Could not update specific skill, trying all..."
    npx skills update -y
  }
}

remove_skills() {
  log_info "Removing cali-product-workflow skills..."
  
  npx skills remove cali-product-workflow -y || {
    log_warn "Could not remove specific skill, trying interactive..."
    npx skills remove
  }
}

list_skills() {
  log_info "Installed skills:"
  npx skills list
}

# ─────────────────────────────────────────────────────────────────────────────
# OpenCode Specific
# ─────────────────────────────────────────────────────────────────────────────

install_opencode_plugin() {
  local config_file="${HOME}/.config/opencode/opencode.json"
  
  log_info "Configuring OpenCode plugin..."
  
  # Create config directory
  mkdir -p "$(dirname "$config_file")"
  
  # Update opencode.json with plugin entry
  if [[ -f "$config_file" ]]; then
    # Check if plugin already exists
    if grep -q "cali-product-workflow" "$config_file" 2>/dev/null; then
      log_info "Plugin already configured in opencode.json"
    else
      # Use jq if available, otherwise manual append
      if command -v jq &>/dev/null; then
        local temp_file="${config_file}.tmp"
        jq '.plugin += ["@renatocaliari/cali-product-workflow"]' "$config_file" > "$temp_file"
        mv "$temp_file" "$config_file"
      else
        log_warn "jq not found. Please manually add to opencode.json:"
        log_info '  Add "plugin": ["@renatocaliari/cali-product-workflow"]'
      fi
    fi
  else
    cat > "$config_file" << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@renatocaliari/cali-product-workflow"]
}
EOF
  fi
  
  log_success "OpenCode plugin configured"
}

# ─────────────────────────────────────────────────────────────────────────────
# Claude Code Specific
# ─────────────────────────────────────────────────────────────────────────────

install_claude_code() {
  log_info "Claude Code plugin installation:"
  log_info ""
  log_info "1. The skills are already installed via 'npx skills add'"
  log_info "2. To use as a full plugin, create marketplace entry"
  log_info ""
  log_info "To add as plugin from local source:"
  log_info "  claude /plugin install /path/to/cali-product-workflow"
  log_info ""
  log_info "To add from GitHub (marketplace):"
  log_info "  claude /plugin marketplace add renatocaliari/cali-product-workflow"
}

# ─────────────────────────────────────────────────────────────────────────────
# Codex Specific
# ─────────────────────────────────────────────────────────────────────────────

install_codex() {
  log_info "Codex plugin installation:"
  log_info ""
  log_info "1. The skills are already installed via 'npx skills add'"
  log_info "2. For hooks, add to ~/.codex/hooks.json"
  log_info ""
  log_info "To install as plugin:"
  log_info "  npx codex-marketplace add renatocaliari/cali-product-workflow --plugins"
  log_info ""
  log_info "For skills:"
  log_info "  npx codex-marketplace add renatocaliari/cali-product-workflow --skills"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

show_help() {
  cat << 'EOF'
cali-product-workflow CLI Management

Usage: cli-install.sh <command>

Commands:
  install-skills    Install skills to all agents via npx skills
  update-skills     Update installed skills
  remove-skills     Remove installed skills
  list-skills       List installed skills
  install-opencode  Configure OpenCode plugin
  install-claude    Show Claude Code installation steps
  install-codex     Show Codex installation steps
  all               Run all installation steps

Examples:
  ./cli-install.sh install-skills    # Install skills to pi, opencode, claude-code, codex
  ./cli-install.sh update-skills     # Update skills
  ./cli-install.sh list-skills       # Show installed skills
  ./cli-install.sh all               # Full installation

Skills are installed to:
  - pi:       ~/.pi/agent/skills/
  - opencode: ~/.config/opencode/skills/
  - claude:   ~/.claude/skills/
  - codex:    ~/.codex/skills/

For more control, use npx skills directly:
  npx skills add renatocaliari/cali-product-workflow -a opencode -a claude-code
  npx skills update
  npx skills remove
EOF
}

main() {
  local command="${1:-}"
  
  case "$command" in
    install-skills) install_skills ;;
    update-skills) update_skills ;;
    remove-skills) remove_skills ;;
    list-skills) list_skills ;;
    install-opencode) install_opencode_plugin ;;
    install-claude) install_claude_code ;;
    install-codex) install_codex ;;
    all)
      install_skills
      echo ""
      install_opencode_plugin
      echo ""
      install_claude_code
      echo ""
      install_codex
      ;;
    *)
      show_help
      exit 1
      ;;
  esac
}

main "$@"