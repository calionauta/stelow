# Context Mode Adapter Pattern

## Overview

Context-mode uses an adapter pattern to support 15+ AI coding platforms (Claude Code, Gemini CLI, Cursor, Pi, etc.). Each platform gets a dedicated adapter that normalizes its unique hook I/O into a common format.

---

## 1. Adapters Directory Structure

```
src/adapters/
├── types.ts              ← Base interface (HookAdapter contract)
├── base.ts               ← BaseAdapter with shared methods
├── detect.ts             ← Platform detection logic
├── client-map.ts         ← MCP clientInfo.name → PlatformId
├── copilot-base.ts      ← Shared for VSCode/JetBrains Copilot
├── claude-code-base.ts   ← Shared for Claude Code family
├── antigravity/          ← Gemini CLI fork
├── claude-code/          ← Claude Code
├── codex/                ← OpenAI Codex
├── cursor/               ← Cursor (VSCode fork)
├── gemini-cli/           ← Google Gemini CLI
├── jetbrains-copilot/    ← JetBrains IDEs
├── kilo/                 ← KiloCode (OpenCode fork)
├── kiro/                 ← Kiro CLI
├── openclaw/             ← OpenClaw
├── opencode/             ← SST OpenCode
├── omp/                  ← Oh My Pi
├── pi/                   ← Pi Coding Agent
├── qwen-code/            ← Alibaba Qwen
├── vscode-copilot/       ← VS Code Copilot
└── zed/                  ← Zed IDE
```

---

## 2. Base Adapter Interface (`types.ts`)

### HookAdapter Contract

Each adapter implements the `HookAdapter` interface:

```typescript
export interface HookAdapter {
  readonly name: string;
  readonly paradigm: "json-stdio" | "ts-plugin" | "mcp-only";
  readonly capabilities: PlatformCapabilities;

  // Input parsing
  parsePreToolUseInput(raw: unknown): PreToolUseEvent;
  parsePostToolUseInput(raw: unknown): PostToolUseEvent;
  parsePreCompactInput?(raw: unknown): PreCompactEvent;
  parseSessionStartInput?(raw: unknown): SessionStartEvent;

  // Response formatting
  formatPreToolUseResponse(response: PreToolUseResponse): unknown;
  formatPostToolUseResponse(response: PostToolUseResponse): unknown;
  formatPreCompactResponse?(response: PreCompactResponse): unknown;
  formatSessionStartResponse?(response: SessionStartResponse): unknown;

  // Configuration
  getSettingsPath(): string;
  getSessionDir(): string;
  getConfigDir(projectDir?: string): string;
  getInstructionFiles(): string[];
  getMemoryDir(): string;
  generateHookConfig(pluginRoot: string): HookRegistration;
  readSettings(): Record<string, unknown> | null;
  writeSettings(settings: Record<string, unknown>): void;

  // Diagnostics
  validateHooks(pluginRoot: string): DiagnosticResult[];
  getHealthChecks?(pluginRoot: string): readonly HealthCheck[];
  checkPluginRegistration(): DiagnosticResult;
  getInstalledVersion(): string;

  // Upgrade
  configureAllHooks(pluginRoot: string): string[];
  backupSettings(): string | null;
  setHookPermissions(pluginRoot: string): string[];
  updatePluginRegistry(pluginRoot: string, version: string): void;
}
```

### BaseAdapter (`base.ts`)

Shared implementation for all adapters:

```typescript
export abstract class BaseAdapter {
  constructor(protected readonly sessionDirSegments: string[]) {}

  getSessionDir(): string {
    const override = resolveContextModeDataRoot();
    const dir = override
      ? join(override, "context-mode", "sessions")
      : join(homedir(), ...this.sessionDirSegments, "context-mode", "sessions");
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  getConfigDir(_projectDir?: string): string {
    return join(homedir(), ...this.sessionDirSegments);
  }

  getInstructionFiles(): string[] { return ["CLAUDE.md"]; }

  getMemoryDir(): string {
    const override = resolveContextModeDataRoot();
    if (override) return join(override, "context-mode", "memory");
    return join(this.getConfigDir(), "memory");
  }

  backupSettings(): string | null { /* copies to .bak */ }
  abstract getSettingsPath(): string;
}
```

Key: `CONTEXT_MODE_DATA_DIR` env var provides a universal storage override for CI/home scenarios.

---

## 3. Platform Detection (`detect.ts`)

### Detection Priority

1. **MCP clientInfo** (highest) — from `initialize` handshake
2. **Environment variables** (high confidence)
3. **Config directory existence** (medium confidence)
4. **Fallback to Claude Code** (low confidence)

### Env Var Registry

```typescript
const _PLATFORM_ENV_VARS_RAW: ReadonlyArray<readonly [PlatformId, readonly PlatformEnvEntry[]]> = [
  ["claude-code", [
    { name: "CLAUDE_CODE_ENTRYPOINT", role: "identification" },
    { name: "CLAUDE_PLUGIN_ROOT",     role: "identification" },
    { name: "CLAUDE_PROJECT_DIR",     role: "workspace" },
    { name: "CLAUDE_SESSION_ID",       role: "identification" },
  ]],
  ["pi", [
    { name: "PI_WORKSPACE_DIR", role: "workspace", detect: false },
    { name: "PI_PROJECT_DIR",   role: "workspace", detect: false },
    { name: "PI_CONFIG_DIR",    role: "identification" },
    { name: "PI_SESSION_FILE",  role: "identification" },
    { name: "PI_COMPILED",      role: "identification" },
  ]],
  // ... 12 more platforms
];
```

### Detection Signal

```typescript
export interface DetectionSignal {
  platform: PlatformId;
  confidence: "high" | "medium" | "low";
  reason: string;
}
```

### Special Cases

- **VSCode/Pi disambiguation** (#539): If `VSCODE_PID` is set but `~/.claude/plugins/installed_plugins.json` lists context-mode → must be Claude Code (VSCode Copilot has no plugin concept)
- **OMP before Pi**: Shared `~/.pi` history, OMP has `~/.omp/` marker
- **CLI agents before editors** (#542): `.kiro/`, `.omp/`, `.pi/` checked before `.cursor/`, `.vscode/`

---

## 4. Pi Adapter Details

### Paradigm: MCP-only

Pi has no native hooks — uses a JS-callback runtime API wired via `extension.ts`. The adapter reports all-false capabilities:

```typescript
readonly paradigm: HookParadigm = "mcp-only";

readonly capabilities: PlatformCapabilities = {
  preToolUse: false,
  postToolUse: false,
  preCompact: false,
  sessionStart: false,
  canModifyArgs: false,
  canModifyOutput: false,
  canInjectSessionContext: false,
};
```

### MCP Bridge (`mcp-bridge.ts`)

Spawns `server.bundle.mjs` as a long-lived child via stdio JSON-RPC:

1. `initialize` — MCP handshake
2. `tools/list` — get available tools
3. `pi.registerTool()` — register each tool with Pi
4. `tools/call` — forward tool executions

**Fork-bomb prevention** (#516):
- Reject pi-named binaries at every step
- `CONTEXT_MODE_BRIDGE_DEPTH` env counter for recursion detection
- Fall back to `node`/`bun` from PATH

**Env scrubbing** (#545, #561):
- Scrubs foreign workspace vars (CLAUDE_PROJECT_DIR, etc.)
- Scrubs foreign identification vars (CLAUDE_CODE_ENTRYPOINT, etc.)
- Preserves own Pi vars (PI_CONFIG_DIR, PI_SESSION_FILE, PI_COMPILED)

---

## 5. Key Patterns for pi-product-workflow

### Session Directory Isolation

Each adapter owns its session dir:
- Claude Code: `~/.claude/context-mode/sessions/`
- Pi: `~/.pi/context-mode/sessions/`
- OMP: `~/.omp/context-mode/sessions/`

### Storage Override

```typescript
// Via CONTEXT_MODE_DATA_DIR env var
export function resolveContextModeDataRoot(env: NodeJS.ProcessEnv): string | null {
  const raw = env.CONTEXT_MODE_DATA_DIR;
  if (!raw || raw.trim() === "") return null;
  if (raw.startsWith("~")) {
    return resolve(homedir(), raw.replace(/^~[/\\]?/, ""));
  }
  return resolve(raw);
}
```

### Platform Capabilities Matrix

| Platform | Hooks | Can Modify Args | Can Modify Output |
|----------|-------|-----------------|-------------------|
| Claude Code | Yes (stdio) | Yes | Yes |
| Gemini CLI | Yes (stdio) | Yes | Yes |
| Pi | No (MCP bridge) | No | No |
| Cursor | Yes (hooks.json) | Partial | Partial |
| VSCode Copilot | Yes (stdio) | Yes | Yes |

---

## Start Here

1. **`src/adapters/types.ts`** — Understand the HookAdapter contract
2. **`src/adapters/base.ts`** — See shared implementation
3. **`src/adapters/detect.ts`** — Platform detection flow
4. **`src/adapters/pi/index.ts`** — Pi-specific adapter
5. **`src/adapters/pi/mcp-bridge.ts`** — How MCP tools are bridged to Pi
6. **`src/adapters/pi/extension.ts`** — Pi extension wiring (event handlers)