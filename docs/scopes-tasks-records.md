# Scopes, tasks, records

Execution runs on three layers. Scopes are committed at planning and frozen;
tasks emerge during building and stay mutable; records prove the work at
close. Without a record, the ✅ is unearned.

| Layer | Created by / when | Mutability | Stored in |
|---|---|---|---|
| **Scope** | Tech planning; frozen after `spec-tech.md` | Frozen | `wf.scopes[i]` in `stelow.json` |
| **Task** | Scope executor; planned tasks seed from the spec table, discovered tasks append with a `note:` trigger | Mutable (`pending` → `done` / `skipped`) | `wf.scopes[i].tasks[]` |
| **Record** | Scope executor at scope close | Frozen after close | `wf.scopes[i].record` + `iteration-state-{SCOPE-ID}.md` |

Scope ceiling: 9 scopes maximum, discovered by mapping, never a target. Records are an
advisory convention by default — execution-critique flags completed scopes
without a verified record, but nothing blocks. `STELOW_VALIDATE=1` enables
runtime validation (record and task validators run before the tracking
file persists, and the pre-commit hook blocks record-less commits).
`scope.tasks` is a checklist audited by execution-critique, not proof.

Rules of thumb: a discovered task big enough to be a delivery unit becomes
a new scope next cycle instead of bloating the current one; more than ~5
discovered tasks means the scope was under-planned; discovered tasks
without `note:` are rejected when validation is on.

## Running scopes: sequential default, opt-in parallel

Scopes run **sequentially by default** — the cheapest known-good strategy
(peer agents cooperating on shared state score on average 30% lower than
solo; coordination overhead grows quadratically). Parallel dispatch is
opt-in and guarded by three layers:

1. **Prevent** — file-reservation locks (`scripts/stelow lock`: atomic,
   default TTL 1800s with stale-steal) before editing declared
   `target_files`. This is a different lock from the workflow advance
   lock (`.stelow/lock`, 120s TTL) — don't mix their timeouts.
2. **Detect** — post-hoc `git diff --name-only $start_sha..HEAD` per scope,
   classified into undeclared writes / real overlaps / stale locks / clean.
3. **Respond** — non-clean classes surface to the human (merge, sequential
   re-run, or rework). The experimental full-parallel mode stays
   specified in `rfc-parallel-scope-execution.md`, not enabled.

| Dispatch | `target_files` | Action |
|---|---|---|
| Sequential | any | run |
| Parallel | declared & disjoint | run (locks defensive) |
| Parallel | declared & intersect | acquire locks; abort on conflict |
| Parallel | undeclared | sequential re-dispatch, or audit-only post-hoc |

Rejected alternatives: LLM-predicted file guards (unreliable — audit
confirms after the fact), per-CLI hooks (host-level concern),
`git worktree` isolation (merge burden disproportionate to 2–3-scope
risk), semantic AST merge (heavyweight for occasional dispatch).

Full doctrine: [scope-execution-strategy.md](scope-execution-strategy.md);
protocol: `skills/stelow-workflow-orchestrator/references/cli-tools/file-locking.md`.
