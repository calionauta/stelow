# Dual-Install Pattern: context-mode Analysis

**Status:** Spike Complete  
**Date:** 2026-05-20  
**Project:** cali-product-workflow

## Overview

This document analyzes the dual-install pattern used by context-mode to understand how to implement a similar pattern for cali-product-workflow. The pattern allows a package to be installed both as a global CLI tool (via npm) and as a pi extension (via pi install).

## Pattern Summary

context-mode uses two install points:
1. **npm global install** (`npm install -g context-mode`) → CLI and MCP server available
2. **pi extension install** (`pi install npm:context-mode`) → Pi extension loaded from stub

## Package Structure

```
context-mode/
├── package.json                    # Main package with pi field
├── .pi/
│   └── extensions/
│       └── context-mode/           # Stub extension
│           ├── package.json        # Version-synced stub
│           ├── index.ts            # Re-exports: export { default } from "../../../build/adapters/pi/extension.js"
│           └── tsconfig.json
├── build/
│   └── adapters/pi/
│       └── extension.js            # Target for stub re-export
├── skills/
│   └── context-mode/
│       └── SKILL.md
└── cli.bundle.mjs                  # CLI entry for bin field
```

## Key package.json Fields

### Main package.json

```json
{
  "name": "context-mode",
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

### Stub extension package.json

```json
{
  "name": "context-mode",
  "version": "1.0.146",
  "main": "index.ts",
  "dependencies": {
    "better-sqlite3": "^11.0.0"
  }
}
```

## Installation Flow

```
┌─────────────────────────────────────────────────────────────┐
│              npm install -g context-mode                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ~/.npm/_npx/... or global node_modules                      │
│  ├── context-mode@1.0.146                                   │
│  ├── bin/context-mode → cli.bundle.mjs  (CLI available)     │
│  ├── build/adapters/pi/extension.js   (pi extension target) │
│  └── skills/                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              pi install npm:context-mode                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ~/.pi/extensions/context-mode/                              │
│  ├── package.json  (version-synced stub)                    │
│  └── index.ts → ../../../build/adapters/pi/extension.js    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Pi reads stub package.json, loads extension.js             │
│  Extension registers hooks and MCP tools                     │
└─────────────────────────────────────────────────────────────┘
```

## Build Pipeline

```bash
npm run build
# 1. tsc - Compile TypeScript to build/
# 2. chmod +x build/cli.js (Unix)
# 3. npm run bundle - esbuild multiple entry points
#    - server.bundle.mjs (MCP server)
#    - cli.bundle.mjs (CLI)
#    - hooks/session-*.bundle.mjs (hooks)
# 4. npm run assert-bundle - Verify bundles exist
# 5. npm run assert-asymmetric-drift - Check version drift
```

## Version Sync

The `version` npm lifecycle hook runs `scripts/version-sync.mjs`:

```javascript
const targets = [
  ".claude-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".openclaw-plugin/openclaw.plugin.json",
  ".openclaw-plugin/package.json",
  ".pi/extensions/context-mode/package.json",  // ← Pi stub synced here
];
```

This ensures the stub extension always has the same version as the main package.

## Key Findings

### 1. Stub Re-exports from Build

The stub extension (`index.ts`) re-exports from the main package's build output:
```typescript
export { default } from "../../../build/adapters/pi/extension.js";
```

This avoids duplicating code while allowing the stub to be a valid npm package that pi can install.

### 2. Platform Adapter Architecture

context-mode uses platform-specific adapters in `src/adapters/`:
- Each platform has its own adapter implementation
- The `pi` field points to the compiled adapter: `./build/adapters/pi/extension.js`
- This keeps the main package entry point generic while enabling platform-specific behavior

### 3. Skills Location

The `pi.skills` field points to `./skills` in the main package, allowing skills to be loaded from the main package rather than duplicated in the stub.

## Potential Issues

| Issue | Description | Mitigation |
|-------|-------------|------------|
| Version Drift | Stub could get out of sync | version-sync.mjs runs on npm version hook |
| Path Hardcoding | Stub path `../../../build/adapters/pi/extension.js` is fragile | Document the requirement clearly |
| Native Modules | better-sqlite3 needs postinstall healing | Include postinstall.mjs script |
| Dependency Duplication | better-sqlite3 installed twice (main + stub) | Accept as necessary for isolation |

## Recommendations for cali-product-workflow

1. **Follow the same pattern**: Main npm package with `pi` field, stub extension in `.pi/extensions/`
2. **Include version-sync**: Run on npm version hook to keep stub version in sync
3. **Place build in accessible location**: The stub's relative path must correctly resolve to the build output
4. **Use adapter pattern**: If platform-specific code is needed, use adapters directory structure
5. **Handle native modules**: Include postinstall script for native module rebuilding if needed
6. **Consider peerDependencies**: For pi core packages (`@earendil-works/pi-*`), use `peerDependencies` with `"*"` range

## Comparison: Single Package vs Dual-Install

| Aspect | Single Package | Dual-Install |
|--------|---------------|--------------|
| Simplicity | ✅ Simpler | ❌ More complex |
| CLI availability | ✅ Can use bin | ✅ Has bin |
| Pi integration | ✅ Can use pi field | ✅ Has pi field |
| Version sync | N/A | ⚠️ Requires script |
| Dependency isolation | Shared | Separate |
| Build output | One location | Must be accessible |

## Conclusion

The dual-install pattern is well-proven by context-mode (14K+ stars, used at Microsoft, Google, Meta, etc.). For cali-product-workflow to integrate with pi as both a CLI tool and an extension, following this pattern is recommended.

## References

- [context-mode GitHub](https://github.com/mksglu/context-mode)
- [context-mode package.json](https://raw.githubusercontent.com/mksglu/context-mode/main/package.json)
- [Pi Packages documentation](https://pi.dev/docs/latest/packages)
- [Pi extension source](https://raw.githubusercontent.com/mksglu/context-mode/main/src/adapters/pi/index.ts)
- [version-sync.mjs](https://raw.githubusercontent.com/mksglu/context-mode/main/scripts/version-sync.mjs)