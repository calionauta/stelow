# Changelog

All notable changes to `@renatocaliari/cali-product-workflow` will be documented in this file.

## [Unreleased]

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