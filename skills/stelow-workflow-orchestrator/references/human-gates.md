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

## More Mode-Gated Waits

- **Scope adjustment** (`Pattern 3`): human IN/OUT confirmation only in
  `Product Spec + Interface + Scopes` and above; otherwise the LLM adjusts
  scope itself.
- **Execution start**: always automatic after planning approval. Never ask
  "shall I proceed" — that question is the workflow stalling, not diligence.
- **Gate tool fallback**: when a gate *tool* (`visual_review`) is
  unavailable in the host, do NOT park in chat waiting. In `Auto`, write
  the approval receipt yourself (`.stelow/approvals/{dirHash}/{file}.approved.md`)
  and advance; in gated modes, open a structured ask instead. A wait with
  neither tool receipt nor open ask is a phantom wait — forbidden.

## Rules

1. **Read `review_mode` before any human wait.** A wait issued in the
   wrong mode is a stuck workflow, not diligence. When in doubt, the mode
   table in `stelow-workflow-shape-up/references/proposal-structure.md`
   (Mode section) is canonical for the full matrix; this file is the
   condensed enforcement copy.
2. **A parked wait needs a live question.** Waiting without a structured
   ask open (no pending interaction, no answerable artifact) is a phantom
   wait — the human has nothing to answer. Either open the ask or advance.
3. **Host plugin surfaces** (bb, Multica, Fusion, Pi, or any host
   integration) derive the same rules from this file: status copy,
   notification feeds, and resume/retry prompts must never promise or
   demand a human decision the mode doesn't require.

## Canonical References

- Full mode matrix: `stelow-workflow-shape-up/references/proposal-structure.md` (Mode section)
- Gate mechanics (tool gates, transitions): `references/transitions.md`
- Ask patterns: `stages/ask-patterns.md` (Pattern 2 for picks)
