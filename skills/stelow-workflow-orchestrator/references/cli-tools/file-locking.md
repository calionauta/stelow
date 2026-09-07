# File Reservation Locks (parallel scope prevention)

> **Status:** convention. Works in any agent without runtime hooks, worktrees, or merge steps.

## Why this exists

Two scopes dispatched in parallel can silently overwrite the same file. The
post-execution `git diff --name-only` overlap check (see `scope-executor` Step 8)
detects this AFTER it has happened — useful as audit, not as prevention.

To prevent the conflict at edit-time without:
- shipping a runtime hook framework,
- forcing `git worktree` isolation (which adds merge complexity), or
- rewriting the harness,

stelow uses a **file-reservation lock** protocol — pure filesystem ops, no
hooks, no CLI-specific code. The agent reads + writes a lock file before
touching a real source file. Other agents see the lock and skip the file
(or wait for its release).

## Protocol

### Layout

```
.stelow/{date}/{dir}/locks/
  {sha1_of_file_path_first_12_chars}.lock   # JSON content below
```

Example:
```
.stelow/2026-07-06/auth-system/locks/da39a3ee5e6b.lock
```

### Lock file content

```json
{
  "scope_id": "scope-3",
  "file": "src/middleware/auth.ts",
  "acquired_at": "2026-07-06T14:32:11.123Z",
  "expires_at": "2026-07-06T15:02:11.123Z",
  "ttl_seconds": 1800
}
```

Default TTL: 1800s (30 min). Crashed agents leave stale locks that expire.

### Acquire (before editing a file)

```bash
scripts/stelow lock acquire --scope <scope-id> --file <path>... [--ttl <seconds>] [--json]
# default TTL 1800. Exit 0: acquired. Exit 1: LOCK CONFLICT (stderr names holder).
```

Atomic create (`O_EXCL`); exists + expired → steal; exists + valid foreign
holder → refuse. The subcommand owns the `<sha1(path)[:12]>.lock` format —
skills only call it, never hand-roll it.

### Release (after editing the file, in same scope)

```bash
scripts/stelow lock release --scope <scope-id> --file <path>...
```

Deletes locks held by this scope (or expired). Exit 0, best-effort.

### Check (read-only — does this scope have room to start?)

```bash
# Before scope begins: report live locks on target_files held by OTHER scopes.
scripts/stelow lock check --scope <scope-id> --file <path>... [--json]
# --json emits {"locks": [{file, held_by, expires_at}]} for orchestrator decision.
```

## When to use

| Scenario | Use lock? |
|---|---|
| Sequential scope execution | NO — no parallel writes possible |
| Parallel scope dispatch (DAG-independent) | YES if `target_files` intersect or are undeclared |
| Parallel dispatch where `target_files` are KNOWN disjoint | OPTIONAL — defensive against undeclared touch |
| Single scope, no parallel | NO |

## Limitations (honest)

| Limitation | Mitigation |
|---|---|
| LLM must follow protocol (read before write) | Skill instructions in `stelow-workflow-scope-executor` Step 3c + Step 3e enforce this |
| TTL-based expiry can race long edits | Default TTL 30 min; expand for large refactors |
| Lock only protects FILES in `target_files` — agent can still write undeclared files | Post-execution `actual_files ∩ declared_target_files` diff catches this in Step 8 |
| Doesn't prevent two scopes touching the same FILE but different REGIONS (line-level) | Out of scope — line-level coordination needs AST merging (Phantom-class solution) |
| `ln` atomic-create isn't POSIX-portable across all filesystems (NFS, some FUSE) | Local filesystem assumed; CI runners OK; document if using exotic FS |

## Why not worktree?

`git worktree` is the obvious alternative. Some agent harnesses expose a
`worktree: true` flag in their subagent delegate parameters. Reasons stelow
does NOT recommend it:

- **Merge step** — every parallel scope ends with a `git merge` of its branch
  back. Conflicts at merge time force human resolution, even when no real
  conflict exists at write time.
- **Branch hygiene** — branches accumulate, need cleanup, pollute `git branch -a`.
- **Composite commits** — agent's atomic commits per scope get scattered across
  branches, then re-interleaved on merge. Audit trail degrades.
- **Per-harness flag** — most agent harnesses expose a worktree flag on subagent
  invocations. The convention-based locking covers any agent regardless.
- **Working dir explosion** — `.worktrees/sw-name-date/` directory tree, one per
  parallel dispatch.

The file-reservation lock gives the same guarantee (no concurrent write) with
none of the merge/hygiene cost. It's not as strong (no file-system-level
isolation) but it's **proportionate to the actual risk**: parallel scope
dispatch is opt-in, scope count is small (2-3), and the post-execution overlap
audit catches any lock-protocol violation.

## Audit trail

After scope execution, post-execution report includes:
- declared `target_files` per scope
- acquired locks (with timestamps)
- released locks
- stolen stale locks (with previous holder)
- observed `actual_files` from `git diff --name-only`
- declared ∩ actual diff (undeclared writes flagged)
- pairwise inter-scope overlap (real conflicts flagged)

See `scope-executor` SKILL Step 8.