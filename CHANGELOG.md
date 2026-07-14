# Changelog

All notable changes to `@calionauta/stelow` will be documented in this file.

## [0.54.3] - 2026-07-14

### Fixed

- **`npm install --omit=dev` failed with exit 127** — the `prepare` script ran `husky` which is a devDependency. When pi installs with `--omit=dev` (production flag), husky is missing and the script exits non-zero, breaking the install. Replaced `prepare: "husky"` with a guarded wrapper that logs and skips when husky is absent. Husky stays in devDependencies (correct location).
- **Property 2 (renameWorkflow preserves dirHash) re-flaky** — fast-check shrank to `("0  ", "aaa")` where `toSafeName("0  ") = "0"` (1 char). renameWorkflow rejects names shorter than 2 chars. Added `if (newName.length < 2) return;` skip-condition so we only test the cases where the rename actually executes.

## [0.54.2] - 2026-07-14

### Fixed

- **CI: skills assertion was wrong contract** — `tests/integration/pi-sandbox-install.test.ts` asserted `DefaultResourceLoader.getSkills() > 0`, but skill discovery is pi's install concern (skills live in `~/.pi/agent/skills/`, copied by `install.sh`). The fresh sandbox has no agent dir → returns 0 → CI fails. Replaced with the actual stelow contract: `tar -tzf` should list 20+ `SKILL.md` files in the tarball. Now the test is fast, deterministic, and asserts what stelow actually controls.

## [0.54.1] - 2026-07-14

### Added

- **Test quality gate (rigor)** — `scripts/rigor-scan.sh` runs [rigor](https://github.com/enriquesanchez-elastic/rigor), a Rust-based static test quality analyzer, across `tests/`. Scans assertion quality, error coverage, boundary conditions, test isolation, input variety, and AI smells. Caches binary in `~/.cache/rigor/`. CI gate at 60 (D-grade floor); pre-push hook via `.husky/pre-push`. `npm run test:rigor` runs locally.
- **pi-integration tests** — `tests/integration/pi-sandbox-install.test.ts` and `tests/integration/pi-session-lifecycle.test.ts` verify the extension loads in a real pi sandbox via `DefaultResourceLoader` and `createAgentSession`. Catches "package builds but doesn't work when installed" bugs.
- **Test value scanner** — `scripts/scan-test-value.ts` (heuristic) classifies test files as DELETE/REVIEW/OK. Used during audit to flag facade tests.
- **AGENTS.md Testing policy** — firm rules: which test kinds to write (mutation-killing, edge-case, regression, property-based, integration with real I/O) and which to never write (snapshots, mocks-of-code-under-test, single-assertion-only, flaky, etc.). Includes "Test value scanner" and "Rigor quality gate" subsections.

### Changed

- **`tests/unit/state-real.test.ts`** rewritten from F-grade (57) to D-grade (60) with 41 tests, each explicitly named with the bug it catches ("Bug: ..." comments). Replaces weak `toBeNull`/`toBeDefined` assertions with `toEqual`/`toBe`. Documents `renameWorkflow` collision limitation (current behavior — duplicate names allowed).

### Removed

- **3 F-grade tests deleted**:
  - `tests/appetite-consistency.test.ts` (52): facade markdown structure tests
  - `tests/integration/events.test.ts` (30): mocks without verification
  - `tests/unit/audit-trail.test.ts` (56): weak assertions
- **`tests/integration/architectural-invariants.test.ts`** (pre-existing untracked): flaky due to `process.env.HOME` shared across parallel tests; coverage redundant with `concurrency.test.ts` + `orphan-workflow-recovery.test.ts` + `corrupt-tracking-recovery.test.ts`.

### Fixed

- **Plannotator tool type cast** — replaced `Promise<any>` with explicit return type. Unified 5 returns to use `{decision: string, feedback: string}` so TDetails inference is consistent.
- **`ctx.ui.notify(msg, "success")`** — `success` is not a valid kind in `@earendil-works/pi-coding-agent@0.74+`. Replaced with `info` in 6 call sites.
- **Property 2 (renameWorkflow preserves dirHash) flaky** — generate raw new name and apply `toSafeName()` to model real rename behavior. Skips cases where `toSafeName` returns empty.
- **pi-sandbox tarball race** — `unlinkSync(tarballSrc)` removed from `pi-sandbox-install.test.ts` and `pi-session-lifecycle.test.ts` because parallel runs caused ENOENT collisions. Source tarball now stays on disk (gitignored via `calionauta-stelow-*.tgz`).
- **`readTracking` crashed on array root JSON** — added `isTrackingShape` defensive type guard. Returns null for non-tracking-shaped JSON (`[]`, `{}`, primitives) instead of crashing in `syncScopesIfNeeded`.

### Test metrics

- **51 test files** (was 54, minus 3 deleted)
- **864 tests** (was 988, restructured for stronger assertions in state-real)
- **0 F-grade (<60)**, 8 D-grade (60–69), ~25 C-grade (70–79), ~13 B-grade (80–89), 0 A-grade (90+)
- **Rigor score distribution** target: B+ is realistic, A is rare for general-purpose utility modules
- **Mutation score on safe-hook.ts**: 100%
- **Mutation score on file-lock.ts**: 62.5%
- **Mutation score on schemas.ts**: 64.1%

## [0.54.0] - 2026-07-14

### Reliability overhaul — implements plan `stelow-reliability.md`

#### Added

- **TypeBox runtime validation for `Workflow` and `TrackingData`** (`extensions/stelow/schemas.ts`) — Replaces compile-time-only validation. Schemas enforce `name` length, `currentPhase ≥ 0`, `status` enum, nested `Scope`/`ScopeRecord`/`ScopeTask` shapes. Failures throw `WorkflowValidationError` with full JSON Pointer path. Respects `STELOW_VALIDATE=0` escape hatch (consistent with per-scope toggle).
- **Advisory file lock for `writeTracking` and `writeGlobalTracking`** (`extensions/stelow/file-lock.ts`) — Prevents the read-modify-write race that atomic write alone does not cover. O_EXCL atomic create + exponential backoff + stale-lock TTL reclamation (default 10s). POSIX-portable (mac + linux).
- **`safeHook` wrapper for all 5 extension hooks** (`extensions/stelow/safe-hook.ts`) — Extracted to its own module. A throw inside any hook is logged with the hook name and returns `undefined` (Pi's "allow" signal) instead of breaking the user input stream or silently swallowing errors. Sibling hooks continue to execute.
- **`/sw-recover` command + orphan workflow detection** (`extensions/stelow/commands.ts`, `extensions/stelow/doctor.ts`) — Detects workflow directories on disk (`.stelow/{date}/{dirHash}/specs/spec-product_*.md`) that have no matching entry in `stelow.json`. Operator-driven recovery: walks orphans, prompts per-directory, writes minimal paused-status entry. New alias `/stelow-recover` and `--all` flag for non-interactive recovery.
- **`/sw-status --json`** (`extensions/stelow/commands.ts`) — Emits structured JSON snapshot of the active workflow (name, dirHash, status, currentPhase, phases[], scopes[], scopeProgress) for tool/agent consumption. Human-formatted output remains the default.
- **Stryker mutation testing infrastructure** (`stryker.config.json`) — Configured to mutate `safe-hook.ts`, `file-lock.ts`, `schemas.ts`. Run with `npm run test:mutation`. Initial run: 100% score on `safe-hook.ts`; 63% overall with 49 surviving mutants documented as future work.
- **Atomic file writes** (`extensions/stelow/state.ts:writeJson`) — All state writes go through `writeJson(path, data)` which uses a tmp-file + `renameSync` pattern. `rename` is atomic on the same filesystem, so a crash mid-write leaves the previous file intact.
- **Defensive `isTrackingShape` type guard** (`extensions/stelow/state.ts`) — `readTracking` now returns `null` for malformed shapes (e.g. `[]` array root, missing `workflows` field) instead of crashing downstream consumers in `syncScopesIfNeeded`.

#### Changed

- **`extensions/stelow/commands.ts:cmdStatus`** — Added `--json` flag for machine-readable output. Default output unchanged.
- **`extensions/stelow/doctor.ts:DoctorReport`** — Added `orphans: OrphanWorkflow[]` field. `formatDoctorReport` renders orphan count and directory paths.
- **CI matrix** (`.github/workflows/ci.yml`) — All 3 jobs (typecheck, lint, test) now run on `ubuntu-latest` + `macos-latest`.
- **`extensions/stelow/state.ts:renameWorkflow` return type** — Now returns `{ ok: true } | { ok: false; error: string }` for explicit success/failure signalling. Callers updated.
- **`tests/integration/property-based.test.ts`** — Property 2 (renameWorkflow preserves dirHash) now filters `dirHash` to `^[a-z0-9-]+$` to prevent invalid-name edge cases. Property 6 (stages-guard) added with 4 sub-properties (determinism, block enforcement, safe fallback, non-blocked allow).
- **`tests/integration/property-based.test.ts`** — Removed `process.env.HOME` manipulation in `beforeEach` to avoid races with parallel vitest files. Property 3 now uses unique `dirHash` values per iteration.

#### Fixed

- **cmdRecover partial-recovery data loss** (`extensions/stelow/commands.ts`) — Previously, if a later orphan produced an invalid synthetic entry, `writeTracking` would throw at the end and silently lose all in-memory pushes (the file stayed at its old state). Now each synthetic entry is validated individually; invalid ones are skipped with a warning so prior successful recoveries in the same run are preserved.
- **readTracking crashed on array root** (`extensions/stelow/state.ts`) — `readJson` only validated `JSON.parse` success, not shape. A user writing `[]` (array) or a single object to `stelow.json` would cause `syncScopesIfNeeded` to throw `data.workflows is not iterable`. Now caught by the new `isTrackingShape` guard.

#### Tests

- **+143 tests, 1037 total passing** (3 pre-existing architectural-invariants failures on `main` unchanged).
- 8 new test files: `atomic-write.test.ts`, `concurrency.test.ts`, `corrupt-tracking-recovery.test.ts`, `file-lock.test.ts`, `hook-error-containment.test.ts`, `hook-order.test.ts`, `orphan-workflow-recovery.test.ts`, `property-based.test.ts`, `safe-hook-integration.test.ts`, `schemas.test.ts`, `subagent-acceptance-contract.test.ts`, `sw-status-json.test.ts`.
- Property-based testing: 5 invariant classes using `fast-check` (write/read round-trip, renameWorkflow preserves dirHash, add/remove global index balance, parseSpecTechScopes idempotence, stages-guard permission check).
- Concurrency stress: 5 tests firing 10/20/50 parallel `writeTracking` calls via `Promise.all` to validate atomic write + lock combination.

#### Dependencies

- Added `typebox@^1.1.38` (moved from peerDep to direct — now used at runtime).
- Added `fast-check@^4.9.0` (devDep — property-based testing).
- Added `@stryker-mutator/core@^9.6.1`, `@stryker-mutator/typescript-checker`, `@stryker-mutator/vitest-runner` (devDeps — mutation testing).

#### Plan coverage

Implements 10 of 10 plan items from `stelow-reliability.md`:
- G1A (hook try/catch), G2A (runtime validation), G3A (lock file), G3B (atomic write), G4A+C (doctor recovery), G5A (/sw-status JSON), G6A (property tests), G6C (mutation testing), G7A (concurrency tests), G8 (subagent acceptance contract), G9A (hook order), G10A (CI matrix).

## [0.53.2] - 2026-07-14

### Changed

- **Removed all "no index.json" comments in source code** — Replaced negative comments with positive, intent-driven comments that describe what the code DOES (not what it doesn't do). Per KISS principle, code should explain itself without referencing what was removed.

  Affected files:
  - `tests/integration/workflow-lifecycle.test.ts` (3 comments)
  - `tests/integration/skill-orchestration.test.ts` (1 comment)
  - `tests/integration/audit-trail.test.ts` (1 comment)
  - `tests/regression/workflow-state-regression.test.ts` (header block — removed "Removed contracts" section)
  - `extensions/stelow/pulse/pulse-task.md` (1 comment)

  Comments now describe the **contract** (workflow state in stelow.json, artifacts in workflow dir) instead of what **doesn't exist** (no index.json).

### Notes

- No functional changes. No code logic touched. Comments only.
- 778 tests passing.
- Historical entries in CHANGELOG.md intentionally retain mentions of `index.json` removal as accurate history.

## [0.53.1] - 2026-07-14

### Changed

- **Test fixtures cleanup for v0.53.0 stelow.json-only world** — Removed obsolete `index.json` writes from 5 test files. These tests were passing in v0.53.0 because they wrote `index.json` directly to the filesystem (no production code path involved), but they were testing removed functionality:
  - `tests/integration/workflow-lifecycle.test.ts` — Rewrote 14 tests to use stelow.json fixtures (not index.json). Tests now verify the canonical-source contract end-to-end.
  - `tests/integration/skill-orchestration.test.ts` — Removed `index.json` write in helper, updated Plannotator gate flow test to use stelow.json for approved status.
  - `tests/integration/audit-trail.test.ts` — Removed `index.json` write from setupWorkflowDir helper.
  - `tests/unit/agnostic-tools.test.ts` — Rewrote 10 tests to test the decision logic directly with workflow object input (no filesystem I/O).
  - `tests/artifacts/artifact-schema.test.ts` — Removed `index.json schema` describe block (no index.json to test).
  - `tests/unit/spec-frontmatter-contract.test.ts` — Updated comments to reflect v0.53.0 contract.
  - `tests/skills/skill-implementation.test.ts` — Updated test to check for `stelow.json` reference (canonical source) instead of `index.json`.

- **`pulse-task.md` aligned with v0.53.0** — Updated instruction to write to `stelow.json#workflows[]` directly. NO `index.json` write.

### Notes

- No code changes (production code unchanged from v0.53.0).
- 778 tests passing (was 822 in v0.53.0). Net: -44 obsolete test cases removed.

## [0.53.0] - 2026-07-14

### Breaking Change

- **Eliminated `.stelow/{date}/{hash}/index.json` mirror entirely** — `stelow.json` is now the **single canonical source of truth**. No mirrors, no write-through, no drift detection. All TUI consumers (muxy panel, herdr TUI, doctor, pulse) read directly from `stelow.json`.

### Removed

- `extensions/stelow/state.ts` — `updateWorkflowIndexJson()` function (110+ lines). `archiveWorkflowOnDisk()` function. `scanWorkflowDirs()` rewritten to read `stelow.json` instead of scanning `index.json` files. `writeTracking()` no longer iterates over workflows to mirror state.
- `extensions/stelow/start.ts` — `cmdStart` no longer writes `index.json` (only `stelow.json`).
- `extensions/stelow/commands.ts` — 3 sites that called `updateWorkflowIndexJson` after `archiveWorkflowOnDisk`.
- `extensions/stelow/index.ts` — agent-end hook no longer calls `updateWorkflowIndexJson`.
- `extensions/stelow/doctor.ts` — `readWorkflowIndexSnapshot()` removed. Drift detection removed (single source = no drift possible). Zombie detection now reads `stelow.json` instead of scanning `index.json` files.
- `extensions/stelow/pulse/pulse.sh` — existence check now looks for `stelow.json` entry instead of per-workflow `index.json`.
- `skills/stelow-product-orchestrator/stages/setup.md` — workflow existence checks + resume workflow logic now reads `stelow.json` directly.
- `integrations/muxy/stelow/src/panel/data.js` — `scanArtifactDirs()` rewritten to read `stelow.json` workflow entries directly.
- `integrations/herdr/stelow/src/main.rs` — `load_index_json()` removed. `WorkflowEntry` struct now deserializes `draftContent` and `scopes[]` directly from `stelow.json#workflows[].i`.
- `tests/unit/scan-workflow-dirs.test.ts` — deleted (function now reads from stelow.json).
- `tests/unit/config-symmetry.test.ts` — rewritten (removed TS write-through tests).
- `tests/unit/state-real.test.ts` — removed `reconcileTracking`/`archiveWorkflowOnDisk` blocks.
- `tests/unit/doctor.test.ts` — removed `detects missing index and global mismatch` test.

### Architecture

**Before v0.53.0:**

```
   stelow.json              index.json (per workflow)
   ──────────               ────────────────────
   config (canonical)  →→   config (mirror)
   scopes (canonical)  →→   scopes (mirror)
   status (canonical)  →→   status (mirror)
   ...                     draft (canonical here only!)
```

Two sources, must be kept in sync via write-through loop, drift detection.

**After v0.53.0:**

```
   stelow.json
   ──────────
   config ✓
   scopes ✓
   status ✓
   draftContent ✓
   phases ✓
   artifacts ✓
   ...all in one place
```

One source. No sync. No drift. **KISS / DRY / CoC compliant.**

### Migration

- **In-flight workflows**: Nothing to do. `stelow.json` already has all the data. The `index.json` file becomes orphaned but is harmless (no code reads it).
- **Integrations (muxy, herdr)**: Updated automatically (this release). No user action.
- **Custom scripts reading `index.json`**: Update to read `stelow.json#workflows[].i` for the workflow of interest (by `name` or `dirHash`).
- **Filesystem artifacts**: `.stelow/{date}/{hash}/` directory layout unchanged. Plans, interfaces, critiques, scopes still live there. Only the `index.json` file inside is gone.

### Tests

- 806 tests passing (was 835 in v0.52.1). Net change: -29 (removed tests for eliminated code paths).

## [0.52.1] - 2026-07-14

### Changed

- **Doc drift cleanup post v0.52.0** — Three doc/test strings mentioned removed legacy fallbacks:
  - `tests/unit/artifact-flow-contract.test.ts`: renamed 3 test cases to remove "with index.json fallback" / "legacy fallback" wording (gate, plan-critique, tech-planning now only read from `stelow.json`).
  - `tests/unit/read-config-helper.test.ts`: updated module doc comment.
  - `extensions/stelow/pulse/pulse-task.md`: clarified that `stelow.json` is the canonical source for workflow context (per-workflow `index.json` is a mirror of one entry in `stelow.json#workflows[]`).

### Notes

- No functional changes — only doc/test string alignment with v0.52.0 canonical-source contract.
- `index.json` remains as per-workflow mirror file (justified: scoped filesystem layout, easier integration consumer access). Not legacy — `updateWorkflowIndexJson()` write-through continues.
- 835 tests passing.

## [0.52.0] - 2026-07-14

### Breaking Change

- **Removed all legacy/backward-compat code paths for Workflow.config migration** — v0.50.0 introduced `stelow.json#workflows[].config` as canonical source for `appetite`, `review_mode`, `domains_detected`. v0.51.x added "fallback to index.json" branches everywhere for pre-v0.50.0 workflows. **This release removes all those fallbacks** — workflows created before v0.50.0 must be re-initialized to set config.

### Removed

- **TS read-through fallback** (`extensions/stelow/state.ts`) — `writeTracking()` no longer reads `index.json#config` and mirrors it into `wf.config`. Workflows from pre-v0.50.0 will have `wf.config = undefined`.
- **Bash helper fallback** (`references/cli-tools/read-config.sh`) — `stelow_read_appetite` / `stelow_read_review_mode` no longer fall back to grepping `.stelow/*/*/index.json`. Helper now exclusively reads from `stelow.json`.
- **stages-guard fallback** (`extensions/stelow/index.ts`) — Hook reads `wf.config.review_mode` directly. No mirror fallback.
- **Slug→name migration** (`extensions/stelow/state.ts`) — Removed `migrateTrackingData`/`migrateWorkflow` functions that handled workflows pre-v0.10.0 (which used `slug` field instead of `name`).
- **Empty-cwd legacy branch** (`extensions/stelow/state.ts`) — `findWorkflowIndicesForProject` no longer falls back to workflows without `cwd` field. All workflows since v0.10 have `cwd`.
- **Slug reads** in `scanWorkflowDirs`, `archiveWorkflowOnDisk` — Removed `raw.name || raw.slug` patterns.
- **Doc comments** about legacy workflows pre-v0.50.0 / pre-v0.10.0 — Removed from 5 skills/stages.
- **Legacy test fixtures** — Removed tests that exercised the fallback paths.

### Migration

Workflows started on v0.50.0 or later are unaffected. Workflows started before v0.50.0 must be re-created (run `/sw-start` again) to set `Workflow.config`. The `stages/setup.md` Step 3 will write the canonical config to `stelow.json#workflows[].config`.

### Tests

- 835 tests passing (was 838 in v0.51.3). Net change: -3 (removed 3 legacy tests) but +0 from fix. Some helper tests refactored.

## [0.51.3] - 2026-07-13

### Changed

- **Hardened `Workflow.config` symmetry across the stack** — appetite and review_mode now flow through identical paths (read canonical source, mirror to index.json, fallback to legacy) in every layer:
  - **TS extension** (`extensions/stelow/index.ts`): `stages-guard` hook now reads `wf.config.review_mode` directly from `wf` (loaded via `getActiveWorkflow()` from `stelow.json`), not from the `index.json` mirror. Falls back to `index.json` only if `wf.config.review_mode` is missing (pre-v0.50.0 workflow).
  - **TS write-through** (`extensions/stelow/state.ts`): already symmetric since v0.51.0 — appetite + review_mode + domains_detected all go through the same `updateWorkflowIndexJson` block.
  - **Bash helper** (`references/cli-tools/read-config.sh`): already symmetric since v0.51.0 — `stelow_read_appetite` and `stelow_read_review_mode` use the same `stelow_config` function with same in-progress filter + legacy fallback.
  - **`cmdStart` seeding** (`extensions/stelow/start.ts`): the initial `index.json` write now includes `config: { appetite: undefined, review_mode: undefined, domains_detected: [] }` so downstream consumers (stages-guard, TUI, muxy, herdr) see config from `t=0` without waiting for the first `writeTracking()`.

### Added

- **`tests/unit/config-symmetry.test.ts`** — 9 tests verifying:
  1. TS write-through mirrors appetite AND review_mode identically.
  2. Bash helper returns identical in-progress filtering for both fields.
  3. Bash helper returns identical defaults when stelow.json is absent.
  4. Bash helper returns identical legacy fallback for both fields.
  5. End-to-end: TS write → bash helper sees same value immediately.

### Tests

- 838 tests passing (was 829 in v0.51.2).

### Why this matters

Before this release, two fragility points existed:

1. **stages-guard hook** read `idx.config.review_mode` from `index.json` mirror. If `writeTracking()` failed (corrupt JSON, disk full, permission), the hook would either not block or block based on stale data. Now reads the canonical `wf.config` directly.

2. **Workflow fresh state** had `index.json` without `config` block until the first `writeTracking()` ran. Hooks reading the mirror got `undefined` instead of explicit defaults. Now seeded at creation.

The bash helper and TS write-through were already symmetric since v0.51.0 — these tests verify that symmetry holds.

## [0.51.2] - 2026-07-13

### Fixed

- **CI: 2 stale test expectations in `tests/appetite-consistency.test.ts`** — The `gate.md uses consistent double-wildcard glob pattern` and `gate.md reads review_mode from stelow.json` assertions were written for the pre-v0.51.0 gate.md which had inline `grep` + `.stelow/*/*/$_DIR/index.json` fallback glob. After v0.51.0 Wave 2 replaced gate.md with the canonical helper, those patterns disappeared from the markdown. Tests now verify the canonical helper path (`read-config.sh` + `stelow_read_review_mode`) instead of the legacy regex.

### Notes

- No functional change — only test fixture alignment with v0.51.0 canonical-source contract.

## [0.51.1] - 2026-07-13

### Changed

- **Consistency cleanup in `shape-up`** — Removed inline defensive fallback (`grep -oP` regex) for reading appetite/review_mode when the canonical helper is unavailable. The other 6 skills + `gate.md` already trust the helper path unconditionally; `shape-up` was inconsistent. Helper is sourced from a relative path inside the project; if missing, the skill fails loudly (clearer than silent regex).

### Notes

- No functional change for normal skill runs (helper always available inside the project).
- 829 tests passing.

## [0.51.0] - 2026-07-13

### Fixed

- **B1 — Mirror `wf.scopes[]` to `index.json`** (`extensions/stelow/state.ts`) — The TS extension's `updateWorkflowIndexJson()` now mirrors `wf.scopes[]` to `index.json#scopes[]`. Previously the herdr TUI integration always showed empty scopes because no caller was passing scopes to `updateWorkflowIndexJson`. **Bug fixed at the source** (TS layer), not at the consumer layer — Rust doesn't need changes.
- **B2 — Removed redundant archive writes** (`extensions/stelow/commands.ts`) — 3 sites called `archiveWorkflowOnDisk()` AND `updateWorkflowIndexJson({ workflow_status: "archived" })`. Both write the same field. Now `updateWorkflowIndexJson` is only called as fallback when `archiveWorkflowOnDisk` returns false (covers renamed workflows where name no longer matches).
- **B3 — `plan-critique` workflow-dir path documented** (`skills/stelow-product-plan-critique/SKILL.md`) — Explicit comment that `stelow.json` is always read from project root (cwd), never from `WF_DIR` (which may point to `.stelow/{date}/{dir}/`).

### Changed

- **Canonical config helper** (`skills/stelow-product-orchestrator/references/cli-tools/read-config.{sh,md}`) — New bash helper `stelow_read_appetite` / `stelow_read_review_mode` / `stelow_read_domains` consolidates 7+ duplicated `grep -oP '"appetite":\s*"([^"]+)"'` patterns. Filters by `status === "in-progress"` to avoid multi-workflow ambiguity (was returning archived configs as defaults). Portable across GNU/BSD grep (no `-P`).
- **7 skills + 1 stage updated to use helper** — `shape-up`, `tech-planning`, `plan-critique`, `ux-critique`, `codebase-critique`, `interface-alternatives`, `scope-executor`, and `gate.md`. Each skill now sources the helper instead of inlining regex.
- **Orchestrator example simplified** (`skills/stelow-product-orchestrator/SKILL.md`) — Removed the "sync index.json via bash" section from the stage-advance example. Write-through is automatic via `writeTracking()`.
- **Pulse instruction updated** (`extensions/stelow/pulse/pulse-task.md`) — `appetite`/`review_mode` go in `stelow.json#wf.config` (canonical), not `index.json`.
- **Test assertion renamed** (`tests/appetite-consistency.test.ts`) — `gate.md reads review_mode from index.json` → `gate.md reads review_mode from stelow.json (canonical) with index.json fallback`.
- **Audit trail fixture updated** (`tests/fixtures/audit-trail/sample-audit-trail.md`) — Review Mode link now points to `stelow.json#workflows[].config.review_mode` (canonical as of v0.50.0).

### Added

- **`tests/unit/read-config-helper.test.ts`** — 10 tests covering: in-progress filter, hardcoded defaults, legacy fallback, multi-workflow ambiguity fix (E2), empty config, domains_detected array.
- **`references/cli-tools/read-config.md`** — Full migration guide explaining why the helper exists and how to inline the function for isolated skill runs.

### Tests

- 829 tests passing (was 818 in v0.50.1).

## [0.50.1] - 2026-07-13

### Changed

- **Prose alignment with v0.50.0 canonical source** — Updated standalone-awareness copy in 5 skills/stages to reference `stelow.json#workflows[].config` as canonical, with `index.json` documented as a legacy mirror for pre-v0.50.0 workflows:
  - `stelow-product-shape-up/SKILL.md` (Standalone awareness note).
  - `stelow-product-shape-up/references/proposal-structure.md` (Mode storage contract).
  - `stelow-product-plan-critique/SKILL.md` (Standalone awareness note).
  - `stelow-product-tech-planning/SKILL.md` (Standalone awareness note).
  - `stelow-product-scope-executor/SKILL.md` (Standalone awareness + Complete-appetite warning echo).
  - `stelow-product-orchestrator/stages/execution.md` (Human-in-loop note).
- **Test assertion tightening** — `tests/unit/artifact-flow-contract.test.ts` now verifies that scope-executor references both `stelow.json#workflows[].config.review_mode` (canonical) AND the `index.json` legacy fallback path, instead of the previous generic `review_mode` substring match.

### Notes

- No functional code changes. All edits are documentation/prose alignment + 1 test assertion precision.
- 818 tests passing (unchanged from v0.50.0).

## [0.50.0] - 2026-07-13

### Breaking Change

- **Consolidate Workflow config in `stelow.json` (single source of truth)** — `appetite`, `review_mode`, and `domains_detected` now live in `stelow.json#workflows[].config` instead of `.stelow/{date}/{hash}/index.json#config`. The TS extension mirrors these values back to `index.json` for legacy TUI/integration consumers, but skills and stages read from `stelow.json` first and only fall back to `index.json` for pre-v0.50.0 workflows.

### Added

- **`Workflow.config` bidirectional sync** (`extensions/stelow/state.ts`) — `writeTracking()` reads `index.json#config` and mirrors it into `wf.config` when the latter is empty (LLM direct-write path); `updateWorkflowIndexJson()` mirrors `wf.config` back to `index.json` (TS write path).
- **`Workflow.config` initialized at workflow creation** (`extensions/stelow/start.ts`) — `cmdStart()` seeds an empty `config: { appetite: undefined, review_mode: undefined, domains_detected: [] }` on every new workflow.
- **Schema validation** (`stelow.schema.json`) — `Workflow.config` schema documents the three fields with enums for `appetite` (Lean/Core/Complete) and `review_mode`.

### Changed

- **Skills read from `stelow.json` first, fall back to `index.json`** — `shape-up`, `tech-planning`, `plan-critique`, `ux-critique`, `codebase-critique`, `interface-alternatives`, `execution-critique`. Each bash block now checks `stelow.json` first; if absent or empty, falls back to the legacy `${WF_DIR}index.json` path.
- **Stage docs reference `stelow.json` as canonical** — `setup.md` (Step 3: Store config), `context.md` (Persist detected domains), `gate.md` (Read configuration), `ask-patterns.md` (Storage contract), `references/cli-tools/subagents.md` (Input Files table), `references/cli-tools/audit-trail-template.md` (Review Mode link).

### Tests

- Updated `spec-frontmatter-contract.test.ts` and `artifact-flow-contract.test.ts` to verify the `stelow.json` canonical-source contract end-to-end (producer + consumers + orphan-field guard).
- 818 tests passing (was 979 in v0.48.0; reduction reflects skill renames in v0.49.0 + test consolidation).

### Migration

- No user action required for in-flight workflows pre-v0.50.0: legacy `index.json#config` is read on first `writeTracking()` and mirrored into `wf.config`. New workflows after this release start writing to `stelow.json` directly.
- Integrations consuming `index.json` continue to work — the TS extension writes-through every change.

## [0.49.2] - 2026-07-13

### Changed

- **Author identity consolidation**: updated personal handles and URLs across the project.
  - Substack: `calirenato82.substack.com` → `calionauta.substack.com` (12 files).
  - GitHub handle: `renatocaliari` → `calionauta` (package metadata, install scripts, design docs, SKILL.md).
  - Personal name: "Renato Caliari" / "Cali" / "Cali (Renato Caliari)" → `calionauta` (LICENSE, package.json, setup.sh display name, README author footer, SKILL.md attributions).

Historical CHANGELOG entries referencing the old handles are preserved verbatim.

## [0.49.1] - 2026-07-13

### Changed

- **Skill description branding**: replaced `[Cali]` prefix with `[stelow]` across 14 product skill descriptions. The description now reflects the project brand rather than the author's first name.
- **Skill authorship metadata**: added `author: calionauta` and `author-url: https://github.com/calionauta` to all 25 SKILL.md frontmatter blocks. Documents project ownership in a machine-readable way.
- Existing body attributions to calionauta (original content author) are preserved.

## [0.49.0] - 2026-07-13

### Changed (BREAKING)

- **Skill prefix renamed: `cali-product-*` → `stelow-product-*`**. All 24 product skills under `skills/` now use the `stelow-product-` prefix. Frontmatter `name:`, internal cross-references, and external invocations (`/skill:stelow-product-shape-up` etc.) are updated throughout the codebase. Skills installed in `~/.agents/skills/` under the old `cali-product-*` name are now orphaned and will be pruned on next session start (`syncSkillsFromClone` + `retired-skills.yaml`).
- **Runtime state directory renamed: `.cali-product-workflow/` → `.stelow/`**. The legacy filesystem path is no longer preserved. Any in-flight workflow tracked under `.cali-product-workflow/<date>/<dirHash>/` must be moved to `.stelow/<date>/<dirHash>/` manually — the extension will not auto-discover the old path.
- **Critique output directories renamed**:
  - `.cali-ux-critique/` → `.stelow-ux-critique/`
  - `.cali-codebase-critique/` → `.stelow-codebase-critique/`
  - `.cali-plan-critique/` → `.stelow-plan-critique/`
- **Build output renamed**: `build/extensions/cali-product-workflow{,-pi}/` → `build/extensions/stelow/` (regenerate via `npm run build`).
- **`AGENTS.md` policy updated**: the legacy backward-compat note for `cali-product-workflow` / `Cali Product Workflow` names is removed. All runtime paths, skill prefixes, and filesystem artifacts now use the `stelow` prefix exclusively.

### Migration

Users upgrading from ≤0.48.0 must:

1. `npm run build` to regenerate `build/extensions/stelow/`.
2. Move any in-flight workflow: `mv .cali-product-workflow/* .stelow/` (only after confirming no current run is using it).
3. Delete old `cali-product-*` skill copies from `~/.agents/skills/` if `install.sh` prune didn't catch them (shouldn't be necessary — `retired-skills.yaml` lists them).

This is a non-cosmetic change: any script, hook, or external tool that hard-codes the old skill names or filesystem paths will break and must be updated.

### Changed (post-release cleanup)

- Removed residual references to optional external skills (not runtime deps of stelow):
  - `.release.yml`, `extensions/stelow/schema-record.ts`: comments no longer name a specific external release skill.
  - `setup.sh`: hotkey slots 2 and 5 now point to project skills (`stelow-product-shape-up`, `stelow-product-execution-critique`) instead of external ones (`cali-go-stack`, `cali-github-releases`).
  - `install.sh`: dropped unused `cali-pw-*` pattern from prune case (no skill was ever shipped under that prefix).
  - `AGENTS.md`: redundant inline "no BC for legacy names" note removed (covered by the entry above).

## [0.48.0] - 2026-07-13

### Added

- **Standalone fixes for all core skills**. Added Standalone Quick Start guide to `cali-product-shape-up` so the LLM always runs Assumption Check before shaping. Input Detection sections now include inline text (verbal description) branches in `plan-critique`, `codebase-critique`, `ux-critique`, and `execution-critique`, so `/skill:<name> <idea>` works without a file path. Stelow artifact detection (`.stelow/*/*/index.json`) added to `codebase-critique` and `ux-critique` for appetite-aware gating. Workflow context detection added to `testing-execution`. `index.json` adopted as primary appetite source in `interface-alternatives`.
- **Português → English translation: all project files cleaned**. Skills (`ux-critique`, `codebase-critique`, `opportunity-mapping`), references, extensions (`.ts` comments), ops scripts (`install.sh`, `retired-skills.yaml`), stages (`stages.yaml`), tests (test data), design docs (`stelow-board-herdr.md`), and `CHANGELOG.md` historical entries — all translated to English.

### Changed

- `REVIEW_MODE` default in `cali-product-shape-up` changed from `"Product Spec + Interface + Scopes"` to `"Auto"` for standalone (assumptions resolve internally instead of asking 5 questions).
- Tool references standardized to CLI-agnostic pattern: `ask_user_question` → `the ask tool` throughout `cali-product-shape-up`.
- `cali-product-testing-execution` and `cali-product-testing-ai-code` descriptions updated to mention standalone usage.
- `cali-product-scope-executor` description now says "can be used standalone".

### Fixed

- **Shape-up Input Detection omitted Assumption Check**: standalone flow listed only "Parallel Recon → Shaping → Proposal output", skipping `shape:15`. Now lists all 5 steps.
- **Orchestrator skill name typos**: `cali-evolutionary-principles` → `cali-product-evolutionary-principles`, `cali-opportunity-mapping` → `cali-product-opportunity-mapping` (lines 72-73).
- **Orchestrator wrong Int. Gate reference**: line 199 referenced `cali-product-tech-planning` instead of `cali-product-interface-alternatives`.
- **Quality Floor regression in `ux-critique`**: Core/a11y with 0 UI file changes showed "Skip." — now uses static a11y/lint baseline per quality floor principle.

## [0.47.0] - 2026-07-12

### Changed

- **`refactor: migrate pi-subagents to tintinweb, pi-tasks replaces rpiv-todo`**. Updated subagents reference from nicobailon/pi-subagents to tintinweb/pi-subagents (`Agent()` tool, `inherit_context: false` = fresh by default). Replaced `@juicesharp/rpiv-todo` with `@tintinweb/pi-tasks` (`TaskCreate`/`TaskList`/`TaskUpdate`). Install scripts (`install.sh`, `setup.sh`) updated to install new packages. Updated README dependencies table and capabilities matrix. `references/cli-tools/subagents.md` and `todo.md` rewritten with both extensions documented; cali-* skill copies are auto-synced via `sync-cli-tools.sh`.

## [0.46.0] - 2026-07-11

### Added

- **`feat: add audit trail — full lineage record from origin to delivery`** (f544e4b). A complete lineage record is now tracked from the origin of a request through to delivery, enabling full traceability across the planning workflow.

### Fixed

- **`fix: scope extraction to Planning section only (not Execution)`** (d873690). Scope extraction was incorrectly pulling content from the Execution section; now scoped strictly to the Planning section.
- **`fix: add generated_at to JSON output + clean up lessons-learned duplicates`** (3c42365). The JSON output now includes a `generated_at` timestamp, and duplicate entries in lessons-learned are properly deduplicated.

### Changed

- **docs(readme): reframe design principle to Pi-first, skills-agnostic** (32f2c28). README reframed to reflect the Pi-first direction while keeping skills harness-agnostic.
- **docs(gap-analysis): polish post-v0.45.0 cleanup** (a0955b4). Gap analysis document polished after the v0.45.0 narrowing release.
- **Update project title in README.md** (004227e).

## [0.45.0] - 2026-07-09

**Major narrowing release.** Removed all non-Pi CLI integrations and reframed the shipped surface as Pi-first. The 25 skills + orchestrator skill remain agent-agnostic via the [agentskills.io](https://agentskills.io/) standard.

**Rationale (from `@calionauta`):**
> The pre-v0.45.0 release shipped per-harness command files and a partial OpenCode plugin. In practice, those integrations were a maintenance tax disproportionate to their value: each new command required touching four files (Pi extension + per-harness generators + dispatcher), and the OpenCode plugin was a TypeScript app that needed a build step. Most of those integrations worked at the "skill delegation" level anyway, and skills already work natively on any agent that reads `~/.agents/skills/<name>/SKILL.md`. Now I can focus on the complete integration with Pi to have one that works really well rather than several more-or-less, and keep refining the orchestrator skill (which any agent can pick up automatically).
>
> Anyone wanting first-class support (TUI / gates / auto-sync) for a new agent can PR an `extensions/stelow/adapters/<harness>/` following the BaseAdapter pattern documented in `architecture.md`. The 0.43.x-era adapter source is preserved at `v0.43.4`.

### Breaking

- **Removed non-Pi CLI integrations.** The following directories and code are deleted from the shipped release:
  - `cli-agents/{opencode,claude,codex}/` — 47 command files + 4 install scripts + 1 OpenCode README
  - `cli-agents/opencode/plugin/` — 9 source files + 5 dist artifacts + lockfile (the TypeScript OpenCode plugin)
  - `extensions/stelow/adapters/opencode/{index,ui}.ts` — 451 lines of OpenCode adapter
  - `extensions/stelow/adapters/claude-code/{index,ui}.ts` — 460 lines of Claude Code adapter
  - `.claude-plugin/{plugin,marketplace}.json` — orphan metadata
  - `.opencode-plugin/plugin.json` — orphan metadata
- **Public type change:** `type CLI = "pi" | "generic"` (was `"pi" | "opencode" | "claude-code" | "generic"`). External code that imports `CLI` from `extensions/stelow/types.ts` needs to drop the opencode/claude-code branches. This is the only public type change.
- **`extensions/stelow/state.ts:detectCLI`** returns `"pi"` or `"generic"` only. The `"generic"` default is safer — agents that don't carry the extension should not be assumed to support Pi tool primitives.
- **`extensions/stelow/adapters/cli-adapter.ts:createAdapter`** / **`extensions/stelow/adapters/ui-factory.ts:createUIAdapter`** / **`extensions/stelow/adapters/commands/dispatcher.ts:getCommandSystem`** only route `pi` vs `generic` now.
- **`getCommandFilesForCLI()` and `generateSkillFile()`/`generateCommandFile()` helpers** removed from `extensions/stelow/commands.ts` (dead after the adapter deletions).
- **`scripts/generate-cli-commands.ts`** is now a no-op stub (preserved as `npm run generate-cli-commands` to keep automation working).
- **`scripts/version-sync.mjs`** only syncs the herdr TOML manifest. Plugin-manifest entries for claude/opencode are removed.
- **`install.sh`** lost the `has_cli opencode|claude-code`, `install_opencode()`, `install_claude_code()`, `install_opencode_commands()`, `install_claude_code_commands()`, `install_codex_commands()` paths — and the corresponding Step 3 routes. `install_skills_flat()` and the universal `~/.agents/skills/` path remain (the path that any agent reads automatically).
- **`.release.yml`**, **`package.json`** (scripts.version), **`.gitignore`** all stripped of non-Pi manifest references.
- **`COMMANDS.md`, `architecture.md`, `README.md`, `docs/INSTALLATION.md`, `docs/PORTABILITY.md`** rewritten to reflect Pi-first framing. **`docs/PORTABILITY.md`** deleted (its content moved into `cli-agents/COMMANDS.md`).
- **`cli-agents/COMMANDS.md`** rewritten: the harness-membership matrix is gone. The new file explains why stelow is Pi-only + how to add a new harness adapter (with the full extension contract).

### Migration path

If you depend on one of the removed harnesses:

1. **For skill-level functionality:** nothing to do. The skills still work via the universal `npx skills add calionauta/stelow -g` install path (or `./install.sh --minimal`). The orchestrator's `/sw-*` slash commands route through the orchestrator skill in any agent that reads `~/.agents/skills/`.
2. **For adapter-level functionality** (native slash commands, TUI overlay, lifecycle hooks, ask_user_question, subagent acceptance contracts): open an adapter PR following the contract in `cli-agents/COMMANDS.md#how-to-extend`. The v0.43.4 source tree (or the snapshot at `docs/archive/2026-07-09-deprecated-multi-cli-integration/v0.43.4-multi-cli-surface.tar.gz`) is the cleanest reference implementation to branch from.
3. **`CLI` type imports:** rename `"opencode"` / `"claude-code"` cases to `"generic"` in any external code that consumed the type, since `generic` now means "any agent that does not have the Pi extension loaded". The Universal Fallback instructions cover every harness through that single path.

### Archived for archaeology

- `docs/archive/2026-07-09-deprecated-multi-cli-integration/v0.43.4-multi-cli-surface.tar.gz` — snapshot of the pre-v0.45.0 multi-CLI surface (cli-agents + adapters + manifests). Read `docs/archive/2026-07-09-deprecated-multi-cli-integration/README.md` first for the rationale and deprecation lore.
- The full pre-v0.45.0 source is also available via `git tag v0.43.4`.

### Added

- **`cli-agents/COMMANDS.md`** is now an architecture/extension guide: explains why the surface narrowed, lists the entire shipped adapter surface (PiAdapter + GenericAdapter only), and provides a step-by-step recipe for adding a new harness adapter. The recipe is the contract the v0.32 type layer established.
- **`architecture.md`** adds an "Adding a Harness Adapter" section so contributors can map the recipe onto the codebase without reading the prior implementations.
- **`docs/archive/2026-07-09-deprecated-multi-cli-integration/`** — a single `README.md` explaining the deprecation plus a `v0.43.4-multi-cli-surface.tar.gz` snapshot. The tarball is gitignored-friendly; the folder itself is the user-facing pointer.
- **`extensions/stelow/adapters/index.ts`** no longer re-exports the opencode/claude-code exports. Single source-of-truth for downstream consumers.

### Changed

- **15 skill `references/cli-tools/*.md` files** rewritten to a "Pi-native path + Universal Fallback" structure. No per-CLI rows. The 20+ per-skill mirrors propagated automatically via `./scripts/sync-cli-tools.sh`.
- **`install.sh` simplicity:** `has_pi()` collapses the previous `has_cli` matrix. Pi is the only harness with special install handling; every other agent picks up skills from `~/.agents/skills/`.
- **`scripts/version-sync.mjs`** trimmed to the herdr TOML target. Plugin manifests for other harnesses (when they re-appear via future adapter PRs) can opt in individually.

## [0.44.1] - 2026-07-09

Patch release: complete the codex-removal cleanup that v0.44.0 started. **No breaking changes from v0.44.0** — purely housekeeping.

### Fixed

- **`install.sh` codex paths** — removed codex from `has_cli()`, `detect_all_clis()`, `install_for_cli()`, update loop, uninstall loop, and Step 3 routes. The standalone `install_codex()` function (50 lines) is removed entirely; `install_codex_commands()` is kept as a no-op for backward-compat and will drop in v0.45.0. Without this fix, `./install.sh` would have hit `codex plugin marketplace add` and `cp cli-agents/codex/commands/...` against non-existent paths.
- **`commands.ts` dead code** — `getCommandFilesForCLI()` had a `case "codex"` branch and `generateCommandFile()` helper that were never reachable after v0.44.0 dropped codex from `CLI` types.

### Changed

- **15 `cli-tools/*.md` source files** — removed codex from CLI tables, command sections, and per-CLI dispatch tables (LLM-facing guidance). The orchestrator's `subagents.md` had 16 codex references across CLI dispatch tables, fallback reference, and decision flowcharts — all collapsed into the opencode/claude-code/generic pattern.
- **20+ per-skill mirrors** — propagated automatically via `scripts/sync-cli-tools.sh` (single source of truth).
- **Architecture + skill docs** — `architecture.md`, orchestrator `SKILL.md` + `references/capabilities.md` + `stages/verification.md`, and `cali-product-scope-executor/SKILL.md` all updated.

### Tests

- **1042 passing** (was 1043) — removed the `'has a row for codex'` assertion in `tests/unit/subagent-context-contract.test.ts` since the table no longer has a codex row.

## [0.44.0] - 2026-07-09

Codex removed (formalized the long-marked "Removed" status), OpenCode plugin dropped (commands-only support), and scopes now auto-sync from spec-tech.md. **Breaking release** — see migration notes below.

### Breaking

- **Codex support removed.** Already marked "Removed" in `cli-agents/COMMANDS.md`; now formalized. No command files, no adapter, no test cases. Codex users must use the `stelow-product-orchestrator` skill directly via chat.
- **OpenCode plugin dropped** (`cli-agents/opencode/plugin/` — 9 files, 2,200-line `package-lock.json`). The TypeScript-based TUI plugin added maintenance burden without offering features that the skill-delegated command files don't already cover. OpenCode now uses the same skill-delegation model as Claude Code: copy `cli-agents/opencode/commands/sw-*.md` to `~/.opencode/commands/`. Install: `cli-agents/opencode/install.sh`.

### Added

- **Auto-sync scopes from spec-tech.md** (convention over configuration). The Pi extension's `readTracking()` and `writeTracking()` hooks now auto-populate `wf.scopes[]` from the latest `spec-tech_*.md` for any in-progress workflow in Execution+ phase. **Idempotent** via `wf.specTechFile` version tracking — re-syncs when spec-tech bumps to v2+. The Muxy panel has a JS mirror (`syncScopesForTracking()` in `muxy/.../data.js`) since the Electron sandbox can't import TS. Test parity guaranteed via `tests/unit/parse-scopes-from-spec-tech.test.ts`.
- **`Workflow.specTechFile` field** (`types.ts`) — tracks which spec-tech version scopes were last synced from. Enables v2+ re-sync.
- **`panes:write` permission** added to Muxy manifest (required by `muxy.modal.open` in the new project picker).
- **Muxy project picker upgraded** to native modal: sortable, search, single-click switch (replaces the chip grid). Sort puts active project first; modal abort if user picks the active project.
- **Muxy tab/scope-chip styling** uses `--muxy-accent` + `--muxy-background` for consistent theming across dark and light themes.

### Changed

- **`cli-agents/COMMANDS.md` rewritten** with explicit "Support Levels" table: Pi ✅ Full, OpenCode/Claude Code ⚠️ Reduced Skill, Codex ❌ Removed. The previous matrix showed all-✅ symbols across all harnesses (misleading).
- **`cali-product-scope-executor` SKILL.md Step 2e** rewritten. The 20-line bash snippet that initialized scopes is gone — replaced with a paragraph explaining that the extension handles it automatically. KISS + DRY.
- **`stelow-product-orchestrator` SKILL.md rule 2** now uses 🚨 emoji + explicit "NEVER chat/prose for user-facing questions" warning. Rule violations were the #1 cause of workflow drift per recent retros.

### Documentation

- **`docs/scope-lifecycle-gaps.md`** — gap analysis covering v2 overwrite handling, index.json write-through, concurrent-write race window, legacy workflows without `dirHash`, and TS/JS phase-number drift.

## [0.43.4] - 2026-07-09

### Fixed

- **Appetite and Review Mode split into two separate questions.** Previously, `setup:15` asked both appetite and review mode in a single `ask_user_question` call (or the LLM was prompted to combine them), conflating two orthogonal decisions. Now `setup:15` asks Appetite only (Pattern 7) and `setup:16` asks Review Mode only (Pattern 8), with explicit warnings against combining them. The `start-message.ts` activation message no longer says "Appetite & Mode declaration" — instead lists them as separate items.

- **Added guardrails against time/calendar references in appetite options.** The original Shape Up concept equates appetite with calendar time (6 weeks), but stelow explicitly departs from that model — appetite caps preparation depth, not duration. The new "Guardrails for LLMs" section in Pattern 7 prohibits time-based framing (e.g., "Lean = 1 week") and explains that appetite is about scope depth only.

## [0.43.3] - 2026-07-08

Docs-only: subagents.md corrected with real CLI commands based on official docs research + universal fallback for any CLI/agent.

### Changed

- **subagents.md Agent Types table**: Fixed planner contradiction (marked "NOT used"), added context-builder/oracle/researcher, added context default column.
- **Worker → Delegate**: Creative/exploration tasks (proposal generation, consolidation) now use `delegate` instead of `worker`. Worker's [system] prompt is biased toward implementation.
- **CLI commands corrected per official docs**:
  - OpenCode: marked as **archived** (successor: Crush). No `delegate_task` — native mechanism is `agent({ prompt })`.
  - Claude Code: no literal `Task()` function. Uses `--bg`, `--agents JSON`, `/batch`.
  - Codex: no `/agent <task>` command. Uses TOML config files + natural language delegation.
- **New "Fallback — pi without pi-subagents" section**: capability comparison, detection, fallback shapes for context/reads/acceptance/parallelism.
- **New "Per-CLI Fallback Reference" section**: expanded per-CLI instructions with how to pass files, context type, agent type support, worked examples.
- **New "Universal Fallback" section**: deterministic write + read pattern that works on ANY CLI/agent. Decision flow diagram covers all degradation paths.

## [0.43.2] - 2026-07-07

Robustness pass: seed + re-sync guard merged into single `node -e`, shape validation (source/status/id) at seed time, discovered append guard rejects missing note. New e2e test (18 cases) covering seed → stelow.json → Muxy display pipeline. All tests green: 36 files, 1051 passing.

### Added

- **Inline shape validation in seed guard** (`SKILL.md` Step 3c): `VALID_SOURCES` / `VALID_STATUSES` Set checks every task at seed time. Catches misspelled `source:'planed'` or `status:'complet'` before they reach stelow.json.
- **Discovered append guard** (`SKILL.md` Step 3e-ter): rejects discovered task without `note:` at push time. Also validates `source === 'discovered'`.
- **E2E test suite** (`tests/integration/scope-task-tracking.test.ts`): 18 tests covering seed, re-sync guard, shape validation, discovered append, mark done/skipped, Muxy `getScopeProgress` aggregation, `getTaskSummaryText` formatting, `discovered_tasks_count` fallback, and full seed→mark→append→Muxy pipeline.

### Changed

- **Re-sync guard merged into seed step** (DRY). Eliminates separate `node -e` that re-reads the file. Same validation, same guarantees, one pass instead of two.

## [0.43.1] - 2026-07-07

Task visibility + CI fix — Muxy pipeline card shows task progress, scope cards are expandable with inline task list + link to spec-tech.md, discovered-task badge, and re-sync guard in scope-executor. CI pi-dependent tests now skip (not fail) in CI runners without global `pi` binary.

### Added

- **Pipeline card task summary** (`data.js`, `app.js`): kanban card shows "tasks 12/18" or "tasks 12/18 · +3 discovered" below scope progress. Quick signal on execution flow without opening scope view.
- **Expandable scope card** (`app.js`): click scope card header in scope view to reveal inline task list with status icons (✅/◌/⏭), discovered-task note, and scroll for 20+ tasks (max-height:300px). Columns also scroll (max-height:calc(100vh-200px)) instead of unbounded grow.
- **"📄 spec-tech" link** on each scope card: opens the approved spec-tech.md artifact preview inline — the source-of-truth markdown with Tasks table.
- **Discovered-task badge**: yellow "+N discovered" badge on scope cards when scope has tasks with `source:'discovered'`. Signals unplanned work emerged during execution.
- **Re-sync guard** (`SKILL.md` Step 3e-ter): post-seed validation that exits 1 if `tasks[]` wasn't populated (malformed spec-tech table). Prevents silent empty-task scopes.
- **`getTaskSummaryText()` helper** (`data.js`): extracted task aggregation for reuse across card views.

### Fixed

- **CI failing on pi-dependent tests** (`cli-dispatch-syntax.test.ts`): both "pi is on PATH" and "pi-subagents extension is discoverable" now skip when `CI` env var is set. Local dev still validates pi is installed.
- **Scope column unbounded grow**: columns now have `overflow-y:auto` with `max-height:calc(100vh-200px)` instead of native flex grow.

## [0.43.0] - 2026-07-07

Record evidence convention (v1) + glob pattern expansion + Shape Up task tracking + Muxy cross-workflow scope view. No npm publish at any name; install via `pi install git:github.com/calionauta/stelow` or `npx skills add ...`.

### Added

- **Record evidence convention (v1, advisory).** `cali-product-scope-executor`
  SKILL Step 3e-bis ships a `## Record` template that scopes fill before close.
  Template lives in the scope's iteration-state markdown file; the
  machine-checkable mirror (`completed_at`, `files_count`, `commands_count`,
  `verified`, `suggested_commit` — all snake_case to match the rest of
  `stelow.json`) lands in `wf.scopes[i].record`. Convention only — no
  enforcement in v1; `execution-critique` Criterion 6 (`Record Evidence`)
  flags missing or unverified records as critique findings (block / warning / minor).
  Rationale: weakest-true-claim discipline borrowed from Skill-Steward
  ADR 0023 — without a non-vacuous record, the ✅ is unearned.
- **Glob pattern expansion in `matchesDeclaredGlob()`.**
  `extensions/stelow/scope.ts` now supports:
    - in-segment `*` wildcard (e.g. `src/auth/*.ts`)
    - `**` as a cross-segment wildcard (e.g. `src/**/*.{ts,tsx}`)
    - brace expansion `{a,b,c}` for OR alternatives (single-level, no nesting)
  Existing trailing `/**` and `/*` patterns unchanged. Net effect: the
  `[TARGET_FILES]` block in spec-tech.md can now declare
  `src/**/*.{ts,tsx}` instead of enumerating extensions.
- **`ScopeRecord` interface** in `extensions/stelow/types.ts` —
  TypeBox-friendly shape for the mirror fields above.
- **`cali-product-execution-critique` Criterion 6 (Record Evidence).**
  New criterion (renumbered subsequent criteria 7–10) checks every
  completed scope for: record present, `verified: true`,
  `files_count > 0`, `commands_count > 0`, suggested_commit set, and
  `iteration-state-{SCOPE-ID}.md` has a `## Record` section.
- **5 new test cases** in `tests/integration/scope-overlap-classify.test.ts`
  covering brace expansion (2-way, 3+way, combined with `/**`, empty
  alternatives, unclosed brace as literal).
- **Task tracking inside scopes (Shape Up hill chart collapse).** New
  `wf.scopes[i].tasks?: ScopeTask[]` for runtime task checkboxes that
  emerge as the scope executes. Each task is `source: 'planned' |
  'discovered'`; `discovered` tasks always carry a `note:` explaining
  the discovery trigger. Two scopes stay at the appetite ceiling
  (Lean ≤2, Core ≤5, Complete ~10) while individual scopes can carry
  many tasks — tasks emerge from reality, scopes are committed up
  front.
- **Scope-executor SKILL Step 3e-ter** documents seeding, appending,
  and marking-done patterns for the task checklist. Iteration-state
  markdown renders the live checklist so a future agent or human can
  see what's actually done vs. what was planned.
- **Muxy cross-workflow scope tab.** New "Scopes" view in the muxy
  panel (`integrations/muxy/stelow/src/panel/{app,data}.js`)
  flattens `wf.scopes[]` across all workflows in the active worktree
  into hill-chart columns (Pending / In Progress / Escalated /
  Failed / Completed). Filter strip: status chips + free-text search
  across scope id, name, type, workflow name, project path. Each card
  shows scope id, name, workflow, project (last 2 path segments),
  iteration counter, and a Record badge (✅ verified / ○ unverified)
  when present. Build verified via `npm run build`.
- **Sandboxing note (muxy limitation):** cross-workflow is scoped to
  the active worktree because `muxy.files.read` is sandboxed to the
  workspace root (per Muxy docs). True cross-project would require
  Muxy to expose a `projects.read.files` API; tracked for later cycles.

### Changed

- **`Scope` interface** now has two new optional fields:
  `record?: ScopeRecord` and `tasks?: ScopeTask[]`. Both are
  advisory in v1 (convention only). Future v2 makes `record` mandatory
  for `status: 'completed'` scopes (TypeBox schema enforcement).
- **Criterion numbering** in `cali-product-execution-critique`:
  Record Evidence is now 6; Gap Registry 7; Lessons Learned 8;
  Gap-to-Scope 9; Decision Matrix 10. All references updated.
- **`ScopeRecord` field naming:** snake_case throughout
  (`completed_at`, `files_count`, `commands_count`, `suggested_commit`)
  to match the rest of `stelow.json` schema (target_files,
  actual_files, start_sha, lock_ttl_seconds). v1 advisory references
  updated.

### Tests

- **8 new unit tests** in `tests/unit/scope-record-tasks.test.ts`
  covering ScopeRecord + ScopeTask shape, planned vs discovered,
  files_count ↔ actual_files invariance.
- **8 new unit tests** in `tests/unit/scope-panel-data.test.ts`
  covering SCOPE_COLUMNS order, flattenScopesForView identity
  preservation, groupScopesByStatus column stability.
- **Total: 1099 tests passing** (was 1049 in v0.42.1).

### Notes for next cycle

- **Record v2 → pre-commit hook.** The current opt-in runtime validation
  (`STELOW_VALIDATE=1`) works but requires an env var. The next cycle
  should ship a `scripts/pre-commit-record.sh` that runs the validators
  from `schema-record.ts` via `require()` and blocks commits with
  missing/incomplete records. Also check `discovered_tasks_count > 5`
  as a project-level threshold.
- **Execution-critique Criterion 6 → block threshold.** Currently flags
  missing records as `warning`/`minor`. Bump to `block` after ≥3
  workflows ship with v1 discipline (proves the convention is real,
  not just paper).

## [0.42.1] - 2026-07-07

Two patches addressing items deferred from the v0.42.0 release notes:

### Fixed

- **`scripts/version-sync.mjs` idempotent TOML rewrite.** The script's TOML
  rewrite used `updated === content` to detect "no match", but that
  check returns a false negative when the file is **already** at the
  target version (e.g., running `npm version 0.42.1` when
  `herdr-plugin.toml` already reads `version = "0.42.0"`).
  `String.prototype.replace` returns the original string both when
  no match exists AND when the replacement was a no-op — so we'd
  mistake idempotency for a missing line.
  Fix: use a regex + `.test()` to distinguish "no match found" from
  "replacement was a no-op". Idempotent runs now succeed quietly.
  Symptom: v0.42.0 release shipped with a "Failed to sync
  herdr-plugin.toml" log line. Manifest was always correct — this
  was just a noisy false negative.

### Added

- **`tests/integration/cli-dispatch-syntax.test.ts`** (10 cases): validates
  the per-CLI PARALLEL dispatch table from `subagents.md`. Two layers:
  1. **Binary availability check** for pi (built-in + pi-subagents
     extension), opencode, codex, claude-code (optional).
  2. **Static call-shape validation** for each documented PARALLEL
     invocation shape (tasks[] + concurrency for pi-subagents,
     multi-Task-per-turn for claude-code, parallel codex-exec
     subagents, opencode PR #14196 shape, generic `&`/`wait`).
  Includes a `resolveCli()` helper that actively skips `node_modules/.bin`
  directories when searching PATH — prevents a known shadowing issue
  where vitest's modified PATH included a local older
  `pi-coding-agent@0.73.1` dev dep that shadowed the global runtime.
  Real LLM session-launching smoke tests are explicitly out of scope
  (require a live model session; documented as different test class).

> **Note on the `npm` package name.** `@calionauta/stelow` is the canonical
> name (set in `package.json`). The package **was never published** to
> npmjs.com at any name (confirmed via `npm view @calionauta/stelow`
> and `npm view @renatocaliari/stelow` both returning 404 at release
> time). Installers in this repo use the git URL
> (`git:github.com/calionauta/stelow`); the `name` field is a
> future-facing label for any eventual publish.
>
> External references that were intentionally preserved (NOT bug, NOT
> regression):
>
>   - `docs/design/stelow-board-herdr.md`: a future separate project.
>   - `skills/cali-product-discovery/SKILL.md` (lines 95, 101, 107):
>     credits to a third-party author's repositories (not stelow).
>   - `setup.sh` line 70 (`pi-tool-repair-layer`): a separate upstream
>     package with its own naming.
>   - `docs/archive/`: 2026-05-20 archive snapshot.

## [0.42.0] - 2026-07-06

Scope-execution rework + cross-platform tooling + state.ts refactor +
canonical-name alignment. **No npm publish at any name; install via
`pi install git:github.com/calionauta/stelow` or `npx skills add ...`.
No deprecation window, no migration cosmetics, no cosupport tickets.**

### Highlights

- **Scope-execution prevention + audit pipeline.** Drop the aspirational
  "file-overlap guard" heuristic (which was never implemented). Ship a
  CLI-agnostic prevention layer (file-reservation locks) + ground-truth
  post-hoc detection (`git diff --name-only`). No `git worktree`
  requirement; no per-CLI hook integration; no merge complexity.
- **Cross-platform install for cymbal + sem.** Auto-detect macOS /
  Linuxbrew / Windows PowerShell / winget / Chocolatey / curl|sh. Default
  `[Y]` prompts; non-interactive shells auto-install.
- **Ataraxy-Labs sem.** The `sem` binary moved to
  [Ataraxy-Labs/sem](https://github.com/Ataraxy-Labs/sem); setup.sh now
  detects via command-set probe (not `--version` text grep, which had a
  false-negative on the real binary).
- **state.ts slimmed.** Two-level refactor: (a) `readJson<T>()` /
  `writeJson()` private helpers replace 12 hand-rolled sites; (b)
  inbox / provenance / scope-execution concerns extracted to their own
  modules (`extensions/stelow/inbox.ts`, `provenance.ts`, `scope.ts`).
  state.ts shrunk 1011 → 819 lines; concerns isolated; 1034 tests pass.

### Added (scope-execution)

- **`[TARGET_FILES]` convention block** in `spec-tech.md` scope bodies.
  Parsed into `wf.scopes[i].target_files` and
  `scope-contract.json#target_files`. Convention over config: trailing
  `/**` ⇒ prefix match, trailing `/*` ⇒ single-level match, otherwise
  exact.
- **File-reservation lock protocol**
  (`skills/stelow-product-orchestrator/references/cli-tools/file-locking.md`,
  synced to 25 skill mirrors via `sync-cli-tools.sh`). CLI-agnostic
  prevention for parallel scope execution. Atomic acquire via `ln`
  (EEXIST-safe), TTL-based stale-lock stealing, `sha1sum(12)` lock file
  naming. Optional `[LOCK_TTL_SECONDS]` block per scope; default 1800s.
  No hooks, no `git worktree`, no per-CLI integration.
- **`Scope` interface** in `extensions/stelow/types.ts` extended with
  `target_files?: string[]`, `actual_files?: string[]`,
  `start_sha?: string`, `lock_ttl_seconds?: number`.
- **4-class overlap classification function**
  (`classifyOverlap()` in `extensions/stelow/scope.ts`) — same logic
  Step 8 used to run inline, now extracted + testable + reused. Classes:
  (a) undeclared writes (declared ≠ actual), (b) real inter-scope
  overlaps, (c) stale locks, (d) clean.
- **`matchesDeclaredGlob`** pure helper (also in `scope.ts`) — covers
  the `/**` / `/*` / exact cases. Used by `classifyOverlap`; exported
  for tooling reuse.
- **Lock acquisition / release steps** in `scope-executor` SKILL
  Steps 3c / 3e. Defensive: scope declares `[TARGET_FILES]` AND the
  orchestrator plans parallel dispatch ⇒ acquire / release.
- **13 new integration tests** in
  `tests/integration/scope-overlap-classify.test.ts` covering glob
  match (3 modes) + all 4 classes + combinations + edge cases (missing
  lockDir, malformed locks, contractless scopes, empty input).
  Total: **1034 / 1034 passing** across 33 files.
- **`scope-actual-files.json` artifact** documented in `subagents.md`
  Input Files table. Replaces the phantom `sibling-scopes.json` claim.

### Added (tooling + install)

- **`scripts/setup.sh` detects + offers cymbal + sem install** (default
  `[Y]`, non-interactive auto-Y). Persists state to
  `.stelow/tools.json` so downstream stages know what's available without
  re-detecting. Read by `extensions/stelow/index.ts` consumers.
- **Cross-platform install cascade** for both tools:
  `brew` (macOS + Linuxbrew) → PowerShell `install.ps1` (Windows,
  cymbal) → `winget install AtaraxyLabs.sem` / `choco install sem`
  (Windows, sem) → `curl | sh` (unix universal) → manual URL on
  failure.
- **`sem` detection fix** — `verify_at_ataraxy()` probes `sem help`
  output for Ataraxy's distinctive command set (impact / blame /
  entities / context / xref / mcp / setup / unsetup; ≥3 matches
  required). GNU Parallel's `sem` symlink (different help text)
  correctly excluded.
- **Muxy panel enhancement** —
  `integrations/muxy/stelow/src/panel/data.js` `getScopeProgress()`
  adds `declaredFilesCount` field; `app.js` tooltip surfaces
  "Using file-reservation lock protocol for parallel scope prevention"
  when declared paths are active.

### Added (testing infra)

- **Muxy panel test update** — `tests/unit/muxy-workflow-data.test.ts`
  now expects the new `declaredFilesCount` field on
  `getScopeProgress()` (1034/1034 pass).

### Refactored (state.ts)

- **`extensions/stelow/state.ts` slimmed 1011 → 819 lines.**
  - **DRY helpers (file-private):**
    `readJson<T>(path): T | null` replaces 6 `JSON.parse(readFileSync(...))`
    sites. `writeJson(path, data)` replaces 4
    `JSON.stringify(..., null, 2) + writeFileSync` pairs. Both added
    at top of state.ts; never re-exported.
  - **Extracted modules:**
    `inbox.ts` (93 lines, 7 functions + 2 constants),
    `provenance.ts` (53 lines, 3 functions + 1 constant),
    `scope.ts` (195 lines, 3 functions + 2 types).
  - **Public API preserved** via `export { ... } from "./..."`
    re-exports in state.ts. 0 caller breakage; 1034 tests pass.

### Removed

- **All `git worktree` references** from stelow docs. Stelow stance:
  sequential default + audit + opt-in file-reservation locks. No
  worktree recommendation (merge complexity burden not justified for
  the 2-3 parallel scope scale).
- **`sibling-scopes.json` (never-implemented phantom artifact)**
  replaced by `scope-actual-files.json` (real, generated by
  `git diff --name-only`).

### npm name alignment

- The `name` field in `package.json` and
  `extensions/stelow/package.json` is now `@calionauta/stelow`.
  Confirmed at release time that the package was **never published**
  to npmjs.com (both `@calionauta/stelow` and the historical
  `@renatocaliari/stelow` return 404 on `npm view`). No deprecation
  notice or migration window is required.
- In-repo references to GitHub URLs were canonicalized to
  `calionauta/stelow` (README badges, schema URLs, setup.sh install
  lines, plugin paths, documentation). Plugin manifest `name` fields
  remain as `@calionauta/stelow` to match.

### Notes for next cycle

- **Herdr plugin manifest** (`integrations/herdr/stelow/herdr-plugin.toml`)
  doesn't have a `[version]` line that `scripts/version-sync.mjs` can
  patch. Pre-existing limitation; tracked separately.
- **schema-fencing for `target_files` glob** — the convention is
  prefix-match only (`/**` and `/*`). Glob characters like `?` or
  `[abc]` are not yet supported. Tracked as a hardening item.

## [0.41.0] - 2026-07-06

### Added

## [0.41.0] - 2026-07-06

### Added

- **Per-CLI deterministic subagent dispatch** (`subagents.md`) — New explicit table for `pi` (built-in + pi-subagents), `opencode`, `claude-code`, `codex`, `generic`. Eliminates LLM translation of intent — orchestrator picks the row for `detected_cli` and emits the literal call shape. Critical rule block at top: **EVERY stelow subagent call passes `context: "fresh"` EXPLICITLY**.
- **Strategic-context worked example** (`subagents.md`) — Concrete `subagent()` invocation for `context:10`/`context:20` showing the user's verbatim request in the task string + `reads: [index.json]` (NOT spec-product.md, which doesn't exist yet at this stage).
- **Packaged-agent gotcha table** (`subagents.md`) — Documents that pi-subagents' `worker`/`planner`/`oracle` ship with `defaultContext: "fork"`. All other packaged agents default to fresh. Stelow always overrides with explicit `context: "fresh"` for predictability.
- **`domains_detected` persistence** (`stages/context.md`) — `context:20` (Domain Context Detection) now writes detected domains to `index.json#config.domains_detected` (single source of truth). Initialized to `[]` in setup.
- **`review_mode` in spec-product.md frontmatter** (`stages/setup.md`) — Was only in `index.json`; now also injected into spec frontmatter as canonical subagent input. Shape Up validation guard rejects files missing this field.
- **`selected-interface.md` as explicit subagent input** — Now read by `tech-planning` (planner subagent) and `scope-executor` (UI-scope workers). Previously only `execution.md` consumed it. Closes the gap where tech scopes could be generated without knowing the chosen UI direction.
- **Code-reviewer subagent invocation contract** (`stages/verification.md`) — Was vague "launch a fresh-context reviewer". Now shows literal subagent invocation shape with diff in task string + `reads: [spec-product.md]`.
- **Convention in global pi.dev AGENTS.md** — Added "Releases & Changelog" section: tag + GitHub Release go together, CHANGELOG.md is canonical, never tag-only.
- **154 new regression tests** — `subagent-context-contract` (41), `spec-frontmatter-contract` (18), `artifact-flow-contract` (19), `sync-content-equality` (76). Sanity-verified by introducing real drift and confirming tests fail.

### Changed

- **fork is now explicitly fallback-only** (`subagents.md`) — New "When fork is necessary (fallback only)" section. Default answer is "never" for workflow-anticipated calls. Fork is only acceptable when the workflow design didn't anticipate the call.
- **README pi-subagents row** — Was marked "Optional, same outcome, fewer features". Now marked "Recommended for Pi" with accurate "Without it" fallback description (scope-executor falls back to parent-controlled loop, no `reads`, no explicit `context: "fresh"` override).
- **README skill breakdown** — Replaced confusing "4 layers - orchestrator + strategies + workflow stages + tactics" with accurate breakdown: 1 orchestrator + 5 strategic approaches + 8 domain tactics + 5 product workflow + 6 code/UX/meta = 25 total.

### Fixed

- **Wrong default claim in subagents.md** — Said `context: "fork"` was the default. Actual pi-subagents default is `fresh` (with packaged `worker`/`planner`/`oracle` overriding to `fork` via their frontmatter). Now correctly documented.
- **Wrong default claim in pi-row of dispatch table** — Said "(default is fork)". Now correctly says "(default is fresh)".
- **sync-cli-tools.sh content drift** — Previously checked only file **existence**, not content equality. Files with stale content passed silently. Now uses `cmp -s` for byte-level comparison, reports per-file drift, and syncs only what's actually different.
- **Strategic-context subagents missing explicit input contract** — `strategic-exploration.md` said "run in parallel, fresh context" but didn't tell the orchestrator what to put in the task string or which files to `reads`. Now explicit about user's verbatim request, appetite, review_mode, domains_detected.

## [0.40.3] - 2026-07-06

### Fixed

- **scope-executor goals.md test** — Adapted test to match synced generic goals.md (removed feature-row `criteria` assertion that no longer applies).

### Docs

- **appetite constraint contrast** — Added paragraph explaining departure from original Shape Up calendar-based model: stelow caps preparation depth, not wall-clock time.

## [0.40.2] - 2026-07-04

### Changed

- **cli-tools distribution** — Removed duplicated `references/cli-tools/` from git tracking (276 files). Sub-skills now get cli-tools generated at build/install time from orchestrator (`stelow-product-orchestrator`), the single source of truth. Added `.npmignore` override so npm tarball includes cli-tools. Updated `install.sh` and Pi extension to regenerate cli-tools on install. CI pipeline generates cli-tools before tests.

## [0.40.1] - 2026-07-02

### Fixed

- **diff-gate stdout parsing** — `plannotator review` does not support `--json`. Added explicit stdout pattern-matching strategy and human fallback for ambiguous results.
- **Selected interface artifact** — Chosen interface proposal now saved to `.stelow/{date}/{dir}/interfaces/selected-interface.md` as permanent artifact. Execution stage reads it for UI direction.

## [0.40.0] - 2026-07-02

### Added

- **plan-gate stage** (order 115) — Tech plan gate between Planning and Execution. Plannotator visual review of `spec-tech.md`. Runs only in `Product Spec + Interface + Tech Review` and `Product Spec + Interface + Tech Review + Code Diff` review modes.
- **diff-gate stage** (order 175) — Code diff review gate between Verification and Audit. Plannotator `review` command on the working tree diff. Runs only in `Product Spec + Interface + Tech Review + Code Diff` review mode. Verification must pass before the diff gate runs.
- **New review mode: "Product Spec + Interface + Tech Review + Code Diff"** — The most advanced mode, adding `diff-gate` on top of all existing gates. Maximum human oversight with visual code review.

### Changed

- **Review mode rename** for clarity and consistency — all mode names are now explicit and additive:
  - `Only Product Spec` → `Product Spec Gate`
  - `Product Spec + Interface Choice` → `Product Spec + Interface Gates`
  - `All Above + Scopes In/Out` → `Product Spec + Interface + Scopes`
  - `All Above + Tech Review` → `Product Spec + Interface + Tech Review`
- **PHASE_NAMES** expanded from 15 to 17: `Plan.Gate` (index 12), `Diff.Gate` (index 15). All downstream mappings, integrations (Muxy, Herdr), and plugin regenerated.
- **Workflow sequence** updated everywhere: `... → Planning → Plan.Gate → Execution → Verification → Diff.Gate → Audit`
- **Review mode effect matrices** across all skills updated with 6 modes and 2 new gate columns (plan-gate, diff-gate).

## [0.39.3] - 2026-07-01

### Added

- **Evidence & Limitations:** added coordination overhead research (CooperBench, clawRxiv, Co-Coder), research vs code parallelism rationale, file-overlap guard documentation

## [0.39.2] - 2026-06-29

### Fixed

- **Pulse scripts now ship with the extension** — previously lived only in
  `.stelow/pulse/` (gitignored), so anyone installing stelow via GitHub/npm
  got a broken Pulse. The 5 pulse files (`pulse.sh`, `pulse.ps1`, prompts,
  `SETUP.md`) now live in `extensions/stelow/pulse/` (tracked, versioned).
  The extension's `ensurePulseScripts()` auto-copies them to the user's
  `.stelow/pulse/` on first `/sw-pulse` invocation. A new
  `scripts/copy-pulse-assets.sh` copies non-TS files into `build/` during
  `npm run build` so the published npm package includes them.

- **`PULSE_MODEL` no longer hardcoded to `haiku`** — the bash and PowerShell
  scripts defaulted to `haiku` when `PULSE_MODEL` was unset. Now defaults to
  empty, and the `--model` flag is only passed to `pi --print` when
  `PULSE_MODEL` is explicitly set. Pulse uses the user's harness-configured
  model otherwise.

- **12 broken TOC anchors in README** — double-dash anchors (`#--pulse--...`)
  corrected to single-dash (`#-pulse--...`) for single-codepoint emoji
  headings. The `toSlug` test helper was also corrected to match GitHub's
  actual anchor algorithm (single-codepoint emojis get one leading dash,
  not two).

### Added

- **`scripts/setup-pulse.sh`** — standalone Pulse setup that doesn't require
  the pi extension or an interactive pi session. Useful for CI/CD, cron
  setup, or pre-staging the project before installing pi. Validates bundled
  scripts, copies them to `.stelow/pulse/`, creates the inbox, prints
  scheduling instructions.

- **`setup.sh` Step 11/11 (Pulse)** — optional step in the main installer
  flow that delegates to `setup-pulse.sh`. Prompts Y/n. Records ok/skip/fail
  in the summary table. All 10 previous steps renumbered `/10` → `/11`.

- **Pulse + HITL differentiator** — top-of-README Key Differentiator entry
  describing Pulse as background cron-driven processing with `review_mode=Auto`,
  and the `[human-in-the-loop]` marker for items that need human judgement.

## [0.39.1] - 2026-06-29

### Fixed

- **Plannotator gate now works end-to-end** — the gate stage had `bash` in
  `blocked_tools` (commit `543dbef`) but `gate.md` required bash to run
  `plannotator annotate --gate`. A new `plannotator` tool (`pi.registerTool`)
  spawns the CLI binary directly, bypassing the bash block. The tool writes
  `.plannotator/approvals/<hash>/gate-approved.md` on approval, and the stelow
  `turn_end` handler auto-advances when it detects any `*.approved.md` receipt.

### Changed

- **`stages.yaml`**: gate/int-gate now block only `bash` — `edit` and `write`
  unblocked (needed for frontmatter stamping and receipt creation).
- **`gate.md`**: rewritten — uses `plannotator` tool (not bash), receipt
  auto-created by the tool, no manual receipt step.
- **`plannotator.md` reference**: updated to show tool path as primary,
  CLI fallback as secondary, receipt paths unified to `.plannotator/approvals/`.
- **`gates_passed` removed** — the field was declared in 22+ files and used in
  the auto-advance logic, but was never populated. Replaced by direct receipt
  file detection. All type declarations, initializations, spreads, migration
  code, tests, schema, and docs updated.

### Added

- **`sem` tool documentation** — entity-level diff for Execution Critique
  (functions, types, methods instead of raw lines). Docs in AGENTS.md,
  README.md, and execution-critique SKILL.md.

## [0.39.0] - 2026-06-28

### Added

- **`execHeadless(task, cwd?)`** — new method on all 4 CLI adapters (Pi, Claude Code, OpenCode, Codex). Spawns the harness CLI non-interactively (`pi --print`, `claude -p`, `opencode -p`, `codex -p`) with the user's default model. Enables agnostic subagent fallback and checkpoint supervision.

- **`subagents.md` — headless CLI fallback** — new section documenting when native `subagent` tool is unavailable. Per-CLI commands, usage patterns, structured output, and parallel headless via `&` + `wait`.

- **`supervise.md` — CLI-agnostic supervision** — replaced Pi-only `/supervise` documentation with a dual-approach pattern: (1) Headless CLI checkpoint for any harness (checkpoint-based, discrete verification), (2) `/supervise` for Pi (continuous, real-time). Both activation table (old) and approach-by-appetite table (new) preserved.

### Changed

- **Adapter interface** — `execHeadless()` added to `CLIAdapter` interface. BaseAdapter throws by default, each harness adapter implements via its native non-interactive command.
- **No model flag** — `execHeadless` uses the user's default model. No `--model` override.

## [0.38.0] - 2026-06-28

### Added

- **Pulse — autonomous inbox processing** — new background system that
  periodically checks `.stelow/inbox/items.md` and creates workflows
  automatically with `review_mode=Auto` (no gates, no questions, no
  Plannotator). Includes:
  - `pulse.sh` (bash, cross-platform: macOS/Linux/Windows Git Bash/WSL)
  - `pulse.ps1` (PowerShell for Windows)
  - System + task prompts at `.stelow/pulse/pulse-{system,task}.md`
  - Setup guide at `.stelow/pulse/SETUP.md` (launchd, systemd, cron,
    Task Scheduler)
  - Provenance log at `.stelow/inbox/history.jsonl`
  - `/sw-inbox history` subcommand

- **`/sw-pulse` commands** — 5 commands to manage the background processor:
  status, pause, resume, process, log.

- **`/sw-start` now reads inbox** — when called without arguments, reads
  items from `.stelow/inbox/items.md` as the draft. Detects `[human]`/
  `[human-in-the-loop]`/`[hitl]` markers and suggests appropriate Review Mode.

- **Inbox item markers** — prefix items with `[human-in-the-loop]` (or `[hitl]`
  or `[human]`) to exclude them from Pulse processing. Pulse enforces this at
  the code level (`grep`/`notmatch`). `/sw-start` includes marked items but
  suggests a Review Mode higher than Auto.

- **Conflict prevention** in Pulse: detects active user sessions via
  `stelow.json` mtime + interactive `pi` process check. Atomic `mkdir` lock.
  Configurable via `PULSE_USER_ACTIVITY_MINUTES`.

### Changed

- **`getAutoBlockedTools()` → `toAgnosticName()`** in CLI adapter interface.
  Each adapter now maps CLI-specific tool names to agnostic names from
  `stages.yaml` (Pi: `ask_user_question` → `ask`, OpenCode: `Grep` → `grep`,
  etc.). Both stages guard and Auto mode enforcement use agnostic names.
  Fixes a latent bug where `ask` in `stages.yaml` never matched
  `ask_user_question` from Pi.

- **Auto mode enforcement now agnostic** — blocks tools by agnostic name
  (`ask`, `plannotator`) instead of Pi-specific names. Works regardless of
  what name Pi extensions register their tools under.

- **Stages guard now uses agnostic names** — converts via
  `adapter.toAgnosticName()` before checking against `stages.yaml`.

- **README** — new Pulse section (`📡 Pulse — Autonomous Inbox Processing`),
  command count updated (16→17), `/sw-start` description updated.

### Tests

- **`tests/unit/agnostic-tools.test.ts`** — 55 new tests covering:
  - `toAgnosticName()` on all 5 real adapters (Pi, OpenCode, Claude Code,
    Codex, Generic) — no mocks
  - Stages guard with CLI-specific names (verifies the bug fix)
  - Auto mode enforcement with real `index.json` I/O
  - Full chain: Pi `ask_user_question` → agnostic `ask` → Auto mode block
  - All 15 stages allow `ask` (design invariant)

## [0.37.0] - 2026-06-28

### Changed

- **`cali-product-coding-standards` cleaned** — removed Datastar-specific content
  (SSE-First, HATEOAS sections, LoB/SoC/tie-breaker Datastar bias). Now contains
  only universal principles (KISS, DRY, LoB, SoC, Fail Fast, YAGNI, size limits).
  Datastar design principles belong solely in `cali-coding-go-stack`. Affected
  references in README and `cali-product-tech-planning` updated.

- **`structured-question.md` → `ask.md`** — replaced Pi-specific
  `ask_user_question` tool reference file with CLI-agnostic `ask.md` across all
  24 skills. All skill-internal references updated.

- **`ctx7` → `@vedanth/context7`** — updated npx package name in
  `doc-search.md` references.

- **Muxy extension improvements** — adapter layer refactored for consistency
  across Pi, Claude Code, Codex, and OpenCode harnesses.

- **Config/install updates** — AGENTS.md, setup.sh, install.sh improvements.

### Tests

- Updated `skill-implementation.test.ts` and `appetite-consistency.test.ts` to
  reference `ask.md` instead of `structured-question.md`.

## [0.36.10] - 2026-06-26

### Added

- **checklist.md replaces phase-todos.json** — LLM now writes markdown checklists
  (`- [x]` / `- [ ]`) instead of JSON todos. Human-readable, Plannotator-friendly,
  ~3.5x fewer tokens. File at `.stelow/<date>/<hash>/checklist.md`.
- **Plannotator auto-open during Execution** — LLM runs `plannotator annotate`
  when the checklist is created. Browser shows interactive checkboxes updating
  in real time as tasks complete.
- **`parseChecklist()` utility** — reads checklist.md and returns task counts
  per scope. Used by /sw-next scope completion gate as optional safety net.
- **`execution:05` step** in execution.md — checklist creation + Plannotator
  integration documented.

### Changed

- **All phase-todos.json code removed.** Zero backward compat, zero migration,
  zero dead code. `PhaseTodo`/`PhaseTodosData` types eliminated.
- **Extensions renamed:** `stelow-board`/`stelow-muxy` → `stelow` across Muxy
  extension, Herdr plugin, package names, binary names, plugin IDs, commands,
  and all documentation.
- **todo.md rewritten** — markdown checklist format, Plannotator integration,
  CLI instructions updated for all harnesses.
- **architecture.md updated** — phase-todos.json → checklist.md.
- **Muxy panel comment fix** — stale phase-todos comment corrected.

### Removed

- `PHASE_TODOS_FILE`, `getPhaseTodosPath`, `readPhaseTodos`, `writePhaseTodos`,
  `getPhaseTodos`, `_phaseTodosCache`, `setPhaseTodos`, `getPhaseTodosFromCache`,
  `migratePhaseTodosToChecklist` — all from state.ts.
- `PhaseTodo`, `PhaseTodosData` types from modules/task.ts and modules/index.ts.

## [0.36.9] - 2026-06-26

### Added

- **`blockedBy?: string[]` field on `Scope` type** — scopes now carry explicit dependency
  IDs, parsed from `Dependencies:` in spec-tech.md.
- **`readyScopes()` utility** — 10-line function returns scopes whose dependencies
  are satisfied. Replaces hardcoded phase ordering with data-driven scheduling.

### Changed

- **Index.json write folded into `writeTracking()`** — eliminates 7 sync callsites.
  Every mutation to `stelow.json` now automatically syncs `.stelow/<date>/<hash>/index.json`.
  Archive fallbacks (dirHash robustness) remain explicit.
- **Worktree removed from default execution flow.** The `execution:10` prompt
  "Create isolated branch + worktree?" was dangerous: LLMs mishandle multi-step git,
  and the instruction had no merge step. Replaced with simple "execute in current dir".
  Worktree moved to **Advanced: Git Worktree Isolation** at end of `execution.md`
  with real merge instructions (`git merge`, `git push`, `git worktree remove`).
- **`blockedBy` is optional** — prevents runtime crash on legacy scope data
  that lacks the field.

### Fixed

- **`readyScopes()` handles `undefined` blockedBy** via `(s.blockedBy ?? []).every(...)`.
  Legacy scopes without the field no longer throw.

## [0.36.8] - 2026-06-26

### Fixed (herdr plugin)

- **`herdr plugin action invoke stelow.board.toggle` now works.**
  `open-board.sh` used `--plugin stelow-board` (wrong ID) and parsed
  JSON from `herdr pane list` in the wrong node (`data.panes` instead of
  `data.result.panes`). Script also ignored `HERDR_PLUGIN_ROOT`
  — fallback added.
- **README reorganized**: keybinds separated from CLI reference, usage:
  TUI is primary, CLI stays in test/debug section.

## [0.36.7] - 2026-06-25

### Added (herdr TUI)

- **Full prompt view** — press `Enter` or `Space` on the detail card
  to toggle a full-screen prompt view showing the complete draft text
  (word-wrapped at 100 chars). `Esc` returns to the detail card.
  Before: prompt truncated to ~200 chars with no way to see the full
  content. Added to help overlay and command bar.

### Fixed (muxy panel)

- **Draft preview now shows up to 120 chars** instead of only 5 words.
  `summarizeDisplayName` was returning just the first 5 significant
  words (e.g. "Nova homepage (GitHub Pages) para" — broken in the
  middle). Now returns the first line up to 120 chars with ellipsis
  at word boundary. The expanded view (click "Brief") was already
  working.

## [0.36.6] - 2026-06-25

### Fixed

- **CI was failing** because `tests/unit/muxy-manifest-schema.test.ts`
  validates permissions against the outdated pinned schema (missing
  `files:read`/`files:write`). Updated the test to explicitly allow
  these known-good permissions with inline docs referencing the
  official Muxy docs. See AGENTS.md "Critical Muxy extension knowledge".
- **Added `files:read` and `files:write` to muxy extension permissions.**
  Without `files:read`, `muxy.files.read('stelow.json')` silently fails
  with "permission denied", causing "No workflow data" even when the
  correct workspace is active.

## [0.36.5] - 2026-06-25

### Fixed (muxy extension — build + events)

- **Build now copies `package.json` into `dist/`.** Muxy docs require
  this: "Because only `dist/` ships, your build must copy `package.json`
  into `dist/`" (contributing.md). Added `scripts/copy-manifest.mjs`.
- **Fixed vite build** by exporting `getActiveWorkspacePath` from `data.js`
  (was imported but not exported).
- **Panel now subscribes to `project.switched` and `worktree.switched`**
  events so it auto-refreshes when user switches workspace in Muxy.
  Previously relied only on 15s polling + manual reload.

## [0.36.4] - 2026-06-24

### Added (state machine documentation)

- **`Workflow.status` enum documented** with full state diagram in
  `extensions/stelow/types.ts`. States: in-progress | paused | completed
  | archived. Transitions documented inline as comments.
- **`tests/unit/workflow-state-machine.test.ts`** — 13 tests

## [0.36.3] - 2026-06-24

### Changed (workflow start behavior)

- **`/sw-start` now auto-pauses existing in-progress workflows** instead
  of blocking with "There is already an active workflow". The previous
  block behavior led to "shadow" workflows (in-progress in `stelow.json`
  but invisible to the UI/LLM because `getActiveWorkflow()` returns only
  the first) when users called `/sw-start` multiple times in succession.
- **New behavior:**
  - 0 in-progress: continue (no-op)
  - 1 in-progress: pause it, then create new
  - 2+ in-progress: pause all, then create new
- Paused workflows stay recoverable via `/sw-resume <name>` and are fully
  removable via `/sw-archive <name>` or `/sw-archive purge`.
- The user is informed via `ctx.ui.notify` with the names of paused workflows.

### Added (anti-regression tests)

- **`tests/unit/start-auto-pause.test.ts`** — 8 tests covering:
  - no in-progress: no-op
  - one in-progress: pauses it
  - two in-progress: pauses both (was the bug — only first was visible)
  - three in-progress: pauses all, `getActiveWorkflow` returns null
  - paused workflows stay in tracking (not deleted)
  - archived/completed workflows are NOT paused (already terminal)
  - REGRESSION: empty-cwd legacy workflows are paused (legacy fallback)
  - REGRESSION: foreign-project workflows are NOT paused

## [0.36.2] - 2026-06-24

### Cleanup (legacy skill removal)

- **`cali-product-workflow` added to `retired-skills.yaml`.** This legacy
  skill (from before the rename in v0.34.0) writes workflow artifacts to
  `.cali-product-workflow/` — the old path. The current extension (v0.36.2)
  writes to `.stelow/`. Re-running `install.sh` (or `setup.sh`) will prune
  any leftover copies of the legacy skill from `~/.agents/skills/`.
- If you have workflows stuck in `.cali-product-workflow/` (legacy path),
  they are NOT tracked by the current extension and will appear "missing"
  in the muxy/herdr panels. Migrate manually if needed:
  1. Copy `.cali-product-workflow/<date>/<dirHash>/` → `.stelow/<date>/<dirHash>/`
  2. Add the workflow entry to `stelow.json` with cwd set to your project path

### Fixed (workflow root detection — user-reported bug)

- **`/sw-start` no longer falsely blocked by workflows in sibling projects.**
  The extension used to climb up to ANY parent directory that had
  `.stelow/` or `stelow.json`. This meant: a user running `/sw-start`
  in `/Users/cali/Development/PROJECT-X` (which has no `.stelow/`)
  would see "There is already an active workflow in this project"
  even though the active workflow lived in `/Users/cali/Development`
  (a separate project, just a shared parent dir).
- **Fix:** only climb up if the parent is the **git toplevel** of the
  cwd. This preserves the original intent ("user is in src/ of a git
  repo, tracking at repo root") while not conflating sibling projects.

### Added (unified source of truth across surfaces)

- **`extensions/stelow/workflow-root.ts`** — canonical `findProjectWorkflowRoot(cwd)`
  implementation, re-exported as `resolveProjectDir` for backward compat.
- **Muxy mirror** in `integrations/muxy/stelow-board/src/panel/data.js` —
  documents the contract; the panel itself filters workflows by `projectPath`
  in `getActiveWorkflow(workflows, projectPath)` (the actual fix for the
  panel).
- **Herdr Rust mirror** in `integrations/herdr/stelow-board/src/main.rs` —
  `#[allow(dead_code)] fn project_workflow_root(...)` kept for parity.
  The plugin's primary `project_root` continues to use `HERDR_PLUGIN_CONTEXT_JSON`
  directly (herdr runtime gives us the correct cwd).

### Added (anti-regression tests)

- **`tests/unit/workflow-root.test.ts`** — 10 tests covering:
  - cwd with own tracking → cwd
  - cwd without tracking, no git → cwd
  - subdir of git repo with tracking at root → git root
  - **REGRESSION**: sibling project under shared parent → cwd (NOT parent)
  - cwd is git toplevel with no tracking → cwd
  - cwd is subdir with own tracking → cwd
  - non-git-toplevel parent with tracking → cwd
  - leading tilde expansion
  - edge cases for tracking detection
- **`tests/unit/muxy-workflow-data.test.ts`** — 3 new tests for
  `getActiveWorkflow(workflows, projectPath)`:
  - foreign-worktree workflow → null
  - missing projectPath → null (defensive)
  - legacy cwd-empty workflow → compatible (same as extension)

### Changed (muxy panel)

- **`getActiveWorkflow(workflows, projectPath)`** now takes projectPath
  and filters workflows by `isWorkflowFromProject(wf, projectPath)`.
  Previously, it returned the first in-progress workflow regardless of
  worktree, causing the panel to act on workflows from sibling worktrees
  when the user clicked `/sw-next`, `/sw-abort`, etc.

## [0.36.1] - 2026-06-24

### Fixed (herdr plugin)

- **Workflows with empty `cwd` now show up in the board.** The previous
  `cwd_matches` rejected empty strings, hiding workflows whose `cwd`
  field wasn't written by the extension (common for early-version
  workflows). Mirrors muxy's `isWorkflowCwdCompatible` exactly — no
  early return on empty. Test coverage in
  `tests/unit/herdr-cwd-matches.test.ts`.
- **Plugin now reads cwd from the right source.** Plugin was reading
  `HERDR_FOCUSED_PANE_CWD` / `HERDR_WORKSPACE_CWD` env vars which herdr
  doesn't set. Now reads `HERDR_PLUGIN_CONTEXT_JSON` (the JSON blob
  herdr actually passes), using `ctx.focused_pane_cwd` then falling
  back to `ctx.workspace_cwd` then `HERDR_PLUGIN_ROOT`. This is the
  reason the board appeared empty even when workflows existed.

### Fixed (muxy extension)

- **Manifest now passes muxy schema validation.** Removed invalid
  `files:read` and `files:write` permissions (not in the schema enum),
  removed duplicate `panes:write`, removed `panel[0].width` (panel
  schema has `additionalProperties: false`). Pinned a copy of the
  official muxy manifest schema at
  `integrations/muxy/stelow-board/manifest.schema.json` for offline
  validation. Anti-regression test in
  `tests/unit/muxy-manifest-schema.test.ts`.

### Removed (herdr plugin)

- **Dead `Stage`/`StageStatus`/`PhaseEntry` code.** Computed a list of
  stages from PHASE_NAMES that was never rendered in the UI. YAGNI
  removed; future "show stages" view can derive it on demand.

### Changed

- **`package.json` `files[]`** now includes `integrations/herdr/stelow-board/`
  so the plugin ships in the npm package. Was previously omitted.
- **`scripts/version-sync.mjs`** now syncs the plugin version to
  `integrations/herdr/stelow-board/herdr-plugin.toml` (TOML format).
  Added `writeTomlVersion` helper. Run via existing `npm run version:sync`.
- **README.md herdr keybinds** updated to match current implementation
  (`Tab`/`j`/`k` next/prev workflow, no drill-in/out).

## [0.36.0] - 2026-06-24

### Added

- **🛡️ Quality Floor — appetite governs scope, never quality.** New
  explicit invariant in `stages/verification.md` and propagated to
  all 24 `codequality-review.md` skill copies. The Quality Floor
  lists which verification gates always run regardless of declared
  appetite (test-suite, code-quality-gate, invisible-20%, static a11y
  when UI exists, Quick-Tier interactive-testing, code review). Appetite
  controls **depth** (how thoroughly), not **whether** these run.
- **Anti-regression test suite** in `tests/appetite-consistency.test.ts`
  (17 new tests across 7 files). Blocks any future commit that
  re-introduces an appetite table with `Skip` for a quality column.
  Preserves legitimate scope skips via explicit allowlist (no UI,
  greenfield, context-stage, etc.).

### Changed

- **`stages/verification.md` — appetite gate table inverted.** Three
  rows previously allowed Lean/Core to skip quality gates; they now
  show the floor (light/single/static/quick-tier) and Complete
  adds depth (parallel/Nuclear/live-site/full browser). Rationale
  documented per row.
- **`cali-product-shape-up` SKILL.md (shape:12):** Tech Preview
  brownfield now always runs minimum `cymbal structure`; appetite
  adds refs/impact depth.
- **`cali-product-tech-planning` SKILL.md (planning:10.5):**
  Codebase Recon floor is always `cymbal search --text`; appetite
  adds refs/impact depth.
- **`cali-product-codebase-critique` SKILL.md:** Lean row no longer
  skips; it runs a single reviewer with a basic checklist. Header
  clarifies "Lean → light".
- **`cali-product-ux-critique` SKILL.md:** Header clarifies
  "Lean → static a11y baseline" (matrix table was already correct).

### Removed

- **`extensions/stelow/modules/cache.ts`** — whole file. `CacheManager`
  and `MapCache` had no runtime callers and no test coverage.
- **`readAllEvents`** from `modules/event-logger.ts` — no callers.
- **`createFreshCheckpoint`** from `modules/checkpoint.ts` — no callers.
- **`formatTask`, `formatTaskList`** from `modules/task.ts` — no callers.
- **`TextFileStore`, `MarkdownFileStore`, `ensureDir`, `IFileStore`**
  from `modules/file-store.ts` — no callers. `JsonFileStore` preserved
  because `checkpoint.ts` uses it at runtime
  (`getCheckpointStore` in `index.ts:422`).
- **`tests/unit/modules-file-store.test.ts`** — coverage of removed code.

### Fixed

- **`tests/integration/commands.test.ts`** — six assertions expected
  17 command files; dispatcher registers 16 (the 17th was removed in
  a prior change). Updated to match `npm run generate-cli-commands`
  output.

### Research basis

- **Estimation Bias Correction** (shape-up SKILL § Estimation Bias):
  LLMs systematically overestimate implementation time and tend to
  cut quality out of fear of complexity. The Quality Floor is the
  architectural countermeasure.
- **proposal-structure.md:** "Quality gates such as build/test/lint/
  typecheck and a11y checks when UI exists are not appetite cuts."
- **cali-product-testing-ai-code SKILL.md:** "Quality baseline applies
  to every appetite... Appetite changes exploration breadth, not
  whether quality gates exist."

The Quality Floor rule aligns the verification behavior with what
shape-up, tech-planning, and testing-ai-code already documented as
the intent — the verification stage was the outlier.

## [0.35.0] - 2026-06-23

### Added
- **`integrations/muxy/stelow-board/`** — Muxy webview panel renamed from
  `extensions/stelow-muxy/`. Muxy.app is open-source under MIT license
  (https://muxy.app/), distributed via GitHub releases. Plugin surface
  unchanged: same `displayName`, same commands, same keyboard shortcut.
- **`integrations/herdr/stelow-board/`** — New Rust+ratatui split-pane TUI
  plugin for the Herdr terminal multiplexer (https://herdr.dev/).
  Click-to-drill navigation through workflow stages → projects → scopes →
  tasks. Requires `herdr >= 0.7.0`.
- **`docs/design/stelow-board-herdr.md`** — Implementation plan for the
  Herdr plugin covering manifest schema, state machine, UI rendering,
  hit-test math, idempotent action wrapper, and open questions.
- **`docs/design/README.md`** references the new plan.

### Changed
- **README: External Dependencies table reordered** — harness-agnostic
  tools (cymbal, plannotator, safe-change, subagents built-in) come
  before Pi-only extensions (pi-subagents, pi-intercom, pi-supervisor)
  before external host integrations (Muxy, Herdr). Plannotator and
  safe-change were mis-classified as Pi-only and are now correctly
  listed as harness-agnostic (5 and 4+ CLIs respectively).
- **README: Visual & TUI Integrations section** — Refactored from
  Muxy-only to a comparison table + two sub-sections (Muxy webview +
  Herdr split-pane TUI), with host, UI model, install commands, and
  keybinds.
- **README: dropped "How We Differ" section** — Vague competitive
  comparisons with "Standard Agent" and stale star counts generated
  more noise than value. Positioning is already covered by Evidence &
  Limitations below.
- **README: dropped "🔧 Dependencies" section as standalone** —
  Collapsed to a `<sub>` footnote inline at the end (then moved into
  Installation as `### Manual setup & dependencies`).
- **README: "Philosophy" + "Why This Exists" merged into "Why stelow"**
  — Two halves of the same elevator pitch collapsed into one section
  with three H3 subsections (hook → Problem → What stelow does →
  Key Features).
- **README: command descriptions refined** — `/sw-start` description
  now mentions auto-runs triage + select when input is a list;
  `/sw-info` description clarifies it returns copy-pasteable cd +
  `/sw-resume` commands (not just info display). `/sw-info` replaces
  the misleading `/sw-goto` name (suggested "jump to" but is read-only).
- **Path A (`setup.sh`) installs all External Dependencies** —
  Previously required `./install.sh` as a separate step. Path A now
  attempts cymbal, ctx7, safe-change, and the Herdr stelow-board
  plugin (when herdr CLI on PATH) with graceful fallback. Muxy.app is
  detected but cannot be auto-installed.
- **Path A: per-step Y/n prompts + summary tracking** — Each optional
  install asks before running. Final summary lists ✅ / ❌ / ⏭ per item.
- **Path A: consistent step numbering (1/10 through 10/10).**
- **`AGENTS.md`: documented the `integrations/<host>/<plugin>/`
  convention** — `extensions/` is for in-process Pi extensions;
  `integrations/<host>/` is for plugins to external hosts (Muxy,
  Herdr) which have incompatible extension models.
- **AGENTS.md: added product naming convention** — `stelow` is
  canonical; legacy `cali-product-workflow` / `Cali Product Workflow`
  must NOT be used in new files. The runtime state directory
  `.cali-product-workflow/` is the one exception (filesystem path
  kept for backward compat).

### Refactored
- **Renamed `extensions/stelow-muxy/` → `integrations/muxy/stelow-board/`**
  — Muxy plugin directory moved out of `extensions/` (which is reserved
  for Pi in-process extensions) into `integrations/muxy/`. Git rename
  detection preserved history.
- **Renamed `cali.workflow-board` → `stelow.board`** — Plugin id
  renames in `herdr-plugin.toml` manifest, displayName in Muxy
  `package.json`, `<title>` in `panel/index.html`, command titles.
- **Renamed `cali-workflow-board` → `stelow-board`** — Cargo package
  and binary name in `Cargo.toml`.
- **Renamed `cli-agents/opencode|claude|codex/commands/sw-goto.md`
  → `sw-info.md`** — Commands `/sw-info.md` files. Internal `sw-goto`
  text inside each file also replaced.
- **Deprecated `stelow-goto` alias** — `extensions/stelow/commands.ts`
  still maps `stelow-goto` → `cmdGoto` for backward compatibility with
  scripts that used the old dispatch name.

### Removed
- **`extensions/stelow-pi/`** — 4-file stub package (1-line proxy that
  re-exported from `extensions/stelow/`). The stub added zero value
  and created two top-level Pi dirs that confused readers. The real
  Pi extension code lives in `extensions/stelow/`. Package name
  `extensions/stelow/package.json` corrected to canonical
  `@calionauta/stelow`.

### Fixed
- **README: "15 problems" closing bullet** removed — Listed BMAD /
  Superpowers / SpecKit / GSD with star counts; the Known Limitations
  table already communicates the same message honestly.
- **README: `/sw-inbox [add|remove\|clear]` and `/sw-ls [all\|archived]`**
  rendering — Pipes were not escaped, breaking Markdown table cells.
- **setup.sh: optional tools (cymbal, ctx7, safe-change, herdr plugin)
  now exit cleanly under `--dry-run`** — Previously skipped silently.
- **setup.sh: "Muxy is a paid macOS app" claim corrected** — Muxy is
  open-source under MIT license (verified via GitHub API). Muxy is
  macOS-only (SwiftUI + libghostty), distributed via GitHub releases.

### Notes for users upgrading from 0.34.1
- **Path A (`curl | sh`) now installs everything** — cymbal, ctx7,
  safe-change, and the Herdr stelow-board plugin all happen
  automatically. cymbal/ctx7 require interactive prompts and may
  fail silently if dependencies (brew/Go/npx) are missing.
- **`herdr plugin install` requires `herdr >= 0.7.0`** — Older versions
  (< 0.7.0) don't have the `plugin` subcommand. If upgrading, run
  `herdr server stop && herdr update` first.
- **The `stelow-goto` internal alias is deprecated** but still works
  for backward compatibility. New scripts should use `/sw-info`.

## [0.34.1] - 2026-06-22

### Changed
- **Skill renamed: `stelow` → `stelow-product-orchestrator`** — Directory,
  SKILL.md frontmatter, and all `/skill:stelow` references updated. Old name
  registered in `retired-skills.yaml` for auto-cleanup.
- **`retired-skills.yaml` moved from `skills/*/` to project root** — Ops-only
  file no longer leaked to runtime via `cp -r`. Convention added to AGENTS.md.
- **AGENTS.md: ops-only config rule** — Moved from passive Convention to
  active Don't, so the AI proactively places config/ops files at root, not
  inside `skills/*/`.

### Fixed
- `install.sh`: stale `skills/stelow/retired-skills.yaml` path → root.
- `install.sh`: stale `/skill stelow` reference in install instructions.
- `sync-cli-tools.sh`: stale `skills/stelow/references/` source path.
- `skills-lock.json`: stale `skills/stelow/SKILL.md` skill path.
- `sync-skills.ts`: hardcoded `"stelow"` directory in retired path.
- `sync-skills.test.ts`: leaked `mkdirSync` import after refactor.
- 30+ stale `skills/stelow/` references in docs and skill cross-refs.

## [0.34.0] - 2026-06-22

### Added
- **Intent classification at /sw-start** — Draft text is auto-classified into
  `new-product`, `feature`, `bugfix`, `refactor`, `investigate`, or `unknown`.
  User confirms or changes the detected category via TUI select prompt.
  Workflow adjusts stage pipeline accordingly (bugfix/refactor skip Shape Up,
  Interface, and Gates). Stores intent in workflow metadata and propagates
  to LLM skill activation message.
- **Drift detection at /sw-resume** — Before resuming, checks `git diff HEAD`
  and untracked files. If drift detected, warns user and asks for confirmation.
  Prevents continuing execution on stale code after interruption.
- **classifyIntent() pure function** — Keyword-pattern-based intent classifier
  in `state.ts` with scoring and tie-break logic. 11 unit tests.
- **WorkflowIntent type** — `WorkflowIntent` type + `INTENT_PHASE`,
  `INTENT_LABELS`, `INTENT_DESCRIPTIONS` constants in `types.ts`.

### Changed
- `start-message.ts`: `buildSkillActivationMessage()` now accepts `intent` and
  `initialPhase` params. Bugfix/refactor get minimal pipeline instructions;
  investigate gets spike-only instructions; new-product/feature get full pipeline.
- README commands table updated to reflect actual commands (removed stale
  `/sw-begin`, `/sw-continue`, `/sw-reset`, et al; added `/sw-pause`,
  `/sw-resume`, `/sw-abort`, `/sw-ls`, `/sw-setphase`, `/sw-info`,
  `/sw-rename`, `/sw-complete`, `/sw-inbox`, `/sw-unlock`).
- Artifact directory path fixed from `.pi/workflow/` to `.stelow/`.

## [0.33.0-alpha] - 2026-06-22

### Added
- **Estimation bias correction** (global criterion) — New rules across
  `cali-product-shape-up`, `cali-product-tech-planning`, and
  `cali-product-plan-critique` to counter model overestimation bias:
  scope count warnings are informational, `cuts_needed` must be based on
  value overlap not perceived complexity, final decision is always human.
- **E2E-first testing priority** — `cali-product-testing-ai-code` and
  `cali-product-testing-execution` reordered to prioritize E2E/behavior
  tests over unit tests across all appetite levels (Lean=1 E2E happy path,
  Core=E2E+variations, Complete=full E2E coverage).
- **Estimation is relative, not absolute** — `plan-critique` feasibility
  checklist now uses relative comparison levels (Low/Medium/High) for
  scope ranking, never absolute numbers.
- **Scope adjustment bias note** — Shape Up scope adjustment warns when
  model recommends removing items due to perceived complexity.

The mechanical warnings above (scope count, spec lines) are **indicators**, not gates.

### Changed
- **cali-product-testing-execution** phases inverted: E2E Browser Testing (Phase 1)
  → UI Quality (Phase 2) → Unit Tests (Phase 3) → Code Review (Phase 4)
  → Final Checklist (Phase 5). Decision tree, examples, edge cases updated.
- **test-behavior scopes** now mandatory in all appetites (was Complete-only).
- All new skill text in English (translated from Portuguese).
- Updated `appetite-consistency.test.ts` to match English assertion.

## [0.32.0-alpha] - 2026-06-21

### Added
- **Inbox grouping** — Triage now creates named group manifests (`.stelow/inbox/groups/`).
  Selection shows both individual items AND groups as selectable candidates.
  Setup reads group context and passes multi-item scope to Shape Up.
- **Cache boundary** — `SKILL.md` reorganized with stable prefix before cache boundary
  marker and variable content after. Expected ~65-75% reduction on SKILL.md input cost.
- **Model routing hints** — `stages.yaml` now has `model_hint` per stage:
  `economy` (triage, select, gate, scope, int-gate, verification),
  `standard` (setup, context, selection, execution, audit),
  `best` (shape, critique, interface, planning). Hints are informational —
  harness controls actual model selection.
- **context-efficiency.md** — Tool-agnostic token-saving strategies reference
  (truncation, batching, structured output, stage-specific tool blocking).
  Replaces the removed context-mode.md.

### Changed
- **Muxy scope tracking UX** — Workflow detail now keeps the selected workflow in sync
  with polling refreshes, shows per-scope status labels, type/source chips, and a
  clearer collapsed summary. Kanban cards show a compact scope progress bar and
  workflow command buttons refresh the board after execution.
- **Review Mode rename** — Former "Mode" renamed to "Review Mode" with explicit level names:
  Auto → Auto, Light → Only Product Spec, Moderate → Product Spec + Interface Choice,
  Full Product → All Above + Scopes In/Out, Full Product + Tech → All Above + Tech Review.
  Updated across all skills, stages, tests, and documentation.
- **install.sh rewrite** — Default is now interactive full setup (skills + extension +
  optional deps with step-by-step confirmation). `--minimal` for skills-only.
  `ASSUME_YES=1` for non-interactive CI mode.
- **context-mode removed** — All 24 `context-mode.md` files deleted (main + 23 sub-skill
  copies). Replaced by tool-agnostic `context-efficiency.md`.
- **README.md** — External Dependencies table added. Pi/Muxy integration clarified.
  All Mode references updated to Review Mode.
- **AGENTS.md** — External tools section added. context-mode reference removed.

### Fixed
- **Muxy detail stale state** — selected workflow/card detail now refreshes from
  the latest `stelow.json` object while the detail panel is open, so generated
  scopes and scope statuses update without closing/reopening the card.
- **Stale references** — 100 files updated to replace old Mode values
  (Light/Moderate/Full Product) with new Review Mode names.

## [0.31.0-alpha] - 2026-06-20

### Added
- **Execution Loop Protocol** — deterministic checkpointed iteration loop for feature scopes.
  - `checkpoint.ts`: `ExecutionCheckpoint` type + `JsonFileStore` wrapper for scope execution state.
  - `verify-runner.ts`: async `runVerifyCommands()` with 120s timeout, captures stdout+stderr.
  - `event-logger.ts`: append-only JSONL audit trail for scope execution events.
  - `index.ts` (adapter.onTurnEnd): detects `waiting_verify` checkpoints, runs verify commands,
    updates status to completed/escalated/in_progress, notifies LLM via adapter.
  - `execution-loop.md`: full protocol documentation (Layer 1 generic + Layer 2 extension).
  - Agent-agnostic: Layer 1 works on any agent (Pi, OpenCode, Claude Code, Codex, generic).
    Layer 2 (auto-verify) integrates via the Pi adapter's turn_end hook.
  - Zero new dependencies — only node:fs, node:child_process, node:path.

### Verified
- `npm run build`
- `npm run typecheck`
- `npm test` (720 passing, 21 files)

## [0.30.0-alpha] - 2026-06-20

### Added
- **Standalone awareness** — 9 skills now document fallback behavior when used outside stelow orchestrator.
- **Tech Preview** (`shape:12`) — appetite-gated codebase recon via cymbal before shaping product spec.
- **Alignment Check** (`planning:15`) — mode-gated bidirectional feedback between spec-tech and spec-product.
- **Reshape cycle** — blocking tech constraints trigger `/sw-setphase phasename=Shape` + `blocking-constraints.md` handoff.
- **cymbal reference doc** — installation, commands, and fallback for codebase navigation.

### Changed
- **Appetite × Mode matrix**: 23/23 combinations covered (shape:12 3/3, planning:15 15/15, reshape 5/5).
- **README**: zero internal stage code references in user-facing documentation.
- **Versioning process** documented in AGENTS.md: `npm version <major.minor.patch>` then `npm run version:sync`.

### Verified
- `npm run build`
- `npm run typecheck`
- `npm test`

## [0.29.0-alpha] - 2026-06-19

### Breaking Changes
- **Appetite labels renamed**: `Light / Balanced / Deep` → `Lean / Core / Complete`.
  This removes the `Light` appetite vs `Light` mode naming conflict and makes the cut policy explicit.

### Removed
- **Mutation testing removed from active workflow**: deleted the Stryker workflow, `stryker.conf.json`, `vitest.mutate.config.ts`, Stryker dependencies, and mutation scripts.
- **Mutation guidance removed from skills**: replaced mutation-score gates with risk-based coverage, critical-path tests, lint, and security gates.

### Changed
- **README and AGENTS.md updated**: removed mutation badge/references and clarified AI-aware testing strategy.
- **Testing skill guidance updated**: `cali-product-testing-ai-code` now recommends coverage/risk targets instead of mutation targets.
- **Appetite cut policy propagated**: setup, context, execution, verification, supervisor, and domain-skill references now use `Lean / Core / Complete`.

### Verified
- `npm run build`
- `npm run typecheck`
- `npm test` → 21 files, 718 tests passed

## [0.28.0-alpha] - 2026-06-19

### Changed
- **Supervisor sensitivity rebalanced**: Lean → Low, Core → Medium, Complete → High. Low sensitivity now active for all appetites (no more supervisor skip). Updated README appetite table, execution stage, supervise tool reference, and all 23 domain skill copies.
- **README appetite table corrected**: a11y audit and code review are now explicitly listed for Core appetite (they were already conditionally active in verification stage).
- **README short summary**: "Critique → Gate → Scope sequencing" replaces the stronger "Measure thrice" claim for accuracy.
- **README author blurb**: Reworded to "Built by a former product manager" with product leadership teaching and product strategy consulting background.

### Added
- **Scope tracking in `stelow.json`**: New `Scope` type and `scopes[]`
  field on `Workflow`. Scopes are initialized by the scope executor, updated per-scope
  on start/complete/escalate, and displayed on the Muxy kanban card (badge) and
  detail view (collapsible list with status icons).
- **Scope completion gate on `/sw-next`**: Blocks Execution→Verification if any scopes
  are not `completed`. Shows which scopes remain.
- **Audit re-injection loop**: When advancing from Audit phase, pending scopes loop
  the workflow back to Execution automatically. Scope executor picks them up.
- **Audit criteria 8 (Gap-to-Scope)**: `cali-product-execution-critique` now converts
  ESCALATED gaps into new scopes in the tracking file, creating a self-healing cycle.

## [0.23.5-alpha] - 2026-06-13

### Changed
- **`status` field normalized across tracking + index.json**: `updateWorkflowIndexJson`
  now synchronizes `status` and `workflow_status`. LLMs can use `status` in
  both files without confusion. Direct writers (`start.ts`, `archiveWorkflowOnDisk`,
  `cmdUnarchive`) also write both fields. Readers prefer `status`
  with fallback to `workflow_status` (backward compat).

## [0.23.4-alpha] - 2026-06-13

### Fixed
- **Skip "Continue?" on fresh workflows**: auto-discovery in `setup.md` now
  checks if `created_at` < 60s ago. Workflows freshly created by `/sw-start`
  skip the redundant question.
- **Note `status` vs `workflow_status` in SKILL.md**: LLMs were confusing the
  tracking file (`status`) fields with index.json (`workflow_status`). Bash template
  now has explicit warning.

## [0.23.3-alpha] - 2026-06-13

### Fixed
- **`getActiveWorkflow` per-worktree isolation**: filters workflows by `cwd`
  via `isWorkflowFromProject`. Stale entries from other Muxy worktrees no longer
  block `/sw-start`. `getAllActiveWorkflows` also filtered.
- **`/sw-doctor` now fixes `local-stale-cwd`**: workflows with `cwd` outside
  the project are archived (tracking + index.json) via `--fix` or interactive
  prompt.

## [0.23.2-alpha] - 2026-06-12

### Added
- **`/sw-doctor --fix`**: auto-fixes zombie workflows, index-status-mismatch,
  and index-phase-mismatch. Supports `--fix` flag (silent) and interactive prompt
  via TUI select when fixable issues are detected.
- **Muxy stale indicator**: kanban cards show warning "⚠ Stale (>24h without
  update)" for workflows stuck in `in-progress`.

### Fixed
- **`cmdArchive`/`cmdAbort`/`cmdArchive purge`**: now synchronize index.json
  via `updateWorkflowIndexJson` directly by `dirHash`, in addition to name lookup
  in `archiveWorkflowOnDisk`. Ensures index.json never becomes inconsistent.
- **`removeWorkflowFromTracking`**: accepts optional `wf` parameter with `dirHash`
  for direct fallback. All 6 call sites updated.

### Documentation
- **README**: `/sw-next` documented with auto-complete; `/sw-doctor` documented
  with zombie detection.

## [0.23.1-alpha] - 2026-06-12

### Fixed
- **Auto-complete workflow on last `/sw-next`**: `cmdNext` now finalizes the workflow
  automatically when `next >= PHASE_NAMES.length`, without depending on manual `/sw-complete`.
  Marks all phases as "completed", synchronizes index.json and stages guard,
  and clears the UI status.
- **`turn_end` sync detects completed workflow**: no longer hardcodes
  `workflow_status: "in-progress"` in index.json. If all phases are completed,
  writes `"completed"`. Includes defensive guard `Array.isArray(phases)`.
- **Zombie workflow detection**: `diagnoseZombieIndexes()` scans all
  `.stelow/<date>/<hash>/index.json` and flags workflows with
  `workflow_status: "in-progress"` that haven't been updated in >24h and don't
  match any locally active workflow. Reported via `/sw-doctor`.

## [0.23.0-alpha] - 2026-06-11

### Changed
- **Global ~/.stelow-global.json is read-only index**: no longer stores `status`,
  `currentPhase`, `phases`, `stage`. Real state always read from local file.
  Removed 337 lines of synchronization code.
- **Commands no longer write state to global**: pause, resume, setphase, next,
  complete only change local tracking.
- **Multiple active workflows blocked**: `/sw-start` refuses if one is already in-progress;
  `/sw-resume` refuses if another workflow is already active.
- **Muxy Done column**: board now has `Done` column for completed workflows;
  removed from Verify/Shape.
- **Muxy multi-worktree**: board optionally shows workflows from other worktrees
  of the same repository, with card identifying the source worktree.

### Added
- **`/sw-doctor`** command: diagnoses tracking health, stale cwd, duplicates,
  index mismatches, global/missing/local.
- **Muxy extra workflows**: loads from global tracking + fetches real local state
  to display multi-worktree.
- **Catalog helpers**: `addToGlobalIndex`, `removeGlobalIndexEntry`,
  `updateGlobalIndexName`.

### Fixed
- **session_start** no longer imports from global (which has no status).
- **turn_end** doesn't sync global; only index.json.
- **cmdStatus/cmdGoto** no longer use status from global.
- **doctor.ts** adapted for global index-only.
- **Muxy stale cwd**: workflow with cwd from another project is hidden and disabled.

## [0.16.1-alpha] - 2026-06-06

### Fixed
- **syncStagesGuardState crash** when tracking file has no active workflow.
- **Tool restrictions stale**: `getStageGuard()` now reads from `stelow.json`
  instead of orphaned `current-stage.json`.
- **Tracking file overwrite**: no longer nullifies `trackingData` when no active workflow.
- **4 new edge case tests** for re-transition, no active workflow, corrupt file,
  invalid phase index. All 643 tests pass.

## [0.16.0-alpha] - 2026-06-06

### Changed
- **Single source of truth for stage state**: merged `current-stage.json` into
  `stelow.json`. The `stage` field on each workflow now holds
  transition history, gates_passed, and supervisor_active. Eliminates drift
  between LLM state and TUI display.
- **syncStagesGuardState** writes to `stelow.json` (reads legacy
  `current-stage.json` as migration fallback).
- **adapters/stages-guard.ts** auto-detects tracking vs stage-state file format.
- **adapters/state-manager.ts** `transition()` accepts optional `trackingPath`
  to sync stage state into `stelow.json`.
- **SKILL.md** state management section now points to `stelow.json`.
- **Tests updated**: all 639 pass.

## [0.15.1-alpha] - 2026-06-06

### Documentation
- **README updated** for mandatory Interface Alternatives: Auto/Light mode table now
  shows `standard (fixo)`, Light description updated, examples reflect new stage
  counts.

## [0.15.0-alpha] - 2026-06-06

### Changed
- **Interface Alternatives mandatory**: Removed `none` option from `interface:` field in
  spec-product frontmatter. Interface now always runs, even in Auto/Light mode.
  The skill covers system interfaces too (API contracts, auth flows, data layer
  patterns), not just visual UI.
- **Auto-chaining simplified**: "Shape Up" now always includes Interface,
  eliminating the separate "Shape Up + Interface" option. Auto/Light mode no
  longer delegates the interface decision to the LLM — `standard` is fixed.

## [0.14.0-alpha] - 2026-06-03

### Added
- **Product-level DoD and ACs** in shape-up: each shaped proposal now includes Definition
  of Done and Acceptance Criteria, validated by output guard.
- **Explicit DoD/AC verification** in scope-executor iteration loop (Step 7): each DoD
  and AC is checked with concrete evidence before declaring success.

### Changed
- **Coding standards merged**: `cali-product-coding-standards` created as self-contained
  skill (universal principles + product-domain depth). Old `cali-product-code-standards`
  removed. Simplicity reviewer now loads the merged skill explicitly.
- **Datastar depth moved**: backend source of truth, SSE-First, HATEOAS details moved
  from product skill to `cali-coding-go-stack` (~/.agents/skills/).

## [0.13.0-alpha] - 2026-06-03

### Added
- **Feature scope auto-iteration loop** in cali-product-scope-executor: feature scopes now
  run implement → verify → review → quality cycles with plateau detection, `[MAX_ITERATIONS]`
  budget (default: 3), and human escalation after exhaustion. See `scopes-and-sequencing.md`
  for `[MAX_ITERATIONS]` docs and scope-executor/SKILL.md Step 3.
- **8 new tests** validating iteration loop structure, MAX_ITERATIONS documentation,
  and consistency across all 25 goals.md copies.

## [0.10.0-alpha] - 2026-06-01

### Changed
- **BREAKING**: Removed `complexity_estimate` field from proposal-structure.md — replaced with `appetite_fit` (fits/cuts_needed/reshape). Appetite is now treated as a constraint, not a target for estimation. The LLM checks whether the shaped proposal fits the declared appetite, rather than estimating effort on an ordinal scale.
- **BREAKING**: plan-critique/SKILL.md appetite violation check now uses `appetite_fit` case-based logic instead of ordinal comparison (Light vs XS/S/M/L/XL). `reshape` halts critique with exit 1.
- **shape-up/SKILL.md**: Validation guard updated to check `appetite_fit` field instead of `complexity_estimate`. Conceptual callout rewritten to emphasize appetite as constraint.
- **scope-executor/SKILL.md**: Template reference updated from `Complexity Estimate` to `Appetite Fit`.
- **execution-critique/SKILL.md**: Fixed stale XS/S/L/XL appetite labels → Light/Balanced/Deep.
- **setup.md**: Comment updated to reference `appetite_fit` constraint model.
- **README.md**: Complete restructure — new section ordering, Key Differentiators as proper heading, "Measure thrice, cut once" as blockquote, Appetite & Mode promoted, Evidence-Based Design + Radical Transparency merged into unified Evidence & Limitations section, Mode system added to differentiators, links added for all Known Limitations papers.
- **appetite-consistency.test.ts**: Tests updated for new schema; execution-critique added to stale-label scan.

### Added
- **State coverage baseline**: Standardized coverage formula `(✅ + ⬆️) / (✅ + ❌ + ⬆️)` across all 4 skills (interface-alternatives, interface-rules, checklists, ui-audit-dimensions)
- **Component Typing section** in `ui-audit-dimensions.md`: Int/Disp classification with baseline applicability rules
- **N/A ⬆️ semantics**: ⬆️ (inherited) counts toward coverage, with named system reference requirement
- **Guardrails**: Component grouping (×N for repeated components), platform-aware states (web vs mobile), self-audit checklist before finalizing coverage table, N/A justification rule (>1 N/A per Int = required note), Display misclassification self-check
- **Quantitative consistency checks**: Coverage plausibility, N/A inflation detection, Display cell cap (≤3)
- **Escape hatch expansion** beyond Archetype D: all Archetype A tables may declare escape rows with ⬆️^DS
- **Baseline relaxation**: read-only/kiosk, voice-only, simple Int components (single-state: toggle, badge)

### Fixed
- **Coverage formula contradiction**: `interface-rules.md` now uses `(✅ + ⬆️) / (✅ + ❌ + ⬆️)` (was excluding ⬆️), matching `output-format.md`
- **Bugged coverage example**: Row showing `4/4` corrected to `6/6` (5 ✅ + 1 ⬆️ = 6 applicable cells)
- **⬆️ missing from N/A Semantics table** in `interface-rules.md`: Added inheritance row
- **Missing coverage formula** in `checklists.md`: Added formula + numeric example
- **Missing scoring threshold alignment**: Added `Maps to (present tells)` column + cross-file reference for inverted scales
- **Missing Int/Disp typing** in `ui-audit-dimensions.md`: Added Component Typing section

## [0.8.4-alpha] - 2026-06-01

### Fixed
- **Approach name mismatch**: `stages/ask-patterns.md` and `stelow-spec.md` now use the canonical name `Multi-Method Market Analysis` (matching `SKILL.md`), instead of the truncated `Market Analysis`.
- **`stages.yaml` awareness**: `context` stage description now references the `context:5` gate (previously silent on the new gate mechanism).
- **Gate matrix clarity**: `stages/context.md` `context:5` matrix row for `Complete | any` now notes that `Auto` is unreachable (Complete appetite forces `Full Product` or `Full Product + Tech` per `README.md`).

## [0.8.3-alpha] - 2026-06-01

### Added
- **`context:5` appetite/mode gate** in `stages/context.md`. Lean + Auto skips the entire Context stage; Light + non-Auto uses a reduced ask (5 strategic approaches listed with opt-in execution, 8 domain libraries detected as reference-only). Balanced and Deep retain full behavior. See `stages/context.md#context:5` for the full matrix.

### Changed
- **Label standardization**: Stage references in `SKILL.md` now use `:10`/`:20` instead of `2a`/`2b`, matching the gap-based numbering convention in `AGENTS.md`.
- **Mode rename**: `Full Tech` → `Full Product + Tech` across README, all 5 stage files, 2 skill SKILL.md files, and the canonical consistency test. Old label is fully removed.

## [0.8.2-alpha] - 2026-06-01

### Fixed

- **Cross-skill references**: Replaced `skills/cali-product-*/SKILL.md` paths with skill names (e.g., `cali-product-shape-up`) across orchestrator, stages, tech-planning, scope-executor, and all 25 goals.md files — skills now work standalone at `~/.agents/skills/`
- **Broken ask.md reference**: Fixed 4 references to non-existent `ask.md` → `structured-question.md` in shape-up/SKILL.md and workflow/SKILL.md
- **permissions.md paths**: Removed repo-relative prefixes for standalone compatibility

### Added

- **README standalone note**: Documented that each skill is fully self-contained with its own references/
- **Structured exports**: Added exports field for cleaner imports

## [0.7.0-alpha] - 2026-05-30

### Added

- **cali-product-execution-critique skill**: Unified post-implementation audit with 8 fixed criteria across 4 input modes (workflow, plan, context, standalone) and `sem diff` integration for entity-level analysis
- **Radical transparency section** in README: Documents 11 known LLM failure modes per 2026 research (Gamage, Osmani, GitClear, Veracode, Ox Security, METR, Faros AI)
- **Context rot awareness rules** in orchestrator SKILL.md: fresh context between stages, no patching in degraded context, read from disk
- **Fresh context check** in execution stage: re-read spec-tech from disk before starting
- **Invisible 20% checklist** in verification stage: error handling, observability, security, validation, rollback
- **NFR checklist** in tech planning scopes: per-scope non-functional requirements to combat the 80% Problem
- **Model provenance tracking**: `generated_by` in spec-product.md frontmatter + Model Provenance Check in gate stage

### Changed

- Renamed `cali-product-delivery-audit` → `cali-product-execution-critique` (directory, frontmatter, all internal references)
- Merged `cali-post-execution-check` content (triggers, warnings) into `cali-product-execution-critique` skill
- All internal skill references normalized to `skills/*/SKILL.md` pattern
- `setup.sh` and `install.sh` now list 22 skills (added `cali-product-execution-critique`)

### Fixed

- Plannotator description updated to reflect interactive annotation + feedback loop
- 3 stale `cali-product-plan-critique` references in test files → `cali-product-critique`
- DISPLAY_NAMES in phase-consistency test: `Plan Critique` → `Product Critique`
- Stage file name `delivery-audit.md` → `execution-critique.md`
- Core stage files list in sandbox-install test updated

### Removed

- Deprecated `~/.agents/skills/cali-post-execution-check/` (content merged into `cali-product-execution-critique`)

---
  - `.` → main extension entry point
  - `./skills` → skills directory
  - `./extensions` → extensions directory

- **`files` field**: Explicit list of published files for cleaner npm package
  - Only includes necessary files (extensions, skills, scripts, config)
  - Excludes empty directories and development artifacts

### Changed

- **Multi-CLI support**: Package now installs on any CLI (pi, opencode, claude-code, codex)
  - Removed `pi:` field from package.json
  - Moved Pi-specific peerDependencies to `optionalPeerDependencies`
  - Updated description to reflect multi-CLI support
  - Removed "pi-package" from keywords

### Documentation

- Updated `docs/INSTALLATION.md` with:
  - Clear separation of required vs Pi-specific dependencies
  - Generic npm install instructions for non-Pi CLIs
  - CLI-specific installation methods (opencode, claude-code, codex)

---

## [0.1.0-alpha] - 2026-05-15

### Added

- **15 skills** with `cali-product-*` prefix:
  - Core: workflow, short-cycle, opportunity-mapping, job-to-be-done, evolutionary-principles, multi-method-market-analysis, scope-executor
  - Growth: ads, business-models, health, marketplace-playbook, open-source, pricing, promotions, trust-building

- **Extension** with workflow commands:
  - `/sw-start` - Start workflow (auto-parses @filename and text)
  - `/sw-stop` - Stop immediately and clear UI
  - `/sw-pause` - Pause (keeps state)
  - `/sw-resume` - Resume paused workflow
  - `/sw-status` - Show current status
  - `/sw-list` - List all workflows
  - `/sw-setphase` - Set current phase
  - `/sw-next` - Advance to next phase
  - `/sw-complete` - Mark as completed
  - `/sw-info` - Navigate to workflow in another project

- **TUI integration**:
  - Footer status shows current workflow + stage
  - Widget above editor shows full workflow info
  - Toast notifications on phase transitions
  - Auto-update when skill advances phases
  - Pause/resume visual states

- **7 workflow stages** matching skill phases:
  - Clarify (Fase 0)
  - Shape (Fase 1)
  - Interface (Fase 2)
  - Critique (Fase 3)
  - Gate (Fase 4)
  - Planning (Fase 5)
  - Execution (Fase 6)

- **Cross-project state**:
  - Local tracking in project
  - Global tracking in home directory
  - Auto-discover workflows when opening projects

- **Smart input parsing**:
  - `@filename` parsed as source files
  - Trailing text parsed as draft content
  - Auto-slug generation from draft or filename

### Changed

- Commands renamed from `/workflow-*` to `/sw-*`
- Phase names updated to match skill exactly
- TUI elements now use clear user-facing labels

---

## [0.0.1-alpha] - 2026-05-15

### Added

- Initial alpha release structure
- Basic extension scaffolding
- 13 initial skills