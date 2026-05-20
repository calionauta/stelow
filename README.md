# @renatocaliari/pi-product-workflow

**Transform product ideas into approved, testable plans — systematically.**

This package brings [Shape Up](https://basecamp.com/shapeup) methodology to AI coding agents. Instead of open-ended feature lists, you shape proposals with clear scope boundaries, validate them through adversarial critique, and generate typed technical scopes ready for autonomous execution.

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

**[Renato Caliari](https://www.linkedin.com/in/calirenato82/)** — Product specialist with hands-on experience:

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
- Typed scopes for autonomous execution (feature, spike, test-*, optimize)## How We Differ

This workflow focuses on **product planning** rather than pure code generation. Here's how it compares:

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

**vs. BMAD Method (45K ⭐) and Superpowers (180K ⭐):**

Both frameworks enforce structure for general software engineering. Here's what differentiates this workflow:

| Aspect | BMAD Method | Superpowers | pi-product-workflow |
|--------|-------------|--------------|---------------------|
| **Focus** | Enterprise team simulation with 12+ agent personas | TDD-first engineering methodology | Product planning + domain-specific knowledge |
| **Scope Definition** | General user stories | Implementation plans | Shape Up with IN/OUT boundaries |
| **Domain Knowledge** | Generic workflows | Code patterns | Job To Be Done, Pricing, Trust, Ads, Open Source, etc. |
| **Review** | Manual or configured | Subagent quality check | Plannotator visual gate with point-by-point comments |
| **Interface** | PRD, diagrams | Plan documents | ASCII art exploration + LLM hybrid creation |
| **Testing** | Depends on setup | TDD with subagents | AI-aware mutation with coverage targets |

**Key differentiators:**

- **Product domain libraries** (8 domains) auto-detected from your language — not generic engineering
- **Visual review gate** — Plannotator opens the full plan in a visual interface for comments, not just chat
- **Interface exploration** — 5 approaches in ASCII art, then LLM creates hybrid combining best points for the context
- **Shape Up methodology** — IN/OUT scope boundaries, betting table concepts, aphorisms
- **Typed technical scopes** — feature, spike, optimize, test-* with dependency mapping and sequencing
- **Real-time TUI tracking** — see workflow state as it progresses

*"Measure thrice, cut once"* — applies to product decisions, not just code.

---

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [🔧 Dependencies](#-dependencies)
- [📁 Artifact Directory](#-artifact-directory)
- [🔄 Process](#-process)
- [🎮 Commands](#-commands)
- [🖥️ TUI Visual](#️-tui-visual)
- [🧪 Testing Strategy](#-testing-strategy-software-products-only)
- [📋 Skills](#-skills-16)
- [📊 Version](#-version)
- [License](#license)

---








## 🚀 Quick Start

---








## 📦 Installation

### Quick Setup (Recommended)

```bash
# 1. Install pi (if not already)
npm install -g @mariozechner/pi-coding-agent

# 2. Clone this repo
git clone git@github.com:renatocaliari/pi-product-workflow.git ~/pi-product-workflow

# 3. Run setup (installs dependencies + this package)
cd ~/pi-product-workflow && ./scripts/setup.sh
```

### Manual Installation

```bash
# Install dependencies first
pi install npm:pi-subagents npm:pi-goal npm:pi-intercom npm:pi-supervisor \\
  npm:pi-autoresearch npm:@juicesharp/rpiv-ask-user-question \\
  npm:@plannotator/pi-extension

# Then install this package
pi install ~/Development/pi-product-workflow
```

### Auto-Trigger (Optional)

By default, the workflow is NOT auto-triggered in all projects. See [docs/ABOUT-AUTO-TRIGGER.md](docs/ABOUT-AUTO-TRIGGER.md) for the reasoning.

**To enable auto-trigger:**
```bash
cp ~/pi-product-workflow/AGENTS.md ~/.pi/agent/AGENTS.md
```

**To disable:**
```bash
rm ~/.pi/agent/AGENTS.md
# Or use: ./scripts/uninstall.sh
```

### Uninstallation

```bash
cd ~/pi-product-workflow && ./scripts/uninstall.sh
```

This removes the package and cleans up `~/.pi/agent/AGENTS.md`.

### Verify

```bash
pi list
# Should show: @renatocaliari/pi-product-workflow + dependencies
```

### Quick Test (without installing)

```bash
pi -e npm:@renatocaliari/pi-product-workflow
```

---













## 🔧 Dependencies

| Extension | Package | Purpose |
|-----------|---------|---------|
| **pi-subagents** | `pi-subagents` | Parallel execution |
| **pi-goal** | `@capyup/pi-goal` | `/goal`, `/sisyphus` modes |
| **plannotator** | `@plannotator/pi-extension` | Plan review with `--gate` |
| **autoresearch** | `pi-autoresearch` | Optimization experiments |
| **ask-user-question** | `@juicesharp/rpiv-ask-user-question` | Structured questions |
| **intercom** | `pi-intercom` | Session messaging |
| **supervisor** | `pi-supervisor` | Outcome steering |

---













## 📁 Artifact Directory

```
.cali-product-workflow/
└── {YYYY-MM-DD}/
    └── {_dir}/          # Hash-based, stable on rename
        ├── index.json
        ├── specs/               # spec-product.md
        ├── interfaces/          # interfaces.md
        ├── plans/               # spec-tech.md, testing-strategy.md
        ├── critiques/          # critique-report.md
        ├── strategic/           # Job To Be Done, opportunity, market analysis
        ├── approvals/           # *.receipt.md
        └── sessions/            # checkpoint.json
```

---














## 🔄 Process

```

╔══════════════════════════════════════════════════════════════════╗
║                    PRODUCT WORKFLOW                            ║
╚══════════════════════════════════════════════════════════════════╝

 ┌─────────────────────────────────────────────────────────────┐
 │  1. Setup                                                   │
 │     Initialize project context & scope                       │
 └──────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  2. Strategic Context (Optional) — parallel exploration —┐
 │  ┌──────┐  ┌──────────┐  ┌──────────┐  ┌──────┐  ┌────────┐ │
 │  │ JTBD  │─▶│Evolution│─▶│Opportun.│─▶│Market│─▶│Discover│ │
 │  └──────┘  └──────────┘  └──────────┘  └──────┘  └────────┘ │
 │                      Explore before betting                 │
 └──────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  3. Proposal (Shape Up)                                                │
 │     Define: problem → solution → scope → rabbit holes       │
 └──────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  4. Plan Critique     ◀── Adversarial review               │
 │     Gaps · Risks · Assumptions · Scope boundaries           │
 └──────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  5. Gate ──── Plannotator approval ──── Approve or Reject  │
 └──────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
              ┌─────────┴─────────┐
              │                   │
              │     Interface?    │
              │    (optional)      │
              ▼                   ▼
     ┌────────────────┐   ┌─────────────────────────┐
     │  skip to #10    │   │  6-9. Brainstorm → Gate │
     └────────┬───────┘   └───────────┬───────────────┘
              │                       │
              └───────────┬───────────┘
                          │
                          ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  10. Tech Planning                                          │
 │     Typed scopes: feature · spike · test-* · optimize       │
 └──────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
     ┌────────────────┐   ┌─────────────────────────┐
     │   Software       │   │   Other Product         │
     │   Products       │   │   (skip testing)        │
     │  ┌───────────┐  │   └───────────────────────┘
     │  │ cali-     │  │
     │  │ testing-  │  │
     │  │ ai-code   │  │
     │  └───────────┘  │
     └────────┬───────┘
              │
              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  11. Execution ─── Autonomous via /goal                     │
 └─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🔍 Domain Libraries (auto-detected on triggers)           │
│     Pricing · Promotions · Ads · Trust · Business Models    │
│     Health · Marketplace · Open Source                      │
└─────────────────────────────────────────────────────────────┘
```

### Domain Libraries (Automatic Detection)

Each domain has its own dedicated skill. The LLM automatically detects signals in your request and suggests relevant playbooks.

**Available Skills:**
- `/skill:cali-product-pricing` — Pricing strategies
- `/skill:cali-product-promotions` — Launch framework
- `/skill:cali-product-ads` — Advertising stages
- `/skill:cali-product-trust-building` — Trust mechanisms
- `/skill:cali-product-business-models` — Revenue models
- `/skill:cali-product-marketplace-playbook` — Supply/demand
- `/skill:cali-product-health` — Product signals
- `/skill:cali-product-open-source` — OSS strategy

**Triggers (auto-detected):**

| User says... | Suggests... |
|---|---|
| "pricing", "subscription", "how much to charge" | Pricing strategy |
| "launch", "promotion", "black friday", "coupon" | Promotions framework |
| "ads", "paid traffic", "facebook ads" | Advertising stages |
| "trust", "guarantee", "social proof" | Trust building |
| "business model", "revenue", "monetize" | Business models |
| "open source", "community edition" | Open source strategy |
| "product health", "wellbeing", "ethics" | Product health |
| "marketplace", "supply/demand" | Marketplace tactics |

**Usage:** Invoke via `/skill:cali-product-{name}` when relevant during planning/execution.

```
┌──────────────────────────────────────────────────────────────┐
│  DOMAIN LIBRARIES (auto-detected on user input)              │
│                                                              │
│  ┌──────────┐ ┌───────────────┐ ┌─────────┐ ┌────────────┐   │
│  │   Ads    │ │Business Models│ │ Pricing │ │ Promotions │   │
│  └──────────┘ └───────────────┘ └─────────┘ └────────────┘   │
│  ┌──────────┐ ┌───────────────┐ ┌─────────┐ ┌────────────┐   │
│  │  Health  │ │  Marketplace  │ │Open Src │ │Trust Build │   │
│  └──────────┘ └───────────────┘ └─────────┘ └────────────┘   │
└──────────────────────────────────────────────────────────────┘
```




---








## 🎮 Commands

All commands use the `/product-workflow-` prefix. Short `/pw:` aliases work too.

### Navigation

| Command | Alias | Description |
|---------|-------|-------------|
| `/product-workflow-start` | `/pw:start` | Start workflow with optional `@files` and text |
| `/product-workflow-stop` | `/pw:stop` | Stop workflow, clear UI immediately |
| `/product-workflow-pause` | `/pw:pause` | Pause workflow, keeps state |
| `/product-workflow-resume` | `/pw:resume` | Resume paused workflow |
| `/product-workflow-complete` | `/pw:complete` | Mark workflow complete, clear UI |
| `/product-workflow-menu` | `/pw:menu` | Open interactive overlay with phase list |

### Visual Feedback

| Action | Result |
|--------|--------|
| Start | Footer shows `│ {name} │ ◆ {phase} {n}/7 │` |
| Pause | Footer shows `│ ⏸ {name} │` (warning color) |
| Resume | Footer returns to normal |
| Stop/Complete | Footer cleared |
| Phase advance | Toast: `◆ {name} — entered {phase} ({n}/7)` |

---













## 🖥️ TUI Visual

**Active Workflow:**
```
│ auth-system  │  ◆ Shape 3/7  │  2 assumptions  │  /pw:menu for details
└─────────────────────────────────────────────────────────────────────
```

**Active with Artifacts:**
```
│ auth-system  │  ◆ Interface 3/7  │  5 proposals · hybrid:C  │  /pw:menu
└─────────────────────────────────────────────────────────────────────────
```

**Paused:**
```
│ ⏸ auth-system                                       │  ← Warning color
└─────────────────────────────────────────────────────────────────────
```

### Interactive Overlay (`/pw:menu`)

```
╔═══════════════════════════════════╗
║  ◆ auth-system                    ║
║                                   ║
║  ✓ Clarify                       ║
║  ◆ Shape   ← current             ║
║  ○ Interface                     ║
║  ○ Critique                      ║
║  ○ Gate                          ║
║  ○ Planning                      ║
║  ○ Execution                     ║
║                                   ║
║  ↑↓ navigate  n:next  s:stop     ║
╚═══════════════════════════════════╝
```

---













## 📋 Skills (16)

### Orchestrator
| Skill | Command | Description |
|-------|---------|-------------|
| **Product Workflow** | `/skill:cali-product-workflow` | Main orchestrator (11 phases) |

### Planning
| Skill | Command | Description |
|-------|---------|-------------|
| **Shape Up** | `/skill:cali-shape-up` | Shape proposals (problem/solution/scope) |
| **Interface Brainstorm** | `/skill:cali-interface-brainstorm` | 5 interface archetypes |
| **Plan Critique** | `/skill:cali-plan-critique` | Audit checklists |
| **Tech Planning** | `/skill:cali-tech-planning` | Scope sequencing |

### Strategic Analysis
| Skill | Command | Description |
|-------|---------|-------------|
| **Product Discovery** | `/skill:cali-product-short-cycle` | Rapid validation method |
| **Opportunity Mapping** | `/skill:cali-product-opportunity-mapping` | Strategic opportunities |
| **Job-to-Be-Done** | `/skill:cali-product-job-to-be-done` | Job To Be Done framework |
| **Evolutionary Principles** | `/skill:cali-evolutionary-principles` | Product evolution |
| **Multi-Method Market** | `/skill:cali-product-multi-method-market-analysis` | PESTLE, Wardley, Foresight |

### Domain Libraries
| Skill | Command | Description |
|-------|---------|-------------|
| **Ads** | `/skill:cali-product-ads` | Transtheoretical advertising |
| **Business Models** | `/skill:cali-product-business-models` | Business model creativity |
| **Health** | `/skill:cali-product-health` | Product health monitoring |
| **Marketplace** | `/skill:cali-product-marketplace-playbook` | Supply/demand balance |
| **Open Source** | `/skill:cali-product-open-source` | Open source strategy |
| **Pricing** | `/skill:cali-product-pricing` | Pricing strategies |
| **Promotions** | `/skill:cali-product-promotions` | MAGIC launch framework |
| **Trust Building** | `/skill:cali-product-trust-building` | Trust mechanisms |

### Execution
| Skill | Command | Description |
|-------|---------|-------------|
| **Scope Executor** | `/skill:cali-product-scope-executor` | Autonomous scope execution |
| **Testing AI Code** | `/skill:cali-testing-ai-code` | AI-aware testing strategy |

---













## 🧪 Testing Strategy (Software Products Only)

When `product_type: software` or `product_type: hybrid`, the workflow auto-activates `cali-testing-ai-code` skill.

### Greenfield (New Code)

| Test Type | Use Case | TDD? |
|-----------|----------|------|
| `test-unit` | Business logic, critical paths | ✅ Yes |
| `test-integration` | DB, APIs, queues | No |
| `test-security` | Auth, payment, data | No |
| `test-behavior` | AI agents, multi-step flows | No |

### Brownfield (Existing Code)

| Test Type | Use Case |
|-----------|----------|
| `test-regression` | Protect existing functionality |
| `test-characterization` | Document current behavior (golden tests) |
| `test-simulation` | Replay past successful tasks |
| `test-impact` | TDAD-style dependency analysis |

### Mutation Targets

| Path Type | Target | Minimum |
|-----------|--------|---------|
| Critical | 70% | 60% |
| Standard | 50% | 40% |
| Experimental | 30% | 20% |

### CI/CD Gates

```yaml
mutation_score: < target → BLOCK
security_findings: > 0 on critical → BLOCK
flaky_rate: > 5% → WARN
```

---













## 📊 Version

**Current**: 0.2.2-alpha

**Latest Release:** [v0.2.2-alpha](https://github.com/renatocaliari/pi-product-workflow/releases/latest)

---













## License

MIT - Cali 2024