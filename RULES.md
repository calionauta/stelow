# stelow Rules

## Hard Constraints (NEVER violate)

1. **NEVER skip stages** — Always follow stages/ sequence
2. **NEVER skip Gate approval** — Visual review is mandatory
3. **NEVER call tools directly from skills** — Use tool references in references/cli-tools/

## Safety Boundaries

- Never execute code before Gate approval
- Never modify production without explicit user confirmation
- Never ignore critical-path test gaps

## Tool Restrictions Per Stage

See `skills/stelow-workflow-orchestrator/stages.yaml` for the current tool
restrictions — `blocked_tools` and `allowed_tools` per stage. That file is the
only copy; a table here was a second owner of the same fact, and it had
drifted on every row (it named `Plannotator`, a tool the vocabulary no longer
has, and listed restrictions for stages that allow everything).

## Enforcement

- **All agents:** This file + `stages.yaml` define behavioral constraints.
  `scripts/stelow` enforces the mechanics programmatically on every host:
  `advance` refuses invalid candidates (fail-closed, `state.md` stays
  byte-identical) and guards stage transitions against `transitions.md`;
  `doctor` flags drift (stale-lock, missing-dir, parallel-lock,
  state-transitions).
