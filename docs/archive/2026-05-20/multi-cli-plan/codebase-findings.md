# Codebase Investigation: Multi-CLI Support

## Files Retrieved

### 1. `extensions/cali-product-workflow/index.ts` (lines 1-100)
- Entry point - registers event listeners on pi's ExtensionAPI
- Handles: `input`, `session_start`, `tool_call`, `turn_end`, `agent_end`
- **Status:** PI-SPECIFIC. All event handlers are pi-exclusive.

### 2. `extensions/cali-product-workflow/commands.ts` (lines 1-450)
- Registers CLI commands: `/sw-start`, `/sw-stop`, `/sw-pause`, etc.
- Uses `pi.registerCommand()` API
- **Status:** PI-SPECIFIC. Command registration uses pi's API.

### 3. `extensions/cali-product-workflow/start.ts` (lines 1-150)
- Workflow creation logic - parse args, create directories, write tracking
- Uses `pi.sendUserMessage()` to trigger workflow phases
- **Status:** PI-SPECIFIC. Uses pi's message API for phase progression.

### 4. `extensions/cali-product-workflow/state.ts` (lines 1-300)
- Data layer: read/write tracking files, scan directories
- Contains `detectCLI()` - **already has CLI detection logic** (lines 16-45)
- Contains `getCLITools()` - **already has tool mapping** (lines 47-85)
- **Status:** NEUTRAL. Core data logic is CLI-agnostic.

### 5. `extensions/cali-product-workflow/types.ts` (lines 1-80)
- Type definitions for Workflow, Phase, TrackingData
- **Status:** NEUTRAL. Pure data types, no CLI coupling.

### 6. `extensions/cali-product-workflow/ui.ts` (lines 1-250)
- TUI components: footer, overlays, phase notifications
- Uses `ctx.ui.custom()` for SelectList overlays
- **Status:** PI-SPECIFIC. All UI is pi TUI.

### 7. `scripts/setup.sh` (lines 1-70)
- Installs only pi-specific packages: `pi-subagents`, etc.
- **Status:** PI-SPECIFIC. No other CLI support.

---

## Architecture Analysis

### Current State

```
┌─────────────────────────────────────────────────────────────┐
│                    Extension (pi)                          │
├─────────────────────────────────────────────────────────────┤
│  index.ts     → Event handlers (pi.on)                     │
│  commands.ts  → Command registration (pi.registerCommand) │
│  start.ts     → Workflow creation (pi.sendUserMessage)    │
│  ui.ts        → TUI components (ctx.ui.custom)            │
├─────────────────────────────────────────────────────────────┤
│  state.ts     → Data layer (CLI-agnostic ✓)               │
│  types.ts     → Type definitions (CLI-agnostic ✓)         │
└─────────────────────────────────────────────────────────────┘
```

### CLI Detection Already Exists

```typescript
// state.ts lines 16-45
export function detectCLI(): string {
  const envCli = process.env.PRODUCT_WORKFLOW_CLI;  // Primary override
  if (envCli && envCli.trim()) return envCli.trim().toLowerCase();
  
  // Fallback: platform-specific files
  if (existsSync(join(home, ".pi"))) return "pi";
  if (existsSync(join(home, ".opencode"))) return "opencode";
  if (existsSync(join(home, ".claude"))) return "claude-code";
  if (existsSync(join(home, ".codex"))) return "codex";
  
  return "generic";
}
```

### Tool Mapping Already Exists

```typescript
// state.ts lines 47-85
export function getCLITools(cli: string = detectCLI()): Record<string, string> {
  // Returns: subagent, ask, plannotator, goals, intercom, supervise
  // Each CLI has different implementations:
  // - pi: full suite
  // - opencode: partial
  // - claude-code: partial
  // - codex: minimal
}
```

---

## Files Requiring Modification

### PHASE 1: Architecture Layer (Core Changes)

| File | Change | Risk |
|------|--------|------|
| `extensions/cali-product-workflow/index.ts` | Replace `pi.on()` event handlers with CLI-agnostic hooks. Implement a driver pattern where each CLI provides its own event adapter. | HIGH - Core extension architecture |
| `extensions/cali-product-workflow/commands.ts` | Replace `pi.registerCommand()` with a command dispatcher that calls CLI-specific command handlers. | HIGH - All user commands |
| `extensions/cali-product-workflow/start.ts` | Replace `pi.sendUserMessage()` with a phase driver that abstracts the message passing. | HIGH - Workflow progression |
| `extensions/cali-product-workflow/ui.ts` | Replace `ctx.ui.custom()` with CLI-specific UI adapters. Each CLI needs: status line, notifications, overlays. | HIGH - User feedback |

### PHASE 2: Supporting Infrastructure

| File | Change | Risk |
|------|--------|------|
| `scripts/setup.sh` | Add CLI detection. Install packages based on detected CLI. Create separate installation paths for each CLI. | MEDIUM |
| `extensions/cali-product-workflow/state.ts` | Already has `detectCLI()` and `getCLITools()`. May need: (1) CLI-specific path resolution, (2) event emitter for cross-CLI communication. | LOW |
| `extensions/cali-product-workflow/types.ts` | Add `CLICapabilities` interface to define what each CLI can do. | LOW |

### New Files Needed

| File | Purpose |
|------|---------|
| `extensions/cali-product-workflow/drivers/pi-driver.ts` | Pi-specific event adapter and UI implementation |
| `extensions/cali-product-workflow/drivers/opencode-driver.ts` | Opencode event adapter and UI |
| `extensions/cali-product-workflow/drivers/claude-driver.ts` | Claude Code event adapter and UI |
| `extensions/cali-product-workflow/cli-adapter.ts` | Main adapter interface + factory function |
| `extensions/cali-product-workflow/cli-dispatcher.ts` | Command dispatch based on detected CLI |

---

## Risks & Open Questions

1. **pi's ExtensionAPI vs other CLIs**: Other CLIs don't have an extension system. May need to use:
   - Environment variables for state passing
   - File-based communication (tracking.json)
   - Hook scripts that the CLI can invoke

2. **UI Adaptability**: How to implement TUI-style overlays in non-pi CLIs?
   - Option A: CLI-specific UI (ASCII tables for some, TUI for pi)
   - Option B: Terminal-compatible UI (always ASCII, works everywhere)
   - Option C: Hybrid (pi gets TUI, others get ANSI)

3. **Command Syntax**: `/sw-start` works for pi. Other CLIs may use different conventions.

4. **Workflow Persistence**: Cross-session state must work without pi's event system.

---

## Start Here

1. **Read `state.ts`** first - understand the existing CLI detection and tool mapping
2. **Define `CLICapabilities` interface** in `types.ts`
3. **Create `cli-adapter.ts`** with the adapter interface
4. **Refactor `index.ts`** to use the adapter instead of direct pi API calls

For the implementation plan, see: `docs/2026-05-20/multi-cli-plan/implementation-plan.md`