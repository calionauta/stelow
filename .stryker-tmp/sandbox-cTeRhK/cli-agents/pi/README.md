# Pi CLI — cali-product-workflow

This directory follows the standard `cli-agents/` pattern for all CLI harnesses.
All commands are documented in `COMMANDS.md` (single source of truth).

## Installation

```bash
# Run from project root
./install.sh --cli pi
```

The install script:
- Builds the Pi extension (`extensions/cali-pw-pi/`)
- Installs the extension to Pi
- Installs required npm packages (`pi-subagents`, `pi-intercom`, `pi-autoresearch`, etc.)
- Installs all 20 skills to `~/.agents/skills/`
- Cleans up any conflicting local Pi skill copies

## Available Commands

| Command | Description |
|---------|-------------|
| `/pw-start` | Start a new workflow |
| `/pw-menu` | Show workflow menu |
| `/pw-status` | Show current status |
| `/pw-help` | Get help |

Full command matrix: `../COMMANDS.md`

## What Gets Installed

| Component | Location |
|-----------|----------|
| Extension | `~/.pi/agent/extensions/cali-pw-pi/` |
| Skills | `~/.agents/skills/` (20 skills flat) |
| Commands | Via extension (slash commands with TUI) |

## Extension Architecture

```
extensions/cali-pw-pi/           # Stub (re-exports from build)
extensions/cali-product-workflow/  # Source (TypeScript)
  ├── adapters/pi/                 # Pi-specific adapter
  ├── commands.ts                  # Slash command registration
  ├── ui.ts                        # TUI overlay
  └── modules/                     # Cache, file-store, task
```

## Notes

- Pi loads AGENTS.md from `~/.pi/agent/AGENTS.md` for development sessions
- The extension provides commands with TUI, not markdown commands
- Skills are loaded from `~/.agents/skills/` (DotAgents Protocol)