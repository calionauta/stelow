# Plan: Refactor cali-product-workflow into Subskills

**Date:** 2026-05-18  
**Status:** Approved - Ready for Implementation  
**Author:** Cali (pi-agent)

---

## 🎯 Objective

Transform the `cali-product-workflow` monolith into **independent subskills** that can be loaded individually, maintaining 100% of instructions, references, and knowledge.

---

## 🔍 Architecture

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
└── domain-libraries/              # Already standalone (keep as-is)
```

**Chain Model:** Vertical with orchestrator - each phase is independently loadable but orchestrated by the main workflow.

---

## 🛠 Implementation Steps

### Phase 1: Create New Skill Structures

**TODO 1.1:** Create `cali-shape-up/` skill directory
```
cali-shape-up/
├── SKILL.md                        # From phase-3-shape.md + frontmatter
└── references/
    ├── EXECUTION-GUIDE.md
    ├── proposal-structure.md
    ├── RISK-ANALYSIS.md
    ├── SHAPING-COMPLETE.md
    ├── SHAPING-PRINCIPLES.md
    └── output-expectations.md     # From orchestrator references/
```

**TODO 1.2:** Create `cali-interface-brainstorm/` skill directory
```
cali-interface-brainstorm/
├── SKILL.md                        # From phase-4-interface.md + frontmatter
└── references/
    ├── archetypes.md
    ├── hybrid-recommendation.md
    ├── INTERFACE-CONTEXT.md
    ├── INTERFACE-EVALUATION.md
    ├── INTERFACE-RECONSTRUCTION.md
    ├── INTERFACE-RULES.md
    └── output-format.md
```

**TODO 1.3:** Create `cali-plan-critique/` skill directory
```
cali-plan-critique/
├── SKILL.md                        # From phase-5-critique.md + frontmatter
└── references/
    ├── audit-dimensions.md
    ├── auto-resolve-rules.md
    ├── CHECKLISTS.md
    ├── critique-frameworks.md
    ├── output-format.md
    └── PLAN-CRITIQUE-CONTEXT.md
```

**TODO 1.4:** Create `cali-tech-planning/` skill directory
```
cali-tech-planning/
├── SKILL.md                        # From phase-7-tech-planning.md + frontmatter
└── references/
    ├── generation-principles.md
    ├── SCOPES-AND-SEQUENCING.md
    ├── TECH-CONTEXT.md
    └── TECH-OUTPUT.md
```

### Phase 2: Migrate Content

**TODO 2.1:** Migrate Shape Up content
- Copy `procedures/phase-3-shape.md` content → `cali-shape-up/SKILL.md`
- Add frontmatter: `name: cali-shape-up`, `description`
- Copy `references/shape-up/*` → `cali-shape-up/references/`
- Copy `references/output-expectations.md` → `cali-shape-up/references/`

**TODO 2.2:** Migrate Interface Brainstorm content
- Copy `procedures/phase-4-interface.md` content → `cali-interface-brainstorm/SKILL.md`
- Add frontmatter
- Copy `references/interface/*` → `cali-interface-brainstorm/references/`

**TODO 2.3:** Migrate Plan Critique content
- Copy `procedures/phase-5-critique.md` content → `cali-plan-critique/SKILL.md`
- Add frontmatter
- Copy `references/plan-critique/*` → `cali-plan-critique/references/`

**TODO 2.4:** Migrate Tech Planning content
- Copy `procedures/phase-7-tech-planning.md` content → `cali-tech-planning/SKILL.md`
- Add frontmatter
- Copy `references/tech-planning/*` → `cali-tech-planning/references/`

### Phase 3: Update Orchestrator

**TODO 3.1:** Refactor `cali-product-workflow/SKILL.md`
- Keep as orchestrator (main entry point)
- Remove phase procedure content (now in subskills)
- Add references to subskills: `/skill:cali-shape-up`, etc.
- Keep: phase sequence, auto-chaining rules, safety rules, tools reference

**TODO 3.2:** Update orchestrator directory structure
```
cali-product-workflow/
├── SKILL.md                        # Orchestrator
├── phases/                         # NEW: Consolidated procedures
│   ├── setup.md                    # From procedures/phase-1-setup.md
│   ├── context.md                  # From procedures/phase-2-context.md
│   ├── gate.md                     # From procedures/phase-6-gate.md
│   └── execution.md               # From procedures/phase-8-execution.md
└── references/
    ├── environment-adaptation.md   # KEEP
    ├── output-expectations.md     # KEEP (referenced)
    └── strategic-exploration.md   # KEEP (for context phase)
```

### Phase 4: Cleanup

**TODO 4.1:** Remove migrated content from orchestrator
- Delete `procedures/` directory (phases migrated to subskills)
- Delete `references/shape-up/` (migrated to cali-shape-up)
- Delete `references/interface/` (migrated to cali-interface-brainstorm)
- Delete `references/plan-critique/` (migrated to cali-plan-critique)
- Delete `references/tech-planning/` (migrated to cali-tech-planning)

### Phase 5: Validation

**TODO 5.1:** Verify skill discovery
- Run `pi` and check `/skill:` list includes new skills

**TODO 5.2:** Test each skill independently
- `/skill:cali-shape-up` - should load and work
- `/skill:cali-interface-brainstorm` - should load and work
- `/skill:cali-plan-critique` - should load and work
- `/skill:cali-tech-planning` - should load and work

**TODO 5.3:** Test orchestrator chain
- `/skill:cali-product-workflow` - should work with subskill references

---

## ⚠️ Risk Mitigations

1. **Cross-skill references:** Use `/skill:cali-shape-up` to load subskill content directly
2. **Artifact paths:** Keep `.cali-product-workflow/{date}/{_dir}/` convention in orchestrator
3. **Information loss:** Verify every section appears in new location via diff
4. **Skill discovery:** Use distinct names (`cali-*` prefix) to avoid conflicts
5. **Version sync:** Keep shared state in orchestrator; subskills reference it

---

## ✅ Verification Checklist

### Pre-Migration
- [ ] Backup original directory
- [ ] Document line counts for all original files
- [ ] List all cross-references

### Post-Migration
- [ ] Each skill has valid SKILL.md with frontmatter
- [ ] Each skill has references/ directory with all files
- [ ] Run skill validation if available
- [ ] Diff original vs migrated file contents
- [ ] Verify cross-skill references resolve

### Full Workflow Test
- [ ] Run full orchestrator
- [ ] Verify all phases execute correctly
- [ ] Verify artifact outputs are correct
- [ ] Verify Plannotator gate works