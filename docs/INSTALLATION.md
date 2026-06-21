# Installation Guide

## Quick Start

```bash
git clone https://github.com/renatocaliari/stelow.git
cd stelow
./install.sh
```

Interactive full setup. Installs 25 skills, Pi extension (if detected), and offers
optional dependencies (cymbal, ctx7) with step-by-step confirmation.

---

## Architecture

```
stelow/          ← Source
└── skills/                     ← 25 skills flat
    ├── stelow/   ← Orchestrator
    ├── cali-product-shape-up/
    └── ... (21 more)

~/.agents/skills/               ← Install target
├── stelow/       ← Copied
├── cali-product-shape-up/      ← Copied
└── ... (25 total)
```

**Skills installed (25 total):**
- `stelow` — orchestrator (15 stages)
- 10 workflow stage skills (shape-up, interface-alternatives, plan-critique, codebase-critique, ux-critique, tech-planning, testing-ai-code, testing-execution, scope-executor, execution-critique)
- 5 strategic analysis skills (job-to-be-done, discovery, opportunity-mapping, multi-method-market-analysis, evolutionary-principles)
- 1 code-standards skill
- 8 domain library skills (ads, pricing, promotions, trust-building, health, marketplace-playbook, business-models, open-source)

---

## Commands

```bash
./install.sh                    # Interactive full setup (default)
./install.sh --minimal          # Skills only, no optional deps
./install.sh update             # Update skills
./install.sh remove             # Uninstall from all detected CLIs
./install.sh --help             # Show help

# Non-interactive (CI), install everything
ASSUME_YES=1 ./install.sh

# Limit to one CLI
PRODUCT_WORKFLOW_CLI=opencode ./install.sh
```

**Full setup flow:**
1. 25 workflow skills — **always installed**
2. Pi extension + npm packages — **confirms before installing** (Pi only)
3. cymbal (codebase navigation) — **confirms before installing**
4. ctx7 (live library docs) — **recommends, requires OAuth**
5. `./install.sh --minimal` skips all optional steps

**CI / automation:** Set `ASSUME_YES=1` to auto-confirm all prompts without interaction.

**Config file:** Unselected options can be installed later by re-running `./install.sh`.

---

## Distribution para Harnesess

O install.sh coloca skills em `~/.agents/skills/`. Para distribuir para cada harness, use **agent-sync**:

```bash
# Instala agent-sync
pipx install agent-sync

# Configura distribuição
agent-sync setup

# Distribui para cada CLI
agent-sync push
```

**Alternativa manual:** Configure cada harness para ler de `~/.agents/skills/`:

| CLI | Configuração |
|-----|-------------|
| **Pi** | `~/.pi/agent/settings.json` → `"skills": ["~/.agents/skills"]` |
| **OpenCode** | `~/.config/opencode/opencode.json` → skills paths |
| **Claude Code** | `~/.claude/settings.json` → skills paths |
| **Codex** | `~/.codex/settings.json` → skills paths |

---

## Skills Only (Sem CLI)

Para instalar skills sem o installer:

```bash
npx skills add renatocaliari/stelow -g
```

Instala skills para `~/.agents/skills/` — funciona em qualquer CLI.

---

## Manual Setup por CLI

<details>
<summary><strong>Pi</strong></summary>

```bash
# Install (skills + extension)
./install.sh

# Update
./install.sh update

# Remove
./install.sh remove

# Skills only (no extension, no optional deps)
./install.sh --minimal
```

</details>

<details>
<summary><strong>OpenCode</strong></summary>

```bash
# Instala skills
npx skills add renatocaliari/stelow -a opencode -g

# Configura ~/.agents/skills/
# Adicionar em ~/.config/opencode/opencode.json:
# "skills": { "paths": ["~/.agents/skills"] }
```

</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
# Plugin marketplace
claude plugin marketplace add https://github.com/renatocaliari/stelow
claude plugin install stelow@marketplace-name

# Ou apenas skills
npx skills add renatocaliari/stelow -a claude-code -g
```

</details>

<details>
<summary><strong>Codex</strong></summary>

```bash
# Plugin marketplace
codex plugin marketplace add https://github.com/renatocaliari/stelow
codex plugin add stelow@marketplace-name

# Ou apenas skills
npx skills add renatocaliari/stelow -a codex -g
```

</details>

---

## Agent Instructions Setup

O installer **não modifica** seu AGENTS.md/CLAUDE.md automaticamente. Adicione manualmente:

```markdown
## stelow Integration

When working on software projects, trigger the product workflow:

1. **Trigger:** Use `/skill stelow`
2. **Process:** Follow the structured workflow (Setup → Context → Shape → Critique → Gate → Scope → Interface → Int.Gate → Selection → Planning → Execution → Verification → Audit)
3. **Execute:** Only after visual review gate (Plannotator approval)
```

| CLI | File |
|-----|------|
| **Pi** | `~/.pi/agent/AGENTS.md` |
| **OpenCode** | `~/.config/opencode/AGENTS.md` or project `AGENTS.md` |
| **Claude Code** | `~/.claude/CLAUDE.md` or project `CLAUDE.md` |
| **Codex** | `~/.codex/AGENTS.md` or project `AGENTS.md` |

---

## Required npm Packages (Pi Only)

Pi requer npm packages para deep integration (slash commands, TUI, event hooks):

| Package | Purpose | Can use `git:`? |
|---------|---------|-----------------|
| `pi-subagents` | Parallel subagent orchestration | ✅ `git:github.com/nicobailon/pi-subagents` |
| `pi-intercom` | Session-to-session coordination | ✅ `git:github.com/nicobailon/pi-intercom` |
| `pi-supervisor` | Conversation supervision | ✅ `git:github.com/tintinweb/pi-supervisor` |
| `@juicesharp/rpiv-ask-user-question` | Question UI component | ✅ `git:github.com/juicesharp/rpiv-mono` |
| `@plannotator/pi-extension` | Visual plan annotation | ✅ `git:github.com/backnotprop/plannotator` |

Other CLIs (OpenCode, Claude Code, Codex) usam apenas skills — zero npm.

---

## Third-Party Dependency Management

Third-party npm dependencies existem **apenas para Pi**. Para proteção contra supply chain risks, veja [docs/SECURITY.md](docs/SECURITY.md).

**On pinning:** Not recommended for actively maintained packages. A 2026 study ([Pinning Is Futile, arXiv 2502.06662](https://arxiv.org/abs/2502.06662)) found that pinning *increases* vulnerability exposure.

**Skills-only mode (avoids npm entirely):**

```bash
./install.sh --minimal
```

This applies only to **Pi** — other CLIs have zero npm dependencies.

---

## Third-Party Skills

 Algumas fases do workflow referenciam skills externas:

| Skill | Required for | Install (Pi) | Install (Other CLIs) |
|-------|-------------|--------------|----------------------|
| `pi-agent-codebase-workflows` | safe-change (Phase 2) | `pi install git:github.com/PriNova/pi-agent-codebase-workflows` | `npx skills add Prinova/pi-agent-codebase-workflows -a <cli> -g` |
| `thermo-nuclear` (codequality-review) | optional ultra-strict final gate for high-risk or Complete-appetite code changes | `pi install git:github.com/cursor/plugins` | `npx skills add cursor/plugins -a <cli> -g` |

Replace `<cli>` with: `opencode`, `claude-code`, or `codex`.

---

## Why Git-Based (No npm)

Git-based distribution is a deliberate security choice:

| Risk | npm packages | Git-based (this project) |
|------|--------------|--------------------------|
| **Supply chain worms** (Shai-Hulud) | ❌ Worm self-propagates via stolen npm tokens | ✅ No npm token to steal |
| **`preinstall` code execution** | ❌ Scripts run automatically on install | ✅ Only markdown + assets copied |
| **Registry compromise** | ❌ Single centralized registry | ✅ GitHub distributed, auditable |
| **Account takeover blast radius** | ❌ npm token publishes many packages | ✅ Only your repo, no self-propagation |
| **Dependency confusion** | ❌ Possible if public name conflicts | ✅ Impossible — GitHub only source |

**Tradeoffs:**
- ✅ **No supply chain worms** — eliminates Shai-Hulud, npm token theft, preinstall scripts
- ✅ **No dependency confusion** — no public registry to attack
- ⚠️ **No semver constraints** — updates pull latest from main, not latest compatible version
- ⚠️ **Lower discoverability** — no npm search, relies on GitHub search or word-of-mouth

**Primary remaining risk:**
- **Maintainer account compromise** — malicious commits to default branch. Mitigate with: signed commits, branch protection, required PR reviews, and Trivy scanning in CI.

**Bottom line:** Git-based distribution solves the risks we *control* (how we ship our code). Risks we *inherit* (maintainer compromise, third-party deps) are shared with all software.