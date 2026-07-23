# SW-006 Fusion plugin post-merge audit

**Audit task:** SW-007  
**Audited SW-006 commit:** `4418bd7` (`SW-006: add compiled Fusion plugin with bundled skills and install lifecycle`)  
**Fusion source commit:** `d5df6fc63554149f392f84b12e49216e84f91e20`  
**Audit result:** **PASS with one medium defect fixed**. The shipped plugin met the external-plugin and lifecycle contracts after the rollback cleanup fix below. The original SW-006 review failure is classified as review-lane infrastructure noise, not the source-level cause of the defect found by this audit.

## Executive summary

This audit independently checked the SW-006 plugin against the current Fusion source tree at the pinned commit, the Stelow runtime boundaries, the SW-006 PROMPT.md acceptance list, its Completion Criteria, and its per-step Artifacts lines. The plugin metadata, compiled package, 25 skill bodies, reduced-loader deferral, full-runtime registration, idempotency, stale managed update, marker collision behavior, canonical artifact generation, state ownership, tool mapping, pack/extracted loading, and rollback workflow were re-exercised.

One defect was found: on a first install, `installArtifacts` created the `.fusion/plugins/...` and `.fusion/workflows` parent directories before registration/final-rename failure, then removed files but left an empty `.fusion` tree. That violated SW-006's no-partial-output criterion. The fix tracks only directories created by the transaction and removes them after staged/restore files are cleaned, without deleting pre-existing or concurrently populated directories. Mutation-killing real-I/O tests cover registration failure and second-final-rename failure. A separate regression locks the corrected marker-removed → `name collision` fail-closed contract.

No version, CHANGELOG, release, daemon shutdown/update, or unrelated Fusion state was changed.

## Pinned external evidence

The local Fusion checkout was verified with:

```text
git -C /home/deploy/tmp/fusion-sw006-inspect rev-parse HEAD
d5df6fc63554149f392f84b12e49216e84f91e20
```

The reviewed source-of-truth files were under that checkout: `packages/core/src/plugin-types.ts` (public manifest, skill, context and hook shapes), `packages/core/src/plugin-loader.ts` (`createContext`, reduced/full loading, `getPluginSkills`, plugin-root resolution), `packages/core/src/plugin-skill-paths.ts` (declared path and traversal guard), `packages/engine/src/plugin-runner.ts` and `session-skill-context.ts` (plugin-root skill discovery), and `packages/engine/src/agent-tools.ts` (`validateWorkflowIrDryRun`, lines 2775–2800 at the pinned source). The public contract confirms `PluginOnLoad = (ctx: PluginContext) => Promise<void> | void`, `PluginSkillContribution.skillFiles` is plugin-root-relative, and public workflow persistence is through `TaskStore.listWorkflowDefinitions/createWorkflowDefinition/updateWorkflowDefinition/deleteWorkflowDefinition`.

The pinned Fusion source also confirms that `validateWorkflowIrDryRun(store, ir, false)` runs parse/trait/code-node/column-agent checks and returns `{valid:true}` or typed validation errors without creating or mutating a workflow row. The plugin's generated artifact is additionally covered by the local structural validation regression and by the plugin's exact-byte preparation validation.

## Preflight and original symptom evidence

- Initial audit worktree status was clean; initial `git log --oneline -1` was `1199715 chore(SW-007): import dependency content from main`. The dependency commit was confirmed with `git show --no-patch --oneline 4418bd7`; `main` points to SW-006 in this checkout.
- `npm ci`: passed; 458 packages installed. npm reported existing audit advisories (3 moderate, 2 high), unrelated to this audit and no dependency was added.
- Initial `npm run typecheck`: passed.
- Initial `npm run build`: passed and rebuilt 25 skills, artifacts, and `dist/`.
- Focused baseline plugin tests: **3 files, 13 tests passed**.
- The intentional build precondition was reproduced once, before implementation changes: after `rm -rf plugins/fusion-plugin-stelow/dist`, `npx vitest run tests/integration/fusion-plugin-contract.test.ts` failed at `tests/integration/fusion-plugin-contract.test.ts:48` (`stat(.../dist/index.js)`) and `:76` (`readFile(.../dist/index.js)`), both with `ENOENT`. The tree was immediately restored with `npm run build`. This is expected compiled-output precondition behavior, not a defect; the contract test must run after build.
- SW-006's captured failure is historical and was not re-run: `/home/deploy/projects/stelow/.fusion/tasks/SW-006/agent-log.jsonl:2059` contains `Step: Code Review` / `Code Review failed before producing a verdict: failed`; line `:4371` contains `3/3 (0 remaining)`. The SW-006 task row has `column: done`, `reviewLevel: 3`, and no source-level review verdict payload in its persisted `workflowStepResults` for the missing Code Review lane. No Code Review lane was re-executed.

## Acceptance sources re-derived from SW-006 PROMPT.md

The authoritative SW-006 task copy was read from `/home/deploy/projects/stelow/.fusion/tasks/SW-006/PROMPT.md`. Its sources did not conflict: the six `Acceptance:` bullets define contract acceptance; `## Completion Criteria` defines completion semantics; the Step `Artifacts:` lines define deliverables.

### Six `Acceptance:` bullets (SW-006 PROMPT.md lines 18–24)

1. A clean install exposes the Stelow Fusion plugin and installs skills/artifacts in documented locations.
2. Registration is idempotent and leaves no partial output on validation/install failure.
3. Fusion mappings remain `fn_ask_question → ask_user_question` and `fn_spawn_agent → subagent`; `visual_review` remains the `.stelow/approvals/...` fallback and is never Fusion-native.
4. Integration tests exercise real install/registration I/O, malformed rollback, and repeat installation, with concrete file/contract assertions and no mocks/snapshots.
5. Typecheck, impacted integration tests, full `npm test`, build, and test-value/rigor gates pass.
6. `architecture.md` and installation docs are updated only as needed to document the actual plugin path/lifecycle.

### Completion Criteria (SW-006 PROMPT.md lines 246–257)

1. Compiled `fusion-plugin-stelow` is exposed from a clean packed package with valid metadata and zero new runtime dependencies.
2. All 25 canonical skills and nested resources are plugin-root-relative and registered through current Fusion contributions.
3. Settings/workflow bytes come from canonical builders, exact staged bytes parse and structurally validate, and the IR is dry-run compatible before registration.
4. One project-scoped managed workflow is created; repeats are byte-stable with same ID/count; stale managed content updates; collisions/duplicates fail closed.
5. Malformed and injected skill/settings/workflow/install/registration failures preserve prior state with no partial files, rows, temp paths, or backup shells.
6. Tool mappings/fallback remain exact and the plugin adds no shadowing tools.
7. `stelow.json` and existing `.stelow/` content remain untouched.
8. Lint, impacted tests, typecheck, full test, build, scan, and rigor pass with zero failures.
9. Documentation/task document are updated and root version/CHANGELOG remain unchanged.

### Per-step `Artifacts:` lines

- **Step 1:** `plugins/fusion-plugin-stelow/{manifest.json,package.json,tsconfig.json,README.md}`, `src/{index.ts,fusion-contract.ts}`, and `tests/integration/fusion-plugin-contract.test.ts`.
- **Step 2:** `scripts/prepare-fusion-plugin.ts`, `src/{skills.ts,skill-installation.ts}`, generated `skills/*`, and `tests/integration/fusion-plugin-installation.test.ts`.
- **Step 3:** generated `artifacts/settings.json` and `artifacts/workflows/stelow-v2.json`, `src/{artifact-installation.ts,workflow-registration.ts,index.ts}`, and the installation tests.
- **Step 4:** root build/package wiring, generated `dist/*`, and `tests/integration/fusion-plugin-package.test.ts`.
- **Step 5:** the three existing plugin integration tests plus the existing Fusion adapter/generator regressions as required.
- **Steps 6–7:** no separate `Artifacts:` line; the required verification and documentation deliverables are recorded below.

## Evidence by audited surface

| Surface | Evidence and verdict |
|---|---|
| Current Fusion external-plugin contract | Pinned source inspection confirmed `plugin.hooks.onLoad`, `plugin.skills`, plugin-root `skillFiles`, traversal-guarded resolution, reduced store shape, full `PluginContext.taskStore`, and dry-run validation. **PASS** |
| Metadata and compiled entry | Node static audit found root/nested/manifest version `0.54.3`, ID `fusion-plugin-stelow`, 25 manifest skills, nested `dependencies: {}`, correct `main`/exports, and a 3414-byte compiled entry. No private/workspace/yaml runtime imports. **PASS** |
| Skill contribution/discovery | Source and generated tree enumeration found 25 source + 25 plugin directories; every body has matching frontmatter name and non-empty description; each contribution uses `skills/<id>/SKILL.md`. Fusion source threads these through `getPluginSkills()` with `pluginRoot` and `resolvePluginSkillBodyPath`. **PASS** |
| Reduced loader | Existing test `defers in the reduced loader and honors the explicit disabled setting` uses only `getRootDir` for the reduced store and verifies no `.fusion` output; disabled full-store path creates no rows. **PASS** |
| Full runtime | Existing tests cover created/unchanged repeated load, same-ID stale managed update, collision, duplicate managed rows, malformed bytes, registration failure, and final rename failure. **PASS after fix** |
| Atomic artifact writes | `parseArtifactBundle` runs before target creation; both siblings stage before callback; restore errors aggregate; `.tmp`/`.restore` cleanup runs in `finally`. SW-007 added created-parent tracking/cleanup at `artifact-installation.ts:71–107,134–170`. **PASS after fix** |
| Workflow ownership | `workflow-registration.ts` filters the description marker, rejects >1 managed rows and marker-less same-name rows, updates a marker-bearing stale row in place, returns unchanged for stable IR, and creates/deletes through only the public store methods. **PASS** |
| Marker-removed edge | `tests/integration/fusion-plugin-audit-symptom.test.ts:57–71` proves marker removal makes the row unmanaged and same-name registration throws `name collision`, preserving the row. No silent adoption. **PASS** |
| Canonical generation | `scripts/prepare-fusion-plugin.ts:8–12,108–115` consumes only the five canonical builders/serializer/validators; no second stages/transitions/traits/toolMap/settings definition. **PASS** |
| State ownership | Installer targets are exactly `.fusion/plugins/fusion-plugin-stelow/settings.json` and `.fusion/workflows/stelow-v2.json`. Repeat-load test byte-checks root `stelow.json` and `.stelow/keep.txt`. Source scans found no forbidden engine/task/settings targets. **PASS** |
| Tool/fallback boundaries | Contract test and adapter source prove exact native list, mappings, absent native `visual_review`, and `.stelow/approvals/{dirHash}/{file}.approved.md` fallback. Plugin executable source has no native tool literals or `tools` key. **PASS** |
| Distribution | Real package test packs/extracts/loads the nested entry and checks 25 skills, artifacts, metadata, `hooks.onLoad`, and no unresolved runtime dependency. `npm pack --dry-run` completed with one `calionauta-stelow-0.54.3.tgz` name; no tarball was retained. **PASS** |
| CLI dry runs | `fn` is on PATH and the package test passed `fn plugin publish --dry-run`, asserting `Plugin publish preflight passed` and `Declared hook functions: hooks.onLoad`. Direct `fn workflow validate --file ... --json` was attempted, but the source-checkout CLI tried to start embedded PostgreSQL and reported an existing `postmaster.pid`; an isolated HOME invocation timed out during startup. The pinned Fusion source and structural regression establish the no-persistence semantics, but this host-side CLI output is recorded as environment-blocked rather than fabricated as a pass. **QUALIFIED** |
| Muxy/Herdr/UI boundaries | No forbidden legacy/runtime references in plugin source, nested metadata, or plugin tests; no dashboard/UI/tool contribution keys. Bundled skill prose may mention historical Pi terminology, but no Muxy/Herdr/runtime structure is shipped. **PASS** |

## Defect findings and remediation

### Medium — empty `.fusion` directory remained after failed first install (fixed)

**Observed:** Existing rollback tests asserted missing final files and empty workflow rows but did not assert the parent tree. A fresh `installProjectIntegration` failure created parent directories during staging, then left an empty `.fusion` tree after registration or final-rename failure. This violated SW-006 Completion Criteria item 5 and the stated “no partial output” contract.

**Root cause:** `installArtifacts` removed staged/final/restore files in `finally`, but had no ownership record for parent directories created by `mkdir(..., {recursive:true})`.

**Fix:** `plugins/fusion-plugin-stelow/src/artifact-installation.ts:71–107` records missing parent directories before creation and removes only those empty directories after temp cleanup at lines 167–170. Existing directories are never marked for removal; `ENOTEMPTY` is preserved. The existing installation test was strengthened to assert `.fusion` is absent after injected final-rename failure.

**Regression:** `tests/integration/fusion-plugin-audit-symptom.test.ts:46–55` uses a real temporary project and stateful store to inject registration failure and asserts zero rows plus no `.fusion`; lines 72–85 inject second-final-rename failure and asserts the same. The marker-removal regression is at lines 57–71.

Commits:

- `28ae7cd fix(SW-007): clean empty Fusion directories after rollback`
- `29c33a2 test(SW-007): lock marker removal collision behavior`

No functionality was removed, so no changeset was required.

## Verification record

| Command | Result |
|---|---|
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` after deleting generated plugin `skills/artifacts/dist` | PASS; recreated 25 skills, artifacts, and compiled entry |
| Focused plugin baseline | 3 files / 13 tests PASS |
| Final focused command (8 integration files including audit test and Fusion regressions) | **8 files / 51 tests PASS** |
| Full `npm test` (inherited SW-006 Acceptance 5 evidence) | **65 files / 1065 tests PASS** |
| `npm run lint` (repository script is `tsc --noEmit`) | PASS |
| `npx tsx scripts/scan-test-value.ts` | PASS; DELETE 0, REVIEW 0, OK 65; audit test OK (3 tests, 10 assertions) |
| `bash scripts/rigor-scan.sh 60` | PASS; `All test files score >= 60 ✅`; audit test 86 (B), plugin tests 75/83/77 |
| `npx vitest run tests/integration/fusion-plugin-package.test.ts` | PASS; 3 tests including extracted load and publish preflight |
| `npm pack --dry-run` | PASS; prepack/build/sync completed, generated tarball was not retained |
| Fusion clone final revision | PASS: `d5df6fc63554149f392f84b12e49216e84f91e20` |
| Final `git status --short --untracked-files=all` | PASS; clean, with no tarball, temp project, audit clone, or untracked `.fusion` state |
| Version/CHANGELOG/version-sync diff | PASS; unchanged |

## SW-006 acceptance verdict table

| SW-006 acceptance | Verdict | Concrete evidence |
|---|---|---|
| 1. Clean install exposes plugin and documented skills/artifacts | PASS | Metadata/skill static audit, clean build, pack/extract test, 25 bodies and exact installed paths. |
| 2. Idempotent registration and no partial output on failure | PASS after SW-007 fix | Repeat load (`WF-001` created then unchanged), malformed pre-write rejection, injected registration/final-rename tests, and empty-parent cleanup regression. |
| 3. Exact tools and visual fallback | PASS | Contract test plus `extensions/stelow/adapters/fusion.ts` source inspection. |
| 4. Real I/O tests, malformed rollback, repeat installation | PASS | 4 plugin tests + audit test use real filesystem, temp trees, pack/extract, and stateful store; no mocks/snapshots. |
| 5. Required quality gates | PASS | Full suite 65/1065, typecheck, build, lint, focused 8/51, scan 0 DELETE/REVIEW, rigor all ≥60. |
| 6. Docs reflect actual lifecycle | PASS | SW-006 README and `architecture.md`/`docs/INSTALLATION.md` were inspected; audit adds the independent report without changing release docs. |

## SW-006 Completion Criteria verdict table

| Criterion | Verdict | Evidence |
|---|---|---|
| Compiled packed plugin, valid metadata, zero runtime dependencies | PASS | Build, pack/extract tests, static metadata audit. |
| 25 skills and nested resources | PASS | 25/25 source/plugin enumeration, concrete bodies, extraction test. |
| Canonical artifact bytes, parse/structural validation, dry-run compatibility | PASS at plugin boundary; host CLI qualified | Preparation source and generated bytes use canonical five helpers; malformed bytes reject before output; Fusion source confirms dry-run non-persistence; local structural regression passes. Direct CLI was blocked by the already-running embedded PostgreSQL lock and is not claimed as captured valid output. |
| One project-scoped workflow, repeat/stale/collision/duplicate behavior | PASS | Installation/registration tests and marker-removal audit regression. |
| Malformed/injected failures preserve state with no leftovers | PASS after fix | New empty-directory tests plus existing byte/row/temp cleanup coverage. |
| Exact tool/fallback boundary | PASS | Adapter/contract/F2 regression tests. |
| Stelow state untouched | PASS | Byte-preservation test and source target scan. |
| All quality gates | PASS | Verification table above. |
| Documentation/task document/version unchanged | PASS pending this report document write | This report is the requested documentation deliverable; root version, CHANGELOG, and version-sync list have no diff. |

## Step-artifact verdict table

| Step | Declared artifacts | Verdict |
|---|---|---|
| 1 | Plugin metadata/README, `src/index.ts`/`fusion-contract.ts`, contract test | PASS; inspected and pack-loaded. |
| 2 | Preparation script, skill installer/contributions, generated skill tree, installation test | PASS; 25 generated trees and real I/O tests. |
| 3 | Generated settings/workflow artifacts, artifact installer, workflow registration, entrypoint, installation test | PASS after remediation; rollback fix is within declared scope. |
| 4 | Root package/build wiring, generated dist, package test | PASS; clean build and real pack/extract/preflight. |
| 5 | Contract/installation/package tests and existing Fusion regressions | PASS; final focused run 8 files/51 tests. |
| 6 | No separate Artifacts line; verification commands | PASS except host CLI is explicitly qualified as infrastructure-blocked. |
| 7 | No separate Artifacts line; docs/task document | PASS after this report and task document write. |

## Review-lane classification

The original symptom is not reproducible from Stelow's source: the Code Review lane emitted no verdict or source-level feedback. The persisted log records the empty-verdict message at line 2059 and retry exhaustion at line 4371; no review lane was re-run. This matches the class of Fusion review-infrastructure failures documented by the Fusion review-lane history (including Runfusion/Fusion#1946's “no feedback captured” dispatch defect). The audit therefore used the required proxy: independent current-HEAD contract inspection, clean build, focused and full tests, real package extraction, plugin publish preflight, stateful lifecycle tests, and mutation-killing rollback tests.

The only source defect found was not represented in the failed review payload: stale empty parent directories after rollback. It is now fixed and independently covered. The missing-`dist` ENOENT is separately classified as an intentional build precondition, not a defect, and was not recreated during final verification.

## Scope and cleanup

- Changed only SW-006 plugin scope, its existing installation test, and the narrowly named audit regression test.
- No `scripts/verify-fusion-plugin.sh` or engine-import fallback was added because `fn` is on PATH; the publish preflight path was exercised by the existing package test. The workflow CLI path remains qualified above because starting the CLI in this hosted environment conflicts with the already-running embedded PostgreSQL process.
- No daemon shutdown/update, release, package-version change, CHANGELOG change, `.changeset` change, UI/dashboard work, Muxy/Herdr revival, private dependency, tarball, or unrelated `.fusion` state was committed.
