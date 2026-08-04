---
"@calionauta/stelow": minor
---

SW-013: documentation-only rewrite of `.github/RELEASE_WORKFLOW.md` to mirror the post-SW-011 `AGENTS.md#Versioning` canonical procedure. Removes the obsolete pre-v0.55 release guidance: the `0.1.0-alpha` "current version" claim, the `-alpha`/`-beta`/`-rc` pre-release suffix scheme, the `npm publish --access public --tag alpha` Step 4, the `--tag alpha` flag, the `Do NOT bump to 1.0.0 until owner confirms` caveat, the `cali-product-*` / `TDAD` example commit messages, and the unused `softprops/action-gh-release` GitHub Actions YAML sample (no `release.yml` is configured in the repo). Replaces them with the v0.55.x canonical 9-step recipe (bump → `version:sync` → `npm run prepare:fusion-plugin && npm run build:fusion-plugin` → CHANGELOG edit → six-point version agreement → commit → annotated tag → push → `gh release create --notes-file`), the explicit "Git/GitHub only, never `npm publish`" rule, and the canonical `calionauta/stelow` repo URLs in the Release Note template.

No runtime functionality, public API, exports, settings, workflow, or release pipeline changed. The file now leads with a one-line disclaimer that `AGENTS.md#Versioning` is canonical and this file is supplementary, so future drift cannot go undetected. Useful supplementary forms (Conventional Commits table, Release Note Template, Version Bump Rules, Quick Reference, Remember list) are preserved and updated to match the v0.55.x repo state.

The deletion count exceeds the addition count because the obsolete pre-v0.55 guidance was a substantial portion of the prior file (4.4 KB across the alpha scheme, the npm-publish Step 4, the auto-release YAML, and the owner-gating caveats); the new content is concise and source-backed against `AGENTS.md#Versioning`.
