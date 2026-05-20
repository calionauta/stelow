#!/usr/bin/env bash
#
# pi-product-workflow Installer
# Auto-detects CLI and installs with full integration
# For specific CLIs: single installation that includes everything
# For generic: npx skills only
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
if [[ -t 1 ]] && command -v tput &>/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
  BOLD="$(tput bold)"
  RESET="$(tput sgr0)"
  RED="$(tput setaf 1)"
  GREEN="$(tput setaf 2)"
  YELLOW="$(tput setaf 3)"
  BLUE="$(tput setaf 4)"
else
  BOLD="" RESET="" RED="" GREEN="" YELLOW="" BLUE=""
fi

log_info() { echo "${BLUE}[info]${RESET} $*"; }
log_success() { echo "${GREEN}[ok]${RESET} $*"; }
log_warn() { echo "${YELLOW}[warn]${RESET} $*"; }
log_error() { echo "${RED}[error]${RESET} $*" >&2; }

# ─────────────────────────────────────────────────────────────────────────────
# CLI Detection
# ─────────────────────────────────────────────────────────────────────────────

detect_cli() {
  # Priority: env var override > config directories > command availability

  if [[ -n "${PRODUCT_WORKFLOW_CLI:-}" ]]; then
    echo "$PRODUCT_WORKFLOW_CLI"
    return
  fi

  # Pi
  if [[ -n "${PI_CONFIG_DIR:-}" ]] || [[ -n "${PI_DIR:-}" ]] || [[ -d "$HOME/.pi" ]]; then
    echo "pi"
    return
  fi

  # OpenCode
  if [[ -d "$HOME/.config/opencode" ]] || [[ -d "$HOME/.opencode" ]]; then
    echo "opencode"
    return
  fi

  # Claude Code
  if [[ -d "$HOME/.claude" ]] || [[ -d "$HOME/.claude-plugin" ]]; then
    echo "claude-code"
    return
  fi

  # Codex
  if [[ -d "$HOME/.codex" ]] || [[ -d "$HOME/.codex-plugin" ]]; then
    echo "codex"
    return
  fi

  # Command availability
  if command -v pi &>/dev/null; then echo "pi"; return; fi
  if command -v opencode &>/dev/null; then echo "opencode"; return; fi
  if command -v claude &>/dev/null; then echo "claude-code"; return; fi
  if command -v codex &>/dev/null; then echo "codex"; return; fi

  # Fallback
  echo "generic"
}

# ─────────────────────────────────────────────────────────────────────────────
# Pi Installation (Dual-Install)
# ─────────────────────────────────────────────────────────────────────────────

install_pi() {
  log_info "Installing for Pi (dual-install pattern)..."

  local core_pkg="npm:@renatocaliari/pi-product-workflow"
  local stub_pkg="npm:@renatocaliari/cali-product-workflow-pi"

  # Check if pi is available
  if ! command -v pi &>/dev/null; then
    log_error "pi command not found. Install pi first:"
    log_error "  npm install -g @mariozechner/pi-coding-agent"
    exit 1
  fi

  # 1. Core package (skills, adapters, CLI tools)
  log_info "Installing core package..."
  pi install "$core_pkg" 2>/dev/null || {
    log_warn "Could not install from npm. Installing from local source..."
    pi install "$SCRIPT_DIR" 2>/dev/null || {
      log_warn "Local install failed. Run './scripts/setup.sh' instead."
    }
  }

  # 2. Stub extension (Pi integration)
  log_info "Installing Pi extension..."
  pi install "$stub_pkg" 2>/dev/null || {
    log_warn "Could not install stub from npm. Installing from local source..."
    pi install "$SCRIPT_DIR/extensions/cali-product-workflow-pi" 2>/dev/null || true
  }

  # 3. Supporting packages
  log_info "Installing supporting packages..."
  local supporting=(
    "npm:pi-subagents"
    "npm:pi-goal"
    "npm:pi-intercom"
    "npm:pi-supervisor"
    "npm:pi-autoresearch"
    "npm:@juicesharp/rpiv-ask-user-question"
    "npm:@plannotator/pi-extension"
  )

  for pkg in "${supporting[@]}"; do
    log_info "  → $pkg"
    pi install "$pkg" 2>/dev/null || log_warn "  Could not install $pkg"
  done

  # 4. Skills via npx (for universal skill paths)
  log_info "Installing skills..."
  npx skills add renatocaliari/pi-product-workflow -a pi -y 2>/dev/null || {
    log_warn "Could not install skills via npx skills"
  }

  log_success "Pi installation complete!"
}

# ─────────────────────────────────────────────────────────────────────────────
# OpenCode Installation
# ─────────────────────────────────────────────────────────────────────────────

install_opencode() {
  log_info "Installing for OpenCode..."

  if ! command -v opencode &>/dev/null; then
    log_error "opencode command not found."
    exit 1
  fi

  local config_file="$HOME/.config/opencode/opencode.json"
  local pkg="@renatocaliari/pi-product-workflow"

  # 1. Add plugin to opencode.json
  mkdir -p "$(dirname "$config_file")"

  if [[ -f "$config_file" ]]; then
    if grep -q "$pkg" "$config_file" 2>/dev/null; then
      log_info "Plugin already in opencode.json"
    else
      if command -v jq &>/dev/null; then
        local tmp="${config_file}.tmp"
        jq '.plugin += ["'"$pkg"'"]' "$config_file" > "$tmp" && mv "$tmp" "$config_file"
      else
        log_warn "jq not found. Please manually add to opencode.json:"
        log_info '  Add "plugin": ["'"$pkg"'"]'
      fi
    fi
  else
    cat > "$config_file" << EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "plugin": ["$pkg"]
}
EOF
  fi

  # 2. Skills via npx
  log_info "Installing skills..."
  npx skills add renatocaliari/pi-product-workflow -a opencode -y 2>/dev/null || {
    log_warn "Could not install skills via npx skills"
  }

  log_success "OpenCode installation complete!"
}

# ─────────────────────────────────────────────────────────────────────────────
# Claude Code Installation
# ─────────────────────────────────────────────────────────────────────────────

install_claude_code() {
  log_info "Installing for Claude Code..."

  if ! command -v claude &>/dev/null; then
    log_error "claude command not found."
    exit 1
  fi

  # 1. Try to add as plugin from npm or local
  log_info "Configuring plugin..."
  
  if npx @anthropic/claude-plugin-cli add renatocaliari/pi-product-workflow 2>/dev/null; then
    log_success "Plugin added via marketplace"
  else
    log_info "Trying local plugin installation..."
    claude /plugin install "$SCRIPT_DIR" 2>/dev/null || {
      log_warn "Plugin install may require manual configuration"
    }
  fi

  # 2. Skills via npx
  log_info "Installing skills..."
  npx skills add renatocaliari/pi-product-workflow -a claude-code -y 2>/dev/null || {
    log_warn "Could not install skills via npx skills"
  }

  log_success "Claude Code installation complete!"
}

# ─────────────────────────────────────────────────────────────────────────────
# Codex Installation
# ─────────────────────────────────────────────────────────────────────────────

install_codex() {
  log_info "Installing for Codex..."

  if ! command -v codex &>/dev/null; then
    log_error "codex command not found."
    exit 1
  fi

  # 1. Try codex-marketplace
  if command -v npx &>/dev/null; then
    log_info "Trying codex-marketplace..."
    npx codex-marketplace add renatocaliari/pi-product-workflow --plugins 2>/dev/null || {
      log_info "codex-marketplace not available. Skipping."
    }
  fi

  # 2. Skills via npx
  log_info "Installing skills..."
  npx skills add renatocaliari/pi-product-workflow -a codex -y 2>/dev/null || {
    log_warn "Could not install skills via npx skills"
  }

  log_success "Codex installation complete!"
}

# ─────────────────────────────────────────────────────────────────────────────
# Generic Installation (npx skills only)
# ─────────────────────────────────────────────────────────────────────────────

install_generic() {
  log_info "Generic CLI detected."
  log_info ""
  log_info "Installing skills only (no full CLI integration)."
  log_info ""
  log_info "For full integration with a specific CLI:"
  log_info "  - Pi:        ./install.sh (from Pi environment)"
  log_info "  - OpenCode:  npm install -g && configure opencode.json"
  log_info "  - Claude:    claude /plugin install"
  log_info "  - Codex:     codex plugin install"
  log_info ""
  
  log_info "Installing skills via npx skills..."
  
  npx skills add renatocaliari/pi-product-workflow -a pi -a opencode -a claude-code -a codex -y 2>/dev/null || {
    log_error "Failed to install skills. Is npx available?"
    exit 1
  }

  log_success "Skills installed!"
  log_info ""
  log_info "To update later: npx skills update"
  log_info "To remove: npx skills remove cali-product-workflow"
}

# ─────────────────────────────────────────────────────────────────────────────
# Uninstall
# ─────────────────────────────────────────────────────────────────────────────

uninstall_all() {
  local cli=$(detect_cli)

  log_info "Uninstalling for $cli..."

  case "$cli" in
    pi)
      pi remove npm:@renatocaliari/pi-product-workflow 2>/dev/null || true
      pi remove npm:@renatocaliari/cali-product-workflow-pi 2>/dev/null || true
      ;;
    opencode)
      local config="$HOME/.config/opencode/opencode.json"
      if [[ -f "$config" ]] && command -v jq &>/dev/null; then
        jq '.plugin -= ["@renatocaliari/pi-product-workflow"]' "$config" > "${config}.tmp" && mv "${config}.tmp" "$config"
      fi
      ;;
    claude-code)
      claude /plugin uninstall pi-product-workflow 2>/dev/null || true
      ;;
    codex)
      codex plugin uninstall pi-product-workflow 2>/dev/null || true
      ;;
  esac

  # Remove skills
  npx skills remove cali-product-workflow -y 2>/dev/null || true

  # Remove auto-trigger
  [[ -f "$HOME/.pi/agent/AGENTS.md" ]] && grep -q "Product Workflow" "$HOME/.pi/agent/AGENTS.md" && rm "$HOME/.pi/agent/AGENTS.md"

  log_success "Uninstallation complete!"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

show_help() {
  cat << 'EOF'
pi-product-workflow Installer

Usage: install.sh [command]

Commands:
  install     Install for detected CLI (default)
  update      Update installation
  remove      Uninstall completely
  help        Show this help

Installation:
  - Detects your CLI (pi, opencode, claude-code, codex, generic)
  - Installs everything needed for that CLI in one command
  - Skills are included in all installations

Environment Variables:
  PRODUCT_WORKFLOW_CLI  Override CLI detection (pi, opencode, claude-code, codex, generic)

Examples:
  ./install.sh              # Install for detected CLI
  ./install.sh update        # Update
  ./install.sh remove        # Uninstall

  PRODUCT_WORKFLOW_CLI=pi ./install.sh  # Force Pi installation
EOF
}

main() {
  local command="${1:-install}"

  case "$command" in
    install|i)
      local cli=$(detect_cli)
      echo ""
      log_info "Detected CLI: ${BOLD}$cli${RESET}"
      echo ""

      case "$cli" in
        pi) install_pi ;;
        opencode) install_opencode ;;
        claude-code) install_claude_code ;;
        codex) install_codex ;;
        generic) install_generic ;;
      esac
      ;;
    update|u)
      npx skills update -y
      ;;
    remove|uninstall|r)
      uninstall_all
      ;;
    help|h|--help|-h)
      show_help
      ;;
    *)
      log_error "Unknown command: $command"
      show_help
      exit 1
      ;;
  esac
}

main "$@"