# Scope Initialization (sync `wf.scopes[]` from spec-tech)

> Before executing scopes, `wf.scopes[]` must be populated from the latest
> `spec-tech.md`. Run the canonical subcommand — do not hand-parse:

```bash
scripts/stelow sync-scopes [--name <workflow>] [--json]
# inside bb: use the plugin's wrapped equivalent
```

With `STELOW_STATEDIR` pointing at the workflow's state dir, no `--name` is
needed. Exit 0 covers both "synced N scopes" and the idempotent no-ops
(already in sync, no spec-tech file, no `[SCOPE-N]` blocks, unreadable
tracking) — existing state is never replaced with an empty scope list.
Writes are atomic (tempfile + rename). Unknown flags exit 2.

## Contract

- Reads `$ROOT/stelow.json` and selects the workflow by `--name`, by
  `STELOW_STATEDIR` dirHash, or (single in-progress workflow) by default.
  Ambiguous selection without `--name` is a usage error (exit 2).
- Derives `.stelow/{date}/{dirHash}/plans/` from the workflow (`created`
  timestamp; today UTC when it is missing or unusable).
- Selects the lexicographically latest `spec-tech_*.md` file.
- Skips when non-empty `scopes[]` already records that filename
  (`wf.specTechFile`); re-syncs when a newer filename appears.
- Parses `[SCOPE-N]` blocks into
  `{ id, type, name, blockedBy, targetFiles, maxIterations, status: 'pending' }`:
  - `id`: `scope-N`; `name`: header remainder
  - `type`: `[TYPE]` line, lowercased (default `feature`)
  - `blockedBy`: `SCOPE-N` references on the `Dependencies:` line
  - `targetFiles`: `- ` items under `[TARGET_FILES]`
  - `maxIterations`: `[MAX_ITERATIONS]` integer (default 3)

## Runtime-state matrix

| Input state | Result |
|---|---|
| Empty `wf.scopes[]`, latest `spec-tech_v1.md` present | Parse and populate; set `wf.specTechFile` |
| Populated scopes and `wf.specTechFile === latest` | Exit 0 without writing |
| Populated scopes and a newer latest filename | Parse and replace the entire array |
| No `spec-tech_*.md` | Exit 0 with a stderr warning; preserve tracking |
| No `[SCOPE-N]` blocks | Exit 0 with a stderr warning; preserve scopes and version |
| Multiple versions | Use the lexicographically latest filename |
| Unusable `wf.created` | Look under today's UTC date |
| Malformed `stelow.json` | Exit 0 with a stderr warning; preserve the bytes |
