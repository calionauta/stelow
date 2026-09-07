# visual_review

`visual_review` is the host-agnostic tool for approving a generated markdown artifact.
The orchestrator resolves its implementation through `stages.yaml#tools.visual_review`.
A host without a native implementation must silently approve and write:
`.stelow/approvals/{dirHash}/{filename}.approved.md`.

## CLI implementation

When no native review UI is available, annotate via the `plannotator` CLI:

```bash
plannotator annotate <file> --gate --json
```

The `.stelow/approvals/` receipt remains the portable contract regardless of
which UI produced the approval.
