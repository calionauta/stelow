# Output Structure

Generate the following sections in order, using the exact format described.

## 1. 🎯 Executive Summary

2-3 sentences summarizing the overall UI quality state, main areas of risk, and overall score.

Format:
```
**Accessibility:** X/4 — Brief justification
**Design Quality:** X/4 — Brief justification
**Overall:** X/8 — Summary statement
```

## 2. 🚨 Critical Issues (Blocking)

Issues that **prevent task completion**, represent **WCAG A failures**, or are **P0 severity**.
Must be resolved before release.

Format for each issue:
- **Issue title**`[dimension]`(severity)
  - **What:** Description of what was observed
  - **Flagged by:** Which checklist item flagged it
  - **Recommendation:** Actionable fix suggestion

Dimensions: `[accessibility]`, `[design]`
Severities: `(P0 Blocking)`, `(P1 Major)`, `(P2 Minor)`, `(P3 Polish)`

Example:
- **Low contrast on primary button text**`[accessibility]`(P1 Major)
  - **What:** "Save" button has white text (#FFFFFF) on light blue background (#7CB9E8) — contrast ratio 2.8:1
  - **Flagged by:** Color Contrast (#1 in a11y checklist)
  - **Recommendation:** Change button background to #1A73E8 (contrast 4.7:1 with white text)

## 3. 🤔 Important Issues (Refinement)

Issues **essential for good UX**, WCAG AA violations, or **P1-P2 severity**.
Should be addressed before public release.

Same format as Critical Issues.

## 4. 🔎 Minor Clarifications

Lower-impact issues about polish, edge variants, or **P3 severity**.

Same format as Critical Issues.

## 5. ✅ Strengths

2-4 bullet points highlighting what is particularly well-executed in the UI.
This prevents the report from feeling purely negative.

## 6. [needs browser] Flag Summary (Codebase mode only)

If running in codebase mode, list any issues flagged as `[needs browser]` that require
live verification in a browser (agent_browser) before they can be considered resolved.

## Mode Notes

- **Live Site mode:** All checks are "what was observed in browser." Include specific element selectors
  or descriptions that make issues easy to locate.
- **Codebase mode:** Mark issues as `[needs browser]` if the violation cannot be confirmed
  from source alone (e.g., rendered contrast, animation smoothness).
- **Screenshot mode:** Mark issues as `[needs live testing]` if they require interaction
  (keyboard nav, focus management, screen reader).
