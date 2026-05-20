# Installation Guide

## Quick Start

```bash
./install.sh
```

One command installs everything needed for your CLI.

---

## Two Installation Options

### Option 1: Full Integration (Recommended)

```bash
./install.sh
```

Installs everything for your detected CLI:

| CLI | What's Installed |
|-----|------------------|
| **Pi** | Core package + Extension + Supporting packages + Skills |
| **OpenCode** | Plugin + Skills |
| **Claude Code** | Plugin + Skills |
| **Codex** | Plugin + Skills |

**Updates:** `pi update --extensions` (Pi) or `./install.sh update` (all CLIs)

---

### Option 2: Skills Only (npx skills)

For when you want just the skills without full CLI integration:

```bash
npx skills add renatocaliari/pi-product-workflow
```

This installs skills to `~/.agents/skills/` — works across multiple CLIs without deep integration.

**Updates:** `npx skills update`

**Use this when:**
- You use multiple CLIs and want unified skills
- You don't need plugins/extensions
- You prefer manual control over integration

---

## CLI-Specific Installation

### Pi

```bash
./install.sh
# Or force:
PRODUCT_WORKFLOW_CLI=pi ./install.sh
```

Installs: Core + Extension + Supporting packages + Skills

**Update:** `pi update --extensions` or `pi update npm:@renatocaliari/pi-product-workflow`

**Uninstall:** `pi remove npm:@renatocaliari/pi-product-workflow npm:@renatocaliari/cali-product-workflow-pi`

### OpenCode

```bash
./install.sh
# Or force:
PRODUCT_WORKFLOW_CLI=opencode ./install.sh
```

Installs: Plugin in `opencode.json` + Skills

**Update:** `./install.sh update`

**Uninstall:** `./install.sh remove` or manually remove from `opencode.json`

### Claude Code

```bash
./install.sh
# Or force:
PRODUCT_WORKFLOW_CLI=claude-code ./install.sh
```

Installs: Plugin + Skills

**Update:** `./install.sh update`

**Uninstall:** `./install.sh remove` or `claude /plugin uninstall pi-product-workflow`

### Codex

```bash
./install.sh
# Or force:
PRODUCT_WORKFLOW_CLI=codex ./install.sh
```

Installs: Marketplace plugin + Skills

**Update:** `./install.sh update`

**Uninstall:** `./install.sh remove` or `codex plugin uninstall pi-product-workflow`

---

## Usage

```bash
# Install (auto-detect CLI)
./install.sh

# Update
./install.sh update

# Remove
./install.sh remove

# Help
./install.sh help
```

---

## Manual Installation

### Pi (Dual-Install)

```bash
# Core package
pi install npm:@renatocaliari/pi-product-workflow

# Extension
pi install npm:@renatocaliari/cali-product-workflow-pi

# Supporting
pi install npm:pi-subagents npm:pi-goal npm:pi-intercom npm:pi-supervisor npm:pi-autoresearch npm:@juicesharp/rpiv-ask-user-question npm:@plannotator/pi-extension
```

### OpenCode

```json
// ~/.config/opencode/opencode.json
{
  "plugin": ["@renatocaliari/pi-product-workflow"]
}
```

### Claude Code

```bash
claude /plugin install /path/to/pi-product-workflow
```

### Codex

```bash
npx codex-marketplace add renatocaliari/pi-product-workflow --plugins
```

---

## Skills Management (npx skills)

```bash
# Install for all CLIs
npx skills add renatocaliari/pi-product-workflow

# Install for specific CLI
npx skills add renatocaliari/pi-product-workflow -a pi -a opencode

# Update
npx skills update

# Remove
npx skills remove cali-product-workflow

# List installed
npx skills list
```

---

## Summary

| Method | When to Use |
|--------|-------------|
| `./install.sh` | Full integration, one command |
| `pi update --extensions` | Update Pi packages |
| `npx skills add ...` | Skills only, lightweight |
| `npx skills update` | Update skills |

---

## Uninstall

```bash
./install.sh remove
```

Or manually:

```bash
# Pi
pi remove npm:@renatocaliari/pi-product-workflow
pi remove npm:@renatocaliari/cali-product-workflow-pi

# Skills
npx skills remove cali-product-workflow

# Auto-trigger
rm ~/.pi/agent/AGENTS.md
```

---

## From Source

```bash
git clone https://github.com/renatocaliari/pi-product-workflow.git
cd pi-product-workflow
./install.sh
```