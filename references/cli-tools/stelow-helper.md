# stelow helper (SCOPE-2)

The `scripts/stelow` helper is the canonical CLI for the stelow skills-only
workflow. It reads/writes the project `state.md` and `.stelow/invariants.json`,
validates stage transitions against
`skills/stelow-workflow-orchestrator/references/transitions.md`, and exposes
a passive doctor that detects four classes of drift.

It replaces the legacy `/sw-*` and `/stelow-*` slash commands with a script
that any host (Pi, Fusion, generic agentskills-compatible agents, or a human
in a terminal) can invoke.

## Usage

```
scripts/stelow status [--json]
scripts/stelow advance <candidate>
scripts/stelow doctor [--json]
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

## Files

| Path | Role | Authored by |
|---|---|---|
| `state.md` | workflow state (YAML frontmatter + body markdown) | LLM + `stelow advance` |
| `.stelow/invariants.json` | audit trail of stage transitions | `stelow advance` only |
| `.stelow/lock/` | mkdir lock with TTL | `stelow advance` |
| `skills/stelow-workflow-orchestrator/references/transitions.md` | stage table (read-only mirror of `stages.yaml`) | generator (read SCOPE-1 contract) |

## Old `/sw-*` → `stelow` mapping

| Legacy command | New helper invocation |
|---|---|
| `/sw-status` | `scripts/stelow status` |
| `/sw-status --json` | `scripts/stelow status --json` |
| `/sw-advance <stage>` | `scripts/stelow advance <stage>` |
| `/sw-doctor` | `scripts/stelow doctor` |
| `/sw-doctor --json` | `scripts/stelow doctor --json` |

Slash-command versions remain registered in Pi and Fusion adapters for
backward compatibility but always delegate to this helper at runtime.

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
- POSIX sh + node + python3 only — no npm deps.
- ≤ ~350 lines of bash + ~80 lines of inline python.