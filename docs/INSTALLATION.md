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
pi install ./extensions/cali-pw-pi
pi install npm:pi-subagents npm:@capyup/pi-goal npm:pi-intercom npm:pi-supervisor npm:pi-autoresearch npm:@juicesharp/rpiv-ask-user-question npm:@juicesharp/rpiv-todo npm:@plannotator/pi-extension

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

## Updates

How each CLI stays current:

| CLI | Update command | What updates |
|-----|----------------|--------------|
| **Pi** | `pi update` | Core package (git clone), supporting npm packages |
| **OpenCode** | `npx skills update` | Skills only |
| **Claude Code** | `claude plugin update cali-product-workflow` | Plugin + skills |
| **Codex** | `codex plugin marketplace upgrade` | Plugin + skills |

**Pi note:** Since the core package is installed via `git:` without a ref pin, `pi update` pulls the latest commit from the default branch.

**Pro tip:** Run `./install.sh update` — it runs `npx skills update` and verifies all skill directories are present.

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

## Required npm Packages (Pi Only)

Pi requires these npm packages for deep integration (slash commands, TUI, event hooks):

| Package | Purpose | Can use `git:`? |
|---------|---------|-----------------|
| `pi-subagents` | Parallel subagent orchestration | ✅ `git:github.com/nicobailon/pi-subagents` |
| `@capyup/pi-goal` | Goal management and tracking | ✅ `git:github.com/Michaelliv/pi-goal` |
| `pi-intercom` | Session-to-session coordination | ✅ `git:github.com/nicobailon/pi-intercom` |
| `pi-supervisor` | Conversation supervision | ✅ `git:github.com/tintinweb/pi-supervisor` |
| `pi-autoresearch` | Autonomous experiment loops | ✅ `git:github.com/davebcn87/pi-autoresearch` |
| `@juicesharp/rpiv-ask-user-question` | Question UI component | ✅ `git:github.com/juicesharp/rpiv-mono` |
| `@plannotator/pi-extension` | Visual plan annotation | ✅ `git:github.com/backnotprop/plannotator` |

Other CLIs (OpenCode, Claude Code, Codex) use only skills — no npm required.

---

## Third-Party Dependency Management

Third-party npm dependencies exist **only for Pi**. For protection against supply chain risks, see [docs/SECURITY.md](docs/SECURITY.md).

**On pinning:** Not recommended for actively maintained packages. A 2026 study ([Pinning Is Futile, arXiv 2502.06662](https://arxiv.org/abs/2502.06662)) found that pinning *increases* vulnerability exposure. For packages with weekly releases, staying current via `pi update` is safer than pinning.

**Skill-only mode (avoid npm entirely):**

```bash
INSTALL_SKILLS_ONLY=1 ./install.sh
```

This applies only to **Pi** — other CLIs already have zero npm dependencies. In this mode, Pi loses slash commands and TUI overlay, but the `cali-product-workflow` skill still works.

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

**Tradeoffs:**
- ✅ **No supply chain worms** — eliminates Shai-Hulud, npm token theft, preinstall scripts
- ✅ **No dependency confusion** — no public registry to attack
- ⚠️ **No semver constraints** — updates pull latest from main, not latest compatible version
- ⚠️ **Lower discoverability** — no npm search, relies on GitHub search or word-of-mouth

**Primary remaining risk:**
- **Maintainer account compromise** — malicious commits to default branch. Mitigate with: signed commits, branch protection, required PR reviews, and Trivy scanning in CI.

**Tradeoff:** Without npm, CLIs that rely on npm for JS plugins (e.g., OpenCode) are limited to skills. Deep integrations (hooks, TUI, slash commands) work only on Pi, which supports native Git install via `pi install git:...`.

**Bottom line:** Git-based distribution solves the risks we *control* (how we ship our code). Risks we *inherit* (maintainer compromise, third-party deps) are shared with all software — managed through defense in depth, not eliminated.