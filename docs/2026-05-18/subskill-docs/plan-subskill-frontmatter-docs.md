# Plan: Improve Sub-Skill Documentation in Orchestrator Frontmatter

## Status
**DRAFT** - Pending Plannotator review

## Problem Statement

The orchestrator skill (`cali-product-workflow`) needs to inform the agent harness about its sub-skills so that:
1. The harness can discover sub-skills when asked about them
2. The orchestrator can properly delegate to sub-skills
3. The description is useful for both pi.dev (with /skill: support) and generic LLMs

### Current Issues

| Version | Current Description | Problem |
|---|---|---|
| **pi-product-workflow** | Lists `/skill:cali-*` with descriptions | Uses `/skill:` prefix which may not work in all contexts |
| **~/.agents/skills** | Lists skill names only | Missing invocation method and less descriptive |

### Ideal Solution

The frontmatter should:
1. Clearly list all sub-skills
2. Show **how to invoke** each sub-skill (path or /skill command)
3. Be consistent across both locations
4. Work for pi.dev and generic LLM harnesses

---

## Options for Sub-Skill Documentation

### Option A: List all sub-skills with paths (RECOMMENDED)

**Rationale:**
- Works universally — any LLM can read a path
- Clear delegation pattern
- No dependency on pi.dev /skill: syntax

**Example:**
```yaml
description: >
  [Cali] Complete product strategic planning orchestrator. Executes Shape Up Planning,
  Interface Brainstorming, Tech Planning, Solution Critique, and Review Gate.
  
  Sub-skills (delegate via /skill:name or read the SKILL.md):
  - cali-shape-up: Shape Up planning → skills-workflow/cali-shape-up/SKILL.md
  - cali-interface-brainstorm: Interface brainstorming → skills-workflow/cali-interface-brainstorm/SKILL.md
  - cali-plan-critique: Plan critique → skills-workflow/cali-plan-critique/SKILL.md
  - cali-tech-planning: Tech planning → skills-workflow/cali-tech-planning/SKILL.md
```

**Pros:**
- ✅ Universal — works for any harness
- ✅ Clear path for direct loading
- ✅ Shows both invocation methods

**Cons:**
- ❌ More verbose
- ❌ Paths differ between pi-product-workflow (has `skills/` prefix) and ~/.agents/skills (no prefix)

---

### Option B: Two-line format with clear separation

**Rationale:**
- First line: what the skill does (trigger)
- Second line: sub-skills as a comma-separated list
- Clear invocation instructions

**Example:**
```yaml
description: >
  [Cali] Complete product strategic planning orchestrator. Executes Shape Up, Interface Brainstorming,
  Tech Planning, Critique, and Review Gate. Use to transform an idea into an approved plan ready for execution.
  
  Sub-skills: /skill:cali-shape-up, /skill:cali-interface-brainstorm, /skill:cali-plan-critique, /skill:cali-tech-planning
  
  For standalone: load skills-workflow/cali-{name}/SKILL.md
```

**Pros:**
- ✅ Compact
- ✅ Shows /skill: commands
- ✅ Shows fallback path

**Cons:**
- ❌ Less detail per sub-skill
- ❌ Still has path differences

---

### Option C: Hierarchical with invocation methods (MOST DETAILED)

**Rationale:**
- Groups sub-skills by phase
- Shows both /skill: and file path
- Most informative for handoffs

**Example:**
```yaml
description: >
  [Cali] Complete product strategic planning orchestrator.
  
  Sub-skills (4 workflow phases):
  1. Shape Up: /skill:cali-shape-up OR skills-workflow/cali-shape-up/SKILL.md
  2. Interface Brainstorm: /skill:cali-interface-brainstorm OR skills-workflow/cali-interface-brainstorm/SKILL.md
  3. Plan Critique: /skill:cali-plan-critique OR skills-workflow/cali-plan-critique/SKILL.md
  4. Tech Planning: /skill:cali-tech-planning OR skills-workflow/cali-tech-planning/SKILL.md
```

**Pros:**
- ✅ Clear numbering and hierarchy
- ✅ Both invocation methods
- ✅ Easy to reference during handoff

**Cons:**
- ❌ Verbose
- ❌ Path varies by location

---

## Path Differences Between Locations

| Location | Orchestrator Path | Sub-skills Path |
|---|---|---|
| `pi-product-workflow` | `skills/cali-product-workflow/SKILL.md` | `skills/cali-product-workflow/skills-workflow/cali-*/SKILL.md` |
| `~/.agents/skills` | `cali-product-workflow/SKILL.md` | `cali-product-workflow/skills-workflow/cali-*/SKILL.md` |

**Solution:** Use relative paths from orchestrator perspective:
- pi-product-workflow: `skills-workflow/cali-{name}/SKILL.md`
- ~/.agents/skills: `skills-workflow/cali-{name}/SKILL.md`

Both are the same relative path because they start from the orchestrator directory.

---

## Recommended Implementation

### For pi-product-workflow (SKILL.md):

```yaml
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
```

### For ~/.agents/skills (SKILL.md):

```yaml
---
name: cali-product-workflow
description: >
  [Cali] Complete product strategic planning orchestrator. Executes Shape Up Planning,
  Interface Brainstorming (conditional), Tech Planning Sequencing, Solution Critique,
  and Review Gate. Use to transform an idea into an approved plan ready for execution.
  
  Sub-skills (4 workflow phases):
  - /skill:cali-shape-up — Shape Up planning → skills-workflow/cali-shape-up/SKILL.md
  - /skill:cali-interface-brainstorm — Interface brainstorming → skills-workflow/cali-interface-brainstorm/SKILL.md
  - /skill:cali-plan-critique — Plan critique → skills-workflow/cali-plan-critique/SKILL.md
  - /skill:cali-tech-planning — Tech planning → skills-workflow/cali-tech-planning/SKILL.md
  
  External skills: JTBD, Evolutionary, Opportunity Mapping, Short-Cycle, Ads, Business Models,
  Health, Marketplace, Open Source, Pricing, Promotions, Trust Building
---
```

**Key differences between locations:**
| Aspect | pi-product-workflow | ~/.agents/skills |
|---|---|---|
| Sub-skill invocation | `/skill:name` (pi.dev native) | `/skill:name` (pi.dev native) |
| Standalone path | `skills-workflow/...` (placeholder) | `skills-workflow/...` (explicit paths) |
| Root structure | `skills/cali-product-workflow/` | `cali-product-workflow/` (no prefix) |

---

## Files to Modify

1. `skills/cali-product-workflow/SKILL.md` (pi-product-workflow)
   - Update frontmatter description
   - Add standalone loading path

2. `~/.agents/skills/cali-product-workflow/SKILL.md`
   - Update frontmatter description
   - Add standalone loading path

---

## Verification Checklist

After implementation:
- [ ] Frontmatter description under 1024 chars (Agent Skills spec)
- [ ] All 4 sub-skills listed with /skill: prefix
- [ ] Standalone loading path included
- [ ] Consistent between both locations
- [ ] Commit and push to pi-product-workflow
- [ ] Copy updated SKILL.md to ~/.agents/skills