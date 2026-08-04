---
name: sw-menu
description: Open the stelow interactive menu
---

# /sw-menu

Open an interactive overlay showing the full workflow state and available actions.

## Usage

```
/sw-menu
```

## What it shows

The menu displays:
- Current phase with progress indicator
- Workflow metadata (name, description, stage)
- IN/OUT scope summary
- Rabbit holes identified
- Risks and assumptions
- Action buttons for common operations:
  - `/sw-next` - Advance to next phase
  - `/sw-setphase` - Jump to specific phase
  - `/sw-pause` - Pause workflow
  - `/sw-complete` - Mark complete

## Related commands

- `/sw-status` - Quick status check
- `/sw-next` - Advance to next phase
- `/sw-setphase` - Jump to phase