## Interface Gate

> **Part of stelow** — See [`SKILL.md`](../SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.

This stage runs after the Interface stage produced the proposals and before
the Interface Selection stage resolves the pick. It is a **visual** gate: the
reviewer looks at the wireframes.

### int-gate:10 — What is under review

The document under review is the proposals file:

```
.stelow/{YYYY-MM-DD}/{_dir}/interfaces/alternatives.md
```

It carries every proposal with its ASCII wireframe, plus the hybrid
recommendation with its own composed wireframe.

**Review this file, not `interfaces.md`.** `interfaces.md` is the readable
rendering of the contrast receipt — the decision record, in prose. It is the
receipt, not the thing a reviewer looks at. The wireframes live in the
proposals file.

If a proposal has no wireframe, the review cannot happen: say so and send the
workflow back to the Interface stage. An option nobody can look at is an
option nobody chose on purpose.

### int-gate:20 — Submission to visual review

**Use the `visual_review` tool** (not bash — bash is blocked in this stage):

```
visual_review filePath=.stelow/{YYYY-MM-DD}/{_dir}/interfaces/alternatives.md
```

The tool blocks until the reviewer acts in the browser UI. It returns a
structured decision:

| Decision | Meaning | Action |
|----------|---------|--------|
| `approved` | The proposals are acceptable | Proceed to receipt + Selection |
| `annotated` | Feedback with changes | Revise the proposals, re-submit |
| `dismissed` | Closed without decision | Ask what to do — do not assume approval |

**If the tool is unavailable** (e.g. a subagent without the extension):
```bash
visual_review annotate .stelow/{YYYY-MM-DD}/{_dir}/interfaces/alternatives.md --gate --json
```

Without a review UI, write the receipt directly after a manual review — see
[`../references/cli-tools/visual_review.md`](../references/cli-tools/visual_review.md).
The receipt is the portable contract; the UI that produced it is not.

### int-gate:30 — After approval

When the decision is `approved`, the receipt is written to:

```
.stelow/{YYYY-MM-DD}/{_dir}/interfaces/alternatives.approved.md
```

with frontmatter carrying `approved: true` and the decision timestamp.

### Do NOT
- Review `interfaces.md` (the receipt) instead of the proposals
- Accept a proposal that carries no wireframe
- Interpret or pick a proposal here — that is the Selection stage's job
- Ask for permission to continue; the gate runs, it does not negotiate

### Completion

When the receipt exists, advance to Interface Selection automatically. The
Selection stage reads the proposals and the contrast receipt, resolves the
pick, and records the breadboard map.
