---
"@calionauta/stelow": minor
---

SW-011: documentation-only refresh of `README.md`, `architecture.md`, and `AGENTS.md` for the v0.55.1 release line. Removes obsolete descriptions of pre-v0.55 surfaces (in-tree Muxy/Herdr integrations, the per-workflow `index.json` mirror, the 15-command Pi-native table, the `modules/cache.ts`/`CacheManager` module, the pre-v0.53 15-stage table, and the unconditional "Gate never skips" rule) and replaces them with source-backed references to the canonical registries (`extensions/stelow/types.ts#PHASE_NAMES`, `skills/stelow-adapter-cli/stages.yaml`, `extensions/stelow/adapters/commands/dispatcher.ts#WORKFLOW_COMMANDS`, and the compiled `plugins/fusion-plugin-stelow/` package). Adds `tests/integration/documentation-contract.test.ts` as a Vitest regression contract pinning the documented counts, host surfaces, approval-receipt path, and Markdown link integrity.

No runtime functionality, public API, exports, settings, or endpoints changed. The deletion count exceeds the addition count because the obsolete guidance was a substantial portion of the prior documentation; the new content is concise and source-backed, and the regression test guards against future drift.
