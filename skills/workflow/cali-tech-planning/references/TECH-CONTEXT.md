---
source: cali-product-planner (consolidated)
original_files: strategies.md, when-to-use.md, cross-domain.md
date: 2026-05-15
---

# Tech Planning — Context, Usage & Strategies

## When to Use

### Use this when:
- Implementation sequencing is needed
- Technical decomposition becomes necessary
- Dependencies are unclear
- Rollout order matters
- Spikes must be identified
- Execution planning becomes operational

### Do NOT use this when:
- The proposal is still strategically unstable
- Workflows are unresolved
- UX direction is still exploratory
- Shaping ambiguities remain significant
- Brainstorming is still active

In those situations, return to shape-up-planning or invoke interface-brainstorming.

---

## Cross-Domain Adaptability

This skill also applies to:
- operational rollouts
- business processes
- organizational transformations
- education/training deployments
- AI agent orchestration
- habit systems
- relationship/process agreements

**Adapt by replacing:**
- technical risk → operational/execution risk
- engineering spikes → validation/research tasks
- rollout sequencing → operational sequencing

---

## Sequencing Strategies and Analysis Modes

### Sequencing Strategy

#### riskiest-first (default)
Front-load:
- technical uncertainty
- architectural validation
- dependency risks
- operational blockers

#### ui-first
Front-load:
- user-visible workflows
- validation surfaces
- stakeholder demos
- UX feedback loops

### Analysis Mode

#### suggestive (default)
Infer:
- hidden risks
- implied dependencies
- probable spikes
- missing enablers

#### strict
Only analyze explicitly provided elements.

---

## Strategic Stability Check (Step 0)

Before sequencing, verify whether:
- shaping converged
- workflows stabilized
- strategic review happened
- UX direction is sufficiently stable

If major ambiguities still exist, return to shape-up-planning and avoid premature engineering decomposition.

---

## Codebase Awareness Check (Step 1)

Before sequencing:
1. Check memory, prior exploration, architecture summaries, related implementation history.
2. Determine whether the codebase is sufficiently understood.
3. If not, recommend exploring the codebase.
4. If exploration is approved, launch exploration focused on:
   - touched systems, APIs, modules, services, data models
   - coupling points, architectural pressure zones
5. Feed findings into risk analysis, sequencing, scope definition, spike generation.
6. If declined, proceed with explicit assumptions and document visibility limitations.