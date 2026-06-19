# Technical Spec: Multi-CLI Support for cali-product-workflow

**Version:** v4  
**Status:** Draft - Awaiting Gate Approval  
**Date:** 2026-05-20  
**Author:** Cali (Renato Caliari)  
**Changelog:** v4 - Added single install.sh script, removed Phase 3 from plan.

---

## Research Summary

### Key Findings from Context Mode & Plannotator

**Context Mode (mksglu/context-mode):**
- Single npm package with adapters pattern
- `configs/{platform}/` contains instruction files (not duplicated content)
- Adapters implement shared `HookAdapter` interface
- Core logic is platform-agnostic

**Plannotator (backnotprop/plannotator):**
- Monorepo with workspace packages
- `packages/server`, `packages/ui`, `packages/ai` shared across apps
- Each app is a thin wrapper around shared packages
- Different npm packages per app

---

## Pattern Analysis

### Recommended: Single Repo + Adapters

**Pros:**
- ✅ **Single source of truth** - easy to maintain
- ✅ **Discoverability** - one repo for everything
- ✅ **Shared scripts** - one install script works for all CLIs
- ✅ **DRY** - no code duplication
- ✅ **KISS** - simple structure

**Cons:**
- ⚠️ Larger repo (but manageable with good structure)

**Best for:** Our use case - skills are markdown, adapters are thin wrappers

### Alternative: Monorepo + Workspace

**Pros:**
- Shared packages versioned together
- Clear separation of concerns

**Cons:**
- More complex setup
- Requires monorepo tooling
- Over-engineering for our needs

---

## Key Decisions from This Session

1. **AGENTS.md is NOT duplicated** - Single generic version with CLI detection
2. **Single repo** - Everything in one place for discoverability and maintenance
3. **Adapters pattern** - Thin wrappers around shared skills
4. **Phase 1-2 only** - No shared packages unless complexity demands it
5. **Main package is generic** - No Pi-specific configs in main package.json
6. **Pi-specific handled via docs** - Document how Pi users install extra deps
7. **Default to `generic`** - When CLI not detected, use built-in tools
8. **Context Mode optional** - Falls back to basic tools if not installed
9. **Single install script** - One `install.sh` that auto-detects CLI

---

## What We Have Now

### Current State

```
cali-product-workflow/
├── skills/                    # Markdown skills (agnostic ✅)
├── references/cli-tools/       # Tool abstractions (agnostic ✅)
├── extensions/                # Pi extension (Pi-only ❌)
├── docs/                      # Documentation
├── AGENTS.md                  # Generic auto-trigger
└── package.json               # Pi-specific config ❌
```

**What Works:**
- Skills are markdown → work anywhere ✅
- Tool abstractions in `cli-tools/` → portable ✅

**What Doesn't Work:**
- `package.json` has `pi:` field → ignored by others ❌
- peerDependencies are Pi-specific → installation fails ❌

---

## Implementation Plan

### Phase 1: Clean Package + Install Script

**Goal:** Make package installable on other CLIs with one command

**Changes to package.json:**

```json
{
  "name": "@renatocaliari/stelow",
  "exports": {
    ".": "./index.js",
    "./skills": "./skills/",
    "./cli-tools": "./references/cli-tools/"
  },
  // NO Pi-specific peerDependencies - safe to ignore on other CLIs
}
```

**Single install script (`install.sh`):**

```bash
#!/usr/bin/env bash
# install.sh - Detect CLI and install accordingly

set -euo pipefail

# Detect CLI
detect_cli() {
  if command -v pi &> /dev/null; then echo "pi"; return; fi
  if command -v opencode &> /dev/null; then echo "opencode"; return; fi
  if command -v claude &> /dev/null; then echo "claude-code"; return; fi
  if command -v codex &> /dev/null; then echo "codex"; return; fi
  echo "generic"
}

CLI=$(detect_cli)
echo "Detected CLI: $CLI"

# Install base package (works on all CLIs)
pi install npm:@renatocaliari/stelow 2>/dev/null || \
opencode install npm:@renatocaliari/stelow 2>/dev/null || \
npm install -g @renatocaliari/stelow

# Install CLI-specific packages
case "$CLI" in
  pi)
    echo "Installing Pi-specific packages..."
    pi install npm:pi-subagents npm:pi-intercom \
      npm:pi-supervisor \
      npm:@plannotator/pi-extension
    ;;
  opencode)
    echo "OpenCode detected - adding to opencode.json..."
    # Update opencode.json with plugin entry
    ;;
  claude-code)
    echo "Claude Code detected - adding plugin..."
    claude /plugin marketplace add renatocaliari/stelow
    ;;
  codex)
    echo "Codex detected - adding plugin..."
    codex /plugins install renatocaliari/stelow
    ;;
  generic)
    echo "Generic CLI - base package installed"
    echo "Some features may be limited without CLI-specific plugins"
    ;;
esac

echo "Installation complete for $CLI"
```

**Benefits:**
- One command for all CLIs: `curl -sSL https://.../install.sh | bash`
- Auto-detects CLI
- Installs correct packages per platform
- Graceful fallback for unknown CLIs

---

### Phase 2: CLI Adapters

**Goal:** Enable core workflow on multiple CLIs

**New Structure:**
```
cali-product-workflow/
├── adapters/
│   ├── pi/               # Pi extension (existing)
│   ├── opencode/         # OpenCode plugin
│   ├── claude-code/      # Claude Code plugin
│   └── codex/            # Codex plugin
├── skills/               # Shared (markdown) ✅
├── references/cli-tools/  # Shared tool abstractions ✅
├── docs/
├── scripts/
│   ├── install.sh        # Auto-detect CLI
│   └── setup-pi.sh      # Pi-specific (optional)
└── package.json
```

**Each adapter:**
- Registers workflow commands
- Provides CLI-specific tool mappings
- Loads shared skills
- **No duplicated code**

---

## Summary

### What We WILL Do

| Phase | Action | Delivered |
|-------|--------|----------|
| **Phase 1** | Clean package.json + install.sh | One-command install for all CLIs |
| **Phase 2** | Create adapters per CLI | Core workflow works |

### What We Will NOT Do

| Action | Reason |
|--------|--------|
| ❌ Duplicated AGENTS.md | Single generic version works |
| ❌ Duplicated configs/ | Same reasoning as AGENTS.md |
| ❌ Shared packages extraction | Over-engineering until complexity demands it |

---

## Success Criteria

- [ ] Package.json cleaned (no Pi-specific blocking fields)
- [ ] Single `install.sh` script that auto-detects CLI
- [ ] Installation works on OpenCode, Claude Code, Codex
- [ ] Pi-specific installation documented
- [ ] Skills load on all CLIs (test)
- [ ] CLI detection works
- [ ] Adapter structure defined

---

## Next Steps

1. **Approve this plan** via Plannotator gate
2. **Execute Phase 1** — Clean package.json + install.sh
3. **Execute Phase 2** — Create adapter structure
4. **Test on each CLI** — Verify skills load

---