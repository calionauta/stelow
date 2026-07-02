# Tech Plan Gate

> **Conditional stage** — only runs when review mode is `Product Spec + Interface + Tech Review` or `Product Spec + Interface + Tech Review + Code Diff`.

Plannotator gate on `spec-tech.md` (the tech plan). Blocks until human approves, annotates, or rejects.

## Gate Activation

Review the generated `spec-tech.md` via Plannotator:

```
Use the `plannotator` tool with filePath pointing to `plans/spec-tech_v{N}.md` (the latest version).
```

The tool returns `{ decision, feedback }`:
- `approved` — proceed to execution
- `annotated` — review feedback and revise the tech plan, then re-submit to plan-gate
- `dismissed` — skip gate and proceed (rare)

## On Approval

Proceed to Execution phase.

## On Annotations

Apply the feedback to spec-tech.md, then re-submit to plan-gate.

## On Rejection

The tech plan needs structural changes. Return to Planning phase and rework the plan based on the feedback.
