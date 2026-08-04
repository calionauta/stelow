---
name: sw-start
description: Start a new stelow planning session
---

# /sw-start

Start the stelow planning process.

## Usage

```
/sw-start [name=<workflow-name>] [description=<description>] [@source-file]
```

## Examples

```
/sw-start
/sw-start name=api-redesign
/sw-start name=dashboard description="Redesign the user dashboard"
/sw-start @brief.md
```

## What it does

1. Creates a new workflow tracking file in `.stelow/`
2. Loads the stelow skill
3. Guides you through the workflow:
   - Setup → Context → Shape → Critique → Gate → Scope → Interface → Int.Gate → Selection
   - Planning → Execution → Verification → Audit

## Requirements

The stelow skill must be installed. See [docs/INSTALLATION.md](../../docs/INSTALLATION.md).

## Related commands

- `/sw-status` - Check current workflow status
- `/sw-menu` - Show workflow menu
- `/sw-help` - Get help about the workflow