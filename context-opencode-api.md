# OpenCode Plugin API Documentation

## Quick Summary

OpenCode plugins are TypeScript modules that extend OpenCode functionality through:
- **Server hooks** (event listeners for lifecycle)
- **Tool definitions** (custom LLM-callable tools)
- **TUI plugins** (SolidJS UI components)

---

## Package Info

```
@opencode-ai/plugin: ^1.15.7
Dependencies: zod@4.1.8, effect@4.0.0-beta.66, @opencode-ai/sdk@1.15.7
PeerDeps: @opentui/core, @opentui/keymap, @opentui/solid (all >= 0.2.15, optional)
```

---

## Plugin Structure

### Export Points

```typescript
// Main plugin (server hooks + tools)
import { Plugin } from "@opencode-ai/plugin";

// Tool definitions
import { tool } from "@opencode-ai/plugin/tool";

// TUI plugin (SolidJS components)
import { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui";
```

### Plugin Module Types

```typescript
// Server plugin
export type PluginModule = {
  id?: string;
  server: Plugin;        // Required for server plugins
  tui?: never;
};

// TUI plugin
export type TuiPluginModule = {
  id?: string;
  tui: TuiPlugin;       // Required for TUI plugins
  server?: never;
};
```

---

## Server Plugin API

### Plugin Function Signature

```typescript
type Plugin = (input: PluginInput, options?: PluginOptions) => Promise<Hooks>;

type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>;
  project: Project;
  directory: string;
  worktree: string;
  serverUrl: URL;
  $: BunShell;  // Shell execution
  experimental_workspace: {
    register(type: string, adapter: WorkspaceAdapter): void;
  };
};
```

### Basic Example

```typescript
// my-plugin/src/index.ts
import { tool } from "@opencode-ai/plugin/tool";

export default async (input) => {
  return {
    tool: {
      mytool: tool({
        description: "My custom tool",
        args: {
          foo: tool.schema.string().describe("foo"),
        },
        async execute(args, context) {
          return `Hello ${args.foo}!`;
        },
      }),
    },
  };
};
```

---

## Hooks (20+ Lifecycle Events)

### Core Hooks

| Hook | Description | Input |
|------|-------------|-------|
| `event` | General event listener | `{ event: Event }` |
| `config` | Config modification | `Config` |
| `auth` | Auth provider setup | `AuthHook` |
| `provider` | Custom model provider | `ProviderHook` |

### Chat Hooks

| Hook | Description | Input |
|------|-------------|-------|
| `chat.message` | New message received | `{ sessionID, agent, model, messageID }` |
| `chat.params` | Modify LLM parameters | `{ sessionID, agent, model, provider, message }` |
| `chat.headers` | Modify request headers | `{ sessionID, agent, model, provider, message }` |
| `chat.system.transform` | Modify system prompt | `{ sessionID, model }` |

### Tool Hooks

| Hook | Description | Input |
|------|-------------|-------|
| `tool.execute.before` | Before tool execution | `{ tool, sessionID, callID }` |
| `tool.execute.after` | After tool execution | `{ tool, sessionID, callID, args }` |
| `tool.definition` | Modify tool definition | `{ toolID }` |

### Session Hooks

| Hook | Description | Input |
|------|-------------|-------|
| `permission.ask` | Permission request | `Permission` |
| `command.execute.before` | Command execution | `{ command, sessionID, arguments }` |
| `shell.env` | Shell environment | `{ cwd, sessionID, callID }` |

### Experimental Hooks

| Hook | Description | Input |
|------|-------------|-------|
| `experimental.chat.messages.transform` | Transform chat history | `{}` |
| `experimental.session.compacting` | Before compaction | `{ sessionID }` |
| `experimental.compaction.autocontinue` | After compaction | `{ sessionID, agent, model, overflow }` |
| `experimental.text.complete` | After text completion | `{ sessionID, messageID, partID }` |

### Hook Definition Example

```typescript
export default async (input) => {
  return {
    hooks: {
      // Session start tracking
      "chat.message": async (input, output) => {
        console.log(`Message in session: ${input.sessionID}`);
      },
      
      // Tool execution logging
      "tool.execute.before": async (input, output) => {
        output.args = input; // Modify args if needed
      },
      
      "tool.execute.after": async (input, output) => {
        console.log(`Tool ${input.tool} completed in ${input.sessionID}`);
      },
      
      // Session compaction
      "experimental.session.compacting": async (input, output) => {
        output.context.push("Custom context for compaction");
      },
    },
  };
};
```

---

## Tool API

### Tool Definition

```typescript
import { tool } from "@opencode-ai/plugin/tool";

const myTool = tool({
  description: "Description shown to LLM",
  args: {
    // Zod schema args
    name: tool.schema.string().describe("Argument description"),
    count: tool.schema.number().optional().describe("Optional count"),
    options: tool.schema.enum(["a", "b", "c"]).optional(),
  },
  async execute(args, context) {
    // context: { sessionID, messageID, agent, directory, worktree, abort, metadata, ask }
    return {
      title: "Result Title",
      output: "Result content",
      metadata: { /* custom metadata */ },
    };
  },
});
```

### ToolContext

```typescript
type ToolContext = {
  sessionID: string;
  messageID: string;
  agent: string;
  directory: string;      // Project directory
  worktree: string;       // Worktree root
  abort: AbortSignal;     // For cancellation
  metadata(input: { title?: string; metadata?: Record<string, any> }): void;
  ask(input: AskInput): Promise<void>;  // Request permissions
};

type AskInput = {
  permission: string;
  patterns: string[];
  always: string[];
  metadata: Record<string, any>;
};
```

---

## TUI Plugin API

### TUI Plugin Function

```typescript
type TuiPlugin = (api: TuiPluginApi, options: PluginOptions, meta: TuiPluginMeta) => Promise<void>;

type TuiPluginApi = {
  app: TuiApp;
  attention: TuiAttention;
  command?: TuiCommandApi;  // Deprecated
  keys: TuiKeys;
  keymap: TuiKeymap;
  mode: TuiModeApi;
  route: TuiRouteApi;
  ui: TuiUiApi;
  kv: TuiKV;
  state: TuiState;
  theme: TuiTheme;
  client: OpencodeClient;
  event: TuiEventBus;
  renderer: CliRenderer;
  slots: TuiSlots;
  plugins: TuiPluginsApi;
  lifecycle: TuiLifecycle;
};
```

### Route API

```typescript
// Register routes
api.route.register([
  {
    name: "my-plugin",
    render: ({ params }) => <MyComponent {...params} />,
  },
]);

// Navigate
api.route.navigate("my-plugin", { sessionID: "123" });

// Current route
api.route.current;  // { name: "session", params: { sessionID: "..." } }
```

### Dialog API

```typescript
// Alert
api.ui.DialogAlert({
  title: "Title",
  message: "Message",
  onConfirm: () => {},
});

// Confirm
api.ui.DialogConfirm({
  title: "Confirm?",
  message: "Are you sure?",
  onConfirm: () => {},
  onCancel: () => {},
});

// Prompt
api.ui.DialogPrompt({
  title: "Enter name",
  placeholder: "Name...",
  value: "default",
  onConfirm: (value) => {},
  onCancel: () => {},
});

// Select
api.ui.DialogSelect({
  title: "Choose option",
  options: [
    { title: "Option 1", value: "a" },
    { title: "Option 2", value: "b", description: "Info" },
  ],
  onSelect: (option) => {},
});

// Custom Dialog
api.ui.Dialog({
  size: "large",
  onClose: () => {},
  children: <div>Custom content</div>,
});
```

### State API

```typescript
// Session state
api.state.session.count();           // Total sessions
api.state.session.get("id");         // Get session
api.state.session.messages("id");    // Session messages
api.state.session.status("id");      // Session status
api.state.session.diff("id");        // Session diff files

// Config
api.state.config;                     // Frozen config

// Path helpers
api.state.path.config;               // Config path
api.state.path.state;                // State path
api.state.path.directory;             // Project directory
```

### KV Store

```typescript
// Get/Set key-value pairs
api.kv.get("key", "default");
api.kv.set("key", { any: "value" });
```

### Theme API

```typescript
// Current theme colors
api.theme.current.primary;
api.theme.current.background;
api.theme.current.text;
// ... full RGBA colors

// Theme modes
api.theme.mode();  // "dark" | "light"

// Manage themes
api.theme.has("theme-name");
api.theme.set("theme-name");
api.theme.install("/path/to/theme.json");
```

### Slot API (UI Slots)

```typescript
// Register UI slot
api.slots.register({
  id: "my-slot",
  render: (props) => <MySlotContent {...props} />,
});

// Use built-in slots
api.ui.Slot({
  name: "sidebar_footer",
  session_id: "session-id",
  children: <Footer />,
});
```

### Available Slots

| Slot Name | Description |
|-----------|-------------|
| `app` | App-level slot |
| `app_bottom` | Bottom of app |
| `home_logo` | Home page logo |
| `home_prompt` | Home page prompt |
| `home_prompt_right` | Right of home prompt |
| `home_bottom` | Bottom of home |
| `home_footer` | Home page footer |
| `session_prompt` | Session prompt |
| `session_prompt_right` | Right of session prompt |
| `sidebar_title` | Sidebar title |
| `sidebar_content` | Sidebar content |
| `sidebar_footer` | Sidebar footer |

### Toast Notifications

```typescript
api.ui.toast({
  variant: "success",  // info, success, warning, error
  title: "Done!",
  message: "Action completed",
  duration: 3000,     // ms, optional
});
```

---

## Command Registration (TUI)

### Legacy API (Deprecated)

```typescript
// Still supported but deprecated
api.command?.register(() => [
  {
    title: "My Command",
    value: "my-command",
    description: "Description",
    slash: { name: "mycommand", aliases: ["mc"] },
    onSelect: (dialog) => {},
  },
]);

api.command?.trigger("my-command");
api.command?.show();
```

### Modern API (Keymap)

```typescript
// Use api.keymap for modern command registration
api.keymap.registerLayer({
  commands: ["my-command"],
  bindings: [
    { key: "ctrl+k", command: "my-command" },
  ],
});

api.keymap.dispatchCommand("my-command");
```

---

## Lifecycle API

```typescript
// Access abort signal
api.lifecycle.signal;  // AbortSignal

// Register dispose
api.lifecycle.onDispose(() => {
  // Cleanup
});
```

---

## Event Bus

```typescript
// Subscribe to events
api.event.on("session.start", (event) => {
  console.log("Session started:", event);
});

// Returns unsubscribe function
const unsubscribe = api.event.on("session.end", (event) => {});
unsubscribe();  // Cleanup
```

---

## Plugin Installation

### package.json Structure

```json
{
  "name": "my-opencode-plugin",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@opencode-ai/plugin": "^1.15.7",
    "@opentui/core": ">=0.2.15",
    "@opentui/solid": ">=0.2.15",
    "@opentui/keymap": ">=0.2.15"
  }
}
```

### tsconfig.json

```json
{
  "extends": "@tsconfig/node22/tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

---

## Complete Plugin Example

```typescript
// src/index.ts (Server plugin)
import { tool } from "@opencode-ai/plugin/tool";

export default async (input) => {
  return {
    tool: {
      pw_start: tool({
        description: "Start a product workflow",
        args: {
          name: tool.schema.string().optional().describe("Workflow name"),
          description: tool.schema.string().optional().describe("Description"),
        },
        async execute(args, ctx) {
          const workflowDir = `${ctx.directory}/.product-workflow`;
          return {
            title: "Workflow Started",
            output: `Created workflow at ${workflowDir}`,
            metadata: { workflowName: args.name },
          };
        },
      }),
    },
    hooks: {
      "chat.message": async (input, output) => {
        // Track messages
      },
      "tool.execute.after": async (input, output) => {
        // Log tool usage
      },
    },
  };
};
```

```typescript
// src/tui.ts (TUI plugin)
import type { TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";

export const tui: TuiPluginModule["tui"] = async (api, options, meta) => {
  // Register custom route
  const unregister = api.route.register([
    {
      name: "pw-status",
      render: ({ params }) => (
        <div>
          <h1>Product Workflow Status</h1>
          <p>Session: {params.sessionID}</p>
        </div>
      ),
    },
  ]);

  // Register commands
  api.keymap.registerLayer({
    commands: ["pw-status", "pw-menu"],
  });

  // Register UI slot
  api.slots.register({
    name: "pw_footer",
    render: () => <div>Workflow Status</div>,
  });

  // Cleanup on dispose
  api.lifecycle.onDispose(() => {
    unregister();
  });
};
```

---

## File Structure

```
my-plugin/
├── src/
│   ├── index.ts      # Server plugin (exports default)
│   ├── tui.ts        # TUI plugin (exports tui)
│   ├── hooks/
│   │   └── my-hook.ts
│   └── ui/
│       └── MyComponent.tsx
├── package.json
├── tsconfig.json
└── dist/             # Built output
```

---

## Configuration (opencode.json)

```json
{
  "plugin": [
    "my-plugin",                    // Simple
    ["my-plugin", { option: true }] // With options
  ]
}
```

---

## Key Types Summary

```typescript
// Plugin input/output
PluginInput = { client, project, directory, worktree, $, serverUrl }
Plugin = (input: PluginInput) => Promise<Hooks>
Hooks = { tool?, event?, chat.*?, tool.*?, shell.*?, experimental.*? }

// TUI
TuiPlugin = (api: TuiPluginApi, options, meta) => Promise<void>
TuiPluginApi = { app, attention, keys, keymap, mode, route, ui, kv, state, theme, client, event, renderer, slots, plugins, lifecycle }
```

---

## References

- Package: https://www.npmjs.com/package/@opencode-ai/plugin
- OpenCode SDK: https://www.npmjs.com/package/@opencode-ai/sdk
- OpenTUI (peer dependency): https://www.npmjs.com/package/@opentui/core