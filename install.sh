#!/usr/bin/env bash
#
# stelow Installer
# Flattens all project skills to ~/.agents/skills/ (DotAgents Protocol).
# Distribution to each harness via agent-sync (or manual config).
#
# Skills are discovered dynamically from skills/ directories containing SKILL.md.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITHUB_REPO="https://github.com/calionauta/stelow"
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

# Print manual AGENTS.md setup instructions (harness-agnostic)
print_agents_setup() {
  echo ""
  log_info "${BOLD}━━ Manual setup ━━${RESET}"
  log_info "Add this to your agent's AGENTS.md / CLAUDE.md:"
  echo ""
  cat << 'EOF'
\`\`\`
## stelow Integration

When working on software projects, trigger the product workflow:

1. **Trigger:** Use `/skill:stelow-workflow-orchestrator`
2. **Process:** Follow the 17-stage workflow (see Stage Index in `skills/stelow-workflow-orchestrator/SKILL.md`)
3. **Execute:** Only after visual review gate approval
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

# Install skills to ~/.agents/skills/ (flat)
install_skills_flat() {
  # Ensure cli-tools are generated before copy (they're gitignored, generated at build/install)
  log_info "Syncing cli-tools to sub-skills..."
  "$SCRIPT_DIR/scripts/sync-cli-tools.sh" 2>/dev/null || log_warn "  cli-tools sync skipped (non-fatal)"

  log_info "Installing skills to ~/.agents/skills/..."
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

  # ── Prune: remove orphaned or retired skills ──
  # Two sources determine what to remove:
  #   1. Skills no longer in the project (natural orphans)
  #   2. Skills explicitly listed in retired-skills.yaml (retirements)
  #
  # Only touches skills with managed prefix.
  local retired_list="$SCRIPT_DIR/retired-skills.yaml"
  local pruned=0
  for entry in "$SKILLS_DIR"/*/; do
    local name="$(basename "$entry")"
    case "$name" in
      stelow-product-*|stelow-workflow-*) ;;
      *) continue ;;
    esac
    # Source 1: not in the project's active skills (natural orphan)
    local in_project=false
    for s in "${project_skills[@]}"; do
      if [[ "$s" == "$name" ]]; then in_project=true; break; fi
    done
    # Source 2: listed in retired-skills.yaml (explicit retirement)
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

# ── Optional cross-harness CLIs ─────────────
offer_cli() {
  local name="$1" pattern="$2" cmd="$3" desc="$4" refs="$5"
  command -v "$name" &>/dev/null && return            # already installed
  grep -rqE "$pattern" "$refs" 2>/dev/null || return  # not used by skills → skip
  log_info "  $desc."
  if confirm "Install $name CLI?" Y; then
    eval "$cmd" 2>/dev/null || log_warn "  Could not auto-install $name — see README."
  fi
}

offer_optional_clis() {
  local refs="$SCRIPT_DIR/skills"
  offer_cli "cymbal"   "cymbal"   "install_cymbal" \
    "Transforms codebase recon from find/grep to full symbol navigation" "$refs"
  offer_cli "ast-grep" "ast_grep" "brew install ast-grep" \
    "Structural (AST-based) code search" "$refs"
  offer_cli "sem"      "\\bsem\\b"  "curl -fsSL https://raw.githubusercontent.com/Ataraxy-Labs/sem/main/install.sh | sh" \
    "Entity-level diff for Execution Critique" "$refs"
}

# Install for any agentskills-compatible agent: skills + optional CLIs
install_generic() {
  log_info "  -> Installing skills for all agents..."
  install_skills_flat
  offer_optional_clis
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

  echo ""
  log_info "To get the latest from GitHub before next update:"
  log_info "  cd $SCRIPT_DIR && git pull origin main && ./install.sh update"
  echo ""
  log_success "Update complete!"
}

# Uninstall
uninstall_all() {
  log_info "Removing skills from $SKILLS_DIR..."

  local project_skills=()
  while IFS= read -r s; do project_skills+=("$s"); done < <(get_project_skills)
  for skill in "${project_skills[@]}"; do
    rm -rf "$SKILLS_DIR/$skill"
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
  echo ""; log_info "${BOLD}stelow Full Setup${RESET}"; echo ""
  log_info "This installs the skills plus optional tooling. You can say N to skip any step."
  echo ""

  # Step 1: Skills (always installed)
  log_info "[1/4] Installing workflow skills..."
  install_skills_flat
  log_success "Skills installed."
  echo ""

  # Step 2: optional cross-harness CLIs (only those used by stelow skills).
  # cymbal + sem are offered (used by Tech Preview / Execution Critique skills);
  # ast-grep is skipped automatically (no skill references it). ctx7 remains a
  # guided OAuth setup below (not a plain install).
  log_info "[2/4] Optional CLI tools (cymbal, sem)"
  offer_optional_clis
  echo ""

  # Step 3: ctx7 (library docs — guided OAuth, not auto-installed)
  log_info "[3/4] ctx7 — live library documentation"
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

  # Step 4: sem (entity-level diff)
  log_info "[4/4] sem — entity-level diff for Execution Critique"
  if ! command -v sem &>/dev/null; then
    if confirm "Install sem? Replaces git diff with function/type/method-level diff in Execution Critique." Y; then
      curl -fsSL https://raw.githubusercontent.com/Ataraxy-Labs/sem/main/install.sh | sh 2>/dev/null || log_warn "  Could not auto-install sem. See https://github.com/Ataraxy-Labs/sem"
    fi
  else
    log_success "  sem already installed."
  fi
  echo ""

  # Summary
  echo ""; log_success "${BOLD}Setup complete!${RESET}"
  print_agents_setup
}

# ── Minimal Setup (skills only) ────────────────────────────────────────

setup_minimal() {
  echo ""; log_info "Minimal setup (skills only)"; echo ""
  install_skills_flat
  echo ""; log_success "Minimal installation complete!"; print_agents_setup
}

# ── Tool-specific installers ───────────────────────────────────────────

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
    log_success "  cymbal agent hooks installed."
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
  remove      Remove installed skills

Environment:
  ASSUME_YES=1     Auto-confirm all prompts (non-interactive)

What gets installed (full):

  ✓ Workflow skills (always)
  ✓ cymbal — codebase navigation (with confirmation)
  ✓ ctx7 — live library docs (with confirmation, requires OAuth)
  ✓ sem — entity-level diff (with confirmation)

What gets installed (minimal):

  ✓ Workflow skills only

Examples:
  ./install.sh                         # Interactive full setup
  ASSUME_YES=1 ./install.sh            # Non-interactive, install everything
  ./install.sh --minimal               # Skills only
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
