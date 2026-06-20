---
source: stelow (consolidated)
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

In those situations, return to shape-up-planning or invoke interface-alternatives.

---

## Product Context: Greenfield vs Brownfield

**Before generating scopes, determine the product context:**

| Context | Description | Testing Strategy Adaptation |
|---------|-------------|----------------------------|
| **Greenfield** | New product, no existing code | TDD-first, risk-based coverage, no legacy constraints |
| **Brownfield** | Existing product, existing code/features | Test-after for features, TDD for critical paths, regression focus |
| **Hybrid** | Adding features to existing product | Separate new from existing, protect invariants |

### Brownfield Considerations (Existing Products)

When evolving an existing product:

1. **Existing tests?** → Adapt strategy based on current test coverage
   - High coverage: Focus on regression + characterization tests
   - Low coverage: Prioritize characterization tests + test coverage
   - No tests: Start with test-after, build momentum for TDD

2. **Existing features** → Protection over innovation
   - Add `test-regression` scopes for existing functionality
   - Use simulation/replay testing for agent behavior verification
   - Apply TDAD (Test-Driven Agentic Development) for impact analysis

3. **Technical debt** → Risk-aware scope planning
   - Identify high-risk areas needing extra testing
   - Factor in legacy patterns and conventions
   - Plan spike scopes for understanding existing architecture

### Greenfield Considerations (New Products)

When building a new product:

1. **No legacy constraints** → Full TDD adoption possible
   - TDD for critical business logic (recommended)
   - Risk-based coverage from day one
   - Clean architecture, no technical debt

2. **Maximum flexibility** → Choose best patterns
   - Architecture from scratch
   - Test frameworks from scratch
   - No need to respect existing conventions

3. **Quality from day one** → Shift-left testing
   - Embed testing strategy in initial scope definition
   - Define testing pyramid early
   - No regression risk yet (but plan for future)

### Questions to Ask (Phase 1 or early Phase 11)

Use the ask tool (see `references/cli-tools/structured-question.md`):

```
ask tool: "Is this a new product or an evolution of an existing one?"
Options:
  - Greenfield — New product: Full TDD + risk-based coverage. No legacy constraints.
  - Brownfield — Existing product: Focus on regression + characterization tests.
  - Hybrid — Feature addition: Protect invariants, test new carefully.
```})
```

**Based on answer:**
- `greenfield`: Full TDD recommendation, risk-based coverage targets
- `brownfield`: TDD for critical paths only, test-after + regression for existing code
- `hybrid`: Separate scope for new vs existing, protect existing with regression tests

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

| Mode | Behavior | Markers |
|------|----------|---------|
| **sugestivo (default)** | Infer hidden risks, implied dependencies, probable spikes, missing enablers | Mark inferred elements with `[suggested]` |

**sugestivo mode rules:**
- Evaluate if tasks are marked as "arriscada" or imply fundamental uncertainties
- Infer technical risks not explicitly stated
- Identify missing enablers or dependencies
- Propose spike scopes for novel/unclear areas

**Note:** Plannotator review gate replaces any "strict" mode — user sees and approves all inferred content.

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