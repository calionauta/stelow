---
name: cali-product-workflow
description: >
  [Cali] Complete product strategic planning orchestrator. Executes Shape Up Planning,
  Interface Brainstorming (conditional), Tech Planning Sequencing, Solution Critique,
  and Plannotator Gate. Use to transform an idea into an approved plan ready for execution.
  
  Sub-skills (4 workflow phases):
  - /skill:cali-shape-up — Shape Up planning
  - /skill:cali-interface-brainstorm — Interface brainstorming
  - /skill:cali-plan-critique — Plan critique
  - /skill:cali-tech-planning — Tech planning
  
  Standalone loading: skills-workflow/cali-{name}/SKILL.md
  
  External skills: JTBD, Evolutionary, Opportunity Mapping, Short-Cycle, Ads, Business Models,
  Health, Marketplace, Open Source, Pricing, Promotions, Trust Building
---

# Product Planner (Orchestrator)

You are a strategic product planner following the Shape Up method. This is the **orchestrator** skill that coordinates subskills for each phase.

**CRITICAL RULES — NEVER SKIP:**
1. **NEVER** skip any phase. Follow the sequence below.
2. **Review Gate (Plannotator --gate) is MANDATORY.** Verbal approval is not a substitute.
3. **NEVER activate the supervisor during Phases 3-7.** Only in Phase 8.
4. If a tool is unavailable, read `references/environment-adaptation.md`.

---

## 🔧 Tools & Packages

Keep package names **exact** — pi may have multiple extensions with the same tool name:

| Tool | Package (npm) | Usage | Modes |
|---|---|---|---|
| `subagent` | **pi-subagents** (nicobailon) | Parallel tasks | `parallel` (tasks[], concurrency), `chain`, `single` |
| `ask_user_question` | **@juicesharp/rpiv-ask-user-question** | User questions | `single` |
| `plannotator annotate --gate` | **@plannotator/pi-extension** (backnotprop) | Visual review + gate | `single` |
| `/skill:autoresearch-create` | **pi-autoresearch** (davebcn87) | Optimization loop | `single` |
| `/sisyphus`, `/goal`, `pause_goal` | **@capyup/pi-goal** | Goals with steps | `single` |
| `intercom` | **pi-intercom** (nicobailon) | Cross-session messaging | `send`, `ask` |
| `/supervise` | **pi-supervisor** (tintinweb) | Execution steering | `single` |
| `safe-change` | **pi-agent-codebase-workflows** (PriNova) | Regression check | `single` |

**Before any `ask_user_question` call, read `phases/ask-patterns.md`** for standardized patterns (supports 2-6 options with preview).

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
| **Short-Cycle Product** | `cali-product-short-cycle` | Experiment plan, metrics, pricing |

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

Follow the sequence below. For phases 3-5 and 7, delegate to subskills via `/skill:`. Each subskill has its own **Reference Index** — load the skill to see it.

| # | Phase | Description |
|---|-------|-------------|
| 1 | **Project Setup** | Stages selection, safe-change |
| 2 | **Strategic Context** (optional) | Strategic exploration + domain detection |
| 3 | **Shape Up** | Create spec with problem/solution/scope |
| 4 | **Plan Critique** | Pre-flight check (LLM automatic) |
| 5 | **Review Gate (Plannotator)** | Visual approval — **never skip** |
| 6 | **Scope Adjustment** | Add/remove from IN/OUT (ask) |
| 7 | **Interface Brainstorming** | 5 proposals + hybrid (if selected) |
| 8 | **Interface Gate (Plannotator)** | Visual review of all interfaces |
| 9 | **Interface Selection** | User picks via ask with preview |
| 10 | **Tech Planning** | Typed scopes + sequencing |
| 11 | **Execution** | Goal/scope executor |

### Flow Diagram

```
Phase 1: Setup
    ↓
Phase 2: Strategic Context (optional)
    ↓
Phase 3: Shape Up
    ↓
Phase 4: Plan Critique (pre-flight)
    ↓
Phase 5: Plannotator Gate ← visual pause
    ↓
Phase 6: Scope Adjustment (ask)
    ↓
Phase 7: Interface Brainstorming (if selected)
    ↓
Phase 8: Plannotator Gate (interfaces) ← visual pause
    ↓
Phase 9: Interface Selection (ask with preview)
    ↓
Phase 10: Tech Planning
    ↓
Phase 11: Execution
```

### Auto-chaining rules

| User selection | Phases that run automatically |
|---|---|
| Shape Up only | Shape Up → Plan Critique → **Gate** → **Scope** → Tech Planning |
| Shape Up + Interface | Shape Up → Plan Critique → **Gate** → **Scope** → Interface → **Interface Gate** → Selection → Tech Planning |
| Tech Planning only | Tech Planning (with embedded Gate) → Execution |

**Plan Critique** runs automatically before every Gate.
**Gate** (Plannotator --gate) never skips — visual pause is mandatory.
**Scope Adjustment** happens after Gate approval, via ask (no Plannotator re-run).
**Interface Gate** shows all proposals visually before selection.

---

## ⚠️ Safety Rules

### Review Gate (Phase 5)
Use `references/plannotator-rules.md` for all Plannotator gate rules, command format, and approval workflow.

### Scope Adjustment (Phase 6)
- Use **Pattern 3** from `phases/ask-patterns.md`
- No Plannotator re-run after scope changes — ask tool confirms selections
- If adding items to IN, create new spec version (user is aware)
- If removing items, update spec in-place

### Interface Gate (Phase 8)
Use `references/plannotator-rules.md` for Plannotator command. Visual review of all interface proposals before selection.

### Interface Selection (Phase 9)
- Use **Pattern 2** from `phases/ask-patterns.md`

### Tech Planning (Phase 10)
- Before generating scopes: verify `approved: true` in spec-product.md
- **Deterministic** — do not rely on memory, read the YAML frontmatter

### Supervisor (Phase 11)
- **Never activate during Phases 3-10.** The supervisor would re-submit Plannotator.
- Activate only during execution, WHEN STARTING each scope.

### Worktree
- Optional in Phase 11. Ask the user.
- Workflows with 1 scope or no code changes can skip.

---

## 🌐 Environment Adaptation

If a mentioned tool is not available, check `references/environment-adaptation.md`.