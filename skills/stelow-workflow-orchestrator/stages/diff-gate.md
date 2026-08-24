# Code Diff Review Gate

> **Conditional stage** — only runs when review mode is `Product Spec + Interface + Tech Review + Code Diff`.

visual review review of the working tree diff. Blocks until human approves, annotates, or rejects.

> **Runs AFTER verification** — tests and automated checks must pass first. The human reviews only code that has passed all automated gates.

> **⚠️ Note on structured output:** Unlike `visual_review annotate --gate --json`, the `visual_review review` command does not support `--json` structured output. The CLI returns plaintext. The LLM must infer the decision from stdout text patterns — see below.

## Gate Activation

Review the current working tree diff via visual review:

```bash
visual_review review
```

This opens the browser-based code review UI showing the diff of all uncommitted changes. The CLI blocks until the human interacts and closes the browser.

## Parsing the Decision

`visual_review review` returns plaintext stdout. Infer the decision from these patterns:

| Stdout contains | Decision | Action |
|---|---|---|
| `"no changes requested"` (or custom `review.approved` prompt) | **approved** | Proceed to Audit |
| `"Review session closed without feedback."` | **dismissed** | Ask user: "The review was dismissed without feedback. Proceed or re-review?" |
| Anything else (annotation feedback markdown) | **annotated** | Apply feedback, cycle back to execution |

> **If custom `review.approved` prompt is configured** in `~/.visual_review/config.json`, the approval text will differ from the default `"no changes requested"`. If the stdout is ambiguous, ask the user: "What was the result of the visual review review?"

## On Approval

Proceed to Audit phase.

## On Annotations

Apply the specific feedback in execution, then the cycle repeats: execution → verification (tests re-run) → diff-gate (human re-reviews the updated diff).

## On Rejection

Fundamental issues with the implementation. Return to Execution. The LLM may need to revise the approach or escalate to Planning if the tech plan is the root cause.
