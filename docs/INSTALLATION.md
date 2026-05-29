# Installation Guide

## Quick Start

```bash
git clone https://github.com/renatocaliari/cali-product-workflow.git
cd cali-product-workflow
./install.sh
```

Auto-detects ALL your CLIs and installs 21 skills to `~/.agents/skills/`.

---

## Architecture

```
cali-product-workflow/          ← Source (versionado)
└── skills/                     ← 20 skills flat
    ├── cali-product-workflow/   ← Orchestrator
    ├── cali-product-shape-up/
    └── ... (19 more)

~/.agents/skills/               ← Install target (home do usuário)
├── cali-product-workflow/       ← Copied
├── cali-product-shape-up/               ← Copied
└── ... (21 total)
```

**Skills installed (21 total):**
- `cali-product-workflow` — orchestrator (11 fases)
- 4 workflow skills (shape-up, interface-brainstorm, product-critique, tech-planning)
- 5 strategic analysis skills
- 8 domain library skills
- 2 execution skills

---

## Commands

```bash
./install.sh              # Install para todos os CLIs detectados
./install.sh update       # Atualiza skills
./install.sh remove       # Desinstala de todos os CLIs
./install.sh help         # Mostra ajuda

# Limitar a um CLI
PRODUCT_WORKFLOW_CLI=opencode ./install.sh

# Apenas skills, sem npm packages (Pi only)
INSTALL_SKILLS_ONLY=1 ./install.sh
```

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
npx skills add renatocaliari/cali-product-workflow -g
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

# Apenas skills (sem extension/slash commands)
INSTALL_SKILLS_ONLY=1 ./install.sh
```

</details>

<details>
<summary><strong>OpenCode</strong></summary>

```bash
# Instala skills
npx skills add renatocaliari/cali-product-workflow -a opencode -g

# Configura ~/.agents/skills/
# Adicionar em ~/.config/opencode/opencode.json:
# "skills": { "paths": ["~/.agents/skills"] }
```

</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
# Plugin marketplace
claude plugin marketplace add https://github.com/renatocaliari/cali-product-workflow
claude plugin install cali-product-workflow@marketplace-name

# Ou apenas skills
npx skills add renatocaliari/cali-product-workflow -a claude-code -g
```

</details>

<details>
<summary><strong>Codex</strong></summary>

```bash
# Plugin marketplace
codex plugin marketplace add https://github.com/renatocaliari/cali-product-workflow
codex plugin add cali-product-workflow@marketplace-name

# Ou apenas skills
npx skills add renatocaliari/cali-product-workflow -a codex -g
```

</details>

---

## Agent Instructions Setup

O installer **não modifica** seu AGENTS.md/CLAUDE.md automaticamente. Adicione manualmente:

```markdown
## cali-product-workflow Integration

When working on software projects, trigger the product workflow:

1. **Trigger:** Use `/skill cali-product-workflow`
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
| `@capyup/pi-goal` | Goal management and tracking | ✅ `git:github.com/Michaelliv/pi-goal` |
| `pi-intercom` | Session-to-session coordination | ✅ `git:github.com/nicobailon/pi-intercom` |
| `pi-supervisor` | Conversation supervision | ✅ `git:github.com/tintinweb/pi-supervisor` |
| `pi-autoresearch` | Autonomous experiment loops | ✅ `git:github.com/davebcn87/pi-autoresearch` |
| `@juicesharp/rpiv-ask-user-question` | Question UI component | ✅ `git:github.com/juicesharp/rpiv-mono` |
| `@plannotator/pi-extension` | Visual plan annotation | ✅ `git:github.com/backnotprop/plannotator` |

Other CLIs (OpenCode, Claude Code, Codex) usam apenas skills — zero npm.

---

## Third-Party Dependency Management

Third-party npm dependencies existem **apenas para Pi**. Para proteção contra supply chain risks, veja [docs/SECURITY.md](docs/SECURITY.md).

**On pinning:** Not recommended for actively maintained packages. A 2026 study ([Pinning Is Futile, arXiv 2502.06662](https://arxiv.org/abs/2502.06662)) found that pinning *increases* vulnerability exposure.

**Skill-only mode (evita npm entirely):**

```bash
INSTALL_SKILLS_ONLY=1 ./install.sh
```

Isso se aplica apenas ao **Pi** — outros CLIs já tem zero npm dependencies.

---

## Third-Party Skills

 Algumas fases do workflow referenciam skills externas:

| Skill | Required for | Install (Pi) | Install (Other CLIs) |
|-------|-------------|--------------|----------------------|
| `pi-agent-codebase-workflows` | safe-change (Phase 2) | `pi install git:github.com/PriNova/pi-agent-codebase-workflows` | `npx skills add Prinova/pi-agent-codebase-workflows -a <cli> -g` |
| `thermo-nuclear` (codequality-review) | final gate (Phase 11) | `pi install git:github.com/cursor/plugins` | `npx skills add cursor/plugins -a <cli> -g` |

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