---
name: pw-help
description: Get help about the cali-product-workflow system
---

# /pw-help

Display help information about the cali-product-workflow system.

## Usage

```
/pw-help
/pw-help <topic>
```

## Topics

| Topic | Description |
|-------|-------------|
| `phases` | List all 11 workflow phases |
| `commands` | Show all available commands |
| `setup` | How to install and configure |
| `concepts` | Shape Up concepts and terminology |

## All Commands

| Command | Description |
|---------|-------------|
| `/pw-start` | Start a new workflow |
| `/pw-stop` | Stop workflow(s) |
| `/pw-pause` | Pause active workflow |
| `/pw-resume` | Resume paused workflow |
| `/pw-status` | Check workflow status |
| `/pw-ls` | List all workflows |
| `/pw-setphase` | Jump to phase |
| `/pw-next` | Advance to next phase |
| `/pw-complete` | Mark workflow complete |
| `/pw-goto` | Go to workflow |
| `/pw-rename` | Rename workflow |
| `/pw-menu` | Open workflow menu |
| `/pw-clean` | Archive stale workflows |
| `/pw-archive` | Archive workflow |
| `/pw-unarchive` | Unarchive workflow |

## The 11 Phases

1. **Setup** - Initialize workflow, load context
2. **Context** - Gather existing context
3. **Shape** - Define scope boundaries (IN/OUT)
4. **Critique** - Adversarial review of the plan
5. **Gate** - Visual review (Plannotator)
6. **Scope** - Break into technical scopes
7. **Interface** - Define UI/API interfaces
8. **Int.Gate** - Interface review gate
9. **Selection** - Prioritize and sequence
10. **Planning** - Generate typed execution plan
11. **Execution** - Execute and validate

## Related commands

- `/pw-menu` - Interactive workflow menu
- `/pw-status` - Quick status check