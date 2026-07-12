# Installation Guide

## Quick Start

```bash
git clone https://github.com/calionauta/stelow.git
cd stelow
./install.sh
```

Interactive full setup. Installs 25 skills, Pi extension (if detected), and offers
optional dependencies (ctx7) with step-by-step confirmation. cymbal (raphapr/pi-cymbal)
and ast-grep (joelhooks/pi-ast-grep) are installed automatically as Pi packages.

> **v0.45.0 narrowed the shipped surface to Pi-only.** Skills remain agent-agnostic —
> see `cli-agents/COMMANDS.md` for the extension guide and the rationale for narrowing.

---

## Architecture

```
stelow/          ← Source
└── skills/                     ← 25 skills flat
    ├── stelow-product-orchestrator/   ← Orchestrator
    ├── cali-product-shape-up/
    └── ... (23 more)

~/.agents/skills/               ← Install target
├── stelow-product-orchestrator/       ← Copied
├── cali-product-shape-up/             ← Copied
└── ... (25 total)
```

**Skills installed (25 total):**

- 1 orchestrator: `stelow-product-orchestrator` (15 stages)
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
./install.sh remove             # Uninstall from all detected agents
./install.sh --help             # Show help

# Non-interactive (CI), install everything
ASSUME_YES=1 ./install.sh

# Limit to Pi
PRODUCT_WORKFLOW_CLI=pi ./install.sh
```

**Full setup flow:**
1. 25 workflow skills — **always installed**
2. Pi extension + npm packages — **confirms before installing** (Pi only)
3. cymbal (codebase navigation) — **installed automatically** as a Pi package (raphapr/pi-cymbal); requires the cymbal CLI on the host
4. ctx7 — live library docs via `npx @vedanth/context7` (recommends, requires OAuth)
5. `./install.sh --minimal` skips all optional steps

**CI / automation:** Set `ASSUME_YES=1` to auto-confirm all prompts without interaction.

**Config file:** Unselected options can be installed later by re-running `./install.sh`.

---

## Distribution for any agentskills-compatible agent

The installer places skills in `~/.agents/skills/`. Any agent that reads from this
directory (the [agentskills.io](https://agentskills.io/) standard) automatically picks
them up — no per-agent install required.

To install skills without the installer (any agent, no extension):

```bash
npx skills add calionauta/stelow -g
```

That's it. The skills land in the standard directory and any compatible agent loads
them on next session.

---

## Skills-only mode (no Pi extension)

```bash
./install.sh --minimal
```

This skips the Pi extension and optional npm packages, leaving the 25 skills in
`~/.agents/skills/`. Works in any agent that reads from there.

---

## Agent Instructions Setup

The installer **does not modify** your `AGENTS.md` / `CLAUDE.md` automatically. The
orchestrator skill is loaded automatically via its `SKILL.md` frontmatter; you can
add a one-line reminder if you want to make the trigger explicit.

```markdown
## stelow Integration

For product-workflow tasks (plans, critiques, scopes, executions), invoke
`stelow-product-orchestrator` and follow its stage routing.
```

---

## Required npm Packages (Pi only)

The Pi extension surfaces additional features (slash commands, TUI overlay, event
hooks, structured questions) through a few npm packages. None are required for the
skills to work; they activate only when Pi is detected.

| Package | Purpose |
|---------|---------|
| `pi-subagents` | Parallel subagent orchestration |
| `pi-intercom` | Session-to-session coordination |
| `pi-supervisor` | Conversation supervision |
| `@juicesharp/rpiv-ask-user-question` | Question UI component |
| `@plannotator/pi-extension` | Visual plan annotation |
| `raphapr/pi-cymbal` | Codebase navigation (`cymbal` CLI required) |
| `joelhooks/pi-ast-grep` | Structural code search (bundles `sg`) |

For Pi-only package installation:

```bash
pi install npm:@calionauta/stelow
```

This installs the extension and its peer dependencies in one step.

---

## Third-Party Skill Registry

Some phases of the workflow reference third-party skills:

| Skill | Required for | Install |
|-------|-------------|---------|
| `pi-agent-codebase-workflows` (safe-change) | Phase 2 impact analysis | `npx skills add Prinova/pi-agent-codebase-workflows -g` |
| `thermo-nuclear` (code-quality-review) | optional ultra-strict final gate | `npx skills add cursor/plugins -g` |

Both work in any agent via the same `npx skills add ... -g` invocation.

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
