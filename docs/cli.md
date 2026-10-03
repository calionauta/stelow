# CLI (`scripts/stelow`)

`scripts/stelow` is the durable state-machine boundary every host shells
out to: bash + python3 only, no npm dependencies. Hosts point at a
per-workflow state dir via `STELOW_STATEDIR` / `STELOW_STATE`. Usage errors
exit 2 (worker misuse), runtime failures exit 1. Inside bb you don't call
this binary directly — the plugin wraps the same operations as
`bb stelow …` with identical semantics.

This page is derived from `scripts/stelow --help`, `scripts/stelow schema`,
and `references/cli-tools/stelow-helper.md`. To refresh it, re-run all
three — `--help` alone under-reports (it omits `scope` and the `ask`
`--contract` flag), so never redraft from a single source.

```
scripts/stelow status [--json]
scripts/stelow advance <candidate> [--dry-run] [--json]
scripts/stelow doctor [--json]
scripts/stelow seed --name <n> --intent <i> [--appetite Lean|Core|Complete] [--review-mode M] [--json]
scripts/stelow ask --question <t> [--contract <id>] [--multiple] --option <label>... (repeat --question groups)
scripts/stelow sync-scopes [--name <workflow>] [--json]
scripts/stelow scope start|done|seed-tasks --scope <id> [--name <workflow>] [--iteration <n>] [--actual-files <a,b>] [--tasks <json>] [--start-sha <sha>] [--json]
scripts/stelow config get <field> [default]
scripts/stelow audit-trail build|check|path [--strict] [--json]
scripts/stelow lock acquire|release|check --scope <id> [--file <f>...] [--ttl N] [--json]
scripts/stelow schema [command]
```

| Command | What it does |
|---|---|
| `status` | One-screen project summary (`--json` for machines). Passive — never mutates. |
| `advance <stage>` | Moves `current_stage` after validating the stage exists, required artifacts exist, and the `.stelow/lock` can be acquired. Fails before touching anything: a bad candidate leaves state byte-identical. `--dry-run` validates without mutating. |
| `doctor` | Four drift classes: `stale-lock` (warn), `missing-dir` (warn), `parallel-lock` (info), `state-transitions-drift` (error). `--json` never exits non-zero on warn/info. |
| `seed` | Scaffolds a workflow (`--appetite`, `--review-mode` set the two control dimensions once). |
| `ask` | Records a structured question (single- or multi-choice, batchable groups, optional `--contract` binding it to a decision contract). |
| `sync-scopes` | Parses `[SCOPE-N]` blocks from the latest `spec-tech_*.md` into `wf.scopes[]`. Idempotent; preserves host/worker overlays and re-houses rework scopes. The single canonical scope parser — hosts shell out instead of mirroring it. |
| `scope` | Per-scope transitions (`start`, `done`, `seed-tasks`) against the validated scope id. |
| `lock` | File-reservation locks for parallel dispatch (exit 0 ok, 1 conflict naming the holder, 2 usage; default TTL 1800s). |
| `config` | Reads workflow config fields with an optional default. |
| `audit-trail` | `build` writes the deterministic `audit-trail.md` (state + artifacts + repo snapshot as SHA-256); `check` fails on missing/stale; `--strict` refuses unregistered outputs. Receipt contract `v3` — hosts that don't recognize the version must fail closed. |
| `schema` | Machine-readable subcommand contracts. |

`/sw-*` skill commands are conversational aliases agents recognize while
reading a skill (`/sw-status` → `status`, `/sw-advance` → `advance`,
`/sw-doctor` → `doctor`). They are not a portable interface — automation
calls the CLI subcommand. Env override: `STELOW_LOCK_TTL_SEC` (default
120; `advance` auto-clears stale locks past TTL).
