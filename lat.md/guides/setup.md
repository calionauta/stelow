# Setup

How to set up and run cali-product-workflow.

## Prerequisites

Required tools before installation. Node.js and npm must be available.

- Node.js >= 20.0.0
- npm
- One of: Pi, OpenCode, Claude Code, or Codex CLI (for running the workflow)

## Installation

Multiple installation paths — choose the one that fits your workflow.

### Option 1: Quick Install (recommended)

Fastest path — runs the project's installation script.

```bash
# From project root
bash setup.sh
```

### Option 2: Manual Installation via npm

Standard npm install for package-based usage.

```bash
npm install @renatocaliari/cali-product-workflow
```

### Option 3: One-click Per-CLI

Each CLI has its own install script:

```bash
# OpenCode — installs plugin with TUI
bash cli-agents/opencode/install.sh

# Claude Code — copies markdown commands
bash cli-agents/claude/install.sh
```

> **Nota:** Pi usa uma extension dedicada em `extensions/cali-product-workflow/` que é carregada automaticamente. Codex ainda não tem install script automatizado.

## Project Structure

Overview of the project directory layout and key directories.

```
cali-product-workflow/
├── skills/                    # Skill definitions (25 skills)
│   ├── cali-product-workflow/ # Orchestrator skill
│   ├── cali-product-shape-up/ # Shape Up method
│   ├── cali-product-plan-critique/ # Gap analysis
│   ├── cali-product-interface-alternatives/ # UI exploration
│   ├── cali-product-tech-planning/ # Technical planning
│   └── ... (20+ more skills)
├── extensions/                # Pi extension (TypeScript)
├── cli-agents/                # Multi-CLI commands
│   ├── COMMANDS.md            # Single source of truth
│   ├── opencode/              # OpenCode plugin + commands
│   ├── claude/                # Claude markdown commands
│   └── codex/                 # Codex markdown commands
├── extensions/cali-product-workflow/modules/                    # Reusable modules
│   ├── file-store.ts          # File persistence
│   ├── cache.ts               # Cache management
│   └── task.ts                # Task types
├── docs/                      # Documentation
└── tests/                     # Tests
```

## Development Commands

Table of all npm-based development and build commands.

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript |
| `npm test` | Run all tests |
| `npm run typecheck` | Type check |
| `npm run lint` | Lint (type check only) |
| `npm run mutate` | Mutation testing |
| `npm run version:sync` | Sync versions across packages |

## Starting a Workflow

Initiate a new product planning session from within your project.

```bash
# From inside a project directory where cali-product-workflow is installed:
/pw-start

# Or with a pre-existing brief:
/pw-start @brief.md
```

## Updating Skills

Skills auto-update on workflow start when connected to GitHub. For manual updates:

```bash
# Re-run the setup script (idempotent)
bash setup.sh

# Or use the npm package
npm update @renatocaliari/cali-product-workflow
```
