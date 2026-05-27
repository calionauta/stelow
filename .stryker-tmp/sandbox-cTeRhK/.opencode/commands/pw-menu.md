---
name: pw-menu
description: Open the cali-product-workflow interactive menu
---

# /pw-menu

Open an interactive overlay showing the full workflow state and available actions.

## Usage

```
/pw-menu
```

## What it shows

The menu displays:
- Current phase with progress indicator
- Workflow metadata (name, description, appetite)
- IN/OUT scope summary
- Rabbit holes identified
- Risks and assumptions
- Action buttons for common operations:
  - `/pw-next` - Advance to next phase
  - `/pw-setphase` - Jump to specific phase
  - `/pw-pause` - Pause workflow
  - `/pw-complete` - Mark complete

## Related commands

- `/pw-status` - Quick status check
- `/pw-next` - Advance to next phase
- `/pw-setphase` - Jump to phase