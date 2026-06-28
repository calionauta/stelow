#!/usr/bin/env bash
#
# stelow Installer
# Flattens 25 skills to ~/.agents/skills/ (DotAgents Protocol).
# Distribution to each harness via agent-sync (or manual config).
#
# Skills: 1 orchestrator + 24 subskills = 25 total flat
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITHUB_REPO="https://github.com/renatocaliari/stelow"
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

# Scan filesystem for project skills (source of truth, replaces static ALL_SKILLS)
# Returns skill names (directories with SKILL.md under $SCRIPT_DIR/skills/).
get_project_skills() {
  local skills=()
  for dir in "$SCRIPT_DIR/skills/"*/; do
    local name="$(basename "$dir")"
    if [[ -f "$dir/SKILL.md" ]]; then
      skills+=("$name")
    fi
  done
  printf '%s\n' "${skills[@]}"
}

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
## stelow Integration

When working on software projects, trigger the product workflow:

1. **Trigger:** Use `/skill:stelow-product-orchestrator`
2. **Process:** Follow the 15-stage workflow (see Stage Index in `skills/stelow-product-orchestrator/SKILL.md`)
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
  log_info "Installing 25 skills to ~/.agents/skills/..."
  mkdir -p "$SKILLS_DIR"

  local installed=0
  local skipped=0
  local project_skills=()
  while IFS= read -r s; do project_skills+=("$s"); done < <(get_project_skills)
  for skill in "${project_skills[@]}"; do
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

  # ── Prune: remove skills órfãs ou retired ──
  # Duas fontes determinam o que remover:
  #   1. Skills que não estão mais no projeto (órfãs naturais)
  #   2. Skills explicitamente listadas em retired-skills.yaml (retirements)
  #
  # Só mexe em skills com prefixo gerenciado.
  local retired_list="$SCRIPT_DIR/retired-skills.yaml"
  local pruned=0
  for entry in "$SKILLS_DIR"/*/; do
    local name="$(basename "$entry")"
    case "$name" in
      cali-product-*|cali-pw-*) ;;
      *) continue ;;
    esac
    # Fonte 1: não está nas skills ativas do projeto (órfã natural)
    local in_project=false
    for s in "${project_skills[@]}"; do
      if [[ "$s" == "$name" ]]; then in_project=true; break; fi
    done
    # Fonte 2: está em retired-skills.yaml (retirada explícita)
    local in_retired=false
    if [[ -f "$retired_list" ]]; then
      local yaml_name
      yaml_name="$(sed -n 's/^  - name: //p' "$retired_list" 2>/dev/null || true)"
      while IFS= read -r rname; do
        if [[ "$rname" == "$name" ]]; then in_retired=true; break; fi
      done <<< "$yaml_name"
    fi
    if ! $in_project || $in_retired; then
      rm -rf "$SKILLS_DIR/$name"
      if $in_retired; then
        log_warn "    Removed retired skill: $name (from retired-skills.yaml)"
      else
        log_warn "    Removed orphaned skill: $name (no longer in project)"
      fi
      ((pruned++)) || true
    fi
  done
  if [[ $pruned -gt 0 ]]; then log_warn "  Pruned $pruned retired/orphaned skill(s)"; fi
}



# ─────────────────────────────────────────────────────────────────────────────
# Pi Package Filter — prevents skill conflicts
# ─────────────────────────────────────────────────────────────────────────────
# Pi discovers skills by directory convention: any skills/ dir in a git clone
# is auto-discovered. To avoid "Skill conflicts" warnings (Pi sees the same
# 25 skills from BOTH ~/.agents/skills/ and the git clone), we set
# "skills": [] on the package entry in settings.json.
#
# Skills stay fresh via the extension's syncSkillsFromClone(), which runs
# on every session_start: compares git HEAD hash, and if changed,
# rm -rf + cp -r all skills from clone → ~/.agents/skills/.
#
# This is also why the pi manifest in package.json does NOT declare "skills" —
# skills are served exclusively from ~/.agents/skills/ (DotAgents Protocol).
# ─────────────────────────────────────────────────────────────────────────────
_configure_pi_skills_filter() {
  local pi_settings="$HOME/.pi/agent/settings.json"
  if [[ ! -f "$pi_settings" ]]; then
    log_warn "    Pi settings not found at $pi_settings"
    return
  fi
  if ! command -v jq &>/dev/null; then
    log_warn "    jq not found — cannot configure package filter. Run: brew install jq"
    return
  fi

  log_info "    Configuring Pi package filter (skills: [] via settings.json)..."
  local tmp=$(mktemp)
  jq '
    (.packages // []) |= map(
      if type == "object" and .source == "git:github.com/renatocaliari/stelow" then
        .skills = []
      else
        .
      end
    )
  ' "$pi_settings" > "$tmp" && mv "$tmp" "$pi_settings"
  log_success "    Pi package filter configured — skills excluded from git clone"
}

# Pi
install_pi() {
  log_info "  -> Installing for Pi..."
  if ! command -v pi &>/dev/null; then log_warn "    pi not found. Skipping."; return; fi

  # Install extension via git package.
  # Skills: [] filter (configured below) prevents Pi from discovering skills
  # from the git clone by convention. Skills are served from ~/.agents/skills/
  # and kept fresh by the extension's syncSkillsFromClone() on session_start.

  log_info "    Installing Pi extension (git package)..."
  pi remove "$SCRIPT_DIR/extensions/stelow" 2>/dev/null || true
  pi install "git:github.com/renatocaliari/stelow" 2>/dev/null || true

  # Configure Pi to ignore skills/ from the git clone via native package filter.
  # Skills are served from ~/.agents/skills/ (kept fresh by extension sync).
  _configure_pi_skills_filter

  # Install skills flat (for non-Pi CLIs: OpenCode, Claude Code, Codex)
  install_skills_flat

  # Install supporting packages
  if [[ -z "${INSTALL_SKILLS_ONLY:-}" ]]; then
    log_info "    Installing supporting packages..."
    # Pi npm packages for deep integration.
    # These are optional — the workflow runs without them (with degraded features).
    for pkg in \
      "npm:pi-subagents" "npm:pi-intercom" \
      "npm:pi-supervisor" \
      "npm:@juicesharp/rpiv-ask-user-question" \
      "@plannotator/pi-extension"; do
      pi install "$pkg" 2>/dev/null || true
    done
    
    # NOTE: cymbal and ctx7 are NOT auto-installed.
    # They remain user-managed because:
    # - cymbal requires brew/go/CGO (not npm)
    # - ctx7 requires OAuth setup (interactive)
    # The workflow falls back gracefully without them.
  else
    log_info "    INSTALL_SKILLS_ONLY set -- skipping npm packages"
  fi

  # Clean up project-level duplicates
  rm -rf "$SCRIPT_DIR/.pi/skills/stelow" 2>/dev/null || true

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
    cp "$cmd_src"/sw-*.md "$cmd_dst/" 2>/dev/null || true
    log_success "    Installed $(ls "$cmd_dst"/sw-*.md 2>/dev/null | wc -l | tr -d ' ') command files"
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
    cp "$cmd_src"/sw-*.md "$cmd_dst/" 2>/dev/null || true
    log_success "    Installed $(ls "$cmd_dst"/sw-*.md 2>/dev/null | wc -l | tr -d ' ') command files"
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
    log_info "      claude plugin install stelow@marketplace-name"
  elif claude plugin marketplace add "$GITHUB_REPO" 2>/dev/null; then
    log_info "    Plugin marketplace added from GitHub. Install:"
    log_info "      claude plugin install stelow@marketplace-name"
  else
    log_info "    Add marketplace manually:"
    log_info "      claude plugin marketplace add $GITHUB_REPO"
    log_info "      claude plugin install stelow@marketplace-name"
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
    cp "$cmd_src"/sw-*.md "$cmd_dst/" 2>/dev/null || true
    log_success "    Installed $(ls "$cmd_dst"/sw-*.md 2>/dev/null | wc -l | tr -d ' ') command files"
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
    log_info "      codex plugin add stelow@marketplace-name"
  elif codex plugin marketplace add "$GITHUB_REPO" 2>/dev/null; then
    log_info "    Plugin marketplace added from GitHub. Install:"
    log_info "      codex plugin add stelow@marketplace-name"
  else
    log_info "    Add marketplace manually (plugins feature required):"
    log_info "      codex plugin marketplace add $GITHUB_REPO"
    log_info "      codex plugin add stelow@marketplace-name"
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
  local project_skills=()
  while IFS= read -r s; do project_skills+=("$s"); done < <(get_project_skills)
  for skill in "${project_skills[@]}"; do
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
          cp "$cmd_src"/sw-*.md "$cmd_dir/" 2>/dev/null || true
          log_success "  - $cli: $(ls "$cmd_dir"/sw-*.md 2>/dev/null | wc -l | tr -d ' ') command files"
        fi
        ;;
      pi)
        if command -v pi &>/dev/null; then
          log_info "  Reinstalling Pi extension (git package)..."
          pi remove "$SCRIPT_DIR/extensions/stelow" 2>/dev/null || true
          pi install "git:github.com/renatocaliari/stelow" 2>/dev/null || true
          # Re-apply package filter (pi update re-clones repo with skills/)
          _configure_pi_skills_filter
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
  
  local project_skills=()
  while IFS= read -r s; do project_skills+=("$s"); done < <(get_project_skills)
  for skill in "${project_skills[@]}"; do
    rm -rf "$SKILLS_DIR/$skill"
  done
  
  for cli in $clis; do
    case "$cli" in
      pi)
        pi remove "git:github.com/renatocaliari/stelow" 2>/dev/null || true
        rm -rf "$HOME/.pi/agent/skills/stelow" 2>/dev/null || true
        # Clean package filter from settings.json
        if command -v jq &>/dev/null; then
          local pi_settings="$HOME/.pi/agent/settings.json"
          if [[ -f "$pi_settings" ]]; then
            local tmp=$(mktemp)
            jq '
              (.packages // []) |= map(
                if type == "object" and .source == "git:github.com/renatocaliari/stelow" then
                  del(.skills)
                else
                  .
                end
              )
            ' "$pi_settings" > "$tmp" && mv "$tmp" "$pi_settings"
          fi
        fi
        log_success "  v Pi" ;;
      opencode)
        local cfg="$HOME/.config/opencode/opencode.json"
        if [[ -f "$cfg" ]] && command -v jq &>/dev/null; then
          jq 'delpaths([["skills","paths"]])' "$cfg" > "${cfg}.tmp" && mv "${cfg}.tmp" "$cfg" 2>/dev/null || true
        fi
        log_success "  v OpenCode" ;;
      claude-code)
        claude plugin uninstall "stelow" 2>/dev/null || true
        log_success "  v Claude Code" ;;
      codex)
        codex plugin remove "stelow" 2>/dev/null || true
        log_success "  v Codex" ;;
    esac
  done

  echo ""
  log_success "Uninstallation complete!"
  log_info "Manual AGENTS.md/CLAUDE.md entries were not removed."
}

# ── Interactive Confirmation ──────────────────────────────────────────

confirm() {
  local prompt="$1" default="${2:-Y}"
  if [[ "$ASSUME_YES" == "1" ]]; then return 0; fi
  local yn
  case "$default" in
    Y|y) yn="Y/n" ;;
    N|n) yn="y/N" ;;
  esac
  while true; do
    echo "" >&2
    read -p "${BOLD}?${RESET} $prompt [$yn] " choice </dev/tty
    case "${choice:-$default}" in
      [Yy]*) return 0 ;;
      [Nn]*) return 1 ;;
      *) echo "  Please answer Y or N." >&2 ;;
    esac
  done
}

# ── Full Setup (Default) ───────────────────────────────────────────────

setup_full() {
  local clis=$(detect_all_clis)
  echo ""; log_info "${BOLD}stelow Full Setup${RESET}"; echo ""
  log_info "This will install stelow and optional dependencies for: ${BOLD}$clis${RESET}"
  log_info "You can say N to skip any step."
  echo ""

  # Step 1: Skills (always installed)
  log_info "[1/5] Installing 25 workflow skills..."
  for cli in $clis; do install_skills_flat; done
  log_success "Skills installed."
  echo ""

  # Step 2: Pi extension + packages
  if echo "$clis" | grep -qw "pi"; then
    log_info "[2/5] Pi deep integration"
    if confirm "Install Pi extension (gates, TUI, slash commands)?" Y; then
      install_pi_extension
      if [[ -z "${INSTALL_SKILLS_ONLY:-}" ]] && confirm "Install Pi supporting packages (subagents, intercom, supervisor)?" Y; then
        install_pi_packages
      fi
    fi
    echo ""
  fi

  # Step 3: Command files for other CLIs
  for cli in $clis; do
    case "$cli" in
      opencode) install_opencode_commands ;;
      claude-code) install_claude_code_commands ;;
      codex) install_codex_commands ;;
    esac
  done

  # Step 4: cymbal (codebase navigation)
  log_info "[3/5] cymbal — codebase navigation for Tech Preview"
  if ! command -v cymbal &>/dev/null; then
    if confirm "Install cymbal? Transforms codebase recon from find/grep to full symbol navigation." Y; then
      install_cymbal
    fi
  else
    log_success "  cymbal already installed."
  fi
  echo ""

  # Step 5: ctx7 (library docs)
  log_info "[4/5] ctx7 — live library documentation"
  if ! command -v ctx7 &>/dev/null; then
    log_info "  ctx7 provides current API docs during execution (prevents hallucinated APIs)."
    log_info "  Requires OAuth setup (opens browser once)."
    if confirm "Set up ctx7?" N; then
      echo "  Run: npx @vedanth/context7 setup" >&2
      log_info "  Run this command after setup completes."
    fi
  else
    log_success "  ctx7 already installed."
  fi
  echo ""

  # Step 6: Agent-sync (cross-CLI distribution)
  log_info "[5/5] agent-sync — distribute skills to all harnesses"
  if confirm "Install agent-sync for automatic skill distribution to all CLIs?" N; then
    pipx install agent-sync 2>/dev/null || log_warn "  pipx not found. Install manually: pipx install agent-sync"
  fi
  echo ""

  # Summary
  echo ""; log_success "${BOLD}Setup complete!${RESET}"
  print_agents_setup
}

# ── Minimal Setup (skills only) ────────────────────────────────────────

setup_minimal() {
  local clis=$(detect_all_clis)
  echo ""; log_info "Minimal setup for: ${BOLD}$clis${RESET}"; echo ""
  for cli in $clis; do install_for_cli "$cli"; done
  echo ""; log_success "Minimal installation complete!"; print_agents_setup
}

# ── Tool-specific installers ───────────────────────────────────────────

install_pi_extension() {
  log_info "  Installing Pi extension..."
  pi remove "$SCRIPT_DIR/extensions/stelow" 2>/dev/null || true
  pi install "git:github.com/renatocaliari/stelow" 2>/dev/null || true
  _configure_pi_skills_filter
}

install_pi_packages() {
  log_info "  Installing Pi supporting packages..."
  local pkgs=0
  for pkg in \
    "npm:pi-subagents" "npm:pi-intercom" \
    "npm:pi-supervisor" \
    "npm:@juicesharp/rpiv-ask-user-question" \
    "@plannotator/pi-extension"; do
    if pi install "$pkg" 2>/dev/null; then
      ((pkgs++)) || true
    fi
  done
  log_success "  $pkgs Pi packages installed."
}

install_cymbal() {
  if [[ "$OSTYPE" == "darwin"* ]] && command -v brew &>/dev/null; then
    log_info "  Installing via Homebrew..."
    brew install 1broseidon/tap/cymbal 2>/dev/null && log_success "  cymbal installed." && install_cymbal_hooks && return 0
  fi
  if command -v go &>/dev/null; then
    log_info "  Installing via Go..."
    CGO_CFLAGS="-DSQLITE_ENABLE_FTS5" go install github.com/1broseidon/cymbal@latest 2>/dev/null && log_success "  cymbal installed." && install_cymbal_hooks && return 0
  fi
  log_warn "  Could not auto-install cymbal. Install manually:"
  log_warn "    brew install 1broseidon/tap/cymbal (macOS)"
  log_warn "    OR: go install github.com/1broseidon/cymbal@latest"
  return 1
}

install_cymbal_hooks() {
  if command -v cymbal &>/dev/null; then
    cymbal hook install opencode 2>/dev/null || true
    cymbal hook install claude-code 2>/dev/null || true
    log_success "  cymbal agent hooks installed."
  fi
}

install_opencode_commands() {
  local cmd_src="$SCRIPT_DIR/cli-agents/opencode/commands"
  local cmd_dst="$HOME/.config/opencode/commands"
  if [[ -d "$cmd_src" ]]; then
    mkdir -p "$cmd_dst"
    cp "$cmd_src"/sw-*.md "$cmd_dst/" 2>/dev/null || true
    log_success "  OpenCode: $(ls "$cmd_dst"/sw-*.md 2>/dev/null | wc -l | tr -d ' ') command files"
  fi
}

install_claude_code_commands() {
  local cmd_src="$SCRIPT_DIR/cli-agents/claude/commands"
  local cmd_dst="$HOME/.claude/commands"
  if [[ -d "$cmd_src" ]]; then
    mkdir -p "$cmd_dst"
    cp "$cmd_src"/sw-*.md "$cmd_dst/" 2>/dev/null || true
    log_success "  Claude Code: $(ls "$cmd_dst"/sw-*.md 2>/dev/null | wc -l | tr -d ' ') command files"
  fi
}

install_codex_commands() {
  local cmd_src="$SCRIPT_DIR/cli-agents/codex/commands"
  local cmd_dst="$HOME/.codex/commands"
  if [[ -d "$cmd_src" ]]; then
    mkdir -p "$cmd_dst"
    cp "$cmd_src"/sw-*.md "$cmd_dst/" 2>/dev/null || true
    log_success "  Codex: $(ls "$cmd_dst"/sw-*.md 2>/dev/null | wc -l | tr -d ' ') command files"
  fi
}

# ── Main ───────────────────────────────────────────────────────────────

show_help() {
  cat << 'EOF'
stelow — product workflow installer

Usage: ./install.sh [OPTION]

Options:
  install     Full setup with interactive prompts (default)
  --minimal   Skills only, no optional dependencies
  --help      Show this help

Commands:
  update      Update installed skills
  remove      Uninstall from all detected CLIs

Environment:
  ASSUME_YES=1     Auto-confirm all prompts (non-interactive)
  PRODUCT_WORKFLOW_CLI  Limit to one CLI (pi|opencode|claude-code|codex)

What gets installed (full):

  ✓ 25 workflow skills (always)
  ✓ Pi extension + npm packages (if Pi detected, with confirmation)
  ✓ cymbal — codebase navigation (with confirmation)
  ✓ ctx7 — live library docs (with confirmation, requires OAuth)
  ✓ agent-sync — cross-CLI distribution (with confirmation)

What gets installed (minimal):

  ✓ 25 workflow skills only

Examples:
  ./install.sh                         # Interactive full setup
  ASSUME_YES=1 ./install.sh            # Non-interactive, install everything
  ./install.sh --minimal               # Skills only
  PRODUCT_WORKFLOW_CLI=pi ./install.sh # Pi only
  ./install.sh update                  # Update skills
  ./install.sh remove                  # Uninstall
EOF
}

main() {
  local cmd="${1:-install}"
  case "$cmd" in
    install|i)
      setup_full ;;
    --minimal|minimal|--skills-only)
      setup_minimal ;;
    update|u) update_all ;;
    remove|uninstall|r) uninstall_all ;;
    help|h|--help|-h) show_help ;;
    *) log_error "Unknown option: $cmd"; show_help; exit 1 ;;
  esac
}

main "$@"