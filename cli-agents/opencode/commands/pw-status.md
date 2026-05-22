---
name: pw-status
description: Show the current cali-product-workflow status
---

# /pw:status

Display the current workflow status.

## Usage

```
/pw:status
```

## Output

Shows:
- Workflow name
- Current phase (e.g., "Setup", "Shape", "Gate")
- Phase number (1-11)
- Bypass status (if active)

## Example output

```
◆ my-workflow  │  ◆ Shape 3
```

## When to use

- Check workflow progress
- Verify current phase before continuing
- Confirm workflow is active

## Requirements

An active workflow must be running. Start one with `/pw:start`.

## Related commands

- `/pw:start` - Start a new workflow
- `/pw:menu` - Show workflow menu
- `/pw:ls` - List all workflows