# stelow helper

The `scripts/stelow` CLI is the canonical state machine behind the `/sw-*`
skill commands. It reads/writes the project `state.md` and `.stelow/invariants.json`,
validates stage transitions against
`skills/stelow-workflow-orchestrator/references/transitions.md`, and exposes
a passive doctor that detects four classes of drift.

## Usage

```
scripts/stelow status [--json]
scripts/stelow advance <candidate> [--dry-run] [--json]
scripts/stelow doctor [--json]
scripts/stelow seed --name <n> --intent <i> [--appetite Lean|Core|Complete] [--review-mode M] [--json]
scripts/stelow ask --question <t> [--multiple] --option <label>... (repeat --question groups)
scripts/stelow sync-scopes [--name <workflow>] [--json]
scripts/stelow lock acquire --scope <id> --file <f>... [--ttl N] [--json]
scripts/stelow lock release --scope <id> --file <f>...
scripts/stelow lock check [--scope <id>] [--file <f>...] [--json]
scripts/stelow config get <field> [default]
scripts/stelow audit-trail build|check|path [--strict] [--json]
scripts/stelow schema [command]
scripts/stelow --help
```

`status` prints a one-screen summary of the project state, or `--json` for
machine consumption. It is **passive** — never mutates.

`advance <candidate>` moves `current_stage` to `<candidate>`. It validates:

- `<candidate>` is a known stage (or is the explicit `next:` for the current
  stage, with a soft warning if not).
- required artifacts listed in the current stage's transitions block exist.
- The `mkdir` lock at `.stelow/lock` can be acquired (or, if it is stale
  past the TTL, cleared and re-acquired).

If any check fails the helper exits non-zero **before** touching `state.md`
or `.stelow/invariants.json`. Revertibility is therefore trivial: a bad
candidate leaves both files byte-identical.

`doctor` runs the four drift checks:
| Class | Severity | Trigger |
|---|---|---|
| `stale-lock` | warn | `.stelow/lock` mtime older than TTL (default 120s) |
| `missing-dir` | warn | `state.md` intent is not one of the 5 known intents |
| `parallel-lock` | info | another live pid holds `.stelow/lock/pid` |
| `state-transitions-drift` | error | `state.md current_stage` not found in `transitions.md` |

`--json` returns `{"findings": [...], "ok": <bool>}` and never exits non-zero
on `warn` / `info`; only `error` flips `ok` to false.

`sync-scopes` parses `[SCOPE-N]` blocks from the latest `spec-tech_*.md` into
`wf.scopes[]` (`id`, `type`, `name`, `blockedBy`, `targetFiles`,
`maxIterations`, `status: 'pending'`). Idempotent via `wf.specTechFile`;
missing input is an exit-0 no-op; existing state is never replaced with an
empty scope list. This is the single canonical scope parser — hosts shell
out instead of maintaining a mirror.

`audit-trail build` writes a canonical, deterministic `audit-trail.md` from
the workflow state, the registered artifacts, and a repository snapshot, all
as SHA-256 content hashes. The snapshot is the whole tree the work was
verified in, not only the commit: Git repository root, `HEAD`, the tracked
worktree diff (`git diff HEAD`), and a manifest of every untracked file. A
later commit, an uncommitted edit, or a new untracked file therefore all make
the receipt stale — which is the point, since a Done card is reviewed for
exactly that work.

`audit-trail check` recomputes the projection and fails when it is missing or
stale. Artifact paths come from the manifest `advance` maintains, and are
resolved against the directory the workflow was advanced from — the same base
`advance` wrote them against, which is not the Git toplevel when the project is
a subdirectory of its repository. Any absolute path or `..` traversal is
refused instead of being hashed or linked.
`--strict` additionally refuses to build while any workflow document in the
state directory is still unregistered — the host-facing completion gate, so a
produced document can never be missing from the receipt's links.

Both actions emit the same JSON envelope: `{ok, contract, path, artifacts,
snapshot, unregistered}` on success, and `{ok: false, contract, path, error}`
on refusal. `contract` pins the projection's shape (`v2`); a host that does
not recognize the version must fail closed rather than complete on an unknown
receipt format. Hosts may render the result, but must not generate a competing
format.

`lock` implements file-reservation locks for parallel scope dispatch
(acquire/release/check under `<statedir>/locks/`). Exit 0 ok, 1 conflict
(stderr names holder), 2 usage. See
`skills/stelow-workflow-orchestrator/references/cli-tools/file-locking.md`
for the protocol (opt-in, TTL + stale-steal semantics).

## Files

| Path | Role | Authored by |
|---|---|---|
| `state.md` | workflow state (YAML frontmatter + body markdown) | LLM + `stelow advance` |
| `.stelow/invariants.json` | audit trail of stage transitions | `stelow advance` only |
| `.stelow/lock/` | mkdir lock with TTL | `stelow advance` |
| `skills/stelow-workflow-orchestrator/references/transitions.md` | stage table (read-only mirror of `stages.yaml`) | generator — edit `stages.yaml`, regen; never by hand |

## `/sw-*` → `stelow` mapping

| Skill command | Helper invocation |
|---|---|
| `/sw-status` | `scripts/stelow status` |
| `/sw-status --json` | `scripts/stelow status --json` |
| `/sw-advance <stage>` | `scripts/stelow advance <stage>` |
| `/sw-doctor` | `scripts/stelow doctor` |
| `/sw-doctor --json` | `scripts/stelow doctor --json` |

The `/sw-*` spellings are conversational aliases an agent may recognize while
reading a skill; they are not a portable interface. Every deterministic
equivalent above is the CLI subcommand in the right-hand column — hosts and
workers call that, and nothing in the core simulates a slash command.

## Env overrides

| Var | Default | Effect |
|---|---|---|
| `STELOW_LOCK_TTL_SEC` | `120` | lock TTL in seconds; advance auto-clears stale locks past TTL |

## AC coverage

| AC | Verified by |
|---|---|
| `stelow advance bogus` exits != 0 and leaves state.md byte-identical | manual: md5sum before/after matches |
| second concurrent `advance` fails with lock message | manual: held lock manually, second `advance` returned "lock held by ..." exit=1 |
| missing required artifact blocks transition | enforced in `advance` pre-condition (Python check on `artifact:` lines) |
| `stelow doctor` flags fixture drift | four-class detection wired; `--json` returns structured findings |
| `stelow status --json` emits valid JSON | passes `python3 -m json.tool` |

## NFR

- Deterministic, offline, fail-closed.
- Bash + python3 only — no npm deps.
