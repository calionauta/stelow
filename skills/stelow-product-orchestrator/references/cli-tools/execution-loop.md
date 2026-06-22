# Execution Loop Protocol

> **Tool Reference** — Part of `skills/stelow/references/cli-tools/`
> See `skills/stelow/stages/execution.md` for the Execution phase routing table.

---

## Quick Summary

Deterministic checkpointed loop for feature scopes with `[MAX_ITERATIONS] >= 2`.
Two layers:

| Layer | What it does | Required? |
|-------|-------------|-----------|
| **Layer 1** (generic) | LLM manages verify + loop via checkpoint.json | ✅ Yes (all agents) |
| **Layer 2** (extension) | Extension runs verify on turn_end, LLM reads result | ❌ Optional (Pi and others with extension support) |

In both: **checkpoint.json is the canonical state.** Do not rely on LLM memory
to know where it stopped — read the checkpoint.

---

## When To Use

| Scope type | MAX_ITERATIONS >= 2 | Verify commands exist | Use protocol? |
|-----------|---------------------|------------------------|--------------|
| `feature`  | ✅                  | ✅                     | ✅ Yes |
| `feature`  | ❌                  | ✅                     | ✅ Yes (crash recovery) |
| `feature`  | ❌                  | ❌                     | ❌ No (one-shot scope) |
| `optimization`, `spike`, `test-*` | — | — | ❌ No (different flow) |

---

## checkpoint.json — Schema

File: `.stelow/execution/{scopeId}/checkpoint.json`

```json
{
  "schemaVersion": 1,
  "scopeId": "scope-1",
  "iteration": 2,
  "maxIterations": 5,
  "status": "in_progress",
  "verifyCommands": ["go test ./...", "golangci-lint run"],
  "verifyResults": [
    { "command": "go test ./...", "passed": false, "output": "TestAuth failed: token expired" }
  ],
  "feedbackLog": [
    "Iteration 2: verify failed — go test ./... failed"
  ],
  "lastStep": "delegate",
  "createdAt": "2026-06-20T10:00:00Z",
  "updatedAt": "2026-06-20T11:30:00Z"
}
```

### Status Values

| Status | Meaning | Written by |
|--------|---------|-----------|
| `in_progress` | LLM is working or about to delegate | LLM |
| `waiting_verify` | Implementation done, awaiting verify | LLM |
| `completed` | Verify passed — scope ready | Extension (or LLM in Layer 1) |
| `escalated` | Max iterations exhausted without passing | Extension (or LLM in Layer 1) |

### Step Values

| Step | Meaning |
|------|---------|
| `delegate` | LLM is delegating or implementing |
| `verify` | Verify commands are running |
| `done` | Scope finished (completed or escalated) |

---

## Protocol (Layer 1 — Generic)

Use when the extension does not support automatic verify.
Works in any agent (Pi, OpenCode, Claude Code, Codex, generic).

### 1. Start scope

```bash
# Read spec-tech.md to extract scopes and verify commands
cat .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_v{N}.md

# Create directory and initial checkpoint
mkdir -p .stelow/execution/{scopeId}
```

Write checkpoint.json:

```json
{
  "schemaVersion": 1,
  "scopeId": "{scopeId}",
  "iteration": 0,
  "maxIterations": {MAX_ITERATIONS},
  "status": "in_progress",
  "verifyCommands": ["{verify commands from spec-tech}"],
  "verifyResults": [],
  "feedbackLog": [],
  "lastStep": "delegate",
  "createdAt": "{now}",
  "updatedAt": "{now}"
}
```

Delegate to subagent with the acceptance contract.

### 2. After subagent returns

Update checkpoint to waiting for verify:

```json
{
  "...": "...",
  "lastStep": "verify",
  "status": "waiting_verify",
  "updatedAt": "{now}"
}
```

### 3. Run verify (Layer 1 — manual)

If the extension did NOT process automatically (Layer 1):

```bash
for cmd in "${verifyCommands[@]}"; do
  if $cmd 2>&1; then
    echo "PASSED: $cmd"
  else
    echo "FAILED: $cmd"
  fi
done
```

Update checkpoint with results:

```json
{
  "...": "...",
  "verifyResults": [
    { "command": "go test ./...", "passed": true, "output": "ok" },
    { "command": "golangci-lint run", "passed": false, "output": "auth.go:15: unused variable" }
  ],
  "status": "completed",
  "updatedAt": "{now}"
}
```

### 4. Decide

Read `checkpoint.verifyResults`:

| Outcome | Action |
|---------|--------|
| All passed | `status = "completed"`. Next scope. |
| Some failed and iteration < maxIterations | Increment iteration. Append to feedbackLog. Re-delegate with feedback. |
| Some failed and iteration >= maxIterations | `status = "escalated"`. Report to user. |

### 5. Resume after crash

1. Read checkpoint.json with the `read` tool
2. If `status = "in_progress"` and `lastStep = "delegate"`:
   - Continue from where you left off (feedbackLog has context)
3. If `status = "waiting_verify"`:
   - Go to step 3 (run verify)
4. If `status = "completed"`:
   - Scope already done, move to next
5. If `status = "escalated"`:
   - Report to user

---

## Protocol (Layer 2 — With Extension)

When the extension (Pi or other with support) processes verify
automatically at turn_end:

### Flow

```
LLM: Implement scope, write checkpoint status="waiting_verify"
LLM: Return (end of turn)
  ── turn_end ──
Extension: Read checkpoint, see "waiting_verify"
Extension: Run verify commands (async exec)
├── passed?  → checkpoint.status = "completed"
│              Extension notifies: "Scope completed"
└── failed?  → checkpoint.iteration++
               checkpoint.status = "in_progress"
               checkpoint.feedbackLog += error
               Extension notifies: "Re-delegate with feedback"
```

LLM at next turn: read the ready checkpoint.

### The LLM does NOT need to run verify manually.
The LLM only needs to read the checkpoint for the result.

---

## events.jsonl (Optional)

Append-only audit trail at `.stelow/execution/{scopeId}/events.jsonl`.

Each line is an independent JSON object. Use for debugging:

```bash
# Find all failures
grep '"passed":false' .stelow/execution/scope-1/events.jsonl

# Watch execution in real time
tail -f .stelow/execution/scope-1/events.jsonl

# Count iterations
grep '"type":"delegate"' .stelow/execution/scope-1/events.jsonl | wc -l
```

---

## Complete Example (Layer 1 + Layer 2)

```
User: "Plan approved. Execute the scopes."

Execution phase:
  1. scope-executor Step 1: read spec-tech.md
  2. Create .stelow/execution/scope-1/checkpoint.json
  3. Delegate: subagent({ task: "...", acceptance: {...} })
  4. Update checkpoint: status="waiting_verify"
  5. End of turn
  6. turn_end: extension sees waiting_verify
  7. Extension runs: go test ./...
     ├── Passed? → completed, notify
     └── Failed? → iteration++,
         checkpoint.feedbackLog += error,
         notify "re-delegate"
  8. LLM reads checkpoint:
     ├── completed? → next scope
     └── failed? → re-delegate with feedback
```

---

## Fallback

If checkpoint.json is corrupted or missing:
1. Read spec-tech.md
2. Re-create checkpoint manually with status="in_progress", iteration=0
3. Continue normal flow

If extension did not process verify within ~5 seconds:
1. Assume Layer 1 (LLM runs verify manually)
2. Run verify commands via `bash` tool
3. Update checkpoint manually
