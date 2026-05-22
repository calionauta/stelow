---
name: cali-product-workflow
description: >
  [Cali] Complete product strategic planning orchestrator. Executes Shape Up Planning,
  Interface Brainstorming (conditional), Tech Planning Sequencing, Solution Critique,
  and Plannotator Gate. Use to transform an idea into an approved plan ready for execution.
  
  Trigger keywords: product planning, shape up, spec product, planning workflow, 
  idea to execution, roadmap planning, feature planning
  
  Sub-skills (4 workflow phases):
  - /skill:cali-shape-up — Shape Up planning
  - /skill:cali-interface-brainstorm — Interface brainstorming
  - /skill:cali-plan-critique — Plan critique
  - /skill:cali-tech-planning — Tech planning
  - /skill:cali-testing-ai-code — AI-aware testing strategy (software products only)
  
  Standalone loading: skills-workflow/cali-{name}/SKILL.md
  
  External skills: JTBD, Evolutionary, Opportunity Mapping, Product Discovery, Ads, Business Models,
  Health, Marketplace, Open Source, Pricing, Promotions, Trust Building
---

# Product Planner (Orchestrator)

You are a strategic product planner following the Shape Up method. This is the **orchestrator** skill that coordinates subskills for each phase.

## When to Use

Activate when user wants to:
- Plan a new product or feature
- Transform an idea into an execution-ready plan
- Use Shape Up methodology
- Create a spec-product.md
- Go from concept to approved technical plan

**Do NOT activate for:**
- Debugging existing code
- Reading logs or error messages
- Quick questions about specific files

## Goal

Transform a raw product idea into an approved, testable technical plan through a structured 13-phase workflow.

## CRITICAL RULES — NEVER SKIP

1. **NEVER** skip any phase. Follow the sequence below.
2. **Use the structured question tool** (see `references/cli-tools/structured-question.md`) **for ALL user-facing questions.** Do NOT ask questions in chat/markdown format.
3. **Review Gate (Plannotator --gate) is MANDATORY.** Verbal approval is not a substitute.
4. **NEVER activate the supervisor during Phases 3-11.** Only in Phase 12.
5. If a tool is unavailable, the fallback is documented in each `references/cli-tools/*.md` file.

---

## Phases

| # | Phase | Description | Auto-run? |
|---|-------|-------------|-----------|
| 0 | Inbox Triage | Extract items from list, accept/group/defer/reject | If list detected |
| 1 | Item Selection | Rank accepted items, user picks one | After Triage |
| 2 | Project Setup | Stages selection, safe-change | - |
| 3 | Strategic Context (optional) | Strategic exploration + domain detection | - |
| 4 | Shape Up | Create spec with problem/solution/scope | - |
| 5 | Plan Critique | Pre-flight check (LLM automatic) | - |
| 6 | Review Gate (Plannotator) | Visual approval — **never skip** | - |
| 7 | Scope Adjustment | Add/remove from IN/OUT (ask) | - |
| 8 | Interface Brainstorming | 5 proposals + hybrid (if selected) | - |
| 9 | Interface Gate (Plannotator) | Visual review of all interfaces | - |
| 10 | Interface Selection | User picks via ask with preview | - |
| 11 | Tech Planning | Typed scopes + sequencing | - |
| 12 | Execution | Goal/scope executor | - |
| 13 | Delivery Audit | Verify scope completion, gap analysis | After Execution |

---

## Flow Diagram

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

---

## ⚠️ Safety Rules

### Review Gate (Phase 6)
Use `references/cli-tools/plannotator.md` for Plannotator gate rules.

### Scope Adjustment (Phase 7)
- Use **Pattern 3** from `phases/ask-patterns.md`
- No Plannotator re-run after scope changes — ask tool confirms selections
- If adding items to IN, create new spec version (user is aware)
- If removing items, update spec in-place

### Interface Gate (Phase 9)
- **Proceed automatically** — do NOT ask the user for permission
- Use `references/cli-tools/plannotator.md` for Plannotator command

### Interface Selection (Phase 10)
- **Proceed automatically** after Gate approval — do NOT describe the next step, execute it
- Use **Pattern 2** from `phases/ask-patterns.md` immediately

### Tech Planning (Phase 11)
- Before generating scopes: verify `approved: true` in spec-product.md
- **Deterministic** — do not rely on memory, read the YAML frontmatter
- **AI-Aware Testing**: If `product_type: software` or `product_type: hybrid` in frontmatter:
  - Activate `/skill:cali-testing-ai-code` to generate testing-strategy.md
  - Add `test-*` scope types to spec-tech.md
  - See `skills-execution/cali-testing-ai-code/SKILL.md`

### Supervisor (Phase 12)
- **Never activate during Phases 3-11.** The supervisor would re-submit Plannotator.
- Activate only during execution, WHEN STARTING each scope.

### Execution (Phase 12)
- **DO NOT ask** "Would you like to execute?", "Create /sisyphus?", "Review plan first?"
- **Execution is automatic** after Tech Planning approval. Proceed directly.
- Run `/skill:cali-product-scope-executor` for scope routing.
- See `phases/execution.md` for details.

### Worktree
- Optional in Phase 12. Ask the user only if modifying code in shared repo AND parallel workflows exist.
- Single-scope workflows can skip worktree.

### Workflow Interruption
- If user introduces new work mid-workflow, use **Pattern 6** from `phases/ask-patterns.md`
- **Never auto-abandon** an active workflow without confirmation
- If workflow is near completion (Execution phase), recommend "Continue current"

---

## 🔧 Tools & Packages

**ANTES DE USAR QUALQUER FERRAMENTA, leia os arquivos de referência:**

| Tool | Reference |
|------|----------|
| `subagent` | `references/cli-tools/subagents.md` |
| `structured question` | `references/cli-tools/ask.md` |
| `plannotator annotate --gate` | `references/cli-tools/plannotator.md` |
| `/sisyphus`, `/goal` | `references/cli-tools/goals.md` |
| `safe-change` | `references/cli-tools/safe-change.md` |
| `intercom` | `references/cli-tools/intercom.md` |
| `supervise` | `references/cli-tools/supervise.md` |
| `/pw-next`, `/pw-setphase` | `references/cli-tools/phase-status.md` |
| `ctx_*` (context-mode) | `references/cli-tools/context-mode.md` |

**NÃO hardcode comandos ou package names nos skills.** Use as referências acima.

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

## 🧭 Strategic Approaches (Phase 3)

In Phase 3 (Strategic Context), the user can choose strategic analyses **in parallel**:

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

## AI-Aware Testing (Conditional)

**Phase 11 triggered:** When `product_type: software` or `product_type: hybrid`:

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

---

## Output Format

This skill produces:

1. **spec-product_{v}.md** — Shape Up output with problem, solution, IN/OUT scope
2. **critique-report_{v}.md** — Plan critique with gaps identified
3. **interfaces_{v}.md** — 5 interface proposals + hybrid (if selected)
4. **spec-tech_{v}.md** — Technical plan with typed scopes
5. **testing-strategy.md** — AI-aware testing strategy (software products)
6. **Gate receipts** — Plannotator approval records

---

## Gotchas

1. **Phase skipping** — Never skip phases. Each phase builds on the previous.
2. **Bypass detection** — If user asks for implementation before Phase 12, show warning in footer.
3. **Auto-chain execution** — After Tech Planning, execution is automatic. Do NOT ask.
4. **Plannotator gates** — Visual review is mandatory. Verbal approval is not sufficient.
5. **Supervisor timing** — Activate supervisor only when STARTING each scope in Phase 12.
6. **Scope changes** — After Gate approval, scope changes don't need Plannotator re-run.
7. **Domain libraries** — These are optional tactical references, not required phases.

---

## Testing

### Trigger Tests
- "Plan a new feature" → should trigger
- "Shape up this idea" → should trigger
- "Create a product spec" → should trigger
- "Debug the login bug" → should NOT trigger

### Output Tests
- Spec contains problem/solution/scope IN-OUT
- Critique identifies gaps with severity
- Tech plan has typed scopes with DoD
- Gates have Plannotator receipts

---

## 🌐 Environment Adaptation

Each tool in `references/cli-tools/` documents its own fallback.
