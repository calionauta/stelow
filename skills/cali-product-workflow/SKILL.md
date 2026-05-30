---
name: cali-product-workflow
description: "[Cali] Complete product planning workflow: Shape Up -> Interface -> Tech Planning -> Product Critique -> Plannotator Gate. Includes 8 domain playbooks (Pricing, Trust, Ads, Health, etc)"
metadata:
  frequency: daily
  category: product
  context-cost: medium
---

# Product Planner (Orchestrator)

You are a strategic product planner following the Shape Up method. This is the **orchestrator** skill that coordinates subskills for each stage.

**CRITICAL RULES — NEVER SKIP:**
1. **NEVER** skip any stage. Follow the sequence below.
2. **Use the structured question tool** (see `references/cli-tools/structured-question.md`) **for ALL user-facing questions.** Do NOT ask questions in chat/markdown format.
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
|| `/pw-next`, `/pw-setphase` | `references/cli-tools/stage-status.md` |
| `ctx_*` (context-mode) | `references/cli-tools/context-mode.md` |
| `todo` | `references/cli-tools/todo.md` |

**DO NOT hardcode commands or package names in skills.** Use the references above.

**Before any structured question call, read `stages/ask-patterns.md`** for standardized patterns.

---

## 📁 Directory Structure

Artifacts are stored in `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/`:
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

## 🧭 Strategic Approaches (Context stage — 2a)

In the Strategic Context stage, the user can choose strategic analyses **in parallel**:

| Approach | Skill | What It Produces |
|---|---|---|
| **Jobs To Be Done** | `cali-product-job-to-be-done` | Contextual segmentation, desired outcomes, job map |
| **Evolutionary Principles** | `cali-evolutionary-principles` | Stepping-stones, novelty map, evolutionary forces |
| **Opportunity Mapping** | `cali-opportunity-mapping` | Ranked opportunities, solution candidates |
| **Multi-Method Market Analysis** | `cali-product-multi-method-market-analysis` | PESTLE, Wardley Maps, Foresight, trends |
| **Product Discovery** | `cali-product-discovery` | Experiment plan, metrics, pricing |

All execute **concurrently** via `subagent({tasks: [...], concurrency: N})`.
See `stages/context.md` for the full flow.

---

## 📚 Complementary Domain Libraries (Context stage — 2b)

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
   Delivery Audit) must re-read artifacts from disk, not trust conversation memory.

4. **Model provenance tracking.** Record which model generated each artifact in
   the YAML frontmatter. Artifacts from smaller models deserve extra review.

---

## 📋 Stage Index

> **Stage Status:** see `references/cli-tools/stage-status.md` for instructions for ASCII status display and CLI commands.

Follow the sequence below. For Shape Up, Critique, Interface, and Int. Gate stages, read the subskill SKILL.md directly. Each subskill has its own **Reference Index** — read the file to see it:

1. Shape: see `skills/cali-product-shape-up/SKILL.md` for instructions
2. Critique: see `skills/cali-product-critique/SKILL.md` for instructions
3. Interface: see `skills/cali-product-interface-brainstorm/SKILL.md` for instructions
4. Int. Gate: see `skills/cali-product-tech-planning/SKILL.md` for instructions

Do NOT use `/skill:` for internal subskills.

> ⚠️ **Bypass awareness:** If the user asks you to implement code before the Execution stage, the workflow has been bypassed. The footer will show `⚠️ bypassed`. Guide the user back: remind them of the current stage and suggest `/pw-next` to advance properly. Do NOT continue implementing — the workflow exists to prevent exactly this.

| # | Stage | Description | Trigger |
|---|-------|-------------|---------|
| 0 | **Inbox Triage** | Extract items from list, accept/group/defer/reject | Auto (list detected) |
| 1 | **Item Selection** | Rank accepted items, user picks one | After Triage |
| 2 | **Project Setup** | Stages selection, safe-change | — |
| 3 | **Strategic Context** (optional) | Strategic exploration + domain detection | — |
| 4 | **Shape Up** | Create spec with problem/solution/scope | — |
| 5 | **Product Critique** | Multi-dimensional critique (plan/codebase/site) | — |
| 6 | **Review Gate (Plannotator)** | Visual approval — **never skip** | — |
| 7 | **Scope Adjustment** | Add/remove from IN/OUT (ask) | — |
| 8 | **Interface Brainstorming** | 5 proposals + hybrid (if selected) | — |
| 9 | **Interface Gate (Plannotator)** | Visual review of all interfaces | — |
| 10 | **Interface Selection** | User picks via ask with preview | — |
| 11 | **Tech Planning** | Typed scopes + sequencing | — |
| 12 | **Execution** | Goal/scope executor | — |
| 13 | **Verification** | Run full test suite, code review, UI audit, browser testing | After Execution |
| 14 | **Delivery Audit** | Full delivery audit (scope, quality, NFRs, edges, docs) | After Verification |

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

See `skills/cali-product-testing-ai-code/SKILL.md`

### Flow Diagram

```
Stage 0: Inbox Triage (auto — if list detected)
Stage 1: Item Selection (auto — if triage ran)
    ↓
Stage 2: Setup
    ↓
Stage 3: Strategic Context (optional)
    ↓
Stage 4: Shape Up
    ↓
Stage 5: Product Critique (pre-flight)
    ↓
Stage 6: Plannotator Gate ← visual pause
    ↓
Stage 7: Scope Adjustment (ask)
    ↓
Stage 8: Interface Brainstorming (if selected)
    ↓
Stage 9: Plannotator Gate (interfaces) ← visual pause
    ↓
Stage 10: Interface Selection (ask with preview)
    ↓
Stage 11: Tech Planning
    ↓
Stage 12: Execution
    ↓
Stage 13: Verification (test suite, review, UI audit) ← NOVO
    ↓
Stage 14: Delivery Audit (see `skills/cali-product-delivery-audit/SKILL.md`)
```

### Auto-chaining rules

| User selection | Stages that run automatically |
|---|---|
| Shape Up only | Shape Up → **Product Critique** → **Gate** → **Scope** → Tech Planning → **Execution** → **Verification** → **Audit** |
| Shape Up + Interface | Shape Up → **Product Critique** → **Gate** → **Scope** → Interface → **Interface Gate** → Selection → Tech Planning → **Execution** → **Verification** → **Audit** |
| Tech Planning only | Tech Planning (with embedded Gate) → **Execution** → **Verification** → **Audit** |

**Product Critique** runs automatically before every Gate.
**Gate** (Plannotator --gate) never skips — visual pause is mandatory.
**Scope Adjustment** happens after Gate approval, via ask (no Plannotator re-run).
**Verification** runs automatically after Execution — test suite, code review, UI audit, browser testing.
**Interface Gate** shows all proposals visually before selection.
**Execution** runs automatically after Tech Planning — DO NOT ask user what to do next.
**Delivery Audit** runs after Verification. Uses `skills/cali-product-delivery-audit/SKILL.md` for all 8 evaluation criteria.

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
  - Activate `see `skills/cali-product-testing-ai-code/SKILL.md` for instructions` to generate testing-strategy.md
  - Add `test-*` scope types to spec-tech.md
  - See `skills/cali-product-testing-ai-code/SKILL.md`

### Supervisor (Execution)
- **Never activate during stages before Execution.** The supervisor would re-submit Plannotator.
- Activate only during execution, WHEN STARTING each scope.

### Execution
- **DO NOT ask** "Would you like to execute?", "Create ordered-execution-goal?", "Review plan first?"
- **Execution is automatic** after Tech Planning approval. Proceed directly.
- see `skills/cali-product-scope-executor/SKILL.md` for instructions for scope routing.
- See `stages/execution.md` for details.
- **DO NOT ask** "Would you like to execute?", "Create ordered-execution-goal?", "Review plan first?"
- **Execution is automatic** after Tech Planning approval. Proceed directly.
- see `skills/cali-product-scope-executor/SKILL.md` for instructions for scope routing.
- See `stages/execution.md` for details.

### Worktree
- Optional in Execution stage. Ask the user only if modifying code in shared repo AND parallel workflows exist.
- Single-scope workflows can skip worktree.
d05|
### Workflow Interruption
d05|
- If user introduces new work mid-workflow, use **Pattern 6** from `stages/ask-patterns.md`
d05|
- **Never auto-abandon** an active workflow without confirmation
d05|
- If workflow is near completion (Execution or Verification stage), recommend "Continue current"
d05|
---
## 🌐 Environment Adaptation

---

## 🌐 Environment Adaptation

Each tool in `references/cli-tools/` documents its own fallback.

## Stage State Management

The current workflow stage is tracked in `.cali-product-workflow/state/current-stage.json`.

When transitioning to a new stage:
1. Read `.cali-product-workflow/state/current-stage.json` to know current stage
2. Read `stages.yaml` to validate tools allowed in new stage
3. Update `.cali-product-workflow/state/current-stage.json` with `transition()` from state-manager
4. If the new stage has `supervisor: true`, activate supervisor
5. If the new stage has `requires_approval: true`, gate before proceeding

## Tool Restrictions

Before calling any tool, check:
1. `RULES.md` for hard constraints
2. `stages.yaml` for stage-specific `blocked_tools`
3. If using Pi: stages-guard enforces automatically
4. If using other CLI: you are responsible for self-enforcement

## Cross-CLI Notes

- **Pi:** stages-guard.ts enforces tool restrictions via PreToolUse hooks
- **Claude/Codex/OpenCode:** Read RULES.md + stages.yaml and self-enforce