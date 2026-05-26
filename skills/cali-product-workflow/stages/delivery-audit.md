# Stage 13: Delivery Audit

**Purpose:** Verify that all planned scopes were correctly implemented and identify any gaps between plan and execution.

> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.
> A post-implementation audit is an evaluation of the project's goals and activity achievement as measured against the project plan, budget, time deadlines, quality of deliverables, specifications, and client satisfaction.
> — *Effective Project Management, 6th Edition*

---

## Overview

The Delivery Audit closes the loop between planning and execution. It answers:

| Question | Verification |
|----------|--------------|
| Did we build what was spec'd? | Scope completeness check |
| Are there gaps? | Gap analysis against spec-tech.md |
| Any scope deviations? | Scope drift detection |
| What did we learn? | Lessons captured for future |

---

## When It Runs

```
Stage 11: Execution (all scopes completed)
    ↓
Stage 12: Delivery Audit
    ↓
    [If gaps found → Scope Remediation or Gap Document]
    [If clean → Workflow Complete]
```

---

## Audit Checklist

### 1. Scope Completeness Check

Read `spec-tech.md` and verify each scope:

```
For each scope in spec-tech.md:
  □ Implemented (code exists)
  □ Test coverage matches plan
  □ Documentation updated
  □ No scope creep (features not in plan)
  □ No scope drop (features missing)
```

### 2. Deliverable Verification

| Deliverable | Check |
|--------------|-------|
| **Features** | All IN-scope features implemented |
| **Tests** | test-* scopes executed, coverage adequate |
| **Documentation** | Docs updated for all changes |
| **CLI/Scripts** | Install scripts work, adapters functional |
| **Breaking Changes** | Migration path provided if needed |

### 3. Quality Gates

| Gate | Status |
|------|--------|
| Tests passing | □/□ |
| Lint clean | □/□ |
| Build succeeds | □/□ |
| No known regressions | □/□ |

### 4. Gap Analysis

Identify and document:

| Gap Type | Description |
|----------|-------------|
| **Missing features** | Planned but not delivered |
| **Partial scope** | Scope started but not completed |
| **New scope** | Delivered but not in plan (scope creep) |
| **Quality issues** | Delivered but with known bugs |
| **Documentation debt** | Code shipped but docs lagging |

---

## Output: Audit Report

Generate `delivery-audit.md` in the plan directory:

```markdown
# Delivery Audit Report

**Date:** {timestamp}
**Spec:** {spec-tech-version}
**Execution:** {scope-executor-version}

## Summary

| Metric | Value |
|--------|-------|
| Total scopes planned | N |
| Scopes completed | N |
| Scopes partial | N |
| Gaps identified | N |

## Scope-by-Scope Verification

| Scope | Status | Notes |
|-------|--------|-------|
| scope-1 | ✅ Complete | |
| scope-2 | ⚠️ Partial | Feature X missing |
| scope-3 | ✅ Complete | |

## Gap Registry

### Gap 1: Missing Feature
- **Scope:** scope-2
- **What was planned:** Feature X
- **What was delivered:** —
- **Impact:** —
- **Resolution:** Document for next cycle

## Lessons Learned

### What Went Well
1. ...

### What Could Improve
1. ...

## Approval

- [ ] All scopes complete OR gaps documented
- [ ] Lessons captured
- [ ] Ready to close workflow
```

---

## Decision Matrix

Based on audit results:

| Situation | Action |
|-----------|--------|
| All scopes complete, no gaps | ✅ **Workflow Complete** — close cycle |
| Minor gaps, low impact | 📝 Document in report, close cycle |
| Significant gaps, medium impact | ⚠️ Offer: "Create follow-up plan?" |
| Critical gaps, high impact | 🚨 Alert user — "Critical gaps found. Review required." |

---

## Integration with Workflow

### Update Stage Status

After audit completes, call `/pw-setphase stage=11` to mark complete.

### Auto-chain

Delivery Audit runs **automatically after Stage 11** when execution completes all scopes.

### Bypass Awareness

If user wants to skip audit, remind them: audit ensures nothing was forgotten and captures learnings.

---

## Reference

- Based on PMI Post-Implementation Review best practices
- Adapted for software delivery with scope-level granularity
- ISO 21513:2026 post-project evaluation guidance