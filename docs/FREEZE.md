# `extensions/` — Historical (resolved in 1.0.0)

> ⚠️ **This tree no longer exists.** The `extensions/` directory was deleted in
> SCOPE-7 (`dcbd49c`, 1.0.0). This file is kept only as historical context.

## What happened

- The SCOPE-5 "skills-only" refactor froze `extensions/` behind
  `scripts/check-extensions-freeze.sh`, blocking accidental drift during the
  transition window.
- SCOPE-7 removed the entire tree (Pi extension host code, Fusion adapter,
  the `WORKFLOW_COMMANDS` command registry, and the rest of the core) plus the
  freeze guard itself.

## Current state

The product is skills-only: 25 portable skills in `skills/`, a
zero-dependency `scripts/stelow` helper (status/advance/doctor), and the
17-stage model in `skills/stelow-product-orchestrator/stages.yaml`. See
[architecture.md](architecture.md).