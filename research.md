# Research: context-mode Dual-Install Pattern

## Summary

context-mode uses a dual-install pattern where the npm package (for CLI and global installs) is separate from the pi extension package (for pi agent integration). The npm package provides the MCP server and CLI tools, while a stub extension package in `.pi/extensions/` re-exports from the main package's build output.

## Findings

### 1. Package Structure

**Main package.json** (`package.json` at repo root):
```json
{
  "name": "context-mode",
  "version": "1.0.146",
  "exports": {
    ".": "./build/adapters/opencode/plugin.js",
    "./plugin": "./build/adapters/opencode/plugin.js",
    "./openclaw": "./build/adapters/openclaw/plugin.js",
    "./cli": "./cli.bundle.mjs"
  },
  "bin": {
    "context-mode": "./cli.bundle.mjs"
  },
  "pi": {
    "extensions": ["./build/adapters/pi/extension.js"],
    "skills": ["./skills"]
  }
}
```

**Pi extension stub** (`.pi/extensions/context-mode/package.json`):
```json
{
  "name": "context-mode",
  "version": "1.0.146",
  "description": "Context-mode extension for Pi coding agent — session continuity and context window protection",
  "main": "index.ts",
  "dependencies": {
    "better-sqlite3": "^11.0.0"
  }
}
```

**Pi extension index.ts** (`.pi/extensions/context-mode/index.ts`):
```typescript
export { default } from "../../../build/adapters/pi/extension.js";
```

[Source](https://raw.githubusercontent.com/mksglu/context-mode/main/.pi/extensions/context-mode/index.ts)

[Source](https://raw.githubusercontent.com/mksglu/context-mode/main/.pi/extensions/context-mode/package.json)

### 2. Exports Field Usage

The `exports` field in package.json defines entry points for different use cases:
- `.` (default): OpenCode plugin
- `./plugin`: OpenCode plugin
- `./openclaw`: OpenClaw plugin
- `./cli`: CLI bundle for `bin` field

This allows the same package to be used in multiple contexts, with the default pointing to the most common use case (OpenCode). [Source](https://registry.npmjs.org/context-mode)

### 3. Bin Field for CLI

The `bin` field maps the command name `context-mode` to `cli.bundle.mjs`:
```json
"bin": {
  "context-mode": "./cli.bundle.mjs"
}
```

When installed globally with `npm install -g context-mode`, this creates a symlink so `context-mode` command is available in PATH. [Source](https://www.typeerror.org/docs/npm/cli/v8/commands/npm-exec)

### 4. Pi Field Structure

The `pi` field in package.json declares pi-specific resources:
```json
"pi": {
  "extensions": ["./build/adapters/pi/extension.js"],
  "skills": ["./skills"]
}
```

When pi installs the package via `pi install npm:context-mode`, it reads this field to know where to find extensions and skills. [Source](https://pi.dev/docs/latest/packages)

### 5. Build Process

**Build pipeline** (from package.json scripts):
1. `tsc` - Compile TypeScript to JavaScript
2. `chmod +x build/cli.js` (Unix only)
3. `npm run bundle` - esbuild bundling for multiple entry points:
   - `server.bundle.mjs` - MCP server
   - `cli.bundle.mjs` - CLI tool
   - `hooks/session-extract.bundle.mjs` - Session extraction hook
   - `hooks/session-snapshot.bundle.mjs` - Session snapshot hook
   - `hooks/session-db.bundle.mjs` - Session database hook
   - `hooks/security.bundle.mjs` - Security hook
4. `npm run assert-bundle` - Verify all bundles exist
5. `npm run assert-asymmetric-drift` - Check for version drift

[Source](https://raw.githubusercontent.com/mksglu/context-mode/main/package.json)

**TypeScript compilation** outputs to `build/` directory, including `build/adapters/pi/extension.js` which is referenced by both the main `package.json` (in `pi.extensions`) and the stub extension.

### 6. Version Sync Mechanism

The `version` script in package.json runs `scripts/version-sync.mjs` which updates all manifest files:
```javascript
const targets = [
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".cursor-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".openclaw-plugin/openclaw.plugin.json",
  ".openclaw-plugin/package.json",
  "openclaw.plugin.json",
  ".pi/extensions/context-mode/package.json",  // <-- Pi extension synced here
];
```

This ensures the stub extension's package.json always has the same version as the main package.

[Source](https://raw.githubusercontent.com/mksglu/context-mode/main/scripts/version-sync.mjs)

### 7. Installation Flow

**npm install -g context-mode:**
1. Downloads context-mode package from npm
2. Runs `postinstall` script
3. Creates `context-mode` command in PATH (from `bin` field)
4. Installs dependencies (better-sqlite3, etc.)
5. Builds TypeScript if not pre-built

**pi install npm:context-mode:**
1. Pi reads package from npm
2. Pi looks for `pi` field in package.json
3. Pi reads `pi.extensions` to find extension entry point
4. Pi reads `pi.skills` to find skill files
5. Pi loads the extension (which is the compiled JS from `build/adapters/pi/extension.js`)

[Source](https://context-mode.pages.dev/)

### 8. Adapter Pattern

context-mode uses an adapter architecture with platform-specific implementations in `src/adapters/`:
- `pi/` - Pi coding agent (read/write/edit/bash tools)
- `openclaw/` - OpenClaw gateway
- `opencode/` - OpenCode
- `claude-code/` - Claude Code
- `codex/` - Codex CLI
- `cursor/` - Cursor
- `gemini-cli/` - Gemini CLI
- etc.

Each adapter extends `BaseAdapter` and implements `HookAdapter` interface. The Pi adapter is special because it uses "mcp-only" paradigm - hooks are wired via JavaScript callbacks, not JSON-stdio.

[Source](https://github.com/mksglu/context-mode/tree/main/src/adapters)

## Installation Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        npm install -g context-mode                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ~/.npm or global node_modules                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  context-mode@1.0.146                                        │  │
│  │  ├── package.json (main)                                     │  │
│  │  ├── bin/                                                    │  │
│  │  │   └── context-mode → cli.bundle.mjs                      │  │
│  │  ├── build/                                                  │  │
│  │  │   └── adapters/pi/extension.js  ← referenced by pi field │  │
│  │  ├── skills/                                                 │  │
│  │  └── ...                                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     pi install npm:context-mode                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ~/.pi/extensions/context-mode/                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  package.json (stub, version-synced from main)               │  │
│  │  index.ts → ../../../build/adapters/pi/extension.js          │  │
│  │  tsconfig.json                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Pi Runtime                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Reads .pi/extensions/context-mode/package.json              │  │
│  │  Finds version: 1.0.146                                     │  │
│  │  Loads index.ts → build/adapters/pi/extension.js            │  │
│  │  Registers Pi extension                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Implementation Details

### Why Dual Install?

1. **CLI availability**: The `bin` field only works when installed via npm, making `context-mode` command available globally
2. **Pi extension isolation**: Pi expects extensions in a specific location (`.pi/extensions/`) with their own package.json
3. **Independent lifecycle**: npm package and pi extension can theoretically have different update cycles
4. **Build separation**: The stub is minimal and re-exports from the main build, avoiding duplication

### Dependency Management

**Main package dependencies:**
- `better-sqlite3`: Core database
- `@modelcontextprotocol/sdk`: MCP server implementation
- `turndown`: HTML to Markdown
- `zod`: Validation

**Pi extension stub dependencies:**
- `better-sqlite3`: The stub has its own better-sqlite3 dependency that gets installed separately

This means `better-sqlite3` is installed twice (once for npm global, once for the stub extension).

## Potential Issues for Our Implementation

### 1. Version Drift

**Problem**: If version-sync script fails, the stub extension could have a different version than the main package.

**Mitigation**: The version-sync runs automatically via npm lifecycle hook on `npm version`. However, if someone manually publishes or if the sync script errors, versions could diverge.

### 2. peerDependencies vs dependencies

**Problem**: According to pi docs, third-party runtime dependencies should be in `dependencies`, but pi core packages should be in `peerDependencies` with `"*"` range.

**Current pattern**: context-mode uses `dependencies` for all packages. The stub extension has its own `dependencies` for `better-sqlite3`.

**Our consideration**: If we use the same pattern, we need to decide:
- Should our main package use `peerDependencies` for pi core packages?
- Should the stub extension have its own dependencies or inherit from main?

### 3. Build Complexity

**Problem**: The build process has multiple steps (tsc → bundle → assert-bundle → assert-asymmetric-drift).

**Our consideration**: This adds complexity. We need to:
- Ensure the build produces both the CLI bundle and the extension.js
- Handle the TypeScript compilation correctly
- Ensure the stub can re-export from the build output

### 4. File Structure

**Problem**: The stub extension needs to know the relative path to the main package's build output.

**Current pattern**: `../../../build/adapters/pi/extension.js` from the stub location.

**Our consideration**: This creates a hard-coded path dependency. If the package structure changes, the stub breaks.

### 5. Native Module Rebuild

**Problem**: `better-sqlite3` requires native compilation. The postinstall script handles healing, but this can cause issues on some platforms.

**Our consideration**: If our implementation uses native modules, we need a similar postinstall strategy.

## Comparison: Single Package vs Dual-Install

| Aspect | Single Package | Dual-Install (context-mode) |
|--------|---------------|---------------------------|
| Simplicity | Simpler, one install | More complex, two install points |
| CLI availability | Can use bin field | Has bin field in main package |
| Pi integration | Can use pi field | Separate stub package |
| Version sync | N/A | Requires version-sync script |
| Dependency isolation | Shared | Separate stub dependencies |
| Build output | One location | Must be accessible from stub |

## Recommendation for cali-product-workflow

Based on this research, the dual-install pattern is well-proven by context-mode. For cali-product-workflow:

1. **Follow the same pattern**: Main npm package with `pi` field, plus a stub extension in `.pi/extensions/`
2. **Use version-sync**: Ensure the stub's package.json version matches the main package
3. **Keep build accessible**: Place build output in a location accessible from the stub's relative path
4. **Handle native modules carefully**: Include postinstall script for native module rebuilding
5. **Consider peerDependencies**: For pi core packages, use `peerDependencies` with `"*"` range as recommended by pi docs

## Sources

### Kept:
- context-mode package.json: Full structure showing exports, bin, and pi fields
- context-mode Pi adapter source: Shows how the extension works
- Pi Packages documentation: Explains how pi field works and installation process
- version-sync.mjs script: Shows how version sync is implemented
- README.md: Installation instructions for all platforms

### Dropped:
- Generic "npm install" tutorials: Too basic, not specific to the pattern
- Raspberry Pi Node.js guides: Not relevant to the topic

## Gaps

- **How exactly pi installs the stub extension**: The pi docs explain the `pi` field but not the exact mechanism of how the stub in `.pi/extensions/` gets created. Need to check if `pi install` copies files or symlinks.
- **Postinstall script details**: The postinstall script is mentioned but not fully analyzed for native module handling.
- **CI/CD for dual-install**: How context-mode publishes both packages (main npm package and the repo with stub) needs investigation.

## Suggested Next Steps

1. Test the dual-install pattern with a minimal example
2. Investigate pi's actual installation mechanism for extensions
3. Document the build process for our specific needs
4. Create a version-sync script for our manifests