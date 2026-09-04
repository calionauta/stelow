# Human Gates by Review Mode

Machine- and human-readable policy for **which stages wait for a human
decision** under each `review_mode` (frontmatter in `spec-product.md`,
`state.md`, `index.json`).

> Visual-review *tool* gates (`gate`, `int-gate`, `plan-gate`, `diff-gate`
> where applicable) always run — they are automated checks with receipts,
> not human waits. This file governs **human waits only**: structured
> questions and picks that park the workflow until a person answers.

| Review Mode | Structured Questions to Human | Interface Selection Pick |
|---|---|---|
| `Auto` | None | **LLM decides** — adopt the hybrid recommendation (or the single proposal for Lean appetite) as `selected-interface.md`. Never park waiting for a human pick. |
| `Product Spec Gate` | None | **LLM decides** — same as Auto. |
| `Product Spec + Interface Gates` | Interface selection | **User chooses** via structured ask with preview. |
| `Product Spec + Interface + Scopes` | Interface selection + scope | **User chooses** via structured ask with preview. |
| `Product Spec + Interface + Tech Review` and above | All including technical | **User chooses** via structured ask with preview. |

## Rules

1. **Read `review_mode` before any human wait.** A wait issued in the
   wrong mode is a stuck workflow, not diligence. When in doubt, the mode
   table in `stelow-workflow-shape-up/references/proposal-structure.md`
   (Mode section) is canonical for the full matrix; this file is the
   condensed enforcement copy.
2. **A parked wait needs a live question.** Waiting without a structured
   ask open (no pending interaction, no answerable artifact) is a phantom
   wait — the human has nothing to answer. Either open the ask or advance.
3. **Plugin surfaces** (`bb-plugin-stelow` and equivalents) derive the same
   rules from this file: hero copy, inbox events, and retry nudges must
   never promise or demand a human decision the mode doesn't require.

## Canonical References

- Full mode matrix: `stelow-workflow-shape-up/references/proposal-structure.md` (Mode section)
- Gate mechanics (tool gates, transitions): `references/transitions.md`
- Ask patterns: `stages/ask-patterns.md` (Pattern 2 for picks)
