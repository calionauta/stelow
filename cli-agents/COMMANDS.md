# cali-product-workflow Commands

## Single Source of Truth

This file is the **authoritative source** for all workflow commands.
Every CLI's AGENTS.md and commands reference this file.

## Command Matrix

| Command | Pi | OpenCode | Claude | Codex | Description |
|---------|----|----------|--------|-------|-------------|
| `/pw-start` | ✅ | ✅ | ✅ | ✅ | Start workflow (with optional @brief.md or description) |
| `/pw-menu` | ✅ | ✅ | ✅ | ✅ | Show interactive workflow menu |
| `/pw-status` | ✅ | ✅ | ✅ | ✅ | Show active workflow status |
| `/pw-help` | ✅ | ✅ | ✅ | ✅ | Help about workflow |
| `/pw-next` | ✅ | ⚠️ | ⚠️ | ⚠️ | Advance to next phase |
| `/pw-stop` | ✅ | ⚠️ | ⚠️ | ⚠️ | Stop workflow(s) |
| `/pw-pause` | ✅ | ⚠️ | ⚠️ | ⚠️ | Pause active workflow |
| `/pw-resume` | ✅ | ⚠️ | ⚠️ | ⚠️ | Resume paused workflow |
| `/pw-ls` | ✅ | ⚠️ | ⚠️ | ⚠️ | List workflows (all, archived, path=) |
| `/pw-goto` | ✅ | ⚠️ | ⚠️ | ⚠️ | Go to a workflow |
| `/pw-complete` | ✅ | ⚠️ | ⚠️ | ⚠️ | Mark workflow complete |
| `/pw-rename` | ✅ | ⚠️ | ⚠️ | ⚠️ | Rename active workflow |
| `/pw-archive` | ✅ | ❌ | ❌ | ❌ | Archive current workflow |
| `/pw-unarchive` | ✅ | ❌ | ❌ | ❌ | Unarchive workflow |
| `/pw-setphase` | ✅ | ⚠️ | ⚠️ | ⚠️ | Jump to specific phase |

✅ = Full support | ⚠️ = Partial (skill invocation) | ❌ = Not available

## Command Coverage by CLI

| CLI | Commands Available | Implementation |
|-----|-------------------|----------------|
| **Pi** | 15 commands | TypeScript extension with hooks |
| **OpenCode** | 4 core commands | Plugin + markdown commands |
| **Claude** | 4 core commands | Markdown commands (skills) |
| **Codex** | 4 core commands | Markdown commands |

## Per-CLI Implementation

### Pi (15 commands - Full support)
- Extension: `extensions/cali-pw-pi/` (installed via install.sh)
- Skills: `~/.agents/skills/` (20 flat skills)
- Commands: Via extension with TUI overlay
- Native registerCommand() for all commands
- Hooks: session-start, pre/post-tool-use, etc.

### OpenCode (4 core commands - Partial)
- Plugin: `cli-agents/opencode/plugin/`
- Markdown commands in `cli-agents/opencode/commands/`
- Hooks for lifecycle management
- Full command list via skill invocation

### Claude (4 core commands - Partial)
- Commands: `cli-agents/claude/commands/`
- Skills-based command dispatch
- Full command list via /skill cali-product-workflow

### Codex (4 core commands - Partial)
- Commands: `cli-agents/codex/commands/`
- Markdown command files
- Full command list via skill invocation

## Adding New Commands

1. Update this COMMANDS.md matrix
2. Create CLI-specific implementation in `cli-agents/{cli}/commands/`
3. Add entry to Command Matrix table
4. Each CLI's AGENTS.md references this file