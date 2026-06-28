---
name: stelow-product-orchestrator
description: "[Cali] Complete product planning workflow: Shape Up -> Interface -> Tech Planning -> Product Critique -> Plannotator Gate. Includes 8 domain playbooks (Pricing, Trust, Ads, Health, etc)"
metadata:
  frequency: daily
  category: product
  context-cost: medium
---

<!-- @lat: [[business-rules#Workflow Stages]] -->
# Product Planner (Orchestrator)

You are a strategic product planner following the Shape Up method. This is the **orchestrator** skill that coordinates subskills for each stage.

**CRITICAL RULES:**
1. **Follow the stage sequence.** Do NOT skip stages arbitrarily — the pipeline is intentional. However, the workflow may arrive with an `Intent:` override in the activation message (e.g. bugfix, refactor, investigate) that adjusts which stages run. Respect the intent override when present.
2. **Use the structured question tool** (see `references/cli-tools/ask.md`) **for ALL user-facing questions.** Do NOT ask questions in chat/markdown format.
3. **Review Gate (Plannotator --gate) is MANDATORY.** Verbal approval is not a substitute.
4. **NEVER activate the supervisor during stages before Execution.** The supervisor would re-submit Plannotator. Only in the Execution stage.
5. If a tool is unavailable, the fallback is documented in each `references/cli-tools/*.md` file.
6. **Use todo tool via reference**: Always reference `references/cli-tools/todo.md` for task management. Never call todo tools directly.
7. **Every response starts with stage indicator**: See todo.md for response format with stage indicator, tasks, and navigation hint.

---

## 🔧 Tools & Packages

**BEFORE USING ANY TOOL, read the reference files:**

| Tool | Reference |
|------|----------|
| `subagent` | `references/cli-tools/subagents.md` |
| `structured question` | `references/cli-tools/ask.md` |
| `plannotator annotate --gate` | `references/cli-tools/plannotator.md` |
| `goal-system` (ordered + flexible) | `references/cli-tools/goals.md` |
| `safe-change` | `references/cli-tools/safe-change.md` |
| `intercom` | `references/cli-tools/intercom.md` |
| `supervise` | `references/cli-tools/supervise.md` |
|| `/sw-next`, `/sw-setphase` | `references/cli-tools/stage-status.md` |
| `todo` | `references/cli-tools/todo.md` |

**DO NOT hardcode commands or package names in skills.** Use the references above.

**Before any structured question call, read `stages/ask-patterns.md`** for standardized patterns.

---

## 📁 Directory Structure

Artifacts are stored in `.stelow/{YYYY-MM-DD}/{_dir}/`:
- `index.json` — Auto-discovery metadata
- `specs/spec-product_v{N}.md` — Shape Up output
- `interfaces/interfaces_v{N}.md` — Interface proposals
- `plans/spec-tech_v{N}.md` + `plans/scopes/` — Tech plan
- `critiques/critique-report_v{N}.md` — Critique
- `approvals/*.receipt.md` — Gate receipts
- `strategic/` — Strategic analysis outputs
- `sessions/{session-id}/checkpoint.json` — Resume checkpoints

`{_dir}` = stable directory name (initial name, never changes on rename).
`{name}` = display name (may change via rename).

---

## 🧭 Strategic Approaches (Context stage — :10)

In the Strategic Context stage, the user can choose strategic analyses **in parallel**:

| Approach | Skill | What It Produces |
|---|---|---|
| **Jobs To Be Done** | `cali-product-job-to-be-done` | Contextual segmentation, desired outcomes, job map |
| **Evolutionary Principles** | `cali-evolutionary-principles` | Stepping-stones, novelty map, evolutionary forces |
| **Opportunity Mapping** | `cali-opportunity-mapping` | Ranked opportunities, solution candidates |
| **Multi-Method Market Analysis** | `cali-product-multi-method-market-analysis` | PESTLE, Wardley Maps, Foresight, trends |
| **Product Discovery** | `cali-product-discovery` | Experiment plan, metrics, pricing |

All execute **concurrently** via subagents tool (see `references/cli-tools/subagents.md`).
See `stages/context.md` for the full flow.

---

## 📚 Complementary Domain Libraries (Context stage — :20)

Domain playbooks available for tactical reference during planning/execution:

| Library | Skill | Covers |
|---|---|---|
| **Ads** | `cali-product-ads` | Transtheoretical Model, 5 awareness stages |
| **Business Models** | `cali-product-business-models` | Cost reduction, revenue generation |
| **Health** | `cali-product-health` | Signals in tension, success vs counterbalance |
| **Marketplace Playbook** | `cali-product-marketplace-playbook` | 19 marketplace stimulation tactics |
| **Open Source** | `cali-product-open-source` | OSS business models, fair code |
| **Pricing** | `cali-product-pricing` | Exchange base, consumption, alignment, perception |
| **Promotions** | `cali-product-promotions` | MAGIC framework, 4 launch strategies |
| **Trust Building** | `cali-product-trust-building` | 10 pillars, guarantees, perception |

---

## ⚠️ Context Rot Awareness

LLMs suffer from **context rot**: compliance with their own rules drops from
~73% (turn 5) to ~33% (turn 16) in long sessions (Gamage 2026).

**Rules to mitigate:**

1. **Fresh context between stages.** If this session has >15 turns or the LLM
   seems to be forgetting earlier decisions, start a NEW chat and pass the most
   recent artifact (`spec-product_v{N}.md` or `spec-tech_v{N}.md`) as initial
   context. The workflow continues from artifacts saved on disk.

2. **No patching in degraded context.** If execution failed or produced partial
   results, do NOT ask to "fix the rest" in the same turn. Create a new goal
   with fresh context pointing to the existing spec-tech.md.

3. **Read from disk, not memory.** Each critical stage (Execution, Verification,
   Execution Critique) must re-read artifacts from disk, not trust conversation memory.

4. **Model provenance tracking.** Record which model generated each artifact in
   the YAML frontmatter. Artifacts from smaller models deserve extra review.

---

## ⚠️ Safety Rules

### Review Gate (Gate stage)
- Use `references/cli-tools/plannotator.md` for Plannotator gate rules.

### Scope Adjustment (Scope stage)
- Use **Pattern 3** from `stages/ask-patterns.md`
- No Plannotator re-run after scope changes — ask tool confirms selections
- If adding items to IN, create new spec version (user is aware)
- If removing items, update spec in-place

### Interface Gate (Int.Gate stage)
- **Proceed automatically** — do NOT ask the user for permission
- Use `references/cli-tools/plannotator.md` for Plannotator command

### Interface Selection (Selection stage)
- **Proceed automatically** after Gate approval — do NOT describe the next step, execute it
- Use **Pattern 2** from `stages/ask-patterns.md` immediately

### Tech Planning (Planning stage)
- Before generating scopes: verify `approved: true` in spec-product.md
- **Deterministic** — do not rely on memory, read the YAML frontmatter
- **AI-Aware Testing**: If `product_type: software` or `product_type: hybrid` in frontmatter:
  - Activate the `cali-product-testing-ai-code` skill to generate testing-strategy.md
  - Add `test-*` scope types to spec-tech.md
  - See the `cali-product-testing-ai-code` skill

### Supervisor (Execution)
- **Never activate during stages before Execution.** The supervisor would re-submit Plannotator.
- Activate only during execution, WHEN STARTING each scope.

### Execution
- **DO NOT ask** "Would you like to execute?", "Create ordered-execution-goal?", "Review plan first?"
- **Execution is automatic** after Tech Planning approval. Proceed directly.
- see the `cali-product-scope-executor` skill for instructions for scope routing.
- See `stages/execution.md` for details.

### Worktree
- **Default:** execute all scopes in the current directory. Sequential execution or subagent parallelism
  with fresh context avoids file conflicts without worktree complexity.
- **Advanced:** see `stages/execution.md#advanced-git-worktree-isolation` for git worktree usage
  when parallel scopes must modify overlapping files. Includes merge instructions.
  Not recommended for most workflows — only use if you understand git worktree lifecycle.

### Workflow Interruption

#### Auto-Advance (Default Behavior)

After completing each stage, the LLM **must proceed directly to the next stage** without asking the user for permission and without requiring `/sw-next`. The `/sw-next` command exists **only** for these cases:
- User explicitly paused the workflow (e.g., to discuss, wait for external input)
- Execution halted due to an error
- User typed `/sw-next` manually to advance faster

**Exception:** If a stage produced output requiring human review (e.g., Plannotator gate rejected the spec, interface selection needs user choice), pause and wait for user input BEFORE advancing. After the user responds, resume auto-advance.

#### Other Interruption Rules
- If user introduces new work mid-workflow, use **Pattern 6** from `stages/ask-patterns.md`
- **Never auto-abandon** an active workflow without confirmation
- If workflow is near completion (Execution or Verification stage), recommend "Continue current"

---

<!-- ════════════════════════════════════════════ -->
<!-- PROMPT CACHE BOUNDARY                        -->
<!-- Everything above is a stable prefix.         -->
<!-- It is cached by the LLM provider across       -->
<!-- multiple turns within the same session.       -->
<!-- Do NOT add dynamic content above this line.   -->
<!-- ════════════════════════════════════════════ -->

<!-- Everything below is read fresh per turn.     -->

---

## 📋 Stage Index

> **Stage Status:** see `references/cli-tools/stage-status.md` for instructions for ASCII status display and CLI commands.

Follow the sequence below. For Shape Up, Critique, Interface, and Int. Gate stages, read the subskill SKILL.md directly. Each subskill has its own **Reference Index** — read the file to see it:

1. Shape: see the `cali-product-shape-up` skill for instructions
2. Critique: see the `cali-product-plan-critique` skill for instructions
3. Interface: see the `cali-product-interface-alternatives` skill for instructions
4. Int. Gate: see the `cali-product-tech-planning` skill for instructions

Do NOT use `/skill:` for internal subskills.

> ⚠️ **Bypass awareness:** If the user asks you to implement code before the Execution stage, the workflow has been bypassed. The footer will show `⚠️ bypassed`. Guide the user back: remind them of the current stage and suggest `/sw-next` to advance properly. Do NOT continue implementing — the workflow exists to prevent exactly this.

| Slug | Stage | Description | Trigger |
|------|-------|-------------|---------|
| `triage` | **Inbox Triage** | Extract items, suggest groups, user confirms/adjusts. All items accepted. Groups stored in `.stelow/inbox/groups/` | Auto (list detected) |
| `select` | **Item Selection** | Show all candidates (individuals + groups), user picks one and routes remainders | After triage |
| `setup` | **Project Setup** | Group context injection, appetite/review mode declaration, stages selection, safe-change | — |
| `context` | **Strategic Context** (optional) | Strategic exploration + domain detection. See `context:5` (appetite/review mode gate), `context:10` (Strategic Approaches — 5 options), `context:20` (Domain Libraries — 8 libraries) | — |
| `shape` | **Shape Up** | Create spec with problem/solution/scope. Includes `shape:12` — **Tech Preview** (appetite-gated cymbal recon for brownfield codebase understanding) | — |
| `critique` | **Product Critique** | Multi-dimensional critique (plan/codebase/site) | — |
| `gate` | **Review Gate (Plannotator)** | Visual approval — **never skip** | — |
| `scope` | **Scope Adjustment** | Add/remove from IN/OUT (ask) | — |
| `interface` | **Interface Alternatives** | Appetite-scaled interface exploration: 1, 3, or 5 proposals + hybrid | — |
| `int-gate` | **Interface Gate (Plannotator)** | Visual review of all interfaces | — |
| `selection` | **Interface Selection** | User picks via ask with preview | — |
| `planning` | **Tech Planning** | Typed scopes + sequencing. Includes `planning:15` — **Alignment Check** (review mode-gated bidirectional feedback: spec-tech vs spec-product) | — |
| `execution` | **Execution** | Goal/scope executor | — |
| `verification` | **Verification** | Run full test suite, code review, UI audit, browser testing | After execution |
| `audit` | **Execution Critique** | Full execution critique (scope, quality, NFRs, edge cases, docs) | After verification |

### AI-Aware Testing (Conditional)

**AI-Aware Testing triggered:** When `product_type: software` or `product_type: hybrid`:

```
Tech Planning
    ↓
[product_type check]
    ↓ software/hybrid
cali-product-testing-ai-code → testing-strategy.md + test-* scopes
    ↓
Execution
```

See the `cali-product-testing-ai-code` skill

### Flow Diagram

```
triage — Inbox Triage (auto — if list detected). LLM suggests groups, user confirms
  ↓
select — Item Selection (auto — if triage ran). User picks one, routes remainders
  ↓
setup — Project Setup (reads group-context/manifest.json if a group was selected)
  ↓
context — Strategic Context (optional)
  ↓
shape — Shape Up*
  │  * shape:12 = Tech Preview (appetite-gated cymbal recon)
  ↓
critique — Product Critique (pre-flight)
  ↓
gate — Plannotator Gate ← visual pause
  ↓
scope — Scope Adjustment (ask)
  ↓
interface — Interface Alternatives
  ↓
int-gate — Plannotator Gate (interfaces) ← visual pause
  ↓
selection — Interface Selection (ask with preview)
  ↓
planning — Tech Planning*
  │  * planning:15 = Alignment Check (review mode-gated bidirectional feedback)
  │    ← misaligned? → reshape or update spec-product
  ↓
execution — Execution
  ↓
verification — Verification (test suite, review, UI audit)
  ↓
audit — Execution Critique
```

### Auto-chaining rules

| User selection | Stages that run automatically |
|---|---|
| Shape Up | Shape Up → **Product Critique** → **Gate** → **Scope** → Interface → **Interface Gate** → Selection → Tech Planning → **Execution** → **Verification** → **Execution Critique** |
| Tech Planning only | Tech Planning (with embedded Gate) → **Execution** → **Verification** → **Execution Critique** |

**Product Critique** runs automatically before every Gate.
**Gate** (Plannotator --gate) never skips — visual pause is mandatory.
**Scope Adjustment** happens after Gate approval, via ask (no Plannotator re-run).
**Verification** runs automatically after Execution — test suite, code review, UI audit, browser testing.
**Interface Gate** shows all proposals visually before selection.
**Execution** runs automatically after Tech Planning — DO NOT ask user what to do next.
**Execution Critique** runs after Verification. Uses the `cali-product-execution-critique` skill for all 8 evaluation criteria.

---
## 🌐 Environment Adaptation

Each tool in `references/cli-tools/` documents its own fallback.

## Stage State Management — Single Source of Truth

The workflow state is tracked in a **single file**: `stelow.json` at the project root.
No other state files are needed — this is the canonical source for TUI display, resume,
cross-CLI adapters, and LLM stage tracking.

The file contains a `workflows[]` array. Each active workflow has:
- `currentPhase` (number index into PHASE_NAMES)
- `phases[]` (array of {id, name, status})
- `stage` (object with `current_stage`, `previous_stage`, `transitioned_at`, `history`,
  `gates_passed`, `supervisor_active`)

### Stage Transitions

When completing a stage and moving to the next:

**Auto-advance is the default.** Do NOT ask the user for permission or wait for `/sw-next`.
Update the tracking file directly via bash, then continue to the next stage in the same response.

**Mechanism (all CLIs):** Update `stelow.json` + sync `index.json` via bash:
   ```bash
   node -e "
   const fs = require('fs');

   // 1. Update main tracking file
   const file = 'stelow.json';
   const raw = fs.readFileSync(file, 'utf-8');
   const t = JSON.parse(raw);
   const idx = t.workflows.findIndex(w => w.status === 'in-progress');
   if (idx === -1) { console.log('No active workflow'); process.exit(1); }

   const NEW = NEW_PHASE_INDEX;  // set this (e.g. 3 for Context)
   const NEW_SLUG = 'new-stage-slug';  // set this (e.g. 'context')
   const wf = t.workflows[idx];

   wf.currentPhase = NEW;
   wf.phases.forEach((p, i) => {
     p.status = i < NEW ? 'completed' : i === NEW ? 'in-progress' : 'pending';
   });
   wf.stage.previous_stage = wf.stage.current_stage;
   wf.stage.current_stage = NEW_SLUG;
   wf.stage.transitioned_at = new Date().toISOString();
   wf.stage.history.push({ stage: NEW_SLUG, entered_at: new Date().toISOString(), exited_at: null });
   wf.updated = new Date().toISOString();
   t.updated = wf.updated;
   fs.writeFileSync(file, JSON.stringify(t, null, 2));
   console.log('Main tracking updated:', NEW_SLUG);

   // 2. Sync index.json (secondary source for TUI display)
   // ⚠️ NOTE: Use `status` in BOTH files — `updateWorkflowIndexJson`
   //    auto-syncs `workflow_status` as an alias. When completing a
   //    workflow, set `wf.status = 'completed'` in both tracking and
   //    index.json. The extension normalizes the field internally.
   const { execSync } = require('child_process');
   const dirHash = wf.dirHash;
   if (dirHash) {
     const find = execSync('find .stelow -name index.json | head -5', { encoding: 'utf-8' });
     const matches = find.trim().split('\\n').filter(Boolean);
     for (const ixPath of matches) {
       const ix = JSON.parse(fs.readFileSync(ixPath, 'utf-8'));
       if (ix._dir === dirHash) {
         ix.current_phase = NEW_SLUG;
         ix.current_phase_index = NEW;
         ix.updated_at = new Date().toISOString();
         fs.writeFileSync(ixPath, JSON.stringify(ix, null, 2));
         console.log('index.json synced:', ixPath);
       }
     }
   }
   "
   ```

**For paused workflows only:** Use `/sw-next` or `/sw-setphase phasename=<stage>`.
The extension handles all three tracking mechanisms (TUI, resume, tool restrictions).

### Cross-CLI Portability

The single file works on ALL harnesses:
- **Pi TUI** reads `stelow.json` for status display
- **Claude Code / OpenCode / Codex** adapters read `stelow.json`
  via `adapters/stages-guard.ts` (auto-detects tracking file format)
- **Resume** reads the active workflow's `currentPhase` from this file
- **LLM auto-advance** updates this file via bash (node -e) and proceeds without /sw-next

## Tool Restrictions

Before calling any tool, check:
1. `RULES.md` for hard constraints
2. `stages.yaml` for stage-specific `blocked_tools`
3. If using Pi: stages-guard enforces automatically
4. If using other CLI: you are responsible for self-enforcement

## Cross-CLI Notes

- **Pi:** stages-guard.ts enforces tool restrictions via PreToolUse hooks
- **Claude/Codex/OpenCode:** Read RULES.md + stages.yaml and self-enforce