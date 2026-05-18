# Plan: Refatorar cali-product-workflow em Subskills

**Date:** 2026-05-18  
**Status:** Draft v3 - Technical Implementation Plan  
**Author:** Cali (pi-agent)

---

## 🎯 Objective

Transformar o `cali-product-workflow` monolith em **subskills independentes** carregáveis individualmente, mantendo 100% das instruções, referências e conhecimento.

---

## 🔍 Research Summary

### How Skills Work (pi.dev)

1. **Discovery:** Pi scans `skills/` dirs recursively for `SKILL.md` files
2. **Loading:** At startup, only `name` + `description` enter context
3. **Activation:** On match, full `SKILL.md` is loaded via `read` tool
4. **References:** Use relative paths from skill root

### Chaining Patterns

- **Horizontal (rpiv-pi):** Sequential chain, each skill produces artifact for next
- **Vertical (Proposed):** Same workflow, phases are independently loadable

**Decision:** Maintain **vertical** with orchestrator for maximum flexibility while preserving auto-chaining.

---

## 📋 Architecture

```
skills/
├── workflow/
│   ├── cali-shape-up/              # NEW: Standalone Shape Up
│   ├── cali-interface-brainstorm/  # NEW: Standalone Interface
│   ├── cali-plan-critique/         # NEW: Standalone Critique
│   ├── cali-tech-planning/         # NEW: Standalone Tech Planning
│   └── cali-product-workflow/      # Orchestrator
│
├── strategic-analysis/             # Already standalone (keep as-is)
│   └── ...
│
└── domain-libraries/              # Already standalone (keep as-is)
    └── ...
```

---

## 🛠 To-Do List (pi.dev compatible)

### Phase 1: Preparation & Inventory

- [ ] **TODO 1.1:** Create complete inventory of ALL files in `cali-product-workflow/`
- [ ] **TODO 1.2:** Document each file's content, purpose, and cross-references
- [ ] **TODO 1.3:** Identify all cross-skill references (external skills called)

### Phase 2: Create New Skill Structures

- [ ] **TODO 2.1:** Create `cali-shape-up/` skill directory with SKILL.md + references/
- [ ] **TODO 2.2:** Create `cali-interface-brainstorm/` skill directory with SKILL.md + references/
- [ ] **TODO 2.3:** Create `cali-plan-critique/` skill directory with SKILL.md + references/
- [ ] **TODO 2.4:** Create `cali-tech-planning/` skill directory with SKILL.md + references/

### Phase 3: Migrate Content

- [ ] **TODO 3.1:** Migrate `procedures/phase-3-shape.md` + `references/shape-up/` → `cali-shape-up/`
- [ ] **TODO 3.2:** Migrate `procedures/phase-4-interface.md` + `references/interface/` → `cali-interface-brainstorm/`
- [ ] **TODO 3.3:** Migrate `procedures/phase-5-critique.md` + `references/plan-critique/` → `cali-plan-critique/`
- [ ] **TODO 3.4:** Migrate `procedures/phase-7-tech-planning.md` + `references/tech-planning/` → `cali-tech-planning/`

### Phase 4: Update Orchestrator

- [ ] **TODO 4.1:** Refactor `cali-product-workflow/SKILL.md` as orchestrator
- [ ] **TODO 4.2:** Update phase procedures to delegate to subskills
- [ ] **TODO 4.3:** Add cross-references between skills

### Phase 5: Validation & Testing

- [ ] **TODO 5.1:** Verify all cross-references work
- [ ] **TODO 5.2:** Test each skill independently
- [ ] **TODO 5.3:** Test orchestrator chain
- [ ] **TODO 5.4:** Run skill-creator validation

---

## 📦 Detailed File Inventory

### Current Structure (Source)

```
cali-product-workflow/
├── SKILL.md                        # 8695 bytes - MAIN ORCHESTRATOR
│   └── Contents:
│       - Frontmatter (name, description)
│       - Tools & Packages reference
│       - Directory Structure
│       - Strategic Approaches (Phase 2a)
│       - Domain Libraries (Phase 2b)
│       - Phase Index with auto-chaining
│       - Safety Rules
│       - Expected Output
│       - Environment Adaptation reference
│
├── procedures/                     # 8 phase procedures
│   ├── phase-1-setup.md           # Project Setup
│   ├── phase-2-context.md        # Strategic Context (uses strategic-analysis skills)
│   ├── phase-3-shape.md          # Shape Up Planning
│   ├── phase-4-interface.md      # Interface Brainstorming
│   ├── phase-5-critique.md       # Plan Critique
│   ├── phase-6-gate.md          # Review Gate (Plannotator)
│   ├── phase-7-tech-planning.md  # Tech Planning
│   └── phase-8-execution.md     # Supervisor + Execution
│
├── references/
│   ├── environment-adaptation.md  # Tool adaptation notes
│   ├── output-expectations.md     # Strong vs weak output criteria
│   ├── strategic-exploration.md   # Phase 2 context
│   │
│   ├── shape-up/                  # 6 files
│   │   ├── EXECUTION-GUIDE.md
│   │   ├── proposal-structure.md
│   │   ├── RISK-ANALYSIS.md
│   │   ├── SHAPING-COMPLETE.md
│   │   ├── SHAPING-PRINCIPLES.md
│   │   └── [implied: output-format?]
│   │
│   ├── interface/                 # 7 files
│   │   ├── archetypes.md
│   │   ├── hybrid-recommendation.md
│   │   ├── INTERFACE-CONTEXT.md
│   │   ├── INTERFACE-EVALUATION.md
│   │   ├── INTERFACE-RECONSTRUCTION.md
│   │   ├── INTERFACE-RULES.md
│   │   └── output-format.md
│   │
│   ├── plan-critique/             # 6 files
│   │   ├── audit-dimensions.md
│   │   ├── auto-resolve-rules.md
│   │   ├── CHECKLISTS.md
│   │   ├── critique-frameworks.md
│   │   ├── output-format.md
│   │   └── PLAN-CRITIQUE-CONTEXT.md
│   │
│   └── tech-planning/             # 4 files
│       ├── generation-principles.md
│       ├── SCOPES-AND-SEQUENCING.md
│       ├── TECH-CONTEXT.md
│       └── TECH-OUTPUT.md
│
└── scripts/                        # 2 files
    └── [any scripts?]
```

### Cross-Skill References (External Skills)

The current workflow EMBEDS references to these skills (in description):
1. `cali-job-to-be-done-framework` - JTBD Framework
2. `cali-evolutionary-principles` - Evolutionary Principles
3. `cali-opportunity-mapping` - Opportunity Mapping
4. `cali-short-cycle-product` - Short-Cycle Product Method
5. `cali-product-ads` - Ads
6. `cali-product-business-models` - Business Models
7. `cali-product-health` - Health
8. `cali-product-marketplace-playbook` - Marketplace Playbook
9. `cali-product-open-source` - Open Source
10. `cali-product-pricing` - Pricing
11. `cali-product-promotions` - Promotions
12. `cali-product-trust-building` - Trust Building

---

## 🔄 File Migration Mapping

### cali-shape-up/ (NEW)

| Source File | Target | Action |
|---|---|---|
| `SKILL.md` (frontmatter + body from phase-3) | `cali-shape-up/SKILL.md` | CREATE - merge frontmatter + procedure |
| `references/shape-up/*` | `cali-shape-up/references/*` | COPY |
| `references/output-expectations.md` | `cali-shape-up/references/output-expectations.md` | COPY (referenced in shape-up) |

### cali-interface-brainstorm/ (NEW)

| Source File | Target | Action |
|---|---|---|
| `SKILL.md` (frontmatter + body from phase-4) | `cali-interface-brainstorm/SKILL.md` | CREATE |
| `references/interface/*` | `cali-interface-brainstorm/references/*` | COPY |

### cali-plan-critique/ (NEW)

| Source File | Target | Action |
|---|---|---|
| `SKILL.md` (frontmatter + body from phase-5) | `cali-plan-critique/SKILL.md` | CREATE |
| `references/plan-critique/*` | `cali-plan-critique/references/*` | COPY |

### cali-tech-planning/ (NEW)

| Source File | Target | Action |
|---|---|---|
| `SKILL.md` (frontmatter + body from phase-7) | `cali-tech-planning/SKILL.md` | CREATE |
| `references/tech-planning/*` | `cali-tech-planning/references/*` | COPY |

### cali-product-workflow/ (REFACTOR as Orchestrator)

| Source | Target | Action |
|---|---|---|
| Original `SKILL.md` | Template | KEEP as reference |
| `procedures/phase-1-setup.md` | `phases/setup.md` | MOVE to new location |
| `procedures/phase-2-context.md` | `phases/context.md` | MOVE (references strategic skills) |
| `procedures/phase-3-shape.md` | DELEGATE | DELETE (now in cali-shape-up) |
| `procedures/phase-4-interface.md` | DELEGATE | DELETE (now in cali-interface-brainstorm) |
| `procedures/phase-5-critique.md` | DELEGATE | DELETE (now in cali-plan-critique) |
| `procedures/phase-6-gate.md` | `phases/gate.md` | MOVE (gate stays in workflow) |
| `procedures/phase-7-tech-planning.md` | DELEGATE | DELETE (now in cali-tech-planning) |
| `procedures/phase-8-execution.md` | `phases/execution.md` | MOVE (execution stays in workflow) |
| `references/shape-up/` | MIGRATED | DELETE (moved to cali-shape-up) |
| `references/interface/` | MIGRATED | DELETE (moved to cali-interface-brainstorm) |
| `references/plan-critique/` | MIGRATED | DELETE (moved to cali-plan-critique) |
| `references/tech-planning/` | MIGRATED | DELETE (moved to cali-tech-planning) |
| `references/environment-adaptation.md` | KEEP | KEEP (orchestrator needs it) |
| `references/output-expectations.md` | KEEP | KEEP (orchestrator references) |
| `references/strategic-exploration.md` | KEEP | KEEP (context phase uses it) |

---

## ⚠️ Risk Analysis & Mitigation

### Risk 1: Cross-Skill References Break

**Risk:** References like `../cali-shape-up/references/SHAPING-PRINCIPLES.md` may not resolve correctly.

**Mitigation:**
- Use absolute paths in skill content when referencing external skills
- Example: `{skill_root}/../cali-shape-up/references/...` or use `/skill:cali-shape-up` to load
- Test each reference after migration

### Risk 2: Artifact Paths Inconsistent

**Risk:** Each skill writes to different paths, breaking workflow state.

**Mitigation:**
- Keep artifact path convention in orchestrator
- All skills write to `.cali-product-workflow/{date}/{_dir}/`
- Orchestrator defines path; subskills follow it
- Document path convention in each skill

### Risk 3: Information Loss in Migration

**Risk:** Subtle instructions, examples, or nuances lost during file copy.

**Mitigation:**
- Use diff tool to compare original vs migrated content
- Create migration checklist with line counts
- Verify every section appears in new location
- Test workflow end-to-end after migration

### Risk 4: Skill Discovery Conflicts

**Risk:** Multiple skills with similar names or conflicting descriptions.

**Mitigation:**
- Use distinct skill names: `cali-shape-up`, `cali-interface-brainstorm`, etc.
- Ensure descriptions are unique and specific
- Run `pi skill list` after installation to verify

### Risk 5: Version Synchronization

**Risk:** Shared concepts diverge across skills over time.

**Mitigation:**
- Keep shared state (scope types, output formats) in orchestrator
- Subskills reference orchestrator for cross-cutting concerns
- Document "source of truth" for each concept

---

## ✅ Validation Checklist

### Pre-Migration
- [ ] Backup original `cali-product-workflow/` directory
- [ ] Document line counts for all original files
- [ ] List all cross-references in original files

### Post-Migration
- [ ] Verify each skill has valid SKILL.md with frontmatter
- [ ] Verify references/ directory in each new skill
- [ ] Run skill validation: `skills-ref validate ./my-skill`
- [ ] Test skill loading: `/skill:cali-shape-up`
- [ ] Test skill chaining via orchestrator
- [ ] Diff original vs migrated file contents
- [ ] Verify cross-skill references resolve
- [ ] Test artifact paths are consistent

### Full Workflow Test
- [ ] Run full `cali-product-workflow` orchestrator
- [ ] Verify all 8 phases execute correctly
- [ ] Verify artifact outputs are correct
- [ ] Verify Plannotator gate works

---

## 📝 Double-Check Verification

### SKILL.md Content Verification

Original `cali-product-workflow/SKILL.md` sections that MUST appear:

| Section | Appears In | Verification |
|---|---|---|
| Frontmatter (name, description) | Orchestrator + each subskill | Check frontmatter |
| Tools & Packages table | Orchestrator | Check orchestrator |
| Directory Structure | Orchestrator | Check orchestrator |
| Phase Index | Orchestrator | Check orchestrator |
| Auto-chaining rules | Orchestrator | Check orchestrator |
| Safety Rules | Orchestrator | Check orchestrator |
| Expected Output format | Orchestrator | Check orchestrator |
| Environment Adaptation | Orchestrator | Check orchestrator |

### Procedure Content Verification

Each phase procedure MUST include:

| Phase | Must Have |
|---|---|
| Setup | Directory creation, artifact structure |
| Context | Strategic analysis skill references |
| Shape Up | Reference reading, scope adjustment |
| Interface | Interface archetypes, evaluation criteria |
| Critique | Audit dimensions, checklists |
| Gate | Plannotator --gate command |
| Tech Planning | Scope types, sequencing, executor routing |
| Execution | Supervisor activation, worktree |

### Reference Content Verification

Each reference directory MUST contain all original files:

| Directory | Files |
|---|---|
| shape-up/ | EXECUTION-GUIDE, proposal-structure, RISK-ANALYSIS, SHAPING-COMPLETE, SHAPING-PRINCIPLES |
| interface/ | archetypes, hybrid-recommendation, INTERFACE-CONTEXT, INTERFACE-EVALUATION, INTERFACE-RECONSTRUCTION, INTERFACE-RULES, output-format |
| plan-critique/ | audit-dimensions, auto-resolve-rules, CHECKLISTS, critique-frameworks, output-format, PLAN-CRITIQUE-CONTEXT |
| tech-planning/ | generation-principles, SCOPES-AND-SEQUENCING, TECH-CONTEXT, TECH-OUTPUT |

---

## 🚀 Implementation Priority

1. **High Priority:** Create subskill structures (TODO 2.x)
2. **High Priority:** Migrate content (TODO 3.x)
3. **High Priority:** Update orchestrator (TODO 4.x)
4. **Medium Priority:** Validation (TODO 5.x)

---

**Questions for Review:**
1. Does this technical plan cover all aspects needed for migration?
2. Are the risks adequately mitigated?
3. Is the validation checklist comprehensive enough?