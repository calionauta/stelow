# Tech Plan Gate

> **Conditional stage** — only runs when review mode is `Product Spec + Interface + Tech Review` or `Product Spec + Interface + Tech Review + Code Diff`. In `Auto`, `Product Spec Gate`, and `Product Spec + Interface + Scopes` this stage does not exist: advance from planning directly to execution, never park waiting for a review here (see `../references/human-gates.md`).

visual review gate on `spec-tech.md` (the tech plan). Blocks until human approves, annotates, or rejects — **in the Tech Review / Code Diff modes above only**.

## Gate Activation

Review the generated `spec-tech.md` via visual review:

```
Use the `visual_review` tool with filePath pointing to `plans/spec-tech_v{N}.md` (the latest version).
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
