# Code Context: stelow Structure Analysis

## Files Retrieved

### 1. `extensions/stelow/` (Directory)

**Key files that need to move to `cli-agents/pi/extensions/`:**
- `commands.ts` (978 lines) - Command handlers for Pi
- `start.ts` - Start workflow logic
- `state.ts` - Workflow state management
- `ui.ts` - UI/footer updates
- `types.ts` - Types and constants
- `index.ts` - Extension entry point
- `adapters/` - CLI adapter implementations

### 2. `extensions/stelow/adapters/` (Directory)

```
adapters/
├── base.ts              - BaseAdapter class
├── cli-adapter.ts       - CLIAdapter interface
├── event-dispatcher.ts  - Event routing
├── ui-adapter.ts        - UI adapter interface
├── ui-factory.ts        - UI factory
├── generic.ts           - Generic adapter fallback
├── commands/            - Command dispatcher
│   └── dispatcher.ts   - WORKFLOW_COMMANDS + registration system
├── pi/                  - Pi-specific adapter
│   ├── index.ts
│   └── ui.ts
├── opencode/            - OpenCode adapter
│   ├── index.ts
│   └── ui.ts
├── claude-code/         - Claude Code adapter
│   ├── index.ts
│   └── ui.ts
└── codex/              - Codex adapter
    ├── index.ts
    └── ui.ts
```

---

## Key Code

### Command Dispatcher (`adapters/commands/dispatcher.ts`)

```typescript
// 15 workflow commands defined
export const WORKFLOW_COMMANDS: CommandDescriptor[] = [
  { name: "pw-start", canonicalName: "pw-start", ... },
  { name: "pw-abort", canonicalName: "pw-abort", ... },
  { name: "pw-pause", canonicalName: "pw-pause", ... },
  // ... 12 more commands
];

// CLI-specific command systems
export function getCommandSystem(cli?: CLI): CommandRegistrationSystem {
  switch (detected) {
    case "pi": return getPiCommandSystem();
    case "opencode": return getOpenCodeCommandSystem();
    case "claude-code": return getClaudeCodeCommandSystem();
    case "codex": return getCodexCommandSystem();
    default: return getGenericCommandSystem();
  }
}
```

### CLI Types (`types.ts`)

```typescript
export type CLI = "pi" | "opencode" | "claude-code" | "codex" | "generic";

export interface CLICapabilities {
  cli: CLI;
  hasPluginSystem: boolean;
  hasCommands: boolean;
  hasSessionStart: boolean;
  hasToolCall: boolean;
  hasTUI: boolean;
  hasNotifications: boolean;
  // ...
}
```

### Adapters Per-CLI

| CLI | Adapter | Commands Support | Hooks | TUI |
|-----|---------|-----------------|-------|-----|
| Pi | `adapters/pi/` | Native registerCommand() | ✅ | ✅ |
| OpenCode | `adapters/opencode/` | Plugin hooks | ✅ | ✅ |
| Claude | `adapters/claude-code/` | Skills-based | ⚠️ | ⚠️ |
| Codex | `adapters/codex/` | commands/ dir | ⚠️ | ⚠️ |

---

## Architecture

```
extensions/stelow/
├── commands.ts          # Pi command handlers (registerCommands, cmdStart, etc)
├── start.ts            # Workflow start logic
├── state.ts           # Tracking, workflow dirs, state management
├── ui.ts              # Footer, overlay, notifications
├── types.ts           # CLI types, constants, phases
├── index.ts           # Extension entry point
│
└── adapters/
    ├── base.ts        # BaseAdapter - shared functionality
    ├── cli-adapter.ts # Interface for CLI adapters
    ├── event-dispatcher.ts # Route events to adapters
    ├── commands/
    │   └── dispatcher.ts # WORKFLOW_COMMANDS + CLI-specific systems
    │
    ├── pi/            # Pi-specific (native commands)
    ├── opencode/      # OpenCode-specific (plugin hooks)
    ├── claude-code/   # Claude Code-specific (skills)
    └── codex/         # Codex-specific (commands dir)
```

---

## What Needs to Move for `cli-agents/` Structure

### Files to Move to `cli-agents/pi/extensions/`

| Current Path | New Path | Notes |
|--------------|----------|-------|
| `extensions/stelow/` | `cli-agents/pi/extensions/` | Entire extension moves |

### Files to Move to `cli-agents/opencode/plugin/`

| Current Path | New Path | Notes |
|--------------|----------|-------|
| `adapters/opencode/index.ts` | `cli-agents/opencode/plugin/src/index.ts` | OpenCode plugin |
| `adapters/opencode/ui.ts` | `cli-agents/opencode/plugin/src/ui.ts` | OpenCode UI |

### Files to Move to `cli-agents/claude/commands/`

| Current Path | New Path | Notes |
|--------------|----------|-------|
| `adapters/commands/dispatcher.ts` | `cli-agents/registry/COMMANDS.md` | Convert to markdown |
| `adapters/claude-code/index.ts` | `cli-agents/claude/commands/` | Command files |

### Files to Move to `cli-agents/codex/commands/`

| Current Path | New Path | Notes |
|--------------|----------|-------|
| `adapters/codex/index.ts` | `cli-agents/codex/commands/` | Command files |

---

## Shared/Core Files (Stay or Move to `shared/`)

These files are shared across all CLIs and should probably move to `shared/`:

| File | Purpose |
|------|---------|
| `state.ts` | Workflow state management (shared) |
| `types.ts` | CLI types, phases, constants (shared) |
| `base.ts` | BaseAdapter class (shared) |
| `cli-adapter.ts` | Adapter interface (shared) |
| `event-dispatcher.ts` | Event routing (shared) |

---

## Start Here

1. **`extensions/stelow/adapters/commands/dispatcher.ts`** - Review WORKFLOW_COMMANDS array and CLI-specific command systems. This is the source of truth for all commands.

2. **`extensions/stelow/commands.ts`** - Understand Pi command handlers (cmdStart, cmdStop, etc.) that need to be ported to the new structure.

3. **`extensions/stelow/adapters/opencode/index.ts`** - Reference implementation for OpenCode plugin hooks.

---

## Open Questions

1. **Shared core:** Should `state.ts`, `types.ts`, `base.ts` move to `shared/` or stay in `cli-agents/pi/`?
2. **Command dispatcher:** Should we keep `dispatcher.ts` as TypeScript or convert entirely to `cli-agents/COMMANDS.md` markdown?
3. **Adapters cleanup:** Should we keep the adapter pattern or simplify for the new structure?