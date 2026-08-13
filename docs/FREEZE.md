# `extensions/` — Frozen Tree

> ⚠️ **This tree is frozen.** It is kept in the repository only as a
> compatibility shim and will be removed in a future major version.
> All orchestration, skills discovery, and workflow logic have migrated to
> `skills/` and `references/`.

## What is frozen here

- All files under `extensions/stelow/`, including:
  - `adapters/` — host-specific adapters (Pi, Fusion, generic)
  - `modules/` — core runtime modules
  - `types.ts`, `state.ts`, `schema.ts`, `schemas.ts`
  - All command dispatchers and event handlers

- The `WORKFLOW_COMMANDS` constant declared in
  `extensions/stelow/adapters/commands/dispatcher.ts`

## Why it is frozen

The `scope-5` "skills-only" refactor removes the entire `extensions/`
tree. The guard at `scripts/check-extensions-freeze.sh` prevents
accidental re-introduction of code into this tree during the refactor
window.

Once the refactor merges to `main`, the tree will be removed entirely.

## Override (temporary use only)

```bash
touch .extensions-freeze-override
git commit -m "chore: lift extensions freeze for <reason>" .extensions-freeze-override
```

Always document the reason. Remove the file and commit again to re-enable
the guard after the emergency fix is merged.

## CI

This guard runs in the CI `check` job. See `.github/workflows/ci.yml`.

```yaml
- name: Extensions freeze guard (SCOPE-5)
  run: bash scripts/check-extensions-freeze.sh
```
