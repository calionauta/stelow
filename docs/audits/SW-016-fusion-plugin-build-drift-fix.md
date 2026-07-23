# SW-016 Fusion Plugin Build Drift Fix

**Created:** 2026-07-23  
**Task:** SW-016 — Fix Fusion plugin build drift (360-file cli-tools deletion)  
**Status:** Fixed  
**Approach:** Option A — sync cli-tools before preparing the Fusion plugin

## 1. Symptom

A successful `npm run build` could delete all 382 tracked files below `plugins/fusion-plugin-stelow/skills/*/references/cli-tools/`. Fresh checkouts contain the canonical orchestrator references and four tracked skill-specific additions, but omit the generated, gitignored mirrors in root `skills/`. SW-010 and SW-012 therefore needed a manual post-build `git checkout HEAD -- plugins/fusion-plugin-stelow/skills/` workaround.

## 2. Diagnosis

`scripts/prepare-fusion-plugin.ts` stages each canonical root skill with recursive `cp()` and atomically replaces the plugin's complete `skills/` directory. That operation correctly mirrors its source, but the source was incomplete: generated sub-skill cli-tools were absent until `scripts/sync-cli-tools.sh` ran. The previous `package.json#scripts.build` invoked prepare before any sync, so the atomic replacement made the tracked plugin tree incomplete while still exiting successfully.

The sync script is intentionally the leaf source-of-truth pipeline and is not safe to run concurrently. The build chain is serial, so placing one sync directly before prepare satisfies that constraint.

## 3. Approach Trade-offs

### Chosen: Option A — sync before prepare

`package.json#scripts.build` now runs `./scripts/sync-cli-tools.sh` before `npm run prepare:fusion-plugin`. This preserves all tracked plugin content, the existing package shape, and runtime behavior. On populated trees the script's content comparisons make the operation effectively a no-op.

### Rejected: Option B — stop tracking plugin mirrors through ignore policy

This would remove 382 files from the tracked distribution surface and make a cloned plugin subtree incomplete unless consumers performed an additional generation step.

### Rejected: Option C — exclude cli-tools from plugin preparation

This would intentionally produce a plugin without references and require changing distribution or installation assumptions. It has a much larger and less reversible blast radius than fixing pipeline order.

## 4. Implementation

- `package.json`: run cli-tools sync before Fusion plugin preparation.
- `tests/integration/fusion-plugin-build-drift.test.ts`: create an isolated fresh-checkout fixture, strip generated mirrors, run sync then prepare, and compare the complete plugin cli-tools allow-list against tracked HEAD. A companion assertion demonstrates the old prepare-without-sync failure mode, and a package-script assertion pins ordering.

Fix commit: `10edd53` — `fix(SW-016): sync cli-tools before prepare-fusion-plugin`.

## 5. Verification

The following checks passed:

```text
npx vitest run tests/integration/fusion-plugin-build-drift.test.ts
# 1 file, 3 tests passed

git clean -fdX skills
npm run build
# exit 0; all 24 generated sub-skill mirrors restored before prepare

git status --porcelain plugins/fusion-plugin-stelow/skills/
# empty
```

The clean-checkout invariant is now: `npm run build` alone regenerates a byte-for-byte clean plugin skills tree, with no manual restore.

## 6. Install Path

Runtime installation is unchanged. `install.sh` still performs its non-fatal cli-tools sync before flat skill installation, and `plugins/fusion-plugin-stelow/src/skill-installation.ts` still recursively copies the fully bundled plugin skills tree. No runtime plugin source was modified.

## 7. Commit

- Fix: `10edd53` — `fix(SW-016): sync cli-tools before prepare-fusion-plugin`
- Documentation: recorded in the subsequent `docs(SW-016): build-drift fix audit report` commit.
