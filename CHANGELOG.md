# Changelog

All notable changes to `@renatocaliari/stelow` will be documented in this file.

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
  `extensions/stelow/package.json` corrected from
  `@renatocaliari/pi-product-workflow-extension` to
  `@renatocaliari/stelow`.

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
  agora sincroniza `status` e `workflow_status`. LLMs podem usar `status` em
  ambos os arquivos sem confundir. Writers diretos (`start.ts`, `archiveWorkflowOnDisk`,
  `cmdUnarchive`) também escrevem ambos os campos. Readers preferem `status`
  com fallback para `workflow_status` (backward compat).

## [0.23.4-alpha] - 2026-06-13

### Fixed
- **Skip "Continue?" on fresh workflows**: auto-discovery em `setup.md` agora
  verifica se `created_at` < 60s atrás. Workflows recém-criados por `/sw-start`
  pulam a pergunta redundante.
- **Nota `status` vs `workflow_status` no SKILL.md**: LLMs confundiam os campos
  do tracking file (`status`) com index.json (`workflow_status`). Template bash
  agora tem aviso explícito.

## [0.23.3-alpha] - 2026-06-13

### Fixed
- **`getActiveWorkflow` per-worktree isolation**: filtra workflows por `cwd`
  via `isWorkflowFromProject`. Stale entries de outros Muxy worktrees não
  bloqueiam mais `/sw-start`. `getAllActiveWorkflows` também filtrado.
- **`/sw-doctor` agora corrige `local-stale-cwd`**: workflows com `cwd` fora
  do projeto são arquivados (tracking + index.json) via `--fix` ou prompt
  interativo.

## [0.23.2-alpha] - 2026-06-12

### Added
- **`/sw-doctor --fix`**: auto-corrige zombie workflows, index-status-mismatch,
  e index-phase-mismatch. Suporta flag `--fix` (silencioso) e prompt interativo
  via TUI select quando issues corrigíveis são detectadas.
- **Muxy stale indicator**: kanban cards mostram aviso "⚠ Stale (>24h without
  update)" para workflows travados em `in-progress`.

### Fixed
- **`cmdArchive`/`cmdAbort`/`cmdArchive purge`**: agora sincronizam index.json
  via `updateWorkflowIndexJson` direto por `dirHash`, além da busca por nome
  em `archiveWorkflowOnDisk`. Garante que index.json nunca fique inconsistente.
- **`removeWorkflowFromTracking`**: aceita parâmetro `wf` opcional com `dirHash`
  para fallback direto. Todos os 6 call sites atualizados.

### Documentation
- **README**: `/sw-next` documentado com auto-complete; `/sw-doctor` documentado
  com detecção de zumbis.

## [0.23.1-alpha] - 2026-06-12

### Fixed
- **Auto-complete workflow on last `/sw-next`**: `cmdNext` agora finaliza o workflow
  automaticamente quando `next >= PHASE_NAMES.length`, sem depender de `/sw-complete`
  manual. Marca todas as fases como "completed", sincroniza index.json e stages guard,
  e limpa o status da UI.
- **`turn_end` sync detecta workflow completo**: não hardcoda mais
  `workflow_status: "in-progress"` no index.json. Se todas as fases estão concluídas,
  escreve `"completed"`. Inclui guard defensivo `Array.isArray(phases)`.
- **Zombie workflow detection**: `diagnoseZombieIndexes()` varre todos os
  `.stelow/<date>/<hash>/index.json` e flagra workflows com
  `workflow_status: "in-progress"` que não foram atualizados em >24h e não
  correspondem a nenhum workflow ativo local. Reportado via `/sw-doctor`.

## [0.23.0-alpha] - 2026-06-11

### Changed
- **Global ~/.stelow-global.json é índice read-only**: não armazena mais `status`,
  `currentPhase`, `phases`, `stage`. Estado real sempre lido do arquivo local.
  Removeu 337 linhas de código de sincronização.
- **Comandos não escrevem mais estado no global**: pause, resume, setphase, next,
  complete só alteram tracking local.
- **Multiple active workflows bloqueado**: `/sw-start` recusa se já existe in-progress;
  `/sw-resume` recusa se outro workflow já está ativo.
- **Muxy Done column**: board agora tem coluna `Done` para workflows completed;
  removed from Verify/Shape.
- **Muxy multi-worktree**: board opcionalmente mostra workflows de outros worktrees
  do mesmo repositório, com card identificando o worktree de origem.

### Added
- **`/sw-doctor`** command: diagnóstico de tracking health, stale cwd, duplicates,
  index mismatches, global/missing/local.
- **Muxy extra workflows**: carrega do global tracking + busca estado real local
  para exibir multi-worktree.
- **Helpers de catálogo**: `addToGlobalIndex`, `removeGlobalIndexEntry`,
  `updateGlobalIndexName`.

### Fixed
- **session_start** não importa mais do global (que não tem status).
- **turn_end** não sincroniza global; só index.json.
- **cmdStatus/cmdGoto** não usam mais status do global.
- **doctor.ts** adaptado para global index-only.
- **Muxy stale cwd**: workflow com cwd de outro projeto é escondido e desabilitado.

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