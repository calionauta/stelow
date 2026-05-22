---
name: pw-menu
description: Show the cali-product-workflow interactive menu
---

# /pw:menu

Show an interactive menu with workflow actions.

## Usage

```
/pw:menu
```

## Options

- **Next Phase** - Advance to the next workflow phase
- **Stop** - Stop the current workflow
- **Status** - View current workflow status

## What it does

Displays an interactive picker with available workflow actions based on the current phase and workflow state.

## Requirements

An active workflow must be running. Start one with `/pw:start`.

## Related commands

- `/pw:start` - Start a new workflow
- `/pw:status` - Check current workflow status
- `/pw:next` - Advance to next phase