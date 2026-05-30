---
name: pw-start
description: Start a new cali-product-workflow planning session
---

# /pw-start

Start the cali-product-workflow planning process.

## Usage

```
/pw-start [name=<workflow-name>] [description=<description>] [@source-file]
```

## Examples

```
/pw-start
/pw-start name=api-redesign
/pw-start name=dashboard description="Redesign the user dashboard"
/pw-start @brief.md
```

## What it does

1. Creates a new workflow tracking file in `.cali-product-workflow/`
2. Loads the cali-product-workflow skill
3. Guides you through the workflow:
   - Setup → Context → Shape → Critique → Gate → Scope → Interface → Int.Gate → Selection
   - Planning → Execution → Verification → Audit

## Requirements

The cali-product-workflow skill must be installed. See [docs/INSTALLATION.md](../../docs/INSTALLATION.md).

## Related commands

- `/pw-status` - Check current workflow status
- `/pw-menu` - Show workflow menu
- `/pw-help` - Get help about the workflow