---
source: cali-product-codebase-critique
---

# Output Structure

## 1. 🎯 Executive Summary

2-3 sentences summarizing codebase health across all dimensions.

Format:
```
**Architecture:** X/4 — Summary
**Data Flow:** X/4 — Summary
**System Contracts:** X/4 — Summary
**Performance:** X/4 — Summary
**Theming:** X/4 — Summary
**Responsive:** X/4 — Summary
**AI Slop:** X/4 — Summary
**Overall:** X/28 — Verdict
```

## 2. 🚨 Critical Issues (Blocking)

P0 issues — security risks, data loss, production failures.
Must be fixed before any release.

Format per issue:
- **[dimension]** Issue title `(severity)`
  - **What:** What was observed
  - **Flagged by:** Which checklist item
  - **Effort:** Structural (hard to fix) | Cosmetic (easy fix)
  - **Recommendation:** Actionable fix suggestion

Dimensions: `[architecture]`, `[data-flow]`, `[contracts]`, `[performance]`, `[theming]`, `[responsive]`, `[ai-slop]`

## 3. 🤔 Important Issues (Refinement)

P1-P2 issues — performance, maintainability debt.
Should be fixed before public release.

Same format as Critical Issues.

## 4. 🔎 Minor Issues (Polish)

P3 issues — code quality, naming, dead code.
Fix when time permits.

Same format as Critical Issues.

## 5. ✅ Strengths

2-4 bullet points highlighting well-structured parts of the codebase.

## Output file

Saved to `.cali-codebase-critique/critique-report.md`
