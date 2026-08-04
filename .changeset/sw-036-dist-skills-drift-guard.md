---
"@calionauta/stelow": patch
---

Add the `dist/skills.d.ts` drift detector from `docs/agents-md-refs/post-mortems/v0.55.2-release-drift.md` §"Secondary guard": a `scripts/check-dist-skills-drift.sh` step in the CI `test` job that asserts the compiled `plugins/fusion-plugin-stelow/dist/skills.d.ts#STELOW_PLUGIN_VERSION` matches `manifest.json#version` after `npm run build`. The guard catches the SW-008 historical-miss pattern (v0.55.0 shipped with `STELOW_PLUGIN_VERSION="0.54.3"` baked into the dist because the release commit skipped the prepare/build step).
