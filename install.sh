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

# CLI Detection
has_pi() {
  [[ -d "$HOME/.pi" ]] || command -v pi &>/dev/null
}

detect_all_clis() {
  if [[ -n "${PRODUCT_WORKFLOW_CLI:-}" ]]; then echo "$PRODUCT_WORKFLOW_CLI"; return; fi
  if has_pi; then echo "pi"; else echo "generic"; fi
}

# Print manual AGENTS.md setup instructions
print_agents_setup() {
  echo ""
  log_info "${BOLD}━━ Manual setup ━━${RESET}"
  log_info "Add this to your agent's AGENTS.md / CLAUDE.md:"
  echo ""
  if has_pi; then log_info "  - Pi:          ~/.pi/agent/AGENTS.md"; fi
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
    *) install_generic ;;
  esac
}

# Install skills to ~/.agents/skills/ (flat)
install_skills_flat() {
  # Ensure cli-tools are generated before copy (they're gitignored, generated at build/install)
  log_info "Syncing cli-tools to sub-skills..."
  "$SCRIPT_DIR/sync-cli-tools.sh" 2>/dev/null || log_warn "  cli-tools sync skipped (non-fatal)"

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
      stelow-product-*) ;;
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
      if type == "object" and .source == "git:github.com/calionauta/stelow" then
        .skills = []
      else
        .
      end
    )
  ' "$pi_settings" > "$tmp" && mv "$tmp" "$pi_settings"
  log_success "    Pi package filter configured — skills excluded from git clone"
}

# Pi
# ── Pi extensions (single source of truth) ──────────────────────────────
# All Pi extensions for deep integration. Convention: a full Pi install
# enables every extension (skills stay active — no filters). cymbal/ast-grep
# extensions are installed here; their CLI tools are still required on the
# host (offer_optional_clis installs them, or see README).
PI_EXTENSIONS=(
  "npm:@tintinweb/pi-subagents"
  "npm:@tintinweb/pi-tasks"
  "npm:pi-web-access"
  "npm:pi-supervisor"
  "npm:pi-agent-browser-native"
  "npm:@juicesharp/rpiv-ask-user-question"
  "npm:@ff-labs/pi-fff"
  "npm:@plannotator/pi-extension"
  "npm:@sting8k/pi-vcc"
  "npm:pi-hermes-memory"
  "npm:pi-cache-optimizer"
  "git:github.com/calionauta/pi-leakguard"
  "npm:@tomooshi/condensed-milk-pi"
  "https://github.com/tomooshi/caveman-milk-pi"
  "git:github.com/PriNova/pi-agent-codebase-workflows"
  "git:github.com/calionauta/pi-tool-repair-layer"
  "git:github.com/raphapr/pi-cymbal"
  "git:github.com/joelhooks/pi-ast-grep"
)

# Install all Pi supporting extensions from the single PI_EXTENSIONS list.
install_pi_extensions() {
  log_info "  Installing Pi supporting extensions..."
  local installed=0
  for pkg in "${PI_EXTENSIONS[@]}"; do
    local display
    if [[ "$pkg" == http* ]]; then
      display=$(basename "$pkg")
    else
      display="${pkg#npm:}"; display="${display#git:}"
    fi
    if pi install "$pkg" 2>/dev/null; then
      log_success "    $display"
    else
      log_warn "    $display (may already be installed)"
    fi
    ((installed++)) || true
  done
  log_success "  $installed Pi extensions processed."
}

install_pi() {
  log_info "  -> Installing for Pi..."
  if ! command -v pi &>/dev/null; then log_warn "    pi not found. Skipping."; return; fi

  # Install extension via git package.
  # Skills: [] filter (configured below) prevents Pi from discovering skills
  # from the git clone by convention. Skills are served from ~/.agents/skills/
  # and kept fresh by the extension's syncSkillsFromClone() on session_start.

  log_info "    Installing Pi extension (git package)..."
  pi remove "$SCRIPT_DIR/extensions/stelow" 2>/dev/null || true
  pi install "git:github.com/calionauta/stelow" 2>/dev/null || true

  # Configure Pi to ignore skills/ from the git clone via native package filter.
  # Skills are served from ~/.agents/skills/ (kept fresh by extension sync).
  _configure_pi_skills_filter

  # Install skills flat (for any agent that reads ~/\.agents/skills/)
  install_skills_flat

  # Install supporting packages (single source of truth: PI_EXTENSIONS)
  if [[ -z "${INSTALL_SKILLS_ONLY:-}" ]]; then
    install_pi_extensions
    # NOTE: ctx7 is NOT auto-installed (requires OAuth setup, interactive).
    # cymbal (raphapr/pi-cymbal) and ast-grep (joelhooks/pi-ast-grep) ARE
    # auto-installed above. The cymbal CLI is still required on the host
    # (offer_optional_clis installs it, or see README); if absent the
    # workflow falls back gracefully to bash `cymbal` / find + git log.
  else
    log_info "    INSTALL_SKILLS_ONLY set -- skipping npm packages"
  fi

  # Clean up project-level duplicates
  rm -rf "$SCRIPT_DIR/.pi/skills/stelow" 2>/dev/null || true

  log_success "  v Pi done"
}

# ── Optional cross-harness CLIs (generic / non-Pi installs) ─────────────
# Convention over configuration: we only offer a CLI when a stelow skill or
# reference actually uses it (detected via grep). Pi auto-installs the
# cymbal/ast-grep *extensions*; for other harnesses we offer the bare CLIs.
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

# Generic (no CLI detected)
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

  # Reinstall command files + Pi extension per CLI
  local clis=$(detect_all_clis)
  for cli in $clis; do
    case "$cli" in
      pi)
        if command -v pi &>/dev/null; then
          log_info "  Reinstalling Pi extension (git package)..."
          pi remove "$SCRIPT_DIR/extensions/stelow" 2>/dev/null || true
          pi install "git:github.com/calionauta/stelow" 2>/dev/null || true
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
        pi remove "git:github.com/calionauta/stelow" 2>/dev/null || true
        rm -rf "$HOME/.pi/agent/skills/stelow" 2>/dev/null || true
        # Clean package filter from settings.json
        if command -v jq &>/dev/null; then
          local pi_settings="$HOME/.pi/agent/settings.json"
          if [[ -f "$pi_settings" ]]; then
            local tmp=$(mktemp)
            jq '
              (.packages // []) |= map(
                if type == "object" and .source == "git:github.com/calionauta/stelow" then
                  del(.skills)
                else
                  .
                end
              )
            ' "$pi_settings" > "$tmp" && mv "$tmp" "$pi_settings"
          fi
        fi
        log_success "  v Pi" ;;
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
  log_info "[1/4] Installing 25 workflow skills..."
  for cli in $clis; do install_skills_flat; done
  log_success "Skills installed."
  echo ""

  # Step 2: Pi extension + packages
  if echo "$clis" | grep -qw "pi"; then
    log_info "[2/4] Pi deep integration"
    if confirm "Install Pi extension (gates, TUI, slash commands)?" Y; then
      install_pi_extension
      if [[ -z "${INSTALL_SKILLS_ONLY:-}" ]] && confirm "Install Pi supporting packages (subagents, supervisor)?" Y; then
        install_pi_extensions
      fi
    fi
    echo ""
  fi


  # Steps 3-4: optional cross-harness CLIs (only those used by stelow skills).
  # cymbal + sem are offered (used by Tech Preview / Execution Critique skills);
  # ast-grep is skipped automatically (no skill references it). ctx7 remains a
  # guided OAuth setup below (not a plain install).
  log_info "[3/4] Optional CLI tools (cymbal, sem)"
  offer_optional_clis
  echo ""

  # Step 4: ctx7 (library docs — guided OAuth, not auto-installed)
  log_info "[4/4] ctx7 — live library documentation"
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

  # Step 6: sem (entity-level diff)
  log_info "[5/5] sem — entity-level diff for Execution Critique"
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
  local clis=$(detect_all_clis)
  echo ""; log_info "Minimal setup for: ${BOLD}$clis${RESET}"; echo ""
  for cli in $clis; do install_for_cli "$cli"; done
  echo ""; log_success "Minimal installation complete!"; print_agents_setup
}

# ── Tool-specific installers ───────────────────────────────────────────

install_pi_extension() {
  log_info "  Installing Pi extension..."
  pi remove "$SCRIPT_DIR/extensions/stelow" 2>/dev/null || true
  pi install "git:github.com/calionauta/stelow" 2>/dev/null || true
  _configure_pi_skills_filter
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
  remove      Uninstall from all detected CLIs

Environment:
  ASSUME_YES=1     Auto-confirm all prompts (non-interactive)
  PRODUCT_WORKFLOW_CLI  Limit to one CLI (pi)

What gets installed (full):

  ✓ 25 workflow skills (always)
  ✓ Pi extension + npm packages (if Pi detected, with confirmation)
  ✓ cymbal — codebase navigation (with confirmation)
  ✓ ctx7 — live library docs (with confirmation, requires OAuth)
  ✓ sem — entity-level diff (with confirmation)

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
