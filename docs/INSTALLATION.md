# Installation Guide

## One-Command Installation

```bash
./install.sh
```

The installer auto-detects your CLI and installs everything needed.

---

## Installation per CLI

### Pi (Recommended)

```bash
./install.sh
# Or force:
PRODUCT_WORKFLOW_CLI=pi ./install.sh
```

Installs:
- Core package (skills, adapters, commands)
- Stub extension (Pi integration)
- Supporting packages (pi-subagents, pi-goal, etc.)
- Skills

### OpenCode

```bash
./install.sh
# Or force:
PRODUCT_WORKFLOW_CLI=opencode ./install.sh
```

Installs:
- Plugin to `opencode.json`
- Skills

### Claude Code

```bash
./install.sh
# Or force:
PRODUCT_WORKFLOW_CLI=claude-code ./install.sh
```

Installs:
- Plugin (marketplace or local)
- Skills

### Codex

```bash
./install.sh
# Or force:
PRODUCT_WORKFLOW_CLI=codex ./install.sh
```

Installs:
- Plugin (marketplace)
- Skills

### Generic (Fallback)

```bash
./install.sh
```

When no specific CLI is detected, installs skills only via `npx skills`.

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

### Pi

```bash
# Core package
pi install npm:@renatocaliari/pi-product-workflow

# Stub extension
pi install npm:@renatocaliari/cali-product-workflow-pi

# Supporting packages
pi install npm:pi-subagents npm:pi-goal npm:pi-intercom npm:pi-supervisor npm:pi-autoresearch npm:@juicesharp/rpiv-ask-user-question npm:@plannotator/pi-extension
```

### OpenCode

```json
// Add to ~/.config/opencode/opencode.json:
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

## Skills Only (npx skills)

If you only want skills without full CLI integration:

```bash
# Install for all CLIs
npx skills add renatocaliari/pi-product-workflow

# Install for specific CLI
npx skills add renatocaliari/pi-product-workflow -a pi

# Update
npx skills update

# Remove
npx skills remove cali-product-workflow
```

---

## Installation Summary

| CLI | Command | Includes |
|-----|---------|----------|
| Pi | `./install.sh` | Core + Extension + Supporting + Skills |
| OpenCode | `./install.sh` | Plugin + Skills |
| Claude Code | `./install.sh` | Plugin + Skills |
| Codex | `./install.sh` | Plugin + Skills |
| Generic | `./install.sh` | Skills only |

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

# All CLIs
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