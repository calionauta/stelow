# @renatocaliari/pi-product-workflow

**Transform product ideas into approved, testable plans — systematically.**

This package brings Shape Up's betting table methodology to pi.dev. Instead of open-ended feature lists, you shape proposals with clear scope boundaries, validate them through adversarial critique, and generate typed technical scopes ready for autonomous execution. Includes 16 specialized product skills (JTBD, Opportunity Mapping, Product Discovery validation, pricing strategies, trust building, and more), a real-time TUI for workflow state, and AI-aware mutation testing strategy for software products.

---

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [🔧 Dependencies](#-dependencies)
- [📁 Artifact Directory](#-artifact-directory)
- [🔄 Workflow Flow](#-workflow-flow)
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


---



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


---



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
        ├── strategic/           # JTBD, opportunity, market analysis
        ├── approvals/           # *.receipt.md
        └── sessions/            # checkpoint.json
```

---


---




---

## 🔄 Workflow Flow

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
 │  2. Strategic Context (Optional) ─── parallel exploration ──┐
 │  ┌──────┐  ┌──────────┐  ┌──────────┐  ┌──────┐  ┌─────┐ │
 │  │ JTBD │─▶│Evolution │─▶│Opportun. │─▶│Market│─▶│Discovery│ │
 │  └──────┘  └──────────┘  └──────────┘  └──────┘  └─────┘ │
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

 ═════▶  Required flow
 ─────▶  Optional / Conditional (dotted line)
```

┌─────────────────────────────────────────────────────────────┐
│  🔍 Domain Libraries (auto-detected on triggers)           │
│     Pricing · Promotions · Ads · Trust · Business Models    │
│     Health · Marketplace · Open Source                      │
└─────────────────────────────────────────────────────────────┘

### Domain Libraries (Automatic Detection)

The LLM automatically detects domain signals in your request and suggests relevant playbooks.

**Triggers (auto-detected):**

| User says... | Suggests... |
|---|---|
| "pricing", "subscription", "how much to charge" | Pricing strategy |
| "launch", "promotion", "black friday", "coupon" | Promotions framework |
| "ads", "paid traffic", "facebook ads" | Advertising stages |
| "trust", "guarantee", "social proof" | Trust building |
| "business model", "revenue", "monetize" | Business models |
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


---



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


---



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


---



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
| **Job-to-Be-Done** | `/skill:cali-product-job-to-be-done` | JTBD framework |
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


---



---

## 📊 Version

**Current**: 0.2.2-alpha

**Latest Release:** [v0.2.2-alpha](https://github.com/renatocaliari/pi-product-workflow/releases/latest)

---


---



---

## License

MIT - Cali 2024