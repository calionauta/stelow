# Installation Guide

## Quick Start

```bash
git clone https://github.com/renatocaliari/cali-product-workflow.git
cd cali-product-workflow
./install.sh
```

Auto-detects ALL your CLIs and installs for each one. One command, zero npm.

---

## What's Installed per CLI

| CLI | Method | How It Works |
|-----|--------|-------------|
| **Pi** | `git:` + `npx skills` | Clones from GitHub, loads JS extensions + skills |
| **OpenCode** | `npx skills` + config | Skills via npx skills, registers path in opencode.json |
| **Claude Code** | marketplace + `npx skills` | Adds GitHub repo as marketplace, skills via npx |
| **Codex** | marketplace + `npx skills` | Adds GitHub repo as marketplace, skills via npx |

---

## Commands

```bash
./install.sh              # Install for all detected CLIs
./install.sh update       # Update skills
./install.sh remove       # Uninstall from all detected CLIs

# Limit to one CLI
PRODUCT_WORKFLOW_CLI=opencode ./install.sh
```

---

## Skills Only

```bash
npx skills add renatocaliari/cali-product-workflow -g
```

Installs skills to `~/.agents/skills/` — works on any CLI. No plugins, no config, no JS.

---

## Manual Setup by CLI

<details>
<summary><strong>Pi</strong></summary>

```bash
# Full install
pi install git:github.com/renatocaliari/cali-product-workflow
pi install ./extensions/cali-product-workflow-pi
pi install npm:pi-subagents npm:@capyup/pi-goal npm:pi-intercom npm:pi-supervisor npm:pi-autoresearch npm:@juicesharp/rpiv-ask-user-question npm:@plannotator/pi-extension

# Update
pi update

# Remove
pi remove git:github.com/renatocaliari/cali-product-workflow
```
</details>

<details>
<summary><strong>OpenCode</strong></summary>

```bash
# Skills
npx skills add renatocaliari/cali-product-workflow -a opencode -g

# Config: add to ~/.config/opencode/opencode.json
# "skills": { "paths": ["~/.config/opencode/skills"] }
```
</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
# Plugin marketplace
claude plugin marketplace add https://github.com/renatocaliari/cali-product-workflow
claude plugin install cali-product-workflow@marketplace-name

# Skills
npx skills add renatocaliari/cali-product-workflow -a claude-code -g

# Remove
claude plugin uninstall cali-product-workflow
```
</details>

<details>
<summary><strong>Codex</strong></summary>

```bash
# Plugin marketplace
codex plugin marketplace add https://github.com/renatocaliari/cali-product-workflow
codex plugin add cali-product-workflow@marketplace-name

# Skills
npx skills add renatocaliari/cali-product-workflow -a codex -g

# Remove
codex plugin remove cali-product-workflow
```
</details>

---

## Agent Instructions Setup

The installer does **not** modify your AGENTS.md/CLAUDE.md automatically. Add this manually:

```markdown
## cali-product-workflow Integration

When working on software projects, trigger the product workflow:

1. **Trigger:** Use `/skill cali-product-workflow`
2. **Process:** Follow the 6-phase workflow
3. **Execute:** Only after visual review gate (Plannotator approval)
```

| CLI | File |
|-----|------|
| **Pi** | `~/.pi/agent/AGENTS.md` |
| **OpenCode** | `~/.config/opencode/AGENTS.md` or project `AGENTS.md` |
| **Claude Code** | `~/.claude/CLAUDE.md` or project `CLAUDE.md` |
| **Codex** | `~/.codex/AGENTS.md` or project `AGENTS.md` |

---

## Third-Party Skills

Some workflow phases reference external skills. Install them for full functionality:

| Skill | Required for | Install (Pi) | Install (Other CLIs) |
|-------|-------------|--------------|----------------------|
| `pi-agent-codebase-workflows` | Phase 2 (safe-change) | `pi install git:github.com/PriNova/pi-agent-codebase-workflows` | `npx skills add Prinova/pi-agent-codebase-workflows -a <cli> -g` |
| `thermo-nuclear` (codequality-review) | Phase 11 (final gate) | `pi install git:github.com/cursor/plugins` | `npx skills add cursor/plugins -a <cli> -g` |

Replace `<cli>` with: `opencode`, `claude-code`, or `codex`.

Without these skills, the workflow falls back to manual alternatives documented in each tool's reference file.

---

## Why Git-Based (No npm)

Distributing exclusively via GitHub is a deliberate security choice:

| Risk | npm packages | Git-based (this project) |
|------|--------------|--------------------------|
| **Supply chain worms** (Shai-Hulud) | ❌ Worm self-propagates via stolen npm tokens | ✅ No npm token to steal |
| **`preinstall` code execution** | ❌ Scripts run automatically on install | ✅ Only markdown + assets copied |
| **Registry compromise** | ❌ Single centralized registry | ✅ GitHub distributed, auditable |
| **Account takeover blast radius** | ❌ npm token publishes many packages | ✅ Only your repo, no self-propagation |
| **Dependency confusion** | ❌ Possible if public name conflicts | ✅ Impossible — GitHub only source |

**Tradeoff:** Without npm, CLIs that rely on npm for JS plugins (e.g., OpenCode) are limited to skills. Deep integrations (hooks, TUI, slash commands) work only on Pi, which supports native Git install via `pi install git:...`.