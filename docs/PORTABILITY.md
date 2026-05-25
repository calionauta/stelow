# Portability Guide

This document explains how cali-product-workflow supports multiple AI coding agent harnesses (CLI tools).

## Overview

cali-product-workflow is designed to work across different AI coding agents. The workflow logic is harness-agnostic; only specific integrations (UI, commands) are platform-dependent.

### Supported Harnesses

| Harness | Status | Notes |
|---------|--------|-------|
| **pi** | ✅ Primary | Full support with TUI, commands, hooks |
| **opencode** | ⚠️ Partial | Skills work, UI/commands TBD |
| **claude-code** | ⚠️ Partial | Skills work, UI/commands TBD |
| **codex** | ⚠️ Partial | Skills work, UI/commands TBD |
| **generic** | ✅ Fallback | Works with any harness via basic tools |

---

## Architecture

### Skill Structure

```
skills/
├── cali-product-workflow/       # Main orchestrator
├── skills/            # Planning skills (agnostic)
├── skills/           # Execution skills (agnostic)
├── skills/  # Analysis skills (agnostic)
└── skills/    # Domain libraries (agnostic)
```

All skills are **markdown-based** and use tool abstractions in `references/cli-tools/`.

### Tool Abstractions

```
references/cli-tools/
├── README.md          # CLI detection strategy
├── subagents.md       # Parallel task delegation
├── plannotator.md     # Visual review gate
├── goals.md           # Goal execution
├── context-mode.md    # Context Mode integration
└── ...                # Other tool abstractions
```

Each tool file documents:
- **Quick Summary**: One-line description for fallback
- **Commands by CLI**: CLI-specific command formats
- **Generic Fallback**: What to do when CLI is unknown

---

## CLI Detection

### How It Works

1. **Primary:** Check `PRODUCT_WORKFLOW_CLI` environment variable
2. **Fallback:** Check for platform-specific directories:
   - `~/.pi/` → `pi`
   - `~/.opencode/` → `opencode`
   - `~/.claude/` → `claude-code`
   - `~/.codex/` → `codex`
3. **Default:** `generic` (uses built-in tool names)

### Setting the CLI

```bash
# Explicitly set the CLI
export PRODUCT_WORKFLOW_CLI=pi

# Or let it auto-detect
# (checks platform files as fallback)
```

### Why `generic`?

Defaulting to `generic` is safer than assuming a specific harness. When we don't know the CLI:

- Use standard tool names (read, bash, write, edit)
- Follow generic instructions in tool files
- Workflow still functions correctly

---

## Tool Mapping

### Available Tools

| Tool | Description | Available |
|------|-------------|-----------|
| `subagent` | Parallel task delegation | ✅ All CLIs |
| `ask` | Structured user questions | ✅ pi, ❌ others |
| `plannotator` | Visual review gate | ✅ All CLIs |
| `goals` | Autonomous execution | ✅ pi, ❌ others |
| `intercom` | Cross-session messaging | ✅ pi, ❌ others |
| `supervise` | Outcome steering | ✅ pi, ❌ others |
| `context-mode` | Context reduction (ctx_*) | ⚠️ Optional |

### CLI-Specific Notes

#### pi

Full support including:
- TUI status display
- Commands (`/pw-start`, `/pw-menu`, etc.)
- Plannotator integration
- Context Mode support

#### opencode, claude-code, codex

Skills work, but:
- UI/commands may need adaptation
- Some tools (ask, goals, intercom) may not be available
- Fall back to generic patterns

---

## Adapting to New CLIs

### Step 1: Create CLI-Specific Config

```bash
# If your CLI uses a different instruction file format
configs/
├── pi/AGENTS.md
├── opencode/AGENTS.md  # or similar
└── claude-code/CLAUDE.md
```

### Step 2: Document Tool Mappings

Update `references/cli-tools/{tool}.md` with new CLI commands.

### Step 3: Test

Run the workflow and verify:
- Skills load correctly
- Tool references resolve
- Fallbacks work when tools unavailable

---

## Context Mode

Context Mode provides ~98% context reduction for heavy operations. It's optional but recommended.

See [CONTEXT-MODE.md](./CONTEXT-MODE.md) for details.

---

## Installation

See [INSTALLATION.md](./INSTALLATION.md) for CLI-specific installation instructions.