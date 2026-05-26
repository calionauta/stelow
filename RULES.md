# cali-product-workflow Rules

## Hard Constraints (NEVER violate)

1. **NEVER skip stages** — Always follow stages/ sequence
2. **NEVER skip Gate approval** — Visual review via Plannotator is mandatory
3. **NEVER activate supervisor during planning** — Only during execution
4. **NEVER call tools directly from skills** — Use tool references in references/cli-tools/

## Safety Boundaries

- Never execute code before Gate approval
- Never modify production without explicit user confirmation
- Never ignore mutation testing failures

## Tool Restrictions Per Stage

See `skills/cali-product-workflow/stages.yaml` for current tool restrictions.

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

- **All CLIs:** This file + stages.yaml define behavioral constraints
- **Pi only:** `extensions/cali-product-workflow/adapters/stages-guard.ts` enforces programmatically
