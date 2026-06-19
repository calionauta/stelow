# stelow

**Transform product ideas into approved, testable plans — systematically.**

## Project Overview

**Type:** Workflow CLI for product planning (skills + stages).
**Stack:** Node 20+, TypeScript 6.0 strict, npm.

## Architecture

See [architecture.md](architecture.md) for module layout, data flow, and how to extend. Skills live in `skills/*/SKILL.md`; stages defined in `stages.yaml` (single source of truth). Visual review gates: `gate` and `int-gate` (Plannotator) — never skip.


## Commands

| Command | Description |
|---------|-------------|
| `/sw-start` | Begin planning |
| `/sw-menu` | Show workflow status |

> **Command aliases:** `/stelow-*` names are registered alongside `/sw-*` for readability. Both prefixes work.

> **Source of Truth:** Stage/skill counts derive from `stages.yaml` and `ls skills/*/SKILL.md | wc -l`. Never update counts here without verifying.

```bash
npm run build            # Compile TypeScript
npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:skills      # Skill structure tests
npm run mutate           # Mutation testing
npm run typecheck        # Type check
```

## Conventions

- **Commits:** conventional (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`). Squash merge to main.
- **Files:** `lowercase-kebab-case` (e.g. `spec-product.md`, not `SpecProduct.md`).
- **Stage headings:** must use `slug:major.minor` format — see [docs/agents-md-refs/stage-numbering.md](docs/agents-md-refs/stage-numbering.md) for the gap-based numbering rules.
- **Tool calls in stage files:** never call `ask_user_question`, `subagent`, or `start_supervision` directly. Use the CLI-agnostic reference in `references/cli-tools/{tool}.md` — see [docs/agents-md-refs/tool-reference-pattern.md](docs/agents-md-refs/tool-reference-pattern.md).

## Don'ts

- Do NOT use `npm install` in CI — use `npm ci` with committed `package-lock.json`
- Do NOT edit generated files in `build/`
- Do NOT use `require()` — this is ESM (`"type": "module"`)
- Do NOT add dependencies without asking
- Do NOT put secrets in AGENTS.md

## Detailed references

- [docs/agents-md-refs/differentiators.md](docs/agents-md-refs/differentiators.md) — what makes this workflow different; key principles. Read when the user asks "why this approach?" or when designing a new stage.
- [docs/agents-md-refs/source-of-truth.md](docs/agents-md-refs/source-of-truth.md) — skills, extensions, distribution model. Read when adding a skill or discussing packaging.
- [docs/agents-md-refs/workflow-integration.md](docs/agents-md-refs/workflow-integration.md) — how to trigger the workflow, repo/license metadata. Read on first user interaction in a fresh project.
