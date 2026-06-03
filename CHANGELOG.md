# Changelog

All notable changes to `@renatocaliari/cali-product-workflow` will be documented in this file.

## [Unreleased]

### Added
- **Feature scope auto-iteration loop** in cali-product-scope-executor: feature scopes now
  run implement → verify → review → quality cycles with plateau detection, `[MAX_ITERATIONS]`
  budget (default: 3), and human escalation after exhaustion. See `scopes-and-sequencing.md`
  for `[MAX_ITERATIONS]` docs and scope-executor/SKILL.md Step 3.

## [0.10.0-alpha] - 2026-06-01

### Changed
- **BREAKING**: Removed `complexity_estimate` field from proposal-structure.md — replaced with `appetite_fit` (fits/cuts_needed/reshape). Appetite is now treated as a constraint, not a target for estimation. The LLM checks whether the shaped proposal fits the declared appetite, rather than estimating effort on an ordinal scale.
- **BREAKING**: plan-critique/SKILL.md appetite violation check now uses `appetite_fit` case-based logic instead of ordinal comparison (PoC vs XS/S/M/L/XL). `reshape` halts critique with exit 1.
- **shape-up/SKILL.md**: Validation guard updated to check `appetite_fit` field instead of `complexity_estimate`. Conceptual callout rewritten to emphasize appetite as constraint.
- **scope-executor/SKILL.md**: Template reference updated from `Complexity Estimate` to `Appetite Fit`.
- **execution-critique/SKILL.md**: Fixed stale XS/S/L/XL appetite labels → PoC/Focused/Comprehensive.
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
- **Approach name mismatch**: `stages/ask-patterns.md` and `cali-product-workflow-spec.md` now use the canonical name `Multi-Method Market Analysis` (matching `SKILL.md`), instead of the truncated `Market Analysis`.
- **`stages.yaml` awareness**: `context` stage description now references the `context:5` gate (previously silent on the new gate mechanism).
- **Gate matrix clarity**: `stages/context.md` `context:5` matrix row for `Comprehensive | any` now notes that `Auto` is unreachable (Comprehensive appetite forces `Full Product` or `Full Product + Tech` per `README.md`).

## [0.8.3-alpha] - 2026-06-01

### Added
- **`context:5` appetite/mode gate** in `stages/context.md`. PoC + Auto skips the entire Context stage; PoC + non-Auto uses a reduced ask (5 strategic approaches listed with opt-in execution, 8 domain libraries detected as reference-only). Focused and Comprehensive retain full behavior. See `stages/context.md#context:5` for the full matrix.

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
  - `/pw-start` - Start workflow (auto-parses @filename and text)
  - `/pw-stop` - Stop immediately and clear UI
  - `/pw-pause` - Pause (keeps state)
  - `/pw-resume` - Resume paused workflow
  - `/pw-status` - Show current status
  - `/pw-list` - List all workflows
  - `/pw-setphase` - Set current phase
  - `/pw-next` - Advance to next phase
  - `/pw-complete` - Mark as completed
  - `/pw-goto` - Navigate to workflow in another project

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

- Commands renamed from `/workflow-*` to `/pw-*`
- Phase names updated to match skill exactly
- TUI elements now use clear user-facing labels

---

## [0.0.1-alpha] - 2026-05-15

### Added

- Initial alpha release structure
- Basic extension scaffolding
- 13 initial skills