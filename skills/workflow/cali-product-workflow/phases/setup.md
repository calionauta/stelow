## Phase 1: Project Setup

> **Part of cali-product-workflow** — See [`SKILL.md`](./SKILL.md) for phase sequence, safety rules, and capability reference.

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

> ⚠️ Note: The `/product-workflow-start` extension already runs a cleanup overlay
> **before** creating a workflow, archiving orphaned workflows. At this point
> there should be at most 1 active workflow. If there are more, investigate.

**If 1 or more in-progress workflows exist**:
1. Read the found `index.json` files
2. If **only 1**: show "Active workflow: {name} ({current_phase})" and ask:
```typescript
ask_user_question({
  questions: [{
    question: `Workflow "{name}" is in progress at phase {current_phase}. Continue?`,
    header: "Resume",
    options: [
      {
        label: "Continue from where you left off (Recommended)",
        description: `Resume from phase {current_phase}. Existing artifacts preserved.`
      },
      {
        label: "View detailed status",
        description: `Show artifacts and phases without proceeding.`
      },
      {
        label: "Cancel workflow",
        description: `Archive and start fresh. Use /pw:start for new.`
      }
    ]
  }]
})
```
3. If **multiple active workflows**: show the list and recommend `/pw:clean`:
```typescript
ask_user_question({
  questions: [{
    question: `There are ${count} active workflows. Use /pw:clean to organize or select: Continue for: ${name}`,
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
        label: "Run /pw:clean",
        description: `Archive orphaned/stalled workflows.`
      }
    ]
  }]
})
```

**If new workflow**:
1. Continue to 1b. Stage Selection normally

### Resume Mechanics (when [RESUME] is present)

When the skill is invoked with `[RESUME: workflow X, phase Y]` context (from `/pw:resume`),
follow this flow INSTEAD OF asking the user:

```bash
WF_DIR=$(ls -d .cali-product-workflow/*/*/ 2>/dev/null | head -1)
INDEX="$WF_DIR/index.json"
if [ ! -f "$INDEX" ]; then
  echo "RESUME_FAILED: index.json not found"
  exit 1
fi
CURRENT_PHASE=$(grep '"current_phase_index"' "$INDEX" | grep -oP '\d+')
_DIR=$(grep '"_dir"' "$INDEX" | grep -oP '"[^"]+"' | tail -1 | tr -d '"')
echo "RESUMING: phase=$CURRENT_PHASE _dir=$_DIR"
```

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

4. **Map artifacts to completed phases**:
   - Approval in `.plannotator/approvals/` → that phase's gate has passed
   - `spec-product.md` exists → Phase 3 (Shape) completed
   - `interfaces.md` exists → Phase 4 (Interface) completed
   - `critique-report.md` exists → Phase 5 (Critique) completed
   - `spec-tech.md` exists and approved → Phase 7 (Planning) completed

5. **Determine resume point**:
   - If `current_phase_index` is 0 → start from Phase 1a (Setup)
   - If `current_phase_index` is 1 → start from Phase 2a (Strategic Context)
   - If checkpoint has `phase == current_phase_index` → jump to `checkpoint.step`
   - If checkpoint has `phase < current_phase_index` → previous phase is done; start current phase
   - If no checkpoint → start current phase from beginning
   - If `current_phase_index >= 6` and spec-tech approved → skip to Phase 8 (Execution)

6. **DO NOT re-ask answered questions.** Use `user_choices` from checkpoint.

7. **Jump to the determined phase** and execute normally. Do not recreate existing artifacts.

### 1b. Stage Selection

Ask the user about workflow stages AND about safe-change:

```typescript
ask_user_question({
  questions: [{
    question: `Which Product Definition Workflow stages should be activated?
Recommendation: [Shape Up + Interface + Tech Planning] | [Shape Up only] | etc.
Justification: [1-2 sentences explaining why].

Select the desired stages:`,
    header: "Workflow",
    multiSelect: true,
    options: [
      {
        label: "Shape Up Planning (Recommended)",
        description: "Understand problem, expose assumptions, map risks, define IN/OUT scope. Generates spec-product.md. → Automatically activates Plan Critique + Review Gate."
      },
      {
        label: "Interface Brainstorming",
        description: "Explore 5 interface directions with ASCII wireframes, breadboarding and trade-offs. → Automatically activates Plan Critique + Review Gate."
      },
      {
        label: "Tech Planning Sequencing",
        description: "Break into scopes with DoD + acceptance criteria. If standalone (no Shape Up/Interface): includes own Review Gate. If post-approval: no gate."
      }
    ]
  },
  {
    question: \`Before starting, would you like to validate the impact of changes on existing code?\`,
    header: "Safe-change",
    options: [
      {
        label: "Yes — run safe-change (Recommended)",
        description: "+ Checks regressions automatically | + Catches issues before planning | - ~2-5 min extra\n  → Executes safe-change from pi-agent-codebase-workflows (PriNova)"
      },
      {
        label: "No — proceed directly",
        description: "+ Faster | + No automatic validation | - No safety net"
      }
    ]
  }]
})
```
**If user chooses "Yes" for safe-change:**
Run \`safe-change\` from **pi-agent-codebase-workflows** (PriNova) BEFORE proceeding.

**If user chooses "No":** proceed directly to Phase 2 (Strategic Context).

**If user selects no workflow option:** proceed to Phase 2b (domain detection may offer direct skill routing),
but safe-change is still offered.

### Auto-chaining rules

| User selection | Phases that run automatically |
|---|---|
| Shape Up only | Shape Up → **Plan Critique** → **Review Gate** → Tech Planning (no gate) → Execution |
| Interface only | Interface Brain. → **Plan Critique** → **Review Gate** → Tech Planning (no gate) → Execution |
| Shape Up + Interface | Shape Up → Interface Brain. → **Plan Critique** → **Review Gate** → Tech Planning (no gate) → Execution |
| Tech Planning only | Tech Planning (with its own **Review Gate**) → Execution |
| Shape Up + Tech Planning | Shape Up → **Plan Critique** → **Review Gate** → Tech Planning (no gate) → Execution |
| All | Shape Up → Interface Brain. → **Plan Critique** → **Review Gate** → Tech Planning (no gate) → Execution |

**Plan Critique** and **Review Gate** never appear as options — they are automatic.

**Review Gate** never duplicates: comes from Plan Critique or embedded in Tech Planning (standalone).
