# Installation Guide

This guide covers installing cali-product-workflow for different AI coding agent harnesses.

## Quick Install (pi)

```bash
# Install via npm
pi install npm:@renatocaliari/pi-product-workflow

# Or from source
git clone https://github.com/renatocaliari/pi-product-workflow.git
cd pi-product-workflow
pi install ./
```

### Install Pi-Specific Dependencies

```bash
# Install all Pi integrations as optional dependencies
pi install npm:@renatocaliari/pi-product-workflow

# Or manually install the integrations you need:
pi install npm:pi-subagents
pi install npm:pi-goal
pi install npm:plannotator
pi install npm:pi-intercom
pi install npm:pi-supervisor
pi install npm:ask-user-question
pi install npm:pi-autoresearch
pi install npm:context-mode
```

### Optional: Auto-trigger

Enable auto-trigger in all projects:

```bash
cp ~/pi-product-workflow/AGENTS.md ~/.pi/agent/AGENTS.md
```

To disable:
```bash
rm ~/.pi/agent/AGENTS.md
```

---

## Installation Methods

---

## Dependencies

### Required (all CLIs)

| Package | Purpose | Min Version |
|---------|---------|-------------|
| typebox | Runtime type validation | * |

### Pi-Specific (optional peer dependencies)

Install these separately for Pi integration:

| Package | Purpose | Min Version |
|---------|---------|-------------|
| pi-subagents | Parallel task execution | 0.24.0 |
| plannotator | Visual review gate | 0.19.0 |
| pi-goal | Goal execution mode | 0.6.0 |
| ask-user-question | Structured questions | 1.6.0 |
| intercom | Cross-session messaging | 0.6.0 |
| supervisor | Outcome steering | 0.4.0 |
| @earendil-works/pi-coding-agent | Core Pi agent | 0.74.0 |
| @earendil-works/pi-tui | Terminal UI | * |
| pi-agent-codebase-workflows | Codebase workflows | * |
| pi-autoresearch | Optimization loops | 0.1.0 |
| context-mode | Context reduction (98%) | 1.0.0 |

---

## Setup Script (Pi only)

Run the setup script for automated installation:

```bash
cd ~/pi-product-workflow
./scripts/setup.sh
```

This script:
1. Installs npm dependencies
2. Copies AGENTS.md to enable auto-trigger
3. Verifies installation

**Note:** This script is Pi-specific. Other CLIs use their native plugin systems.

---

## Verification

### Generic verification

```bash
npm list @renatocaliari/pi-product-workflow
```

### Pi-specific verification

Check installation:

```bash
pi list
```

You should see:
- `@renatocaliari/pi-product-workflow`
- All dependencies

---

## For Other CLIs

### Generic Install (npm)

```bash
npm install @renatocaliari/pi-product-workflow
```

This works on any system with Node.js >= 20.0.0.

### opencode

```json
{
  "plugins": ["@renatocaliari/pi-product-workflow"]
}
```

### claude-code

```bash
/plugin marketplace add renatocaliari/pi-product-workflow
```

### codex

Installation method TBD (Codex may use different plugin system).

---

## Troubleshooting

### Skills not loading

Check that the package is installed:
```bash
pi list | grep product-workflow
```

### Commands not found

Restart the CLI after installation:
```bash
pi --reload
```

### Auto-trigger not working

Verify AGENTS.md is in place:
```bash
cat ~/.pi/agent/AGENTS.md | head
```

---

## Uninstallation

```bash
cd ~/pi-product-workflow
./scripts/uninstall.sh
```

Or manually:
```bash
rm ~/.pi/agent/AGENTS.md
pi uninstall @renatocaliari/pi-product-workflow
```