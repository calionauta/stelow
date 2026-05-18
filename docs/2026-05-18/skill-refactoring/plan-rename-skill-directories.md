# Plan: Rename Skill Directories to Standard Pattern

**Date:** 2026-05-18  
**Status:** Draft for Plannotator Review  
**Author:** Cali (pi-agent)

---

## 🎯 Objective

Rename skill directories (`strategic-analysis/`, `domain-libraries/`, `execution/`) to a consistent pattern (`skills-strategic-analysis/`, `skills-domain-libraries/`, `skills-execution/`) to:
1. Align with the new `skills-workflow/` naming convention
2. Make it clear these directories contain skills
3. Enable agents to discover and load sub-skills by path
4. Update all internal references to use the new paths

---

## 📋 Current Structure

```
cali-product-workflow/
├── SKILL.md                        # Main orchestrator
├── skills-workflow/                 # ✅ Already named correctly
│   ├── cali-shape-up/
│   ├── cali-interface-brainstorm/
│   ├── cali-plan-critique/
│   └── cali-tech-planning/
├── strategic-analysis/              # ❌ Should be: skills-strategic-analysis/
│   ├── cali-product-job-to-be-done/
│   ├── cali-product-evolutionary-principles/
│   ├── cali-product-opportunity-mapping/
│   ├── cali-product-multi-method-market-analysis/
│   └── cali-product-short-cycle/
├── domain-libraries/                # ❌ Should be: skills-domain-libraries/
│   ├── cali-product-ads/
│   ├── cali-product-business-models/
│   ├── cali-product-health/
│   ├── cali-product-marketplace-playbook/
│   ├── cali-product-open-source/
│   ├── cali-product-pricing/
│   ├── cali-product-promotions/
│   └── cali-product-trust-building/
└── execution/                       # ❌ Should be: skills-execution/
    └── cali-product-scope-executor/
```

---

## 🚀 Target Structure

```
cali-product-workflow/
├── SKILL.md
├── skills-workflow/                 # ✅
│   ├── cali-shape-up/
│   ├── cali-interface-brainstorm/
│   ├── cali-plan-critique/
│   └── cali-tech-planning/
├── skills-strategic-analysis/       # ✅ Renamed from strategic-analysis/
│   ├── cali-product-job-to-be-done/
│   ├── cali-product-evolutionary-principles/
│   ├── cali-product-opportunity-mapping/
│   ├── cali-product-multi-method-market-analysis/
│   └── cali-product-short-cycle/
├── skills-domain-libraries/         # ✅ Renamed from domain-libraries/
│   ├── cali-product-ads/
│   ├── cali-product-business-models/
│   ├── cali-product-health/
│   ├── cali-product-marketplace-playbook/
│   ├── cali-product-open-source/
│   ├── cali-product-pricing/
│   ├── cali-product-promotions/
│   └── cali-product-trust-building/
└── skills-execution/                 # ✅ Renamed from execution/
    └── cali-product-scope-executor/
```

---

## 🛠 Implementation Tasks

### Task 1: Rename Directories

**For BOTH locations** (pi-product-workflow AND ~/.agents/skills/):

- [ ] Rename `strategic-analysis/` → `skills-strategic-analysis/`
- [ ] Rename `domain-libraries/` → `skills-domain-libraries/`
- [ ] Rename `execution/` → `skills-execution/`

### Task 2: Update Orchestrator SKILL.md References

**Files to update:**

| Location | File | References to update |
|---|---|---|
| pi-product-workflow | `skills/workflow/cali-product-workflow/SKILL.md` | All references to strategic-analysis/, domain-libraries/, execution/ |
| ~/.agents/skills | `SKILL.md` | All references to strategic-analysis/, domain-libraries/, execution/ |

**Update pattern:**
```markdown
# Before
strategic-analysis/cali-product-job-to-be-done/SKILL.md

# After  
skills-strategic-analysis/cali-product-job-to-be-done/SKILL.md
```

### Task 3: Update Internal Skill References

**Files to update (each skill SKILL.md that references other skills):**

| Skill | Location | Has broken refs? | Reference Type |
|---|---|---|---|
| `cali-product-workflow` (orchestrator) | Both | Yes | References to all 3 directories in Internal Skills Index table |
| `cali-product-scope-executor` | ~/.agents | Yes | **"How to invoke" section** — documentation for other agents |

**About scope-executor "How to invoke":**

The scope-executor skill contains a `"## How to invoke"` section with:
```
Load this skill by reading its file (`execution/cali-product-scope-executor/SKILL.md`)
```

**This is unusual** — no other skills in this package have this self-referencing pattern. It appears to be documentation for OTHER agents that need to invoke this skill as a sub-agent. This pattern should be considered for removal or update in the refactoring.

**Verification:** Checked all other skills (shape-up, interface-brainstorm, plan-critique, tech-planning, domain-libraries, strategic-analysis) — NONE have self-referencing "Load this skill" instructions.
| Other skills | Check | May have references to other skill paths |

### Task 4: Update package.json (pi-product-workflow only)

**File:** `/Users/cali/Development/pi-product-workflow/package.json`

**Update the `pi.skills` array:**
```json
// Before
"./skills/strategic-analysis/cali-product-short-cycle",
"./skills/domain-libraries/cali-product-ads",
"./skills/execution/cali-product-scope-executor"

// After
"./skills/skills-strategic-analysis/cali-product-short-cycle",
"./skills/skills-domain-libraries/cali-product-ads",
"./skills/skills-execution/cali-product-scope-executor"
```

---

## 📝 Reference Mapping Table

### Strategic Analysis Skills

| Skill Name | Old Path | New Path |
|---|---|---|
| Jobs To Be Done | `strategic-analysis/cali-product-job-to-be-done/SKILL.md` | `skills-strategic-analysis/cali-product-job-to-be-done/SKILL.md` |
| Evolutionary Principles | `strategic-analysis/cali-product-evolutionary-principles/SKILL.md` | `skills-strategic-analysis/cali-product-evolutionary-principles/SKILL.md` |
| Opportunity Mapping | `strategic-analysis/cali-product-opportunity-mapping/SKILL.md` | `skills-strategic-analysis/cali-product-opportunity-mapping/SKILL.md` |
| Multi-Method Market Analysis | `strategic-analysis/cali-product-multi-method-market-analysis/SKILL.md` | `skills-strategic-analysis/cali-product-multi-method-market-analysis/SKILL.md` |
| Short-Cycle Product | `strategic-analysis/cali-product-short-cycle/SKILL.md` | `skills-strategic-analysis/cali-product-short-cycle/SKILL.md` |

### Domain Libraries

| Skill Name | Old Path | New Path |
|---|---|---|
| Ads | `domain-libraries/cali-product-ads/SKILL.md` | `skills-domain-libraries/cali-product-ads/SKILL.md` |
| Business Models | `domain-libraries/cali-product-business-models/SKILL.md` | `skills-domain-libraries/cali-product-business-models/SKILL.md` |
| Health | `domain-libraries/cali-product-health/SKILL.md` | `skills-domain-libraries/cali-product-health/SKILL.md` |
| Marketplace Playbook | `domain-libraries/cali-product-marketplace-playbook/SKILL.md` | `skills-domain-libraries/cali-product-marketplace-playbook/SKILL.md` |
| Open Source | `domain-libraries/cali-product-open-source/SKILL.md` | `skills-domain-libraries/cali-product-open-source/SKILL.md` |
| Pricing | `domain-libraries/cali-product-pricing/SKILL.md` | `skills-domain-libraries/cali-product-pricing/SKILL.md` |
| Promotions | `domain-libraries/cali-product-promotions/SKILL.md` | `skills-domain-libraries/cali-product-promotions/SKILL.md` |
| Trust Building | `domain-libraries/cali-product-trust-building/SKILL.md` | `skills-domain-libraries/cali-product-trust-building/SKILL.md` |

### Execution Skills

| Skill Name | Old Path | New Path |
|---|---|---|
| Scope Executor | `execution/cali-product-scope-executor/SKILL.md` | `skills-execution/cali-product-scope-executor/SKILL.md` |

**Note on scope-executor:** The skill contains a `"How to invoke"` section with:
```
Load this skill by reading its file (`execution/cali-product-scope-executor/SKILL.md`)
```

This is a **documentation instruction** for other agents, not a recursive call. When renamed to `skills-execution/`, update to:
```
Load this skill by reading its file (`skills-execution/cali-product-scope-executor/SKILL.md`)
```

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Broken internal references | Use sed to replace all occurrences, then verify |
| package.json paths incorrect | Update all skill paths in pi.skills array |
| Skills not discovered by agents | Verify with `find` command after rename |
| Git sees all files as deleted/new | Use `git mv` instead of `mv` to preserve history |

---

## 🔍 Verification Checklist

After implementation:

- [ ] All directories renamed correctly
- [ ] All SKILL.md files have updated internal references
- [ ] package.json has correct paths
- [ ] `git status` shows renames (not delete+add)
- [ ] Both locations (pi-product-workflow AND ~/.agents/skills/) are synchronized
- [ ] No orphan references to old paths

---

## 📁 Files to Modify

### pi-product-workflow (Development)

| File | Action |
|---|---|
| `skills/strategic-analysis/` | Rename to `skills/skills-strategic-analysis/` |
| `skills/domain-libraries/` | Rename to `skills/skills-domain-libraries/` |
| `skills/execution/` | Rename to `skills/skills-execution/` |
| `skills/workflow/cali-product-workflow/SKILL.md` | Update internal references |
| `package.json` | Update `pi.skills` array paths |

### ~/.agents/skills/cali-product-workflow (Instance)

| File | Action |
|---|---|
| `strategic-analysis/` | Rename to `skills-strategic-analysis/` |
| `domain-libraries/` | Rename to `skills-domain-libraries/` |
| `execution/` | Rename to `skills-execution/` |
| `SKILL.md` | Update internal references to all 3 directories |
| `skills-execution/cali-product-scope-executor/SKILL.md` | Update self-reference path from `execution/` to `skills-execution/` |

---

## 🧪 Post-Implementation Verification

Run this to verify no broken references remain:

```bash
# Check for old paths in any .md file
grep -r "strategic-analysis/" --include="*.md" .
grep -r "domain-libraries/" --include="*.md" .
grep -r "/execution/" --include="*.md" .

# Verify new paths exist
ls skills-strategic-analysis/
ls skills-domain-libraries/
ls skills-execution/
```

**Expected:** No matches for old paths, all new directories exist.