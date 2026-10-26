# Code Diff Review Gate

> **Conditional stage** — only runs when review mode is `Product Spec + Interface + Tech Review + Code Diff`.

Review of the working-tree diff. Blocks until a human approves, annotates, or rejects.

> **Runs AFTER verification** — tests and automated checks must pass first.
> The human reviews only code that has passed all automated gates.

## Gate Activation

The host owns the review surface. Use the host's diff viewer when it has one,
and put the decision to the human as a structured ask (approve or request
changes). A host without a diff viewer may use the Plannotator CLI where it is
installed:

```bash
visual_review review
```

The CLI opens a browser-based code review showing the diff of all uncommitted
changes and blocks until the human interacts and closes it. It is one
implementation of the gate, not the gate itself.

## Structured-ask fallback

When neither the host diff viewer nor the CLI is available, do not silently
approve. Ask with the diff context (file count, `git diff --stat`, or a short
summary) and an approve / request-changes choice, then apply the answer. A
selected gate with no review surface and no open ask is a phantom wait.

## Parsing the CLI decision

`visual_review review` returns plaintext stdout. Infer the decision from these
patterns **only when the CLI was the surface**:

| Stdout contains | Decision | Action |
|---|---|---|
| `"no changes requested"` (or custom `review.approved` prompt) | **approved** | Proceed to Audit |
| `"Review session closed without feedback."` | **dismissed** | Ask user: "The review was dismissed without feedback. Proceed or re-review?" |
| Anything else (annotation feedback markdown) | **annotated** | Apply feedback, cycle back to execution |

> **If a custom `review.approved` prompt is configured** in
> `~/.visual_review/config.json`, the approval text will differ from the
> default `"no changes requested"`. If stdout is ambiguous, ask the user:
> "What was the result of the code review?"

## On Approval

Proceed to Audit phase.

## On Annotations

Apply the specific feedback in execution, then the cycle repeats: execution →
verification (tests re-run) → diff-gate (human re-reviews the updated diff).

## On Rejection

Fundamental issues with the implementation. Return to Execution. The LLM may
need to revise the approach or escalate to Planning if the tech plan is the
root cause.
