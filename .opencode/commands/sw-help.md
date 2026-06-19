---
name: sw-help
description: Get help about the stelow system
---

# /sw-help

Display help information about the stelow system.

## Usage

```
/sw-help
/sw-help <topic>
```

## Topics

| Topic | Description |
|-------|-------------|
| `phases` | List all workflow phases |
| `commands` | Show all available commands |
| `setup` | How to install and configure |
| `concepts` | Shape Up concepts and terminology |

## All Commands

| Command | Description |
|---------|-------------|
| `/sw-start` | Start a new workflow |
| `/sw-abort` | Abort and archive workflow(s) |
| `/sw-pause` | Pause active workflow |
| `/sw-resume` | Resume paused workflow |
| `/sw-status` | Check workflow status |
| `/sw-ls` | List all workflows |
| `/sw-setphase` | Jump to phase |
| `/sw-next` | Advance to next phase |
| `/sw-complete` | Mark workflow complete |
| `/sw-goto` | Go to workflow |
| `/sw-rename` | Rename workflow |
| `/sw-menu` | Open workflow menu |
| `/sw-clean` | Archive stale workflows |
| `/sw-archive` | Archive workflow |
| `/sw-unarchive` | Unarchive workflow |

## The Workflow Phases

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
11. **Execution** - Execute scopes
12. **Verification** - Test suite, code review, UI audit
13. **Audit** - Delivery audit and sign-off

## Related commands

- `/sw-menu` - Interactive workflow menu
- `/sw-status` - Quick status check