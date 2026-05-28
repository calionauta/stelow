# @renatocaliari/cali-product-workflow

[![CI](https://github.com/renatocaliari/cali-product-workflow/actions/workflows/ci.yml/badge.svg)](https://github.com/renatocaliari/cali-product-workflow/actions/workflows/ci.yml)
[![Mutation Testing](https://github.com/renatocaliari/cali-product-workflow/actions/workflows/mutation.yml/badge.svg)](https://github.com/renatocaliari/cali-product-workflow/actions/workflows/mutation.yml)
[![Coverage](https://img.shields.io/badge/coverage-70%25-brightgreen)](https://github.com/renatocaliari/cali-product-workflow/actions/workflows/ci.yml)

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
- [📋 Skills (21)](#-skills-21)
- [📊 Version](#-version)
- [License](#license)

---

## Philosophy

> *"Let's go slow to go fast: invest time in thorough planning to gain speed and deliver value in execution."*

**Traditional AI development:** "Here's what I want. Start coding."

**With cali-product-workflow:** The user just says:

```
/pw-start "Here's what I want to build"
```

And the workflow begins asking questions, exploring scope, shaping the proposal, reviewing for gaps, getting visual approval, and only then generating typed technical scopes for execution.

## About the Author

**[Cali (Renato Caliari)](https://www.linkedin.com/in/calirenato82/)**

This workflow wasn't designed in a vacuum. It comes from years inside real teams — as a product manager, consultant, and leader across different organizations. The skills, patterns, and disciplines here were tested, broken, and rebuilt in live product environments, not conference rooms.

### 📚 Published Work

- 🇧🇷 [e-book, Brazilian Portuguese] *Inovação baseada em Jobs To Be Done* (Innovation based on Jobs To Be Done)
- 🇧🇷 [e-book, Brazilian Portuguese] *A Arte da Experimentação: Da Ideia ao Produto* (The Art of Experimentation: From Idea to Product — Innovate with a simplified process and AI assistance)

### 💼 Experience

- Former **Product Manager** at tech companies
- **Product Consultant** helping leaders with strategy and teams with processes
- Creator of **Triple Track Agile** — adds an opportunity mapping track to product cycles
- Developed **Contornos** — a social technology for decentralized decisions

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

- **21 sub-skills** organized into 4 layers — orchestrator + strategies + workflow stages + tactics
- Part of a broader ecosystem of **54+ skills** for coding, ops, research, and facilitation
- Real-time TUI tracking with visual overlay (`/pw-menu`)
- Gate approval via Plannotator — review, comment, approve or reject before implementation
- Typed scopes for autonomous execution (feature, spike, test-*, optimize)

## How We Differ

This workflow combines product planning, domain knowledge, and technical execution for digital products. Here's how it compares:

| Aspect | Standard Agent | Heavy Framework | cali-product-workflow |
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

| Aspect | [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) | [Superpowers](https://github.com/obra/superpowers) | cali-product-workflow |
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

This package works across **multiple coding agents** — not just pi.dev. See the compatibility table in [Installation](#-installation) to pick your path.

| Your situation | Recommended command | What you get |
|----------------|--------------------|-------------|
| **New to CLIs** (no Node, no agent) | `curl -fsSL https://raw.githubusercontent.com/.../setup.sh \| sh` | Node.js + pi.dev + all extensions + 20 skills |
| **Already use pi.dev** | `git clone ... && ./install.sh` | 20 skills + TUI overlay + slash commands |
| **Use OpenCode / Claude Code / Codex** | `git clone ... && ./install.sh` | 20 skills + command files (no TUI) |
| **Any CLI (skills only)** | `npx skills add renatocaliari/cali-product-workflow -g` | 20 skills via DotAgents Protocol |

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for detailed options.
Per-agent configuration files (commands, install scripts) are in [`cli-agents/`](cli-agents/).

---

## 📦 Installation

### CLI Compatibility

Not every feature works on every CLI. Here's what to expect:

| Feature | pi.dev | OpenCode | Claude Code | Codex |
|---------|--------|----------|-------------|-------|
| **Skills (all 20)** | ✅ | ✅ | ✅ | ✅ |
| **`/pw-start`, `/pw-menu` commands** | ✅ Slash commands | ✅ Via `pw-*.md` files | ✅ Via command files | ✅ Via command files |
| **TUI overlay (real-time status)** | ✅ Native | ❌ | ❌ | ❌ |
| **Plannotator visual gate** | ✅ Extension | ⚠️ Manual | ⚠️ Manual | ⚠️ Manual |
| **Deep hooks (events, gates)** | ✅ Extension | ❌ | ❌ | ❌ |

> **Bottom line:** The **20 skills work identically on every CLI** — they run the full Shape Up workflow, generate plans, critique, scopes, everything. The TUI overlay and deep integration features are Pi-only because only Pi exposes an extension system. All CLIs can still complete the workflow; it just happens in chat rather than a visual panel.

---

### 🚀 Path A: From Zero (pi.dev + Everything)

**One command, everything included.** Pick this if you don't have pi.dev yet.

```bash
curl -fsSL https://raw.githubusercontent.com/renatocaliari/cali-product-workflow/main/setup.sh | sh
```

**What gets installed:**

| Component | Details | Works on |
|-----------|---------|----------|
| **Node.js** | v20+ (if not installed) | — |
| **pi.dev** | Latest version | pi.dev |
| **Extensions (22)** | subagents, browser, intercom, supervisor, plannotator, etc. | pi.dev only |
| **Skills (20)** | Shape Up, JTBD, Pricing, Ads, Discovery, and more | **All CLIs** ✅ |
| **Settings** | Theme, model defaults, skill shortcuts | pi.dev |

> **Not using pi.dev?** The skills are still installed to `~/.agents/skills/` — they work on OpenCode, Claude Code, and Codex too. You just won't get the Pi-only extensions or TUI. The workflow itself runs fine.

### 📋 Path B: Existing pi.dev User

```bash
git clone https://github.com/renatocaliari/cali-product-workflow.git
cd cali-product-workflow
./install.sh
```

The installer auto-detects your CLIs and installs skills + extensions + slash commands. Skills go to `~/.agents/skills/`.

### 📋 Path C: Other CLI (OpenCode / Claude Code / Codex)

The **skills** are the core of this project — they work on **any** agent that supports the [DotAgents Protocol](https://dotagents.org).

```bash
git clone https://github.com/renatocaliari/cali-product-workflow.git
cd cali-product-workflow
./install.sh
```

The installer detects your CLI and installs **skills + command files**. No extensions, no TUI — just the 20 skills that run the workflow.

**Or, with npx (no clone needed):**

```bash
npx skills add renatocaliari/cali-product-workflow -g
```

This installs all 20 skills to `~/.agents/skills/` — works on any CLI.

> For CLI-specific setup (OpenCode config, Claude Code plugin, Codex plugin), see [docs/INSTALLATION.md](docs/INSTALLATION.md).

---

## 🔧 Dependencies

For manual setup, per-CLI commands, updates, and detailed installation options, see [docs/INSTALLATION.md](docs/INSTALLATION.md).

### Required (Pi Only)

See [docs/INSTALLATION.md#required-npm-packages](docs/INSTALLATION.md#required-npm-packages).

### Development

See [package.json](package.json) for toolchain dependencies (TypeScript, Vitest, Stryker).

### Third-Party Skills (Optional)

See [docs/INSTALLATION.md#third-party-skills](docs/INSTALLATION.md#third-party-skills).

```bash
# Skills
npx skills add renatocaliari/cali-product-workflow -a opencode -g

# Config (add to ~/.config/opencode/opencode.json)
# "skills": { "paths": ["~/.config/opencode/skills"] }
```
</details>

<details>
<summary>Claude Code</summary>

```bash
# Plugin marketplace
claude plugin marketplace add https://github.com/renatocaliari/cali-product-workflow
claude plugin install cali-product-workflow@marketplace-name

# Skills
npx skills add renatocaliari/cali-product-workflow -a claude-code -g

# Remove
claude plugin uninstall cali-product-workflow
```
</details>

<details>
<summary>Codex</summary>

```bash
# Plugin marketplace
codex plugin marketplace add https://github.com/renatocaliari/cali-product-workflow
codex plugin add cali-product-workflow@marketplace-name

# Skills
npx skills add renatocaliari/cali-product-workflow -a codex -g

# Remove
codex plugin remove cali-product-workflow
```
</details>

### Updates

How each CLI stays current with the cali-product-workflow:

| CLI | Update mechanism | Auto? | What updates |
|-----|-----------------|-------|-------------|
| **Pi** | `pi update` or `pi update --extensions` | ✅ Manual (`pi update`) | Core package (git clone), supporting npm packages |
| **OpenCode** | `npx skills update` | ❌ Manual | Skills only |
| **Claude Code** | `claude plugin update name@marketplace` | ❌ Manual | Plugin + skills |
| **Codex** | `codex plugin marketplace upgrade` | ❌ Manual | Plugin + skills |

**Pi note:** Since the core package is installed via `git:` without a ref pin, `pi update` pulls the latest commit from the default branch. Supporting npm packages are also updated.

**Skills:** `npx skills update` checks GitHub for changes and reinstalls if needed. Run it occasionally to keep skills current across all CLIs.

**Pro tip:** Run `./install.sh update` — it runs `npx skills update` and verifies all skill directories are present.

### Why Git-Based (No npm)

This project distributes **exclusively via GitHub** — no npm publishing. This is a deliberate security choice:

| Risk | npm packages | Git-based (this project) |
|------|--------------|--------------------------|
| **Supply chain worms** (Shai-Hulud) | ❌ Worm self-propagates via stolen npm tokens | ✅ No npm token to steal |
| **`preinstall` code execution** | ❌ Scripts run automatically on install | ✅ Only markdown + assets copied |
| **Registry compromise** | ❌ Single centralized registry | ✅ GitHub distributed, auditable |
| **Account takeover blast radius** | ❌ npm token publishes many packages | ✅ Only your repo, no self-propagation |
| **Dependency confusion** | ❌ Possible if public name conflicts | ✅ Impossible — GitHub only source |
| **Maintainer compromise** | ⚠️ Attacker publishes malicious version | ⚠️ **Same risk** — attacker pushes malicious commit |
| **Third-party npm deps** (pi-subagents, etc.) | ⚠️ Subject to all npm risks above | ⚠️ **Same risk** — installed via npm regardless |

**Tradeoff:** Without npm, CLIs that rely on npm for JS plugins (e.g., OpenCode) are limited to skills. Deep integrations (hooks, TUI, slash commands) work only on Pi, which supports native Git install via `pi install git:...`.

**Bottom line:** Git-based distribution solves the risks we *control* (how we ship our code). Risks we *inherit* (maintainer compromise, third-party deps) are shared with all software — managed through defense in depth, not eliminated.

### Third-Party Dependency Management

Third-party npm dependencies exist **only for Pi**. OpenCode, Claude Code, and Codex use only skills (markdown files) — our code is never distributed via npm. (The `npx skills` CLI itself is an npm package, but it's a well-audited Vercel tool used to fetch markdown from GitHub — not our runtime.)

For protection against supply chain risks (for Pi's npm deps and general development), see [docs/SECURITY.md](docs/SECURITY.md).

Pi requires these npm packages for deep integration (slash commands, TUI, event hooks):

| Package | Purpose | Can use `git:`? |
|---------|---------|-----------------|
| `pi-subagents` | Parallel agent orchestration | ✅ `git:github.com/nicobailon/pi-subagents` |
| `@capyup/pi-goal` | Goal management with status overlay | ✅ `git:github.com/Michaelliv/pi-goal` |
| `pi-intercom` | Session coordination | ✅ `git:github.com/nicobailon/pi-intercom` |
| `pi-supervisor` | Conversation supervision | ✅ `git:github.com/tintinweb/pi-supervisor` |
| `pi-autoresearch` | Autonomous research | ✅ `git:github.com/davebcn87/pi-autoresearch` |
| `@juicesharp/rpiv-ask-user-question` | User prompts | ✅ `git:github.com/juicesharp/rpiv-mono` |
| `@plannotator/pi-extension` | Visual plan review | ✅ `git:github.com/backnotprop/plannotator` |

Switching from `npm:` to `git:` does not change the security profile — the code is identical. The effective mitigation is defense in depth, not replacing the registry channel.

**Our distribution model (GitHub, no self-publish) and our dependency model (npm for Pi packages) address different risk layers** — a distinction recognized by:

- **[OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)** — Open Web Application Security Project standard for identifying known vulnerabilities in dependencies
- **[NIST SSDF](https://csrc.nist.gov/Projects/ssdf)** — US National Institute of Standards and Technology's Secure Software Development Framework, which separates producer/distributor controls from consumer/dependency controls
- **[ENISA Supply Chain Guidance](https://www.enisa.europa.eu/publications/supply-chain-guidelines)** — European Union Agency for Cybersecurity guidelines distinguishing first-party distribution integrity from third-party dependency risk

**How we handle it today:**

| Practice | Status | Notes |
|----------|--------|-------|
| Regular `pi update` | ✅ Already documented | `pi update --extensions` keeps all packages current |
| Pi's built-in lockfile | ✅ Already happens | Pi runs `npm install` internally, which generates and respects lockfiles |

**On pinning:** Not recommended for actively maintained packages. A 2026 study ([Pinning Is Futile, arXiv 2502.06662](https://arxiv.org/abs/2502.06662)) found that pinning *increases* vulnerability exposure — pinned packages go stale because teams forget to update them. For packages with weekly releases (e.g., `pi-subagents` with 77 versions), **staying current via `pi update` is safer than pinning**.

**Skill-only mode (avoid npm entirely):** Set `INSTALL_SKILLS_ONLY=1` to skip all npm package installation:

```bash
INSTALL_SKILLS_ONLY=1 ./install.sh
```

This applies only to **Pi** — the other CLIs (OpenCode, Claude Code, Codex) already have zero npm dependencies. In this mode, Pi loses slash commands and TUI overlay, but the `cali-product-workflow` skill still works normally.

**For development dependencies (TypeScript, Vitest, Stryker):** We use `.npmrc` with `save-exact=true` to keep our own toolchain deterministic.

**Recommended for users:** See [docs/SECURITY.md](docs/SECURITY.md) for a guide on supply chain security tools (Socket.dev + Snyk) and how to set them up.

### Agent Instructions Setup

The installer **does not modify** your AGENTS.md/CLAUDE.md automatically. This is intentional:

- **Safety:** Auto-modifying agent instructions can break existing workflows. Your agent config is yours.
- **Idempotence:** No cleanup needed on uninstall — no traces left behind.
- **Awareness:** You should consciously review what instructions your agent follows.
- **Portability:** Different agents use different files (`AGENTS.md` vs `CLAUDE.md`). You decide what fits.

After installation, manually add this to your agent's instructions file:

````markdown
## cali-product-workflow Integration

When working on software projects, trigger the product workflow:

1. **Trigger:** Use `/skill cali-product-workflow`
3. **Execute:** Only after visual review gate (Plannotator approval)
````

| CLI | File |
|-----|------|
| **Pi** | `~/.pi/agent/AGENTS.md` |
| **OpenCode** | `~/.config/opencode/AGENTS.md` or project `AGENTS.md` |
| **Claude Code** | `~/.claude/CLAUDE.md` or project `CLAUDE.md` |
| **Codex** | `~/.codex/AGENTS.md` or project `AGENTS.md` |

---

---

## 📁 Artifact Directory

All workflow artifacts are stored in:

```
<project>/.pi/workflow/
```

| Subdirectory | Contents |
|--------------|----------|
| `input/` | User's original idea |
| `stages/` | Stage outputs (JTBD, Shape Up, Interface, etc.) |
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
| `/pw-start` or `/pw-begin` | Start the workflow |
| `/pw-menu` | Show workflow state and controls |
| `/pw-continue` | Continue to next phase |
| `/pw-help` | Show available commands |
| `/pw-status` | Display current phase and progress |
| `/pw-reset` | Reset workflow state |

### Phase Commands

| Command | Description |
|---------|-------------|
| `/pw-jtbd` | Run Job To Be Done phase |
| `/pw-shape` | Run Shape Up phase |
| `/pw-interface` | Run Interface phase |
| `/pw-critique` | Run Critique phase |
| `/pw-tech` | Run Tech Planning phase |

### Utility Commands

| Command | Description |
|---------|-------------|
| `/pw-export <phase>` | Export phase output |
| `/pw-import <file>` | Import saved workflow |
| `/pw-log` | Show workflow execution log |
| `/pw-review` | Open Plannotator for review |
| `/pw-scope <name>` | Create typed scope |
| `/pw-goals` | Manage execution goals |

---

## 🖥️ TUI Visual

The workflow includes a real-time TUI overlay showing:

- Current phase and progress
- Phase artifacts and outputs
- Upcoming tasks
- Quick actions

Toggle with `/pw-menu`.

---

## 📋 Skills (21)

All 21 skills are flat in `skills/` directory, ready for `~/.agents/skills/`. They're organized into 4 layers:

### 🎛️ Orchestrator (1)

| Skill | Purpose |
|-------|---------|
| `cali-product-workflow` | Coordinates the multi-stage workflow (Setup → Context → Shape → Critique → Gate → Scope → Interface → Int.Gate → Selection → Planning → Execution → Verification → Audit) |

### 🧠 Product Strategies (5)

| Skill | Purpose |
|-------|---------|
| `cali-product-job-to-be-done` | Job To Be Done — understand what job users hire the product to do |
| `cali-product-discovery` | Customer discovery and validation |
| `cali-product-opportunity-mapping` | Map opportunities to see where to focus |
| `cali-product-multi-method-market-analysis` | Multi-method market analysis |
| `cali-product-evolutionary-principles` | Evolutionary principles for sustainable development |

### ⚙️ Workflow Stages (7)

| Skill | Purpose |
|-------|---------|
| `cali-product-shape-up` | Shape Up planning — appetite, hill charts, rabbit holes, IN/OUT boundaries |
| `cali-product-interface-brainstorm` | Interface exploration in ASCII art |
| `cali-product-plan-critique` | Adversarial plan review with Plannotator gate |
| `cali-product-tech-planning` | Technical scope generation with dependency mapping |
| `cali-product-testing-ai-code` | AI-aware mutation testing strategy |
| `cali-product-testing-execution` | Post-implementation testing protocol |
| `cali-product-scope-executor` | Autonomous scope execution with dependency mapping |

### 📘 Product Tactics (8)

| Skill | Purpose |
|-------|---------|
| `cali-product-ads` | Advertising and growth channels |
| `cali-product-business-models` | Business model canvas and options |
| `cali-product-health` | Product health metrics |
| `cali-product-marketplace-playbook` | Marketplace dynamics |
| `cali-product-open-source` | Open source strategy |
| `cali-product-pricing` | Pricing strategy and tactics |
| `cali-product-promotions` | Promotions and campaigns |
| `cali-product-trust-building` | Trust-building mechanisms |

### Installation

```bash
# Via installer (recommended)
./install.sh

# Via npx (any CLI)
npx skills add renatocaliari/cali-product-workflow -g

# Via agent-sync (distribution to multiple CLIs)
pipx install agent-sync
agent-sync skills centralize
```
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
- [Issues](https://github.com/renatocaliari/cali-product-workflow/issues)
- [Discussions](https://github.com/renatocaliari/cali-product-workflow/discussions)