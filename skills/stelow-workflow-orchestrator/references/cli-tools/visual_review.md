# visual_review

`visual_review` is the host-agnostic **decision contract** for approving a
generated markdown artifact. It is not a renderer: a host may implement it
with its own artifact viewer, its annotation surface, or a structured ask. The
orchestrator resolves the implementation through
`stages.yaml#tools.visual_review`.

The contract is `{ decision, feedback }`, with `decision` in
`approved | annotated | dismissed`, plus the portable receipt
`.stelow/approvals/{dirHash}/{filename}.approved.md`.

## Fallbacks (in order)

1. **Native review tool.** Use it when the host registers one, and let the
   human annotate the artifact in that UI.
2. **Structured ask.** When no native tool exists, put the artifact under
   decision in the host's structured ask (`ask_user_question` or equivalent),
   with an option to approve and an option to request changes. A selected gate
   must never approve itself: only `Auto` may write an agent receipt without a
   human decision, and it records `approved_via: auto` / `selected_by: llm`.
3. **CLI fallback.** If the host has the Plannotator CLI, `plannotator annotate
   <file> --gate --json` returns the same decision. Install the binary only
   (checksum-verified, no hooks or skills):

   ```bash
   curl -fsSL https://plannotator.ai/install.sh | bash -s -- --minimal
   ```

The `.stelow/approvals/` receipt remains the portable contract regardless of
which surface produced the approval. If no surface exists and the gate is
selected, do not write the receipt: park on the structured ask. A wait with
neither a receipt nor an open ask is a phantom wait.
