---
name: cali-product-workflow
description: >
  [Cali] Complete product strategic planning orchestrator. Executes Shape Up Planning,
  Interface Brainstorming (conditional), Tech Planning Sequencing, Solution Critique,
  and Plannotator Gate. Use to transform an idea into an approved plan ready for execution.
  
  This orchestrator delegates to subskills:
  - /skill:cali-shape-up - Shape Up planning
  - /skill:cali-interface-brainstorm - Interface brainstorming
  - /skill:cali-plan-critique - Plan critique
  - /skill:cali-tech-planning - Tech planning
  
  Embedded external skills:
  - Audit/Critique frameworks (impeccable ecosystem)
  - JTBD Framework (cali-job-to-be-done-framework)
  - Evolutionary Principles (cali-evolutionary-principles)
  - Opportunity Mapping (cali-opportunity-mapping)
  - Short-Cycle Product Method (cali-short-cycle-product)
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

| # | Phase | Delegation |
|---|-------|-----------|-------------------|
| 1 | **Project Setup** | `phases/setup.md` |
| 2 | **Strategic Context** (optional) | `phases/context.md` |
| 3 | **Shape Up Planning** | `/skill:cali-shape-up` |
| 4 | **Interface Brainstorming** | `/skill:cali-interface-brainstorm` |
| 5 | **Plan Critique** | `/skill:cali-plan-critique` |
| 6 | **Review Gate** | `phases/gate.md` |
| 7 | **Tech Planning** | `/skill:cali-tech-planning` |
| 8 | **Supervisor + Execution** | `phases/execution.md` |

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

---

## ⚠️ Safety Rules

### Review Gate (Phase 6)
1. **Verbal approval in chat does NOT replace the gate.** Even if the user says "approved", "go ahead" — run Plannotator with --gate.
2. **Plannotator with --gate is MANDATORY.** Only proceed AFTER "approved".
3. After approval: stamp the frontmatter (`approved: true`) + create receipt.
4. Spec is frozen after approval. Future changes = `spec-product_{v+1}.md` + new gate.

### Tech Planning (Phase 7)
- Before generating scopes: verify `approved: true` in spec-product.md
- **Deterministic** — do not rely on memory, read the YAML frontmatter

### Supervisor (Phase 8)
- **Never activate during Phases 3-7.** The supervisor would re-submit Plannotator.
- Activate only during execution, WHEN STARTING each scope.

### Worktree
- Optional in Phase 8. Ask the user.
- Workflows with 1 scope or no code changes can skip.

---

## 🌐 Environment Adaptation

If a mentioned tool is not available, check `references/environment-adaptation.md`.