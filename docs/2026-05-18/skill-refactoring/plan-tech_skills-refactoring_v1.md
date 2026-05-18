# Plan: Refatorar cali-product-workflow em Subskills

**Date:** 2026-05-18  
**Status:** Draft for Plannotator Review  
**Author:** Cali (pi-agent)

---

## 🎯 Objective

Transformar o `cali-product-workflow` monolith (que referencia procedures e references internamente) em **subskills independentes** que podem ser carregadas individualmente, mantendo as mesmas capacidades mas com maior modularidade e reusabilidade.

---

## 🔍 Research Summary

### Current State

```
skills/
├── workflow/
│   └── cali-product-workflow/          # SKILL.md principal (8695 bytes)
│       ├── procedures/                 # 8 phase procedures
│       │   ├── phase-1-setup.md
│       │   ├── phase-2-context.md
│       │   ├── phase-3-shape.md
│       │   ├── phase-4-interface.md
│       │   ├── phase-5-critique.md
│       │   ├── phase-6-gate.md
│       │   ├── phase-7-tech-planning.md
│       │   └── phase-8-execution.md
│       └── references/                 # Domain references (subdivided)
│           ├── shape-up/               # 6 files
│           ├── interface/              # 7 files
│           ├── plan-critique/          # 6 files
│           ├── tech-planning/          # 4 files
│           ├── environment-adaptation.md
│           └── output-expectations.md
├── strategic-analysis/                 # 5 standalone skills
│   ├── cali-product-short-cycle/
│   ├── cali-product-opportunity-mapping/
│   ├── cali-product-job-to-be-done/
│   ├── cali-product-evolutionary-principles/
│   └── cali-product-multi-method-market-analysis/
└── domain-libraries/                  # 8 standalone skills
    ├── cali-product-ads/
    ├── cali-product-pricing/
    └── ... (6 more)
```

### How Skills Work (pi.dev)

1. **Discovery:** Pi scans `skills/` dirs recursively for `SKILL.md` files
2. **Loading:** At startup, only `name` + `description` enter context
3. **Activation:** On match, full `SKILL.md` is loaded via `read` tool
4. **References:** Use relative paths from skill root

**Key insight from Agent Skills spec:**
> "When a skill supports multiple domains/frameworks, organize by variant... Claude reads only the relevant reference file."

This suggests nested structure WITHIN a skill is the intended pattern — not splitting into separate skills.

### Chaining Patterns (rpiv-pi reference)

The rpiv-pi project demonstrates skill chaining:
```
/skill:discover → /skill:research → /skill:design → /skill:plan → /skill:implement
```

Each skill produces an artifact consumed by the next. This is a **horizontal** chain (sequential), different from our **vertical** phases within one workflow.

---

## 🚀 Proposed Architecture

### Option A: Subskills as Separate Skill Directories

Create independent skills that reference each other:

```
skills/
├── workflow/
│   ├── cali-shape-up/              # NEW: Independent Shape Up skill
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   ├── SHAPING-PRINCIPLES.md
│   │   │   ├── proposal-structure.md
│   │   │   └── ...
│   │   └── scripts/
│   │
│   ├── cali-interface-brainstorm/  # NEW: Independent Interface skill
│   │   ├── SKILL.md
│   │   └── references/
│   │
│   ├── cali-plan-critique/         # NEW: Independent Critique skill
│   │   ├── SKILL.md
│   │   └── references/
│   │
│   ├── cali-tech-planning/         # NEW: Independent Tech Planning skill
│   │   ├── SKILL.md
│   │   └── references/
│   │
│   └── cali-product-workflow/      # Orchestrator (references subskills)
│       └── SKILL.md
│
├── strategic-analysis/             # Keep as-is (already independent)
│   └── ...
│
└── domain-libraries/              # Keep as-is (already independent)
    └── ...
```

### Option B: Single Skill with Clear References (Current Optimized)

Keep `cali-product-workflow` as the orchestrator but clarify the subskill pattern:

```
cali-product-workflow/
├── SKILL.md                        # Orchestrator with explicit references
├── phases/                         # Renamed from "procedures"
│   ├── setup.md
│   ├── shape-up.md
│   ├── interface.md
│   ├── critique.md
│   ├── gate.md
│   ├── tech-planning.md
│   └── execution.md
├── references/
│   └── [keep structure as-is]
└── assets/
    └── [templates, if any]
```

---

## 📋 Detailed Refactoring Plan (Option A)

### Phase 1: Create Individual Phase Skills

1. **Create `cali-shape-up` skill**
   - Move `procedures/phase-3-shape.md` → `cali-shape-up/SKILL.md`
   - Move `references/shape-up/*` → `cali-shape-up/references/`
   - Update description to trigger independently
   - Add cross-references to related skills

2. **Create `cali-interface-brainstorm` skill**
   - Move `procedures/phase-4-interface.md` → `cali-interface-brainstorm/SKILL.md`
   - Move `references/interface/*` → `cali-interface-brainstorm/references/`
   - Add references to Shape Up output format

3. **Create `cali-plan-critique` skill**
   - Move `procedures/phase-5-critique.md` → `cali-plan-critique/SKILL.md`
   - Move `references/plan-critique/*` → `cali-plan-critique/references/`
   - Include audit/critique frameworks

4. **Create `cali-tech-planning` skill**
   - Move `procedures/phase-7-tech-planning.md` → `cali-tech-planning/SKILL.md`
   - Move `references/tech-planning/*` → `cali-tech-planning/references/`
   - Add execution routing patterns

### Phase 2: Update Workflow Orchestrator

5. **Refactor `cali-product-workflow`**
   - Keep as orchestrator but reference subskills via `/skill:` commands
   - Include `auto-chaining rules` in description
   - Maintain phase sequence but delegate to subskills
   - Update `references/environment-adaptation.md` to reference available skills

### Phase 3: Update Procedures

6. **Update phase procedures**
   - Phase 1: Can reference Shape Up as external skill
   - Phase 2: Explicitly use strategic analysis skills
   - Phase 3-7: Delegate to `/skill:cali-shape-up`, etc.
   - Phase 6: Keep gate as part of workflow (it's meta)

7. **Update SKILL.md of each new skill**
   - Add frontmatter (`name`, `description`)
   - Add cross-references to workflow orchestrator
   - Include "Part of cali-product-workflow" note

---

## 📝 File Mapping

| Original | New Location | Skill |
|---|---|---|
| `procedures/phase-1-setup.md` | `cali-product-workflow/phases/setup.md` | orchestrator |
| `procedures/phase-2-context.md` | `cali-product-workflow/phases/context.md` | orchestrator |
| `procedures/phase-3-shape.md` | `cali-shape-up/SKILL.md` | **new** |
| `procedures/phase-4-interface.md` | `cali-interface-brainstorm/SKILL.md` | **new** |
| `procedures/phase-5-critique.md` | `cali-plan-critique/SKILL.md` | **new** |
| `procedures/phase-6-gate.md` | `cali-product-workflow/phases/gate.md` | orchestrator |
| `procedures/phase-7-tech-planning.md` | `cali-tech-planning/SKILL.md` | **new** |
| `procedures/phase-8-execution.md` | `cali-product-workflow/phases/execution.md` | orchestrator |
| `references/shape-up/*` | `cali-shape-up/references/*` | **new** |
| `references/interface/*` | `cali-interface-brainstorm/references/*` | **new** |
| `references/plan-critique/*` | `cali-plan-critique/references/*` | **new** |
| `references/tech-planning/*` | `cali-tech-planning/references/*` | **new** |

---

## ✅ Benefits of This Refactoring

1. **Independent Loading:** Each phase can be triggered directly (`/skill:cali-shape-up`)
2. **Better Discoverability:** Skills appear in `/skill:` list with their own descriptions
3. **Reusability:** Shape Up skill can be used standalone for quick shaping sessions
4. **Modular Testing:** Each skill can be evaluated independently
5. **Clearer Ownership:** Each skill has its own references, reducing cognitive load

---

## ⚠️ Considerations

1. **Cross-skill references:** Need to maintain references between skills
2. **Version synchronization:** Changes in one skill may require updates in others
3. **Artifact path consistency:** Must maintain `.cali-product-workflow/` path convention across skills

---

## 🛠 Implementation Steps

1. [ ] Create new skill directories under `skills/workflow/`
2. [ ] Copy/move SKILL.md content for each phase
3. [ ] Copy/move references to new locations
4. [ ] Update frontmatter (name, description) for each new skill
5. [ ] Add cross-references between skills
6. [ ] Refactor orchestrator to use `/skill:` commands
7. [ ] Update strategic analysis skills to add references to workflow
8. [ ] Test skill loading and chaining
9. [ ] Update package.json if needed

---

**Questions for Review:**
1. Does this architecture match your intent for subskill loading?
2. Should phases like "Setup" and "Gate" remain in orchestrator or become skills?
3. How should cross-skill artifact paths be managed?