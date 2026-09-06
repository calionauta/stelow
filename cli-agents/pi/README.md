# Pi CLI — stelow

This directory follows the standard `cli-agents/` pattern for all CLI harnesses.
Commands and host activation are documented in `COMMANDS.md` (single source of truth).

## Installation

Since 1.0.0 the product is **skills-only** — there is no Pi extension to build
or install. pi.dev consumes the same 28 skills as every other agent:

```bash
# Run from project root
./install.sh          # flattens skills/* into ~/.agents/skills/
# — or —
npx skills add calionauta/stelow -g
```

The installer:
- Flattens all 28 skills into `~/.agents/skills/`
- Prunes retired/orphaned skills (`retired-skills.yaml`)
- Does **not** register host commands or install a TUI — `/sw-*` is routed by
  the skills themselves

## Available Commands

| Command | Description |
|---------|-------------|
| `/sw-start` | Start a new workflow |
| `/sw-status` | Show workflow status (`scripts/stelow status`) |
| `/sw-next` | Advance to the next stage |

Full command matrix: `../COMMANDS.md`

## What Gets Installed

| Component | Location |
|-----------|----------|
| Skills | `~/.agents/skills/` (28 skills flat) |
| Helper | `scripts/stelow` (status / advance / doctor) |
| Commands | Skill-provided (`/sw-*` routed by `stelow-workflow-entry` + `stelow-workflow-router`) |

## Notes

- Activate the workflow with the marker protocol: `STELOW_WORKFLOW=1` +
  `STELOW_STATE=<path>` (see `references/host-levers.md`).
- Skills are loaded from `~/.agents/skills/` on every agentskills-compatible agent.