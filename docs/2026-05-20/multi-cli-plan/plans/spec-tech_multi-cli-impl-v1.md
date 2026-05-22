---
source: cali-tech-planning
original_files: spec-tech_multi-cli-v1.md (approved plan)
date: 2026-05-20
---

# Technical Spec: Multi-CLI Support Implementation

**Version:** v1  
**Status:** Draft - For Execution  
**Date:** 2026-05-20  
**Author:** Cali (Renato Caliari)  
**Source:** Based on approved plan `spec-tech_multi-cli-v1.md` + research findings

---

## 0. Product Context

### Problem Statement
cali-product-workflow currently only works on Pi. Goal: support OpenCode, Claude Code, and Codex with a single codebase.

### Key Decisions (from approved plan)
1. **AGENTS.md is NOT duplicated** - Single generic version with CLI detection
2. **Single repo** - Everything in one place
3. **Adapters pattern** - Thin wrappers around shared skills
4. **Phase 1-2 only** - No shared packages extraction
5. **Main package is generic** - No Pi-specific configs
6. **Single install.sh** - Auto-detects CLI

### Brownfield Context
Existing product with Pi-specific code. New features (adapters) added incrementally. Existing Pi functionality must continue working.

---

## 1. Identified Scopes

### Critical Spike (before Phase 1)
| Scope | Type | Justification |
|-------|------|---------------|
| **spike-cli-detection** | spike | Define CLICapabilities interface + test detection logic |

### Phase 1 Scopes (Independent, can parallelize)
| Scope | Type | Justification |
|-------|------|---------------|
| **feature-package-cleanup** | feature | Clean package.json - unblock installation |
| **feature-install-script** | feature | Create install.sh - user-facing |

### Phase 2 Scopes (Sequential dependency)
| Scope | Type | Justification |
|-------|------|---------------|
| **feature-cli-adapter** | feature | Core adapter pattern implementation |
| **feature-commands-abstract** | feature | Abstract command registration |
| **feature-events-abstract** | feature | Abstract event handlers |
| **feature-ui-abstract** | feature | Abstract TUI components |

### Testing Scopes
| Scope | Type | Justification |
|-------|------|---------------|
| **test-cli-detection** | test-behavior | Integration tests for CLI detection |
| **test-integration-all-cli** | test-integration | Test workflow on all CLIs |

---

## 2. High-Level Sequence

```
[spike-cli-detection]
       ↓
[feature-package-cleanup] ←→ [feature-install-script]  (PARALLEL)
       ↓
[feature-cli-adapter]
       ↓
[feature-commands-abstract]
       ↓
[feature-events-abstract]
       ↓
[feature-ui-abstract]
       ↓
[test-cli-detection] ←→ [test-integration-all-cli]  (PARALLEL)
```

### Sequencing Rationale
1. **spike-cli-detection**: Foundation for all adapter work
2. **Parallel Phase 1**: package cleanup and install script are independent
3. **Sequential Phase 2**: Each scope builds on the previous
4. **Parallel testing**: Tests are independent of implementation

---

## 3. Detailed Development Sequence per Scope

---

## [SCOPE-0] spike-cli-detection

**Type:** spike  
**Objective:** Define CLICapabilities interface and validate detection logic  
**Rationale:** This is the foundation for the entire adapter pattern. Must complete before any adapter code.

### Definition of Done
- [ ] `CLICapabilities` interface defined in `types.ts`
- [ ] `detectCLI()` tested for all 4 CLIs (pi, opencode, claude-code, codex)
- [ ] `getCLITools()` returns correct tools per CLI
- [ ] Documentation of detection signals for each CLI

### Implementation Tasks

| # | Task | Done Criterion | Risk |
|---|------|---------------|------|
| 1.1 | Read existing `state.ts` detectCLI() | Understand current implementation | LOW |
| 1.2 | Read existing `state.ts` getCLITools() | Understand current tool mapping | LOW |
| 1.3 | Define `CLICapabilities` interface | Interface covers all CLI differences | MEDIUM |
| 1.4 | Add missing detection signals | Env vars, config files, commands | MEDIUM |
| 1.5 | Add detection for OpenCode | Detect via `~/.config/opencode/` | LOW |
| 1.6 | Add detection for Claude Code | Detect via `~/.claude/` or `.claude-plugin/` | LOW |
| 1.7 | Add detection for Codex | Detect via `~/.codex/` or `.codex-plugin/` | LOW |
| 1.8 | Write CLI detection tests | Test all 4 CLIs, edge cases | MEDIUM |
| 1.9 | Document detection signals | README section on CLI detection | LOW |

### Technical Considerations
- Use environment variables as primary override (PRODUCT_WORKFLOW_CLI)
- Use config directory existence as secondary signal
- Add command availability check as tertiary signal
- Handle "generic" fallback gracefully

### Dependencies
None - this is the starting point

### Output
- Updated `types.ts` with `CLICapabilities`
- Updated `state.ts` with enhanced detection
- Test file `tests/cli-detection.test.ts`

---

## [SCOPE-1] feature-package-cleanup

**Type:** feature  
**Objective:** Clean package.json so it installs on all CLIs  
**Rationale:** Quick win - removes Pi-specific blocking fields

### Definition of Done
- [ ] `pi:` field removed from package.json
- [ ] Pi-specific peerDependencies removed
- [ ] Exports field added for skills and cli-tools
- [ ] Package installs via `npm install -g` without errors
- [ ] Package still works on Pi when Pi-specific deps installed separately

### Implementation Tasks

| # | Task | Done Criterion | Risk |
|---|------|---------------|------|
| 1.1 | Backup current package.json | Original preserved in git | LOW |
| 1.2 | Remove `"pi": {...}` field | No pi-specific config | LOW |
| 1.3 | Move Pi deps to documentation | Users know to install separately | LOW |
| 1.4 | Add `"exports"` field | `"./skills"` and `"./cli-tools"` work | MEDIUM |
| 1.5 | Update keywords | Remove "pi-package", keep "ai-coding-agent" | LOW |
| 1.6 | Test `npm pack` | Package.tgz generated correctly | MEDIUM |
| 1.7 | Update INSTALLATION.md | Document Pi-specific installation | LOW |
| 1.8 | Verify on Pi | Install package + Pi deps separately | LOW |

### Technical Considerations
- Exports field allows `import 'cali-product-workflow/skills'`
- OptionalPeerDependencies still in package but non-blocking
- Keep "pi-skill" keyword for discoverability

### Dependencies
None - independent scope

### Output
- Cleaned `package.json`
- Updated `docs/INSTALLATION.md`

---

## [SCOPE-2] feature-install-script

**Type:** feature  
**Objective:** Create single install.sh that auto-detects CLI  
**Rationale:** User-facing - one command for all CLIs

### Definition of Done
- [ ] `install.sh` script exists in repo root
- [ ] Auto-detects: pi, opencode, claude-code, codex, generic
- [ ] Installs base package for all CLIs
- [ ] Installs CLI-specific packages when needed
- [ ] Works on macOS, Linux
- [ ] Graceful fallback for unknown CLIs

### Implementation Tasks

| # | Task | Done Criterion | Risk |
|---|------|---------------|------|
| 2.1 | Create `install.sh` skeleton | Script runs without error | LOW |
| 2.2 | Implement CLI detection function | Returns correct CLI for each | MEDIUM |
| 2.3 | Add base package installation | Works via npm/pnpm/bun | LOW |
| 2.4 | Add Pi-specific installation | Installs pi-subagents, etc. | MEDIUM |
| 2.5 | Add OpenCode config update | Updates opencode.json | MEDIUM |
| 2.6 | Add Claude Code plugin add | Runs `/plugin marketplace add` | MEDIUM |
| 2.7 | Add Codex plugin install | Runs `codex plugin install` | MEDIUM |
| 2.8 | Test on each CLI | install.sh works everywhere | HIGH |
| 2.9 | Add help flag | `--help` shows usage | LOW |
| 2.10 | Add dry-run flag | `--dry-run` shows what would happen | LOW |

### Technical Considerations
- Use `set -euo pipefail` for error handling
- Support multiple package managers (npm, pnpm, bun)
- Detect via: command availability > env vars > config files
- Provide clear user output at each step

### Dependencies
None - independent scope (can parallelize with SCOPE-1)

### Output
- `install.sh` script
- `CHANGELOG.md` entry

---

## [SCOPE-3] feature-cli-adapter

**Type:** feature  
**Objective:** Create core adapter interface and factory  
**Rationale:** Foundation for all CLI abstraction work

### Definition of Done
- [ ] `CLIAdapter` interface defined
- [ ] `CLIAdapterFactory` function implemented
- [ ] Pi adapter stubs created
- [ ] OpenCode adapter stubs created
- [ ] Claude Code adapter stubs created
- [ ] Codex adapter stubs created
- [ ] All adapters export from single entry point

### Implementation Tasks

| # | Task | Done Criterion | Risk |
|---|------|---------------|------|
| 3.1 | Create `adapters/cli-adapter.ts` | Interface defined | MEDIUM |
| 3.2 | Define `CLIAdapter` interface | Covers: commands, events, tools, ui | MEDIUM |
| 3.3 | Create `adapters/base.ts` | Shared adapter logic | LOW |
| 3.4 | Create `adapters/pi/` directory | Pi-specific adapter | LOW |
| 3.5 | Create `adapters/opencode/` directory | OpenCode adapter | MEDIUM |
| 3.6 | Create `adapters/claude-code/` directory | Claude Code adapter | MEDIUM |
| 3.7 | Create `adapters/codex/` directory | Codex adapter | MEDIUM |
| 3.8 | Create `adapters/index.ts` | Exports all adapters | LOW |
| 3.9 | Implement adapter factory | `createAdapter(cli)` returns correct adapter | MEDIUM |

### Technical Considerations
- Each adapter is a directory with `index.ts`
- Base adapter provides shared utilities
- Factory uses detectCLI() to select adapter
- Adapters are lazy-loaded to avoid import errors

### Interface Design

```typescript
export interface CLIAdapter {
  readonly name: CLI;
  readonly capabilities: CLICapabilities;
  
  // Commands
  registerCommands(): CommandRegistration[];
  
  // Events
  onToolCall(handler: ToolCallHandler): void;
  onSessionStart(handler: SessionStartHandler): void;
  onTurnEnd(handler: TurnEndHandler): void;
  
  // Tools
  getAvailableTools(): ToolDefinition[];
  
  // UI
  showNotification(message: string, type: NotificationType): void;
  showSelectList(options: SelectOption[]): Promise<string>;
  showStatusLine(info: StatusInfo): void;
}
```

### Dependencies
- Requires SCOPE-0 (CLICapabilities interface)

### Output
- `adapters/` directory with all adapter stubs
- `adapters/cli-adapter.ts` with interface and factory

---

## [SCOPE-4] feature-commands-abstract

**Type:** feature  
**Objective:** Abstract command registration across CLIs  
**Rationale:** `/pw-start` needs to work on all CLIs

### Definition of Done
- [ ] `/pw-start` works on Pi
- [ ] `/pw-start` works on OpenCode
- [ ] `/pw-start` works on Claude Code
- [ ] `/pw-start` works on Codex
- [ ] `/pw-stop`, `/pw-pause` work on all CLIs

### Implementation Tasks

| # | Task | Done Criterion | Risk |
|---|------|---------------|------|
| 4.1 | Read current `commands.ts` | Understand Pi command API | LOW |
| 4.2 | Create command dispatcher | Routes to CLI-specific handler | MEDIUM |
| 4.3 | Implement Pi command handler | Uses `pi.registerCommand()` | LOW |
| 4.4 | Implement OpenCode handler | Uses plugin hooks | HIGH |
| 4.5 | Implement Claude Code handler | Uses `commands/` directory | MEDIUM |
| 4.6 | Implement Codex handler | Uses `commands/` directory | MEDIUM |
| 4.7 | Create command files per CLI | `/pw-start.md` format | MEDIUM |
| 4.8 | Test commands on all CLIs | All commands register | HIGH |

### Command Files Format

For Claude Code / Codex (skill-based):
```markdown
---
name: pw-start
description: Start a new product workflow
---
/pw-start {args}
```

### Dependencies
- Requires SCOPE-3 (adapter pattern exists)

### Output
- Updated `commands.ts` using adapter
- `adapters/*/commands/` directory per CLI

---

## [SCOPE-5] feature-events-abstract

**Type:** feature  
**Objective:** Abstract event handling across CLIs  
**Rationale:** Workflow needs session_start, tool_call, turn_end events

### Definition of Done
- [ ] Session start event handled on all CLIs
- [ ] Tool call event handled on all CLIs
- [ ] Turn end event handled on all CLIs
- [ ] Events propagate to workflow state correctly

### Implementation Tasks

| # | Task | Done Criterion | Risk |
|---|------|---------------|------|
| 5.1 | Read current `index.ts` event handlers | Understand Pi event API | LOW |
| 5.2 | Create event dispatcher | Routes to CLI-specific handler | MEDIUM |
| 5.3 | Implement Pi event handler | Uses `pi.on()` | LOW |
| 5.4 | Implement OpenCode handler | Uses session hooks | HIGH |
| 5.5 | Implement Claude Code handler | Uses hooks.json | MEDIUM |
| 5.6 | Implement Codex handler | Uses hooks.json | MEDIUM |
| 5.7 | Test events on all CLIs | Events fire correctly | HIGH |

### Dependencies
- Requires SCOPE-3 (adapter pattern exists)

### Output
- Updated `index.ts` using adapter
- `adapters/*/events/` implementation per CLI

---

## [SCOPE-6] feature-ui-abstract

**Type:** feature  
**Objective:** Abstract TUI components across CLIs  
**Rationale:** Status line, notifications, select lists need CLI-specific implementation

### Definition of Done
- [ ] Status line works on all CLIs
- [ ] Notifications work on all CLIs
- [ ] Select lists work on all CLIs
- [ ] UI degrades gracefully on unsupported CLIs

### Implementation Tasks

| # | Task | Done Criterion | Risk |
|---|------|---------------|------|
| 6.1 | Read current `ui.ts` | Understand Pi UI API | LOW |
| 6.2 | Create UI adapter interface | Define UI contract | MEDIUM |
| 6.3 | Implement Pi UI adapter | Uses `ctx.ui.custom()` | LOW |
| 6.4 | Implement OpenCode UI | Uses `tui.toast.show()` | HIGH |
| 6.5 | Implement Claude Code UI | Uses terminal output | MEDIUM |
| 6.6 | Implement Codex UI | Uses terminal output | MEDIUM |
| 6.7 | Test UI on all CLIs | Displays correctly | HIGH |

### UI Fallback Strategy
```
if (supportsANSI) → Use colors and formatting
else if (supportsStdout) → Plain text
else → Silent mode (log to file)
```

### Dependencies
- Requires SCOPE-3 (adapter pattern exists)

### Output
- Updated `ui.ts` using adapter
- `adapters/*/ui/` implementation per CLI

---

## [SCOPE-7] test-cli-detection

**Type:** test-behavior  
**Objective:** Integration tests for CLI detection  
**Rationale:** Ensure detection works across all scenarios

### Definition of Done
- [ ] Test for each CLI detection method
- [ ] Test env var override
- [ ] Test config directory detection
- [ ] Test command availability detection
- [ ] Test fallback to generic

### Test Cases

```typescript
describe('CLI Detection', () => {
  it('detects pi via PI_CONFIG_DIR env var', () => {...});
  it('detects opencode via opencode.json', () => {...});
  it('detects claude-code via .claude/', () => {...});
  it('detects codex via .codex-plugin/', () => {...});
  it('respects PRODUCT_WORKFLOW_CLI override', () => {...});
  it('falls back to generic when no CLI detected', () => {...});
});
```

### Dependencies
- Requires SCOPE-0 (detection logic exists)

### Output
- `tests/cli-detection.test.ts`

---

## [SCOPE-8] test-integration-all-cli

**Type:** test-integration  
**Objective:** End-to-end tests for workflow on all CLIs  
**Rationale:** Verify full workflow works on each CLI

### Definition of Done
- [ ] `/pw-start` completes on Pi
- [ ] `/pw-start` completes on OpenCode
- [ ] `/pw-start` completes on Claude Code
- [ ] `/pw-start` completes on Codex
- [ ] State persists correctly across sessions

### Test Strategy
- Use CI/CD to test on each CLI
- Mock external dependencies (plannotator, etc.)
- Test basic workflow, not full execution

### Dependencies
- Requires SCOPE-4, SCOPE-5, SCOPE-6 (commands and events work)

### Output
- `tests/integration/` with CLI-specific tests

---

## 4. Final Summary – Scope Names

| # | Scope | Type | Dependencies |
|---|-------|------|-------------|
| 0 | spike-cli-detection | spike | - |
| 1 | feature-package-cleanup | feature | - |
| 2 | feature-install-script | feature | - |
| 3 | feature-cli-adapter | feature | 0 |
| 4 | feature-commands-abstract | feature | 3 |
| 5 | feature-events-abstract | feature | 3 |
| 6 | feature-ui-abstract | feature | 3 |
| 7 | test-cli-detection | test-behavior | 0 |
| 8 | test-integration-all-cli | test-integration | 4, 5, 6 |

---

## 5. Execution Hints

### Parallel Opportunities
- SCOPE-1 and SCOPE-2 can run in parallel
- SCOPE-7 can run after SCOPE-0 completes

### Sequential Requirements
- SCOPE-3 must complete before SCOPE-4, 5, 6
- SCOPE-4, 5, 6 must complete before SCOPE-8

### Risk Mitigation
- **High risk tasks**: OpenCode hooks (SCOPE-4.4, 5.4), UI implementation (SCOPE-6.4)
- **Medium risk**: Adapter interface design (SCOPE-3.1)
- **Low risk**: Package cleanup (SCOPE-1), install script (SCOPE-2)

### Test Philosophy
- TDD for spike (SCOPE-0) - define interface before implementing
- Test-after for features - verify existing functionality
- Integration tests verify cross-CLI compatibility

---

## Notes

- Implementation follows Context Mode's adapter pattern
- Each CLI gets its own adapter directory
- Core logic (skills, types, state) remains CLI-agnostic
- Phased approach minimizes risk
- Rollback possible at each scope boundary