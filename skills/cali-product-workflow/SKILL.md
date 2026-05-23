---
name: cali-product-workflow
description: >
  [Cali] Complete product strategic planning orchestrator. Executes Shape Up Planning,
  Interface Brainstorming (conditional), Tech Planning Sequencing, Solution Critique,
  and Plannotator Gate. Use to transform an idea into an approved plan ready for execution.
  
  Sub-skills (4 workflow phases):
These are internal skills bundled with this package. Read the SKILL.md directly — do NOT use `/skill:` for internal subskills:

  - Shape Up planning: see `skills-workflow/cali-shape-up/SKILL.md` for instructions
  - Interface brainstorming: see `skills-workflow/cali-interface-brainstorm/SKILL.md` for instructions
  - Plan critique: see `skills-workflow/cali-plan-critique/SKILL.md` for instructions
  - Tech planning: see `skills-workflow/cali-tech-planning/SKILL.md` for instructions

  Execution skills (read directly):
  - AI-aware testing: see `skills-execution/cali-testing-ai-code/SKILL.md` for instructions
  - Scope executor: see `skills-execution/cali-product-scope-executor/SKILL.md` for instructions
  
  External skills: JTBD, Evolutionary, Opportunity Mapping, Product Discovery, Ads, Business Models,
  Health, Marketplace, Open Source, Pricing, Promotions, Trust Building
---

# Product Planner (Orchestrator)

You are a strategic product planner following the Shape Up method. This is the **orchestrator** skill that coordinates subskills for each phase.

**CRITICAL RULES — NEVER SKIP:**
1. **NEVER** skip any phase. Follow the sequence below.
2. **Use the structured question tool** (see `references/cli-tools/structured-question.md`) **for ALL user-facing questions.** Do NOT ask questions in chat/markdown format.
3. **Review Gate (Plannotator --gate) is MANDATORY.** Verbal approval is not a substitute.
4. **NEVER activate the supervisor during Phases 3-11.** Only in Phase 12.
5. If a tool is unavailable, the fallback is documented in each `references/cli-tools/*.md` file.

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
| `/pw-next`, `/pw-setphase` | `references/cli-tools/phase-status.md` |
| `ctx_*` (context-mode) | `references/cli-tools/context-mode.md` |

**DO NOT hardcode commands or package names in skills.** Use the references above.

**Before any structured question call, read `phases/ask-patterns.md`** for standardized patterns.

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

## 🧭 Strategic Approaches (Phase 2a)

In Phase 2 (Strategic Context), the user can choose strategic analyses **in parallel**:

| Approach | Skill | What It Produces |
|---|---|---|
| **Jobs To Be Done** | `cali-product-job-to-be-done` | Contextual segmentation, desired outcomes, job map |
| **Evolutionary Principles** | `cali-evolutionary-principles` | Stepping-stones, novelty map, evolutionary forces |
| **Opportunity Mapping** | `cali-opportunity-mapping` | Ranked opportunities, solution candidates |
| **Multi-Method Market Analysis** | `cali-product-multi-method-market-analysis` | PESTLE, Wardley Maps, Foresight, trends |
| **Product Discovery** | `cali-product-discovery` | Experiment plan, metrics, pricing |

All execute **concurrently** via `subagent({tasks: [...], concurrency: N})`.
See `phases/context.md` for the full flow.

---

## 📚 Complementary Domain Libraries (Phase 2b)

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

## 📋 Phase Index

> **Phase Status:** see `references/cli-tools/phase-status.md` for instructions for ASCII status display and CLI commands.

Follow the sequence below. For phases 3-5 and 7, read the subskill SKILL.md directly. Each subskill has its own **Reference Index** — read the file to see it:

1. Phase 3 (Shape): see `skills-workflow/cali-shape-up/SKILL.md` for instructions
2. Phase 4 (Critique): see `skills-workflow/cali-plan-critique/SKILL.md` for instructions
3. Phase 6 (Interface): see `skills-workflow/cali-interface-brainstorm/SKILL.md` for instructions
4. Phase 7 (Int. Gate): see `skills-workflow/cali-tech-planning/SKILL.md` for instructions

Do NOT use `/skill:` for internal subskills.

> ⚠️ **Bypass awareness:** If the user asks you to implement code before Phase 12 (Execution), the workflow has been bypassed. The footer will show `⚠️ bypassed`. Guide the user back: remind them of the current phase and suggest `/pw-next` to advance properly. Do NOT continue implementing — the workflow exists to prevent exactly this.

| # | Phase | Description | Trigger |
|---|-------|-------------|---------|
| 0 | **Inbox Triage** | Extract items from list, accept/group/defer/reject | Auto (list detected) |
| 1 | **Item Selection** | Rank accepted items, user picks one | After Triage |
| 2 | **Project Setup** | Stages selection, safe-change | — |
| 3 | **Strategic Context** (optional) | Strategic exploration + domain detection | — |
| 4 | **Shape Up** | Create spec with problem/solution/scope | — |
| 5 | **Plan Critique** | Pre-flight check (LLM automatic) | — |
| 6 | **Review Gate (Plannotator)** | Visual approval — **never skip** | — |
| 7 | **Scope Adjustment** | Add/remove from IN/OUT (ask) | — |
| 8 | **Interface Brainstorming** | 5 proposals + hybrid (if selected) | — |
| 9 | **Interface Gate (Plannotator)** | Visual review of all interfaces | — |
| 10 | **Interface Selection** | User picks via ask with preview | — |
| 11 | **Tech Planning** | Typed scopes + sequencing | — |
| 12 | **Execution** | Goal/scope executor | — |
| 13 | **Delivery Audit** | Verify scope completion, gap analysis | After Execution |

### AI-Aware Testing (Conditional)

**Phase 10 triggered:** When `product_type: software` or `product_type: hybrid`:

```
Tech Planning
    ↓
[product_type check]
    ↓ software/hybrid
cali-testing-ai-code → testing-strategy.md + test-* scopes
    ↓
Execution
```

See `skills-execution/cali-testing-ai-code/SKILL.md`

### Flow Diagram

```
Phase 0: Inbox Triage (auto — if list detected)
Phase 1: Item Selection (auto — if triage ran)
    ↓
Phase 2: Setup
    ↓
Phase 3: Strategic Context (optional)
    ↓
Phase 4: Shape Up
    ↓
Phase 5: Plan Critique (pre-flight)
    ↓
Phase 6: Plannotator Gate ← visual pause
    ↓
Phase 7: Scope Adjustment (ask)
    ↓
Phase 8: Interface Brainstorming (if selected)
    ↓
Phase 9: Plannotator Gate (interfaces) ← visual pause
    ↓
Phase 10: Interface Selection (ask with preview)
    ↓
Phase 11: Tech Planning
    ↓
Phase 12: Execution
    ↓
Phase 13: Delivery Audit
```

### Auto-chaining rules

| User selection | Phases that run automatically |
|---|---|
| Shape Up only | Shape Up → Plan Critique → **Gate** → **Scope** → Tech Planning → **Execution** → **Audit** |
| Shape Up + Interface | Shape Up → Plan Critique → **Gate** → **Scope** → Interface → **Interface Gate** → Selection → Tech Planning → **Execution** → **Audit** |
| Tech Planning only | Tech Planning (with embedded Gate) → **Execution** → **Audit** |

**Plan Critique** runs automatically before every Gate.
**Gate** (Plannotator --gate) never skips — visual pause is mandatory.
**Scope Adjustment** happens after Gate approval, via ask (no Plannotator re-run).
**Interface Gate** shows all proposals visually before selection.
**Execution** runs automatically after Tech Planning — DO NOT ask user what to do next.

---

## ⚠️ Safety Rules

### Review Gate (Phase 5)
Use `references/cli-tools/plannotator.md` for Plannotator gate rules.

### Scope Adjustment (Phase 6)
- Use **Pattern 3** from `phases/ask-patterns.md`
- No Plannotator re-run after scope changes — ask tool confirms selections
- If adding items to IN, create new spec version (user is aware)
- If removing items, update spec in-place

### Interface Gate (Phase 8)
- **Proceed automatically** — do NOT ask the user for permission
- Use `references/cli-tools/plannotator.md` for Plannotator command

### Interface Selection (Phase 9)
- **Proceed automatically** after Gate approval — do NOT describe the next step, execute it
- Use **Pattern 2** from `phases/ask-patterns.md` immediately

### Tech Planning (Phase 10)
- Before generating scopes: verify `approved: true` in spec-product.md
- **Deterministic** — do not rely on memory, read the YAML frontmatter
- **AI-Aware Testing**: If `product_type: software` or `product_type: hybrid` in frontmatter:
  - Activate `see `skills-execution/cali-testing-ai-code/SKILL.md` for instructions` to generate testing-strategy.md
  - Add `test-*` scope types to spec-tech.md
  - See `skills-execution/cali-testing-ai-code/SKILL.md`

### Supervisor (Phase 12)
- **Never activate during Phases 3-10.** The supervisor would re-submit Plannotator.
- Activate only during execution, WHEN STARTING each scope.

### Execution (Phase 12)
- **DO NOT ask** "Would you like to execute?", "Create ordered-execution-goal?", "Review plan first?"
- **Execution is automatic** after Tech Planning approval. Proceed directly.
- see `skills-execution/cali-product-scope-executor/SKILL.md` for instructions for scope routing.
- See `phases/execution.md` for details.
- **DO NOT ask** "Would you like to execute?", "Create ordered-execution-goal?", "Review plan first?"
- **Execution is automatic** after Tech Planning approval. Proceed directly.
- see `skills-execution/cali-product-scope-executor/SKILL.md` for instructions for scope routing.
- See `phases/execution.md` for details.

### Worktree
- Optional in Phase 12. Ask the user only if modifying code in shared repo AND parallel workflows exist.
- Single-scope workflows can skip worktree.
d05|
### Workflow Interruption
d05|
- If user introduces new work mid-workflow, use **Pattern 6** from `phases/ask-patterns.md`
d05|
- **Never auto-abandon** an active workflow without confirmation
d05|
- If workflow is near completion (Execution phase), recommend "Continue current"
d05|
---
d05|
## 🌐 Environment Adaptation

---

## 🌐 Environment Adaptation

Each tool in `references/cli-tools/` documents its own fallback.