# stelow Rules

## Hard Constraints (NEVER violate)

1. **NEVER skip stages** — Always follow stages/ sequence
2. **NEVER skip Gate approval** — Visual review via Plannotator is mandatory
3. **NEVER activate supervisor during planning** — Only during execution
4. **NEVER call tools directly from skills** — Use tool references in references/cli-tools/

## Safety Boundaries

- Never execute code before Gate approval
- Never modify production without explicit user confirmation
- Never ignore critical-path test gaps

## Tool Restrictions Per Stage

See `skills/stelow-workflow-orchestrator/stages.yaml` for current tool restrictions.

| Stage | Blocked Tools |
|-------|---------------|
| triage | edit, write, bash, subagent, agent_browser |
| setup | bash, write, agent_browser |
| selection | bash, write, agent_browser |
| shape | bash, agent_browser |
| gate | edit, write, bash, subagent, agent_browser |
| execution | (none - all allowed, supervisor active) |
| audit | bash |

## Enforcement

- **All agents:** This file + `stages.yaml` define behavioral constraints.
  `scripts/stelow` enforces the mechanics programmatically on every host:
  `advance` refuses invalid candidates (fail-closed, `state.md` stays
  byte-identical) and guards stage transitions against `transitions.md`;
  `doctor` flags drift (stale-lock, missing-dir, parallel-lock,
  state-transitions).
