# visual_review

`visual_review` is the host-agnostic tool for approving a generated markdown artifact.
The orchestrator resolves its implementation through `stages.yaml#tools.visual_review`.
A host without a native implementation must silently approve and write:
`.stelow/approvals/{dirHash}/{filename}.approved.md`.

## Pi implementation fallback

When the Pi adapter is active, it maps `visual_review` to the host-native
Plannotator executable (`plannotator annotate <file> --gate --json`). The
`.stelow/approvals/` receipt remains the portable contract; `.plannotator/`
is a Pi compatibility location only.
