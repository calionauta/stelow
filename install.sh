#!/usr/bin/env bash
#===============================================================================
# pi-product-workflow Installation Script
# Auto-detects CLI (pi, opencode, claude-code, codex) and installs accordingly
# Works on macOS and Linux
#===============================================================================

set -euo pipefail

# Script directory (resolve symlinks)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors (with fallback for non-color terminals)
if [[ -t 1 ]] && command -v tput &>/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
  BOLD="$(tput bold)"
  RESET="$(tput sgr0)"
  RED="$(tput setaf 1)"
  GREEN="$(tput setaf 2)"
  YELLOW="$(tput setaf 3)"
  BLUE="$(tput setaf 4)"
else
  BOLD=""
  RESET=""
  RED=""
  GREEN=""
  YELLOW=""
  BLUE=""
fi

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------

log_info() {
  echo "${BLUE}[info]${RESET} $*"
}

log_success() {
  echo "${GREEN}[ok]${RESET} $*"
}

log_warn() {
  echo "${YELLOW}[warn]${RESET} $*"
}

log_error() {
  echo "${RED}[error]${RESET} $*" >&2
}

#-------------------------------------------------------------------------------
# CLI Detection
#-------------------------------------------------------------------------------

detect_cli() {
  # Priority: 1. Environment variable override, 2. Config directories, 3. Commands

  # 1. Environment variable override
  if [[ -n "${PRODUCT_WORKFLOW_CLI:-}" ]]; then
    echo "$PRODUCT_WORKFLOW_CLI"
    return
  fi

  # 2. Config directories (higher priority = more specific checks first)

  # Pi: PI_CONFIG_DIR or PI_DIR environment variable
  if [[ -n "${PI_CONFIG_DIR:-}" ]] || [[ -n "${PI_DIR:-}" ]] || [[ -d "$HOME/.pi" ]]; then
    echo "pi"
    return
  fi

  # OpenCode: ~/.config/opencode/ or .opencode/
  if [[ -d "$HOME/.config/opencode" ]] || [[ -d "$HOME/.opencode" ]] || [[ -f "$HOME/.config/opencode.json" ]]; then
    echo "opencode"
    return
  fi

  # Claude Code: ~/.claude/ or CLAUDE_API_KEY env var + .claude directory
  if [[ -n "${CLAUDE_API_KEY:-}" ]] && [[ -d "$HOME/.claude" || -d "$HOME/.claude-plugin" ]]; then
    echo "claude-code"
    return
  fi
  if [[ -d "$HOME/.claude" ]] || [[ -d "$HOME/.claude-plugin" ]]; then
    echo "claude-code"
    return
  fi

  # Codex: ~/.codex/ or OPENAI_API_KEY + .codex-plugin directory
  if [[ -n "${OPENAI_API_KEY:-}" ]] && [[ -d "$HOME/.codex" || -d "$HOME/.codex-plugin" ]]; then
    echo "codex"
    return
  fi
  if [[ -d "$HOME/.codex" ]] || [[ -d "$HOME/.codex-plugin" ]]; then
    echo "codex"
    return
  fi

  # 3. Command availability
  if command -v pi &>/dev/null; then
    echo "pi"
    return
  fi

  if command -v opencode &>/dev/null; then
    echo "opencode"
    return
  fi

  if command -v claude &>/dev/null; then
    echo "claude-code"
    return
  fi

  if command -v codex &>/dev/null; then
    echo "codex"
    return
  fi

  # Fallback
  echo "generic"
}

#-------------------------------------------------------------------------------
# Package Manager Detection
#-------------------------------------------------------------------------------

detect_package_manager() {
  if [[ -n "${PACKAGE_MANAGER:-}" ]]; then
    echo "$PACKAGE_MANAGER"
    return
  fi

  if command -v pnpm &>/dev/null; then
    echo "pnpm"
    return
  fi

  if command -v bun &>/dev/null; then
    echo "bun"
    return
  fi

  if command -v npm &>/dev/null; then
    echo "npm"
    return
  fi

  echo "none"
}

#-------------------------------------------------------------------------------
# Installation Functions
#-------------------------------------------------------------------------------

install_base_package() {
  local pkg_manager="$1"
  local dry_run="$2"

  log_info "Installing base package (pi-product-workflow)..."

  if [[ "$dry_run" == "true" ]]; then
    log_info "[dry-run] Would run: $pkg_manager install -g @renatocaliari/pi-product-workflow"
    return
  fi

  case "$pkg_manager" in
    pnpm)
      pnpm install -g @renatocaliari/pi-product-workflow
      ;;
    bun)
      bun add -g @renatocaliari/pi-product-workflow
      ;;
    npm)
      npm install -g @renatocaliari/pi-product-workflow
      ;;
    none)
      log_error "No package manager found. Please install npm, pnpm, or bun."
      exit 1
      ;;
  esac

  log_success "Base package installed"
}

install_pi_packages() {
  local dry_run="$1"

  log_info "Installing Pi-specific packages..."

  local pi_packages=(
    "pi-subagents"
    "pi-goal"
    "pi-intercom"
    "pi-supervisor"
    "pi-autoresearch"
  )

  for pkg in "${pi_packages[@]}"; do
    if [[ "$dry_run" == "true" ]]; then
      log_info "[dry-run] Would install: $pkg"
    else
      if command -v pi &>/dev/null; then
        log_info "Installing $pkg..."
        pi package add "$pkg" 2>/dev/null || log_warn "Could not install $pkg via pi package add"
      else
        log_warn "pi command not found. Install $pkg manually or run in Pi environment."
      fi
    fi
  done

  if [[ "$dry_run" != "true" ]]; then
    log_success "Pi packages installation complete"
  fi
}

install_opencode_plugin() {
  local dry_run="$1"

  log_info "Configuring OpenCode plugin..."

  local config_dir="${HOME}/.config/opencode"
  local config_file="${config_dir}/plugins.json"

  if [[ "$dry_run" == "true" ]]; then
    log_info "[dry-run] Would update: ${config_file}"
    return
  fi

  # Create config directory if needed
  mkdir -p "$config_dir"

  # Update plugins.json
  if [[ -f "$config_file" ]]; then
    local existing_content
    existing_content=$(cat "$config_file")
    # Add our plugin to the list if not already present
    if ! echo "$existing_content" | grep -q "pi-product-workflow"; then
      log_info "Adding pi-product-workflow to plugins.json..."
      # Simple append (proper JSON manipulation would require jq)
      echo "${existing_content}" | grep -v '^$' > "${config_file}.tmp"
      echo '  "pi-product-workflow": true' >> "${config_file}.tmp"
      mv "${config_file}.tmp" "$config_file"
    fi
  else
    echo '{"pi-product-workflow": true}' > "$config_file"
  fi

  log_success "OpenCode plugin configured"
}

install_claude_code_plugin() {
  local dry_run="$1"

  log_info "Adding Claude Code plugin..."

  if [[ "$dry_run" == "true" ]]; then
    log_info "[dry-run] Would run: claude /plugin marketplace add pi-product-workflow"
    return
  fi

  if command -v claude &>/dev/null; then
    claude /plugin marketplace add pi-product-workflow 2>/dev/null || \
      log_warn "Could not add plugin via Claude CLI. Please add manually."
  else
    log_warn "claude command not found. Install Claude Code and run: claude /plugin marketplace add pi-product-workflow"
  fi

  log_success "Claude Code plugin instructions shown"
}

install_codex_plugin() {
  local dry_run="$1"

  log_info "Installing Codex plugin..."

  if [[ "$dry_run" == "true" ]]; then
    log_info "[dry-run] Would run: codex plugin install pi-product-workflow"
    return
  fi

  if command -v codex &>/dev/null; then
    codex plugin install pi-product-workflow 2>/dev/null || \
      log_warn "Could not install plugin via Codex CLI. Please install manually."
  else
    log_warn "codex command not found. Install Codex and run: codex plugin install pi-product-workflow"
  fi

  log_success "Codex plugin installation attempted"
}

install_cli_specific() {
  local cli="$1"
  local dry_run="$2"

  case "$cli" in
    pi)
      install_pi_packages "$dry_run"
      ;;
    opencode)
      install_opencode_plugin "$dry_run"
      ;;
    claude-code)
      install_claude_code_plugin "$dry_run"
      ;;
    codex)
      install_codex_plugin "$dry_run"
      ;;
    generic)
      log_info "Generic CLI detected. Only base package will be installed."
      log_info "For CLI-specific features, set PRODUCT_WORKFLOW_CLI env var."
      ;;
  esac
}

#-------------------------------------------------------------------------------
# Main Installation
#-------------------------------------------------------------------------------

main() {
  local dry_run="false"
  local cli=""
  local pkg_manager=""

  # Parse flags
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        dry_run="true"
        shift
        ;;
      --help|-h)
        show_help
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done

  # Detect environment
  cli=$(detect_cli)
  pkg_manager=$(detect_package_manager)

  echo ""
  echo "${BOLD}pi-product-workflow Installer${RESET}"
  echo "================================"
  echo ""
  log_info "Detected CLI: ${BOLD}${cli}${RESET}"
  log_info "Package manager: ${BOLD}${pkg_manager}${RESET}"
  echo ""

  if [[ "$dry_run" == "true" ]]; then
    log_warn "DRY RUN MODE - No changes will be made"
    echo ""
  fi

  # Install base package
  install_base_package "$pkg_manager" "$dry_run"
  echo ""

  # Install CLI-specific packages
  install_cli_specific "$cli" "$dry_run"
  echo ""

  if [[ "$dry_run" == "true" ]]; then
    log_success "Dry run complete. Run without --dry-run to install."
  else
    log_success "Installation complete!"
    echo ""
    echo "Next steps:"
    echo "  - Restart your CLI to load the new package"
    echo "  - Run 'pi-product-workflow' or use the /pw: commands"
    echo ""
    echo "For help: $0 --help"
  fi
}

#-------------------------------------------------------------------------------
# Help
#-------------------------------------------------------------------------------

show_help() {
  cat << 'EOF'
pi-product-workflow Installer

Usage: install.sh [OPTIONS]

Auto-detects your CLI (pi, opencode, claude-code, codex) and installs
pi-product-workflow with appropriate CLI-specific configuration.

OPTIONS:
  --dry-run    Show what would be installed without making changes
  --help, -h   Show this help message

ENVIRONMENT VARIABLES:
  PRODUCT_WORKFLOW_CLI  Override CLI detection (pi, opencode, claude-code, codex, generic)
  PACKAGE_MANAGER       Override package manager detection (npm, pnpm, bun)

EXAMPLES:
  ./install.sh              # Install with auto-detection
  ./install.sh --dry-run    # Preview installation steps
  PRODUCT_WORKFLOW_CLI=pi ./install.sh  # Force Pi installation

SUPPORTED CLIs:
  - pi: Installs pi-subagents, pi-goal, pi-intercom, pi-supervisor, pi-autoresearch
  - opencode: Adds plugin to OpenCode config
  - claude-code: Runs /plugin marketplace add
  - codex: Runs codex plugin install
  - generic: Installs base package only
EOF
}

# Run main
main "$@"
