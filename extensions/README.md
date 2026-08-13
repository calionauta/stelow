# extensions/ — FROZEN

**This directory is frozen pending the skills-only refactor.**

## Why

The `stelow/skills-only` refactor (see `.plans/skills-only/plan.md`) removes this
entire layer. While the refactor is in progress, **do not modify any file under
`extensions/` or `WORKFLOW_COMMANDS/`**.

A CI guard (`scripts/check-extensions-freeze.sh`) enforces this automatically.
Any change to `extensions/` or `WORKFLOW_COMMANDS/` will fail CI.

## Emergency kill-switch

If you absolutely must make an emergency change:

```bash
rm .stelow/refactor-freeze-active
# make your change
git commit ...
# re-enable freeze
touch .stelow/refactor-freeze-active
git commit ...
```

## Status

- Refactor plan: `.plans/skills-only/plan.md`
- Freeze guard: `scripts/check-extensions-freeze.sh`
- Freeze marker: `.stelow/refactor-freeze-active` (present = freeze active)
- Target: SCOPE-7 (hpj0) — HUMAN GATE required before deletion
