---
name: sw-status
description: Check current product-workflow status
---

# /sw-status

Check the current status of an active product workflow.

## Usage

```
/sw-status
/sw-status name=<workflow-name>
```

## Examples

```
/sw-status
/sw-status name=api-redesign
```

## What it shows

- Current phase (e.g., "Phase 3: Shape")
- Workflow name and description
- Appetite level
- Active scope items
- Time elapsed
- Next suggested action

## Related commands

- `/sw-menu` - Open the workflow menu overlay
- `/sw-start` - Start a new workflow
- `/sw-ls` - List all workflows