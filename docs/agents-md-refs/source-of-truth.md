# Skills & Distribution

## Skills

Counts are derived, never hardcoded — see the **Source of Truth** section in
AGENTS.md. Skills live in `skills/*/SKILL.md` (14 `stelow-product-*` + 14
`stelow-workflow-*` = 28) and install to `~/.agents/skills/` for **any**
agentskills-compatible agent.

## Distribution

- **Skills-only, host-agnostic.** There is no extension code, no compiled
  plugin, and no per-host adapter — see [architecture.md](../../architecture.md).
- **Git-based primary distribution** (`./install.sh`, `npx skills add
  calionauta/stelow -g`, or `setup.sh`). There is **no npm publish** — see
  [docs/SECURITY.md](../SECURITY.md) for rationale.
- **Runtime mechanics:** `scripts/stelow` (bash + python3) — `status`,
  `advance`, `doctor`, `seed`, `schema`, `ask`. No npm runtime dependency.

**Reference from AGENTS.md:** When the user asks "where do skills come
from?", "how do I add a new skill?", or "is this on npm?", point here.
`skills/stelow-workflow-orchestrator/stages.yaml` and
`ls skills/stelow-product-*/SKILL.md skills/stelow-workflow-*/SKILL.md | wc -l`
are the source of truth for counts.
