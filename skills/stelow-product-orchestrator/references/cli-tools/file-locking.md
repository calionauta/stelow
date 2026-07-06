# File Reservation Locks (parallel scope prevention)

> **Status:** convention. Works on any CLI (pi / opencode / codex / claude-code) without runtime hooks, worktrees, or merge steps.

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
LOCK_DIR=".stelow/${DATE}/${DIR}/locks"
mkdir -p "$LOCK_DIR"
FILE_PATH="src/middleware/auth.ts"
LOCK_FILE="$LOCK_DIR/$(printf '%.12s' "$(printf '%s' "$FILE_PATH" | sha1sum | cut -d' ' -f1)").lock"
TTL=1800
NOW=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
EXP=$(date -u -d "+${TTL} seconds" +%Y-%m-%dT%H:%M:%S.%3NZ)

# Atomic acquire: link() returns EEXIST if file already exists.
# If exists + expired: clobber (steal stale lock). If exists + valid: abort.
if ln "$LOCK_FILE" "$LOCK_FILE.locktmp" 2>/dev/null; then
  rm "$LOCK_FILE.locktmp"
  cat > "$LOCK_FILE" <<EOF
{"scope_id":"$SCOPE_ID","file":"$FILE_PATH","acquired_at":"$NOW","expires_at":"$EXP","ttl_seconds":$TTL}
EOF
  echo "LOCK ACQUIRED: $FILE_PATH"
else
  # Lock exists — check if expired
  EXISTING_EXP=$(jq -r '.expires_at' "$LOCK_FILE" 2>/dev/null)
  if [ -n "$EXISTING_EXP" ] && [ "$(date -u -d "$EXISTING_EXP" +%s)" -lt "$(date -u +%s)" ]; then
    # Stale — steal
    cat > "$LOCK_FILE" <<EOF
{"scope_id":"$SCOPE_ID","file":"$FILE_PATH","acquired_at":"$NOW","expires_at":"$EXP","ttl_seconds":$TTL}
EOF
    echo "STALE LOCK STOLEN: $FILE_PATH"
  else
    echo "LOCK CONFLICT: $FILE_PATH held by $(jq -r '.scope_id' "$LOCK_FILE")" >&2
    exit 1
  fi
fi
```

### Release (after editing the file, in same scope)

```bash
LOCK_FILE="$LOCK_DIR/$(printf '%.12s' "$(printf '%s' "$FILE_PATH" | sha1sum | cut -d' ' -f1)").lock"
rm -f "$LOCK_FILE"
```

### Check (read-only — does this scope have room to start?)

```bash
# Before scope begins: scan target_files and report any pre-existing locks
# held by OTHER scopes. Output JSON for orchestrator decision.
for f in "${TARGET_FILES[@]}"; do
  LOCK="$LOCK_DIR/$(printf '%.12s' "$(printf '%s' "$f" | sha1sum | cut -d' ' -f1)").lock"
  if [ -f "$LOCK" ]; then
    HOLDER=$(jq -r '.scope_id' "$LOCK")
    EXPIRES=$(jq -r '.expires_at' "$LOCK")
    if [ "$HOLDER" != "$SCOPE_ID" ] && [ "$(date -u -d "$EXPIRES" +%s)" -gt "$(date -u +%s)" ]; then
      echo "{\"file\":\"$f\",\"held_by\":\"$HOLDER\",\"expires_at\":\"$EXPIRES\"}"
    fi
  fi
done
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
| LLM must follow protocol (read before write) | Skill instructions in `cali-product-scope-executor` Step 3c + Step 3e enforce this |
| TTL-based expiry can race long edits | Default TTL 30 min; expand for large refactors |
| Lock only protects FILES in `target_files` — agent can still write undeclared files | Post-execution `actual_files ∩ declared_target_files` diff catches this in Step 8 |
| Doesn't prevent two scopes touching the same FILE but different REGIONS (line-level) | Out of scope — line-level coordination needs AST merging (Phantom-class solution) |
| `ln` atomic-create isn't POSIX-portable across all filesystems (NFS, some FUSE) | Local filesystem assumed; CI runners OK; document if using exotic FS |

## Why not worktree?

`git worktree` is the obvious alternative (pi-subagents has `worktree: true`,
claude-code has `--worktree`). Reasons stelow does NOT recommend it:

- **Merge step** — every parallel scope ends with a `git merge` of its branch
  back. Conflicts at merge time force human resolution, even when no real
  conflict exists at write time.
- **Branch hygiene** — branches accumulate, need cleanup, pollute `git branch -a`.
- **Composite commits** — agent's atomic commits per scope get scattered across
  branches, then re-interleaved on merge. Audit trail degrades.
- **Per-CLI flag** — `worktree: true` in pi-subagents, `--worktree` in
  claude-code, different in codex. Stays harness-specific.
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