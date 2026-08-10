---
"@calionauta/stelow": patch
---

Add the v0.55.2-release-drift guard from `docs/agents-md-refs/post-mortems/v0.55.2-release-drift.md`: a `scripts/check-version-coherence.sh` tag-aware CI script plus a husky `commit-msg` hook that enforces a release-bump or rollback trailer on any commit that edits `package.json#version`. The CI guard runs on every PR touching the five tracked version-bearing files and fails with a `::error::` annotation when the version diverges from the latest annotated tag on `origin/main` without a declared intent trailer.