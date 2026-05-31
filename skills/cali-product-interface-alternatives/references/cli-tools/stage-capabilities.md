# Stage Capabilities

Reference: what each workflow stage can do, and what tools it uses.

| Stage | Primary Actions | Allowed Tools | Supervisor | Requires Approval |
|-------|----------------|---------------|------------|-------------------|
| triage | ask | ask, read, grep, ls | No | No |
| setup | read, grep | ask, read, grep, ls, subagent | No | No |
| selection | ask, read | ask, read, grep, ls, subagent | No | No |
| shape | read, write | ask, read, grep, ls, write, subagent | No | No |
| gate | read | read, ls, grep, ask | No | Yes (plannotator) |
| execution | edit, write, bash | all tools | Yes | No |
| audit | read, grep | ask, read, grep, ls, write | No | No |

For **blocked tools** per stage, see `stages.yaml` in the skill root.

## Cross-CLI Behavior

- **Pi**: enforcement via `extensions/.../adapters/stages-guard.ts`
- **Claude/Codex/OpenCode**: self-enforcement by reading `RULES.md` + `stages.yaml`
