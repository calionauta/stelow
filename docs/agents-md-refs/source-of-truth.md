# Skills & Distribution

## Skills

See the **Source of Truth** section in AGENTS.md for how stage/skill counts
are derived. Skills live in `skills/*/SKILL.md` (26 `stelow-product-*` / `stelow-workflow-*` skills
plus the `stelow-entry` and `stelow-router` infra skills) and install to
`~/.agents/skills/` for **any** agentskills-compatible agent (pi.dev, OpenCode,
Claude Code, Codex, Cursor, Fusion, Multica, …).

## Distribution

- **Skills-only, host-agnostic.** There is no extension code, no compiled
  plugin, and no per-host adapter — see [architecture.md](../../architecture.md).
- **Git-based primary distribution** (`./install.sh`, `npx skills add
  calionauta/stelow -g`, or `setup.sh`). There is **no npm publish** — see
  [docs/SECURITY.md](../SECURITY.md) for rationale.
- **Runtime mechanics:** `scripts/stelow` (bash + python3) — status, advance,
  doctor. No npm runtime dependency.

**Reference from AGENTS.md:** When the user asks "where do skills come
from?", "how do I add a new skill?", or "is this on npm?", point here.
The `stages.yaml` and `ls skills/stelow-product-*/SKILL.md skills/stelow-workflow-*/SKILL.md | wc -l` commands
are the source of truth for counts.