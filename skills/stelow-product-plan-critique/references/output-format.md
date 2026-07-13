---
source: stelow-product-plan-critique
applies_to: [plan]
---

# Output Structure

The critique report has two layers:
- **YAML frontmatter:** structured gap data (machine-readable, token-efficient)
- **Markdown body:** narrative with context, examples, and rationale

Both layers are produced in a single file. The frontmatter feeds downstream stages;
the narrative supports human review in the Plannotator gate.

## Frontmatter Schema

Start every `critique-report.md` with YAML frontmatter containing structured gap data:

```yaml
---
gaps:
  - severity: critical      # critical | important | minor
    tag: flow               # flow | state | affordance | data | system | feasibility | composition | design-quality
    title: "Short gap title"
    description: "What was observed vs what's required"
    recommendation: "Actionable question the team needs to answer"
    resolved: false
  - severity: important
    tag: data
    title: "Another gap"
    description: "..."
    recommendation: "..."
    resolved: false
  - severity: minor
    tag: affordance
    title: "Minor item"
    description: "..."
    recommendation: "..."
    resolved: true
strengths:
  - "Well-defined user flow for the main JTBD"
  - "Clear IN/OUT boundaries"
verdict: "The plan has gaps"   # solid | has gaps | incomplete
---
```

> **Why frontmatter:** Downstream stages read `gaps[].severity` and `gaps[].resolved`
> without re-parsing narrative text. The Plannotator gate still shows the full
> narrative. No information is lost — the body duplicates nothing from frontmatter;
> it only adds context.

## 1. 🎯 Executive Summary

2-3 sentences summarizing overall plan health, coverage of each checklist,
and most critical gaps.

Format:
```
**Flow coverage:** X/6 — Brief summary of what's missing
**State coverage:** X/7 — Brief summary of what's missing
... (per checklist)
**Overall verdict:** The plan is [solid / has gaps / incomplete]
```

## 2. 🚨 Critical Gaps (Blocking)

Gaps that would **block implementation** — missing essential definitions,
undefined flows, or unhandled states.

Must be resolved before the review gate.

Format for each gap:
- **[tag]** Gap title `(severity)`
  - **What:** Description of what was observed vs what's required
  - **Flagged by:** Which checklist item flagged it
  - **Recommendation:** Specific, actionable question the team needs to answer
  - **Resolved:** Yes (by [rule]) | No

Tags: `[flow]`, `[state]`, `[affordance]`, `[data]`, `[system]`, `[feasibility]`, `[composition]`, `[design-quality]`

## 3. 🤔 Important Gaps (Refinement)

Gaps that would cause **significant difficulty** — unclear branching paths,
missing states, undefined error handling.

Should be resolved before the review gate.

Same format as Critical Gaps.

## 4. 🔎 Minor Clarifications

Lower-impact items — polish, edge cases, nice-to-haves.

Same format as Critical Gaps.

## 5. ✅ Strengths

3-5 bullet points highlighting what is particularly well-defined in the plan.
This prevents the critique from feeling purely negative.

## Output file

Saved to `.stelow-plan-critique/critique-report.md`
