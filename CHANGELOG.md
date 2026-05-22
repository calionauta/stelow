# Changelog

All notable changes to `@renatocaliari/cali-product-workflow` will be documented in this file.

## [Unreleased]

### Added

- **Structured exports**: Added exports field for cleaner imports
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