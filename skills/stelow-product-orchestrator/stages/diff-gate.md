# Code Diff Review Gate

> **Conditional stage** — only runs when review mode is `Product Spec + Interface + Tech Review + Code Diff`.

Plannotator review of the working tree diff. Blocks until human approves, annotates, or rejects.

> **Runs AFTER verification** — tests and automated checks must pass first. The human reviews only code that has passed all automated gates.

## Gate Activation

Review the current working tree diff via Plannotator:

```bash
plannotator review
```

This opens the browser-based code review UI showing the diff of all uncommitted changes.

Expected outcomes:
- `approved` — proceed to audit
- `annotated` with comments — apply the feedback to execution, then cycle back: execution → verification → diff-gate
- `rejected` — structural issues found, return to execution for rework

## On Approval

Proceed to Audit phase.

## On Annotations

Apply the specific feedback in execution, then the cycle repeats: execution → verification (tests re-run) → diff-gate (human re-reviews the updated diff).

## On Rejection

Fundamental issues with the implementation. Return to Execution. The LLM may need to revise the approach or escalate to Planning if the tech plan is the root cause.
