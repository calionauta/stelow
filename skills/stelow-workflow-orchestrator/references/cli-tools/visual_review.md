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

Install (binary only, checksum-verified, no hooks/skills):

```bash
curl -fsSL https://plannotator.ai/install.sh | bash -s -- --minimal
```

The `.stelow/approvals/` receipt remains the portable contract regardless of
which UI produced the approval. If `plannotator` is absent, write the receipt
file directly after manual review.
