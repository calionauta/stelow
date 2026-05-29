## Project Setup

> **Part of cali-product-workflow** — See [`SKILL.md`](./SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.
> **Stage Status:** Read `references/cli-tools/stage-status.md` for ASCII status display and CLI commands.

### 0a. Inbox Check (always)

**Before anything else**, check if there are deferred items from previous sessions:

```bash
INBOX=".cali-product-workflow/inbox/items.md"
if [ -f "$INBOX" ]; then
  echo "DEFERRED_ITEMS_FOUND"
  cat "$INBOX"
fi
```

If deferred items exist, offer the user to review them: "You have N deferred items from a previous session. Review them now?" If yes, proceed to Triage. If no, continue to setup.

### 1a. Auto-Discovery Check (before anything else)

**BEFORE asking anything to the user**, verify the directory structure exists:

```bash
DIR=".cali-product-workflow"
if [ ! -d "$DIR" ]; then
  mkdir -p "$DIR"
  echo "Created $DIR (extension session_start did not run)"
fi
```

Then scan for existing workflows:

```bash
count=0
for f in .cali-product-workflow/*/*/index.json; do
  if [ -f "$f" ] && grep -q '"workflow_status"[[:space:]]*:[[:space:]]*"in-progress"' "$f" 2>/dev/null; then
    echo "ACTIVE_WORKFLOW_FOUND:$f"
    cat "$f"
    count=$((count + 1))
  fi
done
if [ "$count" -eq 0 ]; then
  echo "NEW_WORKFLOW"
fi
```

> ⚠️ Note: The `/pw-start` extension already runs a cleanup overlay
> **before** creating a workflow, archiving orphaned workflows. At this point
> there should be at most 1 active workflow. If there are more, investigate.

**If 1 or more in-progress workflows exist**:
1. Read the found `index.json` files
2. If **only 1**: show "Active workflow: {name} ({current_stage})" and ask:
```typescript
ask_user_question({
  questions: [{
    question: `Workflow "{name}" is in progress at stage {current_stage}. Continue?`,
    header: "Resume",
    options: [
      {
        label: "Continue from where you left off (Recommended)",
        description: `Resume from stage {current_phase}. Existing artifacts preserved.`
      },
      {
        label: "View detailed status",
        description: `Show artifacts and stages without proceeding.`
      },
      {
        label: "Cancel workflow",
        description: `Archive and start fresh. Use /pw-start for new.`
      }
    ]
  }]
})
```
3. If **multiple active workflows**: show the list and recommend `/pw-clean`:
```typescript
ask_user_question({
  questions: [{
    question: `There are ${count} active workflows. Use /pw-clean to organize or select: Continue for: ${name}`,
    header: "Multiple",
    options: [
      {
        label: `Continue "${name}"`,
        description: `Ignore the others and focus on this one.`
      },
      {
        label: "List all",
        description: `View all active workflows.`
      },
      {
        label: "Run /pw-clean",
        description: `Archive orphaned/stalled workflows.`
      }
    ]
  }]
})
```

**If new workflow**:
1. Continue to 1b. Stage Selection normally

### Resume Mechanics (when [RESUME] is present)

When the skill is invoked with `[RESUME: workflow X, phase Y]` context (from `/pw-resume`),
follow this flow INSTEAD OF asking the user:

**Step 1: Identify the correct workflow directory by name**

```bash
# Find workflow by NAME (not _dir) matching the RESUME context
RESUME_WF_NAME="$1"  # e.g., "wf-whkaxv" from [RESUME: workflow wf-whkaxv]

# Scan all index.json files for matching name field
MATCHED_DIR=""
for f in .cali-product-workflow/*/*/index.json; do
  if [ -f "$f" ]; then
    WF_NAME=$(grep '"name"' "$f" | grep -oP '"[^"]+"' | head -1 | tr -d '"')
    if [ "$WF_NAME" = "$RESUME_WF_NAME" ]; then
      MATCHED_DIR=$(dirname "$f")
      echo "MATCHED: name=$WF_NAME dir=$MATCHED_DIR"
      break
    fi
  fi
done

if [ -z "$MATCHED_DIR" ]; then
  echo "RESUME_FAILED: workflow '$RESUME_WF_NAME' not found in any index.json"
  echo "Available workflows:"
  for f in .cali-product-workflow/*/*/index.json; do
    [ -f "$f" ] && echo "  - $(grep '"name"' "$f" | grep -oP '"[^"]+"' | head -1 | tr -d '"')"
  done
  exit 1
fi

WF_DIR="$MATCHED_DIR"
INDEX="$WF_DIR/index.json"
_DIR=$(basename "$WF_DIR")  # _dir = directory name (e.g., pw-ollc-whkaxv)
echo "RESUMING: name=$RESUME_WF_NAME _dir=$_DIR"
```

> ⚠️ **CRITICAL**: The `{name}` field (display name, e.g., `wf-whkaxv`) is what the user sees.
> The `{_dir}` field (directory name, e.g., `pw-ollc-whkaxv`) is the filesystem path.
> **NEVER** confuse them — always match by `name`, not by `_dir`.

After identifying the workflow:

1. **Read the full `index.json`** — extract `name`, `current_phase_index`, `current_phase`,
   `artifacts`, `workflow_status`

2. **Read session checkpoints** (if they exist):
   ```bash
   for cp in "$WF_DIR/sessions/"*/checkpoint.json; do
     [ -f "$cp" ] && cat "$cp"
   done
   ```
   Extract `phase`, `step`, `pending_decisions`, `user_choices`, `artifacts_partial`

3. **Survey existing artifacts**:
   ```bash
   ls "$WF_DIR/specs/"* 2>/dev/null && echo "SPEC_EXISTS"
   ls "$WF_DIR/interfaces/"* 2>/dev/null && echo "INTERFACES_EXIST"
   ls "$WF_DIR/critiques/"* 2>/dev/null && echo "CRITIQUE_EXISTS"
   ls "$WF_DIR/plans/spec-tech_"* 2>/dev/null && echo "TECH_PLAN_EXISTS"
   ls "$WF_DIR/approvals/"* 2>/dev/null && echo "APPROVALS_EXIST"
   ls .plannotator/approvals/$_dir/*.approved.md 2>/dev/null && echo "GATE_PASSED"
   ```

4. **Map artifacts to completed stages**:
   - Approval in `.plannotator/approvals/` → that stage's gate has passed
   - `spec-product.md` exists → Shape Up stage completed
   - `interfaces.md` exists → Interface stages completed
   - `critique-report.md` exists → Product Critique stage completed
   - `spec-tech.md` exists and approved → Tech Planning stage completed

5. **Determine resume point**:
   - If `current_phase_index` is 0 → start from Setup stage
   - If `current_phase_index` is 1 → start from Context (Strategic Context)
   - If checkpoint has `phase == current_phase_index` → jump to `checkpoint.step`
   - If checkpoint has `phase < current_phase_index` → previous phase is done; start current phase
   - If no checkpoint → start current phase from beginning
   - If `current_phase_index >= Planning stage index` and spec-tech approved → skip to Execution

6. **DO NOT re-ask answered questions.** Use `user_choices` from checkpoint.

7. **Jump to the determined stage** and execute normally. Do not recreate existing artifacts.

### 1b. Stage Selection

Use **Pattern 5** from `stages/ask-patterns.md`.

**If user chooses "Yes" for safe-change:**
Run `safe-change` from **pi-agent-codebase-workflows** (PriNova) BEFORE proceeding.

**If user selects no workflow option:** proceed to Strategic Context.

### Auto-chaining rules

| User selection | Stages that run automatically |
|---|---|
| Shape Up only | Shape Up → **Product Critique** → **Review Gate** → Tech Planning (no gate) → Execution |
| Interface only | Interface Brain. → **Product Critique** → **Review Gate** → Tech Planning (no gate) → Execution |
| Shape Up + Interface | Shape Up → Interface Brain. → **Product Critique** → **Review Gate** → Tech Planning (no gate) → Execution |
| Tech Planning only | Tech Planning (with its own **Review Gate**) → Execution |
| Shape Up + Tech Planning | Shape Up → **Product Critique** → **Review Gate** → Tech Planning (no gate) → Execution |
| All | Shape Up → Interface Brain. → **Product Critique** → **Review Gate** → Tech Planning (no gate) → Execution |

**Product Critique** and **Review Gate** never appear as options — they are automatic.

**Review Gate** never duplicates: comes from Product Critique or embedded in Tech Planning (standalone).
