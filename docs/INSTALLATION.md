# Installation Guide

## Quick Start

```bash
git clone https://github.com/calionauta/stelow.git
cd stelow
./install.sh
```

`./install.sh` flattens all 25 skills into `~/.agents/skills/` and prunes
retired or orphaned skills. That is everything — there is no extension, plugin,
or host registration step; any agent that reads `~/.agents/skills/<name>/SKILL.md`
(agentskills.io standard) picks the skills up automatically.

**Without cloning:**

```bash
npx skills add calionauta/stelow -g
```

**Zero-to-running on a new machine** (optionally bootstraps Node + pi.dev +
toolchain before installing the skills):

```bash
curl -fsSL https://raw.githubusercontent.com/calionauta/stelow/main/setup.sh | sh
```

---

## Architecture

```
stelow/          ← Source
└── skills/                     ← 25 portable skills (1 orchestrator + 24 sub-skills)
    ├── stelow-workflow-entry/                   ← entry point (STELOW_WORKFLOW=1)
    ├── stelow-workflow-router/                  ← advance / load next stage
    ├── stelow-workflow-orchestrator/    ← orchestrator + stages.yaml
    ├── stelow-workflow-shape-up/
    └── ...

~/.agents/skills/               ← Install target
├── stelow-workflow-entry/                       ← Copied
├── stelow-workflow-orchestrator/        ← Copied
└── ... (all skills)
```

The 17-stage model, data flow, and state layout are documented in
[architecture.md](architecture.md) and the README [📋 Skills](../README.md#-skills) section.

---

## Commands

```bash
./install.sh                    # Flatten skills to ~/.agents/skills/ (default)
./install.sh --minimal          # Skills only, no optional toolchain (same as default in practice)
./install.sh update             # Re-copy skills + prune retired/orphaned
./install.sh remove             # Remove skills from all detected agents
./install.sh --help             # Show help

# Non-interactive (CI)
ASSUME_YES=1 ./install.sh
```

`./install.sh --minimal` is the default behavior: only the skills are installed.
There is no Pi-extension step anymore (removed in 1.0.0).

---

## Distribution for any agentskills-compatible agent

The installer places skills in `~/.agents/skills/`. Any agent that reads from this
directory (the [agentskills.io](https://agentskills.io/) standard) automatically picks
them up — no per-agent install required.

To install skills without the installer (any agent):

```bash
npx skills add calionauta/stelow -g
```

That's it. The skills land in the standard directory and any compatible agent loads
them on next session.

---

## Skills-only mode

Skills-only **is** the product since 1.0.0 — there is no separate skills-only flag.
`./install.sh` (or `npx skills add`) installs portable skills that work in any agent
that reads `~/.agents/skills/`.

---

## Agent Instructions Setup

`./install.sh` does **not** modify your `AGENTS.md` / `CLAUDE.md` automatically. The
orchestrator skill is loaded automatically via its `SKILL.md` frontmatter; you can
add a one-line reminder if you want to make the trigger explicit.

```markdown
## stelow Integration

For product-workflow tasks (plans, critiques, scopes, executions), invoke
`stelow-workflow-orchestrator` and follow its stage routing.
```

---

## Third-Party Skill Registry

Some phases of the workflow reference third-party skills:

| Skill | Required for | Install |
|-------|-------------|---------|
| `pi-agent-codebase-workflows` (safe-change) | Pre-execution impact analysis | `npx skills add Prinova/pi-agent-codebase-workflows -g` |
| `thermo-nuclear` (code-quality-review) | optional ultra-strict final gate | `npx skills add cursor/plugins -g` |

Both work in any agent via the same `npx skills add ... -g` invocation. See the
External Dependencies table in the README for the full list with fallbacks.

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

---

## Fusion / Multica / pi.dev / any host (all hosts)

All hosts install the **same** skills to `~/.agents/skills/` — there is no compiled
Fusion plugin and no per-host package anymore (removed in 1.0.0). Hosts that want
the workflow auto-loaded set the marker protocol (`STELOW_WORKFLOW=1` +
`STELOW_STATE=<path>`); see `skills/stelow-workflow-entry/references/host-levers.md`.