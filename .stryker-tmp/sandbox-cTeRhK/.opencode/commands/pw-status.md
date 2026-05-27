---
name: pw-status
description: Check current product-workflow status
---

# /pw-status

Check the current status of an active product workflow.

## Usage

```
/pw-status
/pw-status name=<workflow-name>
```

## Examples

```
/pw-status
/pw-status name=api-redesign
```

## What it shows

- Current phase (e.g., "Phase 3/11: Shape")
- Workflow name and description
- Appetite level
- Active scope items
- Time elapsed
- Next suggested action

## Related commands

- `/pw-menu` - Open the workflow menu overlay
- `/pw-start` - Start a new workflow
- `/pw-ls` - List all workflows