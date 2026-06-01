# Business Rules

Core domain logic, invariants, and constraints for the cali-product-workflow system.

## Workflow Stages

The rigid 15-stage sequence that must never be reordered or skipped. Uses gap-based hierarchical numbering with gap of 10 for insertability.

Each stage has a [[glossary#Slug|slug]] prefix. The orchestrator skill (`cali-product-workflow`) enforces this through its Stage Index.

### Stage Sequence

The full pipeline from triage through audit. All 15 stages run in order with no skipping allowed.

```
triage → select → setup → context → shape → critique → gate → scope → interface → int-gate → selection → planning → execution → verification → audit
```

### Rules

Key invariants that govern stage execution. Violating these can cause infinite loops or incorrect approvals.

- **No stage skipping.** Plannotator [[glossary#Gate|gate]] (`gate`, `int-gate`) is mandatory and requires visual approval — verbal approval is insufficient.
- **No supervisor activation before Execution.** Activating the supervisor during pre-execution stages causes re-submission to Plannotator, creating an infinite loop.
- **Context rot awareness.** LLM compliance with rules drops from ~73% to ~33% over 16 turns. Agents must re-read artifacts from disk, not trust conversation memory.

## Shape Up Method

The proposal phase follows Shape Up conventions.

### Appetite

Every shaped proposal must specify an appetite (timebox) as a constraint. The appetite bounds the solution and prevents unbounded scope growth.

### IN/OUT Scope

Every proposal must declare explicit IN and OUT boundaries. Features not listed as IN are implicitly OUT. This prevents scope creep during planning and execution.

### Rabbit Holes

Potential implementation risks must be identified during shaping. If a rabbit hole becomes a blocker, the proposal returns to the shaping phase.

## Pipeline Organization

Workflows are organized in `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/` directories (see [[data-model#Workflow Directory Structure]]). The system uses auto-discovery via `index.json` metadata — no configuration files needed.

### Key Constraints

Stable invariants for the directory naming convention. `{_dir}` never changes on rename; `{name}` may change.

- `{_dir}` = stable directory name (never changes on rename)
- `{name}` = display name (may change via rename)
- Session knowledge persists across workflow sessions and is injected in the `setup` stage
- Lessons learned from previous sessions are injected before shaping

## Tool Reference Pattern

Stage files must NEVER call technical tools directly. Instead, they reference CLI-agnostic `.md` files in `references/cli-tools/` that document the tool. This ensures portability across Pi, OpenCode, Claude Code, and Codex.

## Plannotator Gate

A visual browser review with point-by-point annotation. Every annotation returns structured feedback to the LLM for revision.

The gate is NEVER skipped — only degraded to a manual review file if the tool command fails.

## Model Provenance

Every artifact records which model generated it in YAML frontmatter (`generated_by: "{model_name}"`). This allows attribution and appropriate scrutiny — artifacts from smaller models deserve extra review.

## Invisible 20% Enforcement

For every code change, the following dimensions must be verified:
- **Error handling** — retry/backoff, fallback
- **Observability** — structured logging, correlation IDs
- **Security** — auth consistency, input sanitization, rate limiting
- **Validation** — null/empty/boundary handling
- **Rollback** — rollback strategy, migration reversal

## Execution Critique

Post-verification evaluation against 8 fixed criteria. Produces a structured report with actionable outcomes. Implemented by the `cali-product-execution-critique` skill (see [[decisions#ADR-5: Execution Critique (formerly Delivery Audit)]]).

The criteria are: scope completeness, implementation quality, invisible 20%, edge cases, documentation/tests, gap registry, lessons learned, and decision matrix.

## Multi-CLI Support

The workflow must be invocable from Pi, OpenCode, Claude Code, and Codex. The single source of truth for commands is `cli-agents/COMMANDS.md`.

Pi gets full support (16 commands). Other CLIs get 4 core commands each.
