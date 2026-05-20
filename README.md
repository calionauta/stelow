# @renatocaliari/pi-product-workflow

[![CI](https://github.com/renatocaliari/pi-product-workflow/actions/workflows/ci.yml/badge.svg)](https://github.com/renatocaliari/pi-product-workflow/actions/workflows/ci.yml)
[![Mutation Testing](https://github.com/renatocaliari/pi-product-workflow/actions/workflows/mutation.yml/badge.svg)](https://github.com/renatocaliari/pi-product-workflow/actions/workflows/mutation.yml)
[![Coverage](https://img.shields.io/badge/coverage-70%25-brightgreen)](https://github.com/renatocaliari/pi-product-workflow/actions/workflows/ci.yml)

**Transform product ideas into approved, testable plans — systematically.**

This package brings [Shape Up](https://basecamp.com/shapeup) methodology to AI coding agents. Instead of open-ended feature lists, you shape proposals with clear scope boundaries, validate them through adversarial critique, and generate typed technical scopes ready for autonomous execution.

---

**Key differentiators:**

- **Product domain libraries** — 8 domains auto-detected from your language (Pricing, Trust, Ads, Promotions, Open Source, Health, Marketplace, Business Models)
- **Visual review gate** — Plannotator opens the full plan in a visual interface for comments, not just chat
- **Interface exploration** — 5 approaches in ASCII art with flows and trade-offs, then LLM creates hybrid combining best points for the context
- **[Shape Up](https://basecamp.com/shapeup) methodology** — IN/OUT scope boundaries, betting table concepts, aphorisms
- **Typed technical scopes** — feature, spike, optimize, test-* with dependency mapping and sequencing
- **Real-time TUI tracking** — see workflow state as it progresses

*"Measure thrice, cut once"* — applies to product decisions, not just code.

---

## 📋 Table of Contents

- [Philosophy](#philosophy)
- [About the Author](#about-the-author)
- [Why This Exists](#why-this-exists)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [🔧 Dependencies](#-dependencies)
- [📁 Artifact Directory](#-artifact-directory)
- [🔄 Process](#-process)
- [🎮 Commands](#-commands)
- [🖥️ TUI Visual](#️-tui-visual)
- [📋 Skills (16)](#-skills-16)
- [📊 Version](#-version)
- [License](#license)

---

## Philosophy

> *"Let's go slow to go fast: invest time in thorough planning to gain speed and deliver value in execution."*

**Traditional AI development:** "Here's what I want. Start coding."

**With pi-product-workflow:** The user just says:

```
/pw:start "Here's what I want to build"
```

And the workflow begins asking questions, exploring scope, shaping the proposal, reviewing for gaps, getting visual approval, and only then generating typed technical scopes for execution.

## About the Author

**[Cali (Renato Caliari)](https://www.linkedin.com/in/calirenato82/)** — Product specialist with hands-on experience:

### 📚 Published Work

- 🇧🇷 [e-book, Brazilian Portuguese] *Inovação baseada em Jobs To Be Done* (Innovation based on Jobs To Be Done)
- 🇧🇷 [e-book, Brazilian Portuguese] *A Arte da Experimentação: Da Ideia ao Produto* (The Art of Experimentation: From Idea to Product — Innovate with a simplified process and AI assistance)

### 💼 Experience

- Former **Product Manager** at tech companies
- **Product Consultant** helping leaders with strategy and teams with processes

### 🌐 Resources

| Site | Description |
|------|-------------|
| [timeproduto.com.br](https://www.timeproduto.com.br/) | Product process divided into stages, with AI tools and prompts for each stage |
| [calirenato82.substack.com](https://calirenato82.substack.com) | Blog exploring AI, organizational culture, daily philosophy, narrative practices, and product thinking — with published prompts and free e-books |

## Why This Exists

**The Problem:** Building products with AI agents often leads to:

- Scope creep and unclear boundaries — defining *what not to build* is harder than *what to build*
- Plans without adversarial review — no one questions assumptions before coding begins
- Technical work before business validation — shipping features that shouldn't exist
- No systematic testing for AI-generated code — AI writes fast, but also writes wrong
- Generic workflows missing product-specific insights — pricing, trust, ads, and launch strategy are product decisions, not code decisions

**The Solution:** A structured workflow that makes AI think like a product manager:

- ✅ **Measure thrice, cut once** — shapes proposals with IN/OUT boundaries BEFORE coding
- ✅ **Strategic exploration** — Job To Be Done, Opportunity Mapping, Evolutionary Principles, Market Analysis, and Product Discovery knowledge integrated
- ✅ **Adversarial critique** — reviews every plan for gaps, risks, and assumptions
- ✅ **Visual review gate** — Plannotator opens the full plan for point-by-point comments (not just chat)
- ✅ **Interface exploration in ASCII art** — visualize 5 different approaches in seconds, no coding wasted, then LLM creates a hybrid version combining the best points for the context
- ✅ **Domain libraries** — auto-detects 8 product domains (Pricing, Trust, Ads, etc.) from your language
- ✅ **Technical scope mapping** — breaks down into typed scopes, maps dependencies, sequences execution
- ✅ **AI-aware mutation testing** — for software products, with coverage targets and CI gates
- ✅ **Greenfield & Brownfield** — works for new products and existing product evolution

**Key Features:**

- 16 specialized product skills (Job To Be Done, Opportunity Mapping, Product Discovery, Pricing, Promotions, Trust Building, and more)
- Real-time TUI tracking with visual overlay (`/pw:menu`)
- Gate approval via Plannotator — review, comment, approve or reject before implementation
- Typed scopes for autonomous execution (feature, spike, test-*, optimize)

## How We Differ

This workflow combines product planning, domain knowledge, and technical execution for digital products. Here's how it compares:

| Aspect | Standard Agent | Heavy Framework | pi-product-workflow |
|--------|---------------|-----------------|---------------------|
| **Scope** | Open-ended | Full lifecycle | Shaped proposals with IN/OUT |
| **Review** | Manual chat | Configured | Adversarial critique + Gate |
| **Domain Skills** | None | Generic | 8 product-specific (auto-detected) |
| **Testing** | Ad-hoc | Configured | AI-aware mutation coverage |
| **Interface** | None | Coded mockups | ASCII art + tradeoffs + hybrid |
| **Tracking** | None | Varies | Real-time TUI + visual overlay |

### Key Differences

**vs. Claude Code / OpenCode:**

Both have a "plan" mode, but it's basic — restrict tools and add generic planning instructions. There's no structured product thinking: no scope boundaries, no adversarial critique, no domain-specific playbooks, no visual review gates.

- **Shapes proposals before coding** — with clear IN/OUT boundaries
- **Adversarial plan critique** — catches gaps, risks, and assumptions
- **Domain libraries** — auto-detect from user input (pricing, ads, trust, etc.)
- **Visual review gate** — Plannotator opens the full plan for point-by-point comments (not just chat)

**vs. [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) (47K ⭐) and [Superpowers](https://github.com/obra/superpowers) (199K ⭐):**

Both frameworks enforce structure for general software engineering. Here's what differentiates this workflow:

| Aspect | [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) | [Superpowers](https://github.com/obra/superpowers) | pi-product-workflow |
|--------|--------|---------|-----------|
| **Stars** | ~47K | ~199K | — |
| **Focus** | Enterprise team simulation (12+ workflows) | TDD-first engineering methodology | Product planning + domain knowledge + execution |
| **Phases** | 4 (Analysis → Planning → Solutioning → Implementation) | Skills system (14 skills) | 6 (Setup → Strategic → Shape Up → Interface → Critique → Tech) |
| **Scope Definition** | User stories, epics | Implementation plans | Shape Up with IN/OUT boundaries |
| **Domain Knowledge** | Generic product workflows | Code patterns, best practices | Job To Be Done, Pricing, Trust, Ads, Open Source, Health, Marketplace |
| **Review** | Manual or configured checklists | Subagent quality check | Plannotator visual gate with point-by-point comments |
| **Interface** | 1 UX design workflow (ux-spec.md) | 2-3 text approaches + optional browser | 5 ASCII archetypes + LLM hybrid creation |
| **Testing** | Sprint-based (dev-story + code-review) | TDD-first with subagents | Context-aware: TDD critical paths, mutation targets (70/50/30%), greenfield/brownfield |
| **Execution** | Story-by-story sprint cycle | Batch execution with review checkpoints | Typed scopes with dependency mapping and sequencing |

---

## 🚀 Quick Start

```bash
# 1. Install pi (if not already)
npm install -g @mariozechner/pi-coding-agent

# 2. Clone and install
git clone https://github.com/renatocaliari/pi-product-workflow.git
cd pi-product-workflow
./install.sh
```

That's it! The installer auto-detects your CLI (pi, opencode, claude-code, codex) and installs everything needed.

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for detailed options.

---

## 📦 Installation

### Quick Setup (Recommended)

```bash
./install.sh
```

The installer auto-detects your CLI and installs everything needed.

### Two Installation Options

**Option 1: Full Integration (Recommended)**

Installs everything for your detected CLI:

| CLI | What's Installed |
|-----|------------------|
| **Pi** | Core package + Extension + Supporting packages + Skills |
| **OpenCode** | Plugin + Skills |
| **Claude Code** | Plugin + Skills |
| **Codex** | Plugin + Skills |

**Option 2: Skills Only (npx skills)**

For when you want just the skills without full CLI integration:

```bash
npx skills add renatocaliari/pi-product-workflow
```

This installs skills to `~/.agents/skills/` — works across multiple CLIs without deep integration.

**Use this when:**
- You use multiple CLIs and want unified skills
- You don't need plugins/extensions
- You prefer manual control over integration

### CLI-Specific Installation

#### Pi (Dual-Install)

```bash
./install.sh
# Or force:
PRODUCT_WORKFLOW_CLI=pi ./install.sh
```

Installs: Core + Extension + Supporting packages + Skills

**Update:** `pi update --extensions` or `pi update npm:@renatocaliari/pi-product-workflow`

**Uninstall:** `pi remove npm:@renatocaliari/pi-product-workflow npm:@renatocaliari/cali-product-workflow-pi`

#### OpenCode

```bash
./install.sh
# Or force:
PRODUCT_WORKFLOW_CLI=opencode ./install.sh
```

Installs: Plugin in `opencode.json` + Skills

**Update:** `./install.sh update`

**Uninstall:** `./install.sh remove`

#### Claude Code

```bash
./install.sh
# Or force:
PRODUCT_WORKFLOW_CLI=claude-code ./install.sh
```

Installs: Plugin + Skills

**Update:** `./install.sh update`

**Uninstall:** `./install.sh remove`

#### Codex

```bash
./install.sh
# Or force:
PRODUCT_WORKFLOW_CLI=codex ./install.sh
```

Installs: Marketplace plugin + Skills

**Update:** `./install.sh update`

**Uninstall:** `./install.sh remove`

### Usage

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

### Manual Installation

#### Pi (Dual-Install)

```bash
# Core package
pi install npm:@renatocaliari/pi-product-workflow

# Extension
pi install npm:@renatocaliari/cali-product-workflow-pi

# Supporting
pi install npm:pi-subagents npm:pi-goal npm:pi-intercom npm:pi-supervisor npm:pi-autoresearch npm:@juicesharp/rpiv-ask-user-question npm:@plannotator/pi-extension
```

#### OpenCode

```json
// ~/.config/opencode/opencode.json
{
  "plugin": ["@renatocaliari/pi-product-workflow"]
}
```

#### Claude Code

```bash
claude /plugin install /path/to/pi-product-workflow
```

#### Codex

```bash
npx codex-marketplace add renatocaliari/pi-product-workflow --plugins
```

### Skills Management (npx skills)

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

### Summary

| Method | When to Use |
|--------|-------------|
| `./install.sh` | Full integration, one command |
| `pi update --extensions` | Update Pi packages |
| `npx skills add ...` | Skills only, lightweight |
| `npx skills update` | Update skills |

### Uninstall

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

## 🔧 Dependencies

### Required

| Package | Purpose |
|---------|---------|
| `pi-subagents` | Parallel subagent orchestration |
| `pi-goal` | Goal management and tracking |
| `pi-intercom` | Session-to-session coordination |
| `pi-supervisor` | Conversation supervision and steering |
| `pi-autoresearch` | Autonomous experiment loops |
| `@juicesharp/rpiv-ask-user-question` | Question UI component |
| `@plannotator/pi-extension` | Visual plan annotation |

### Development

| Package | Purpose |
|---------|---------|
| `typescript` | Type safety |
| `vitest` | Unit testing |
| `@stryker-mutator/core` | Mutation testing |

---

## 📁 Artifact Directory

All workflow artifacts are stored in:

```
<project>/.pi/workflow/
```

| Subdirectory | Contents |
|--------------|----------|
| `input/` | User's original idea |
| `phases/` | Phase outputs (JTBD, Shape Up, Interface, etc.) |
| `plans/` | Technical plans and specs |
| `reviews/` | Plannotator feedback |
| `scopes/` | Typed execution scopes |
| `logs/` | Workflow execution logs |

---

## 🔄 Process

The workflow runs through six phases:

1. **Setup** — User provides initial idea, AI asks clarifying questions
2. **Strategic** — Job To Be Done, Opportunity Mapping, Evolutionary Principles, Market Analysis, Product Discovery
3. **Shape Up** — Appetite, Hill Chart, Rabbit Holes, distant future, enemies, solutions, scope boundaries (IN/OUT), betting table
4. **Interface** — ASCII art exploration, trade-offs, LLM hybrid creation
5. **Critique** — Adversarial review, gaps, risks, assumptions
6. **Tech Planning** — Typed scopes (feature, spike, optimize, test-*), dependency mapping, sequencing

---

## 🎮 Commands

### Primary Commands

| Command | Description |
|---------|-------------|
| `/pw:start` or `/pw:begin` | Start the workflow |
| `/pw:menu` | Show workflow state and controls |
| `/pw:continue` | Continue to next phase |
| `/pw:help` | Show available commands |
| `/pw:status` | Display current phase and progress |
| `/pw:reset` | Reset workflow state |

### Phase Commands

| Command | Description |
|---------|-------------|
| `/pw:jtbd` | Run Job To Be Done phase |
| `/pw:shape` | Run Shape Up phase |
| `/pw:interface` | Run Interface phase |
| `/pw:critique` | Run Critique phase |
| `/pw:tech` | Run Tech Planning phase |

### Utility Commands

| Command | Description |
|---------|-------------|
| `/pw:export <phase>` | Export phase output |
| `/pw:import <file>` | Import saved workflow |
| `/pw:log` | Show workflow execution log |
| `/pw:review` | Open Plannotator for review |
| `/pw:scope <name>` | Create typed scope |
| `/pw:goals` | Manage execution goals |

---

## 🖥️ TUI Visual

The workflow includes a real-time TUI overlay showing:

- Current phase and progress
- Phase artifacts and outputs
- Upcoming tasks
- Quick actions

Toggle with `/pw:menu`.

---

## 📋 Skills (16)

### Strategic Skills (5)

| Skill | Purpose |
|-------|---------|
| `cali-jtbd` | Job To Be Done — understand what job users hire the product to do |
| `cali-opportunity-mapping` | Map opportunities to see where to focus |
| `cali-evolutionary` | Evolutionary principles for sustainable development |
| `cali-short-cycle` | Rapid feedback loops |
| `cali-product-discovery` | Customer discovery and validation |

### Domain Skills (8)

| Skill | Purpose |
|-------|---------|
| `cali-pricing` | Pricing strategy and tactics |
| `cali-ads` | Advertising and growth channels |
| `cali-trust` | Trust-building mechanisms |
| `cali-promotions` | Promotions and campaigns |
| `cali-business-models` | Business model canvas and options |
| `cali-health` | Product health metrics |
| `cali-marketplace` | Marketplace dynamics |
| `cali-open-source` | Open source strategy |

### Workflow Skills (3)

| Skill | Purpose |
|-------|---------|
| `cali-shape-up` | Shape Up planning methodology |
| `cali-interface-brainstorm` | Interface exploration and ASCII art |
| `cali-plan-critique` | Adversarial plan review |
| `cali-tech-planning` | Technical scope generation |

---

## 📊 Version

Current: **1.0.0-alpha**

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## License

MIT

---

## 📞 Support

- [Documentation](docs/)
- [Issues](https://github.com/renatocaliari/pi-product-workflow/issues)
- [Discussions](https://github.com/renatocaliari/pi-product-workflow/discussions)