# Pi CLI — stelow

This directory follows the standard `cli-agents/` pattern for all CLI harnesses.
All commands are documented in `COMMANDS.md` (single source of truth).

## Installation

```bash
# Run from project root
./install.sh --cli pi
```

The install script:
- Builds the Pi extension (`extensions/stelow/`)
- Installs the extension to Pi
- Installs required npm packages (`pi-subagents`, `pi-intercom`, etc.)
- Installs all 25 skills to `~/.agents/skills/`
- Cleans up any conflicting local Pi skill copies

## Available Commands

| Command | Description |
|---------|-------------|
| `/sw-start` | Start a new workflow |
| `/sw-status` | Show current status |
| `/sw-help` | Get help |

Full command matrix: `../COMMANDS.md`

## What Gets Installed

| Component | Location |
|-----------|----------|
| Extension | `~/.pi/agent/extensions/stelow/` |
| Skills | `~/.agents/skills/` (25 skills flat) |
| Commands | Via extension (slash commands with TUI) |

## Extension Architecture

```
extensions/stelow/  # Source (TypeScript) — single Pi extension
  ├── adapters/pi/                 # Pi-specific adapter
  ├── commands.ts                  # Slash command registration
  ├── ui.ts                        # TUI overlay
  └── modules/                     # Cache, file-store, task
```

## Notes

- Pi loads AGENTS.md from `~/.pi/agent/AGENTS.md` for development sessions
- The extension provides commands with TUI, not markdown commands
- Skills are loaded from `~/.agents/skills/`