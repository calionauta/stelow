# @renatocaliari/pi-product-workflow

Complete product workflow package for pi.dev coding agent. Includes **19 specialized skills** (5 workflow + 5 strategic-analysis + 8 domain-libraries + 1 execution), a powerful **extension with workflow commands**, and real-time **TUI tracking**.

## Skills Overview

### Workflow Skills (Orchestrator + Subskills)
| Skill | Description |
|---|---|
| `cali-product-workflow` | **Orchestrator** - Coordinates all phases |
| `cali-shape-up` | Shape Up planning (standalone or via orchestrator) |
| `cali-interface-brainstorm` | Interface brainstorming (standalone or via orchestrator) |
| `cali-plan-critique` | Plan critique with audit checklists (standalone or via orchestrator) |
| `cali-tech-planning` | Tech planning and scope sequencing (standalone or via orchestrator) |

### Strategic Analysis Skills
| Skill | Description |
|---|---|
| `cali-product-short-cycle` | Short-cycle product learning method |
| `cali-product-opportunity-mapping` | Strategic opportunity mapping |
| `cali-product-job-to-be-done` | JTBD framework |
| `cali-evolutionary-principles` | Evolutionary product thinking |
| `cali-product-multi-method-market-analysis` | Multi-method market analysis (PESTLE, Wardley, etc.) |

### Domain Libraries
| Skill | Description |
|---|---|
| `cali-product-ads` | Advertising strategies (Transtheoretical Model) |
| `cali-product-business-models` | Business model creativity |
| `cali-product-health` | Product health monitoring |
| `cali-product-marketplace-playbook` | Marketplace stimulation |
| `cali-product-open-source` | Open source strategy |
| `cali-product-pricing` | Pricing strategies |
| `cali-product-promotions` | Launch promotions (MAGIC framework) |
| `cali-product-trust-building` | Trust building mechanisms |

### Execution Skills
| Skill | Description |
|---|---|
| `cali-product-scope-executor` | Autonomous scope execution |

---

---

## 🚀 Quick Start

```bash
# Start a new workflow
/product-workflow-start

# With file references and draft text
/product-workflow-start @brief.md "additional context"

/product-workflow-start @spec.md @requirements.md "OAuth login flow"

# Run the skill
/skill:cali-product-workflow
```

---

## 🎮 Commands

All commands use the `/product-workflow-` prefix. Short `/pw:` aliases also work:

| Command | Description | Alias |
|---------|-------------|-------|
| `/product-workflow-start` | Start workflow. Parses `@filename` and text as draft. | `/pw:start` |
| `/product-workflow-stop` | **Stop** and clear UI immediately. | `/pw:stop` |
| `/product-workflow-pause` | Pause (keeps state). | `/pw:pause` |
| `/product-workflow-start` | Start workflow. Parses `@filename` and text as draft. | `/pw:start` |

| Skill advances phase | **Updates** footer | `auth-system │ ◆ Interface 3/7 │ 5 proposals` |
| `/product-workflow-pause` | Footer changes to PAUSED | `⏸ auth-system` |
| `/product-workflow-resume` | Footer returns to normal | `auth-system │ ◆ Shape 3/7 │ ...` |
| `/product-workflow-stop` | **Removes** footer | Cleared |
| `/product-workflow-complete` | **Removes** footer | Cleared |
| Auto-rename (pós-Clarify) | Slug updates in-place | `untitled-1 → auth-system` |
| Phase transition | **Toast notification** | `◆ auth-system — entered Interface (3/7)` |

### TUI Visual

**Active Workflow (compact footer):**
```
│ auth-system  │  ◆ Shape 3/7  │  2 assumptions  │  /pw:menu for details
└─────────────────────────────────────────────────────────────────────
```

**Active Workflow (with artifacts):**
```
│ auth-system  │  ◆ Interface 3/7  │  5 proposals · hybrid:C  │  /pw:menu
└─────────────────────────────────────────────────────────────────────────
```

**Paused:**
```
│ ⏸ auth-system                                       │  ← Footer (warning)
└─────────────────────────────────────────────────────────────────────
```

### Interactive Overlay

Use `/pw:menu` or `/product-workflow-menu` to open the **interactive overlay** —
a focused dialog with the complete phase list, navigation, and quick actions.

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

### How Updates Work

The skill writes to `cali-product-workflow.json` when it advances phases. The extension watches for these changes:

1. **Skill advances phase** → writes to tracking file
2. **Extension detects change** (via `tool_call` and `turn_end` events)
3. **TUI updates** automatically — no command needed from user

### TUI Element Names

All TUI elements use clear, user-facing names:

| Element | Label | Purpose |
|---------|-------|---------|
| Footer status | `▶ {name} [{stage}]` | Current workflow + stage |
| Widget | `▶ Workflow:` | Shows full workflow info |
| Notification | `▶ Workflow: {name} — Phase {n}: {stage}` | Phase transitions |

---

## 📋 Skills (15)

### Core Planning Skills (7)

| Skill | Invocation | What it Does |
|-------|-----------|--------------|
| **Product Workflow** | `/skill:cali-product-workflow` | Main orchestrator: Shape Up → Interface → Critique → Gate → Planning → Execution |
| **Short Cycle** | `/skill:cali-product-short-cycle` | Rapid validation: experiments, metrics, pre-sales, MVP |
| **Opportunity Mapping** | `/skill:cali-product-opportunity-mapping` | Strategic opportunity analysis |
| **Job-to-Be-Done** | `/skill:cali-product-job-to-be-done` | JTBD framework for needs discovery |
| **Evolutionary Principles** | `/skill:cali-product-evolutionary-principles` | Stepping-stones, product evolution |
| **Multi-Method Market** | `/skill:cali-product-multi-method-market-analysis` | PESTLE, Wardley Maps, Delphi, Foresight |
| **Scope Executor** | `/skill:cali-product-scope-executor` | Execute approved scopes autonomously |

### Growth & Marketing Skills (8)

| Skill | Invocation | What it Does |
|-------|-----------|--------------|
| **Ads** | `/skill:cali-product-ads` | Transtheoretical Model advertising |
| **Business Models** | `/skill:cali-product-business-models` | Business model creativity |
| **Health** | `/skill:cali-product-health` | Product health monitoring |
| **Marketplace Playbook** | `/skill:cali-product-marketplace-playbook` | Supply/demand balance tactics |
| **Open Source** | `/skill:cali-product-open-source` | Open source strategy |
| **Pricing** | `/skill:cali-product-pricing` | Pricing strategies |
| **Promotions** | `/skill:cali-product-promotions` | MAGIC launch promotions |
| **Trust Building** | `/skill:cali-product-trust-building` | Trust mechanisms |

---

## 🔧 Dependencies

| Extension | Package | Purpose |
|-----------|---------|---------|
| **pi-subagents** | `pi-subagents` | Parallel execution, built-in agents |
| **pi-goal** | `@capyup/pi-goal` | `/goal`, `/sisyphus` modes |
| **plannotator** | `@plannotator/pi-extension` | Plan review with `--gate` |
| **autoresearch** | `pi-autoresearch` | Optimization experiments |
| **ask-user-question** | `@juicesharp/rpiv-ask-user-question` | Structured questions |
| **intercom** | `pi-intercom` | Session messaging |
| **supervisor** | `pi-supervisor` | Outcome steering |

---

## 📦 Installation

```bash
# From local path
pi install ~/Development/pi-product-workflow

# From npm (after publishing)
pi install npm:@renatocaliari/pi-product-workflow

# Copy AGENTS.md for automatic triggering
cp ~/Development/pi-product-workflow/AGENTS.md ~/.pi/agent/AGENTS.md
```

---

## 📁 Tracking & Artifact Files

| File / Directory | Location | Purpose |
|-----------------|----------|---------|
| `.cali-product-workflow/` | Project root | Plan artifacts (specs, interfaces, critiques, receipts, checkpoints) |
| `cali-product-workflow.json` | Project root | Local workflow state |
| `.cali-product-workflow-global.json` | Home directory | Cross-project workflow tracking |

### Artifact Directory Layout

```
.cali-product-workflow/
└── {YYYY-MM-DD}/
    └── {_dir}/          # Stable hash-based directory (never changes on rename)
        ├── index.json            # Auto-discovery metadata
        ├── specs/                # Shape Up output
        │   └── spec-product_v{N}.md
        ├── interfaces/           # Interface proposals
        │   └── interfaces_v{N}.md
        ├── plans/                # Tech plans + scopes
        │   ├── spec-tech_v{N}.md
        │   └── scopes/
        ├── critiques/            # Plan critique reports
        │   └── critique-report_v{N}.md
        ├── strategic/            # Strategic analysis outputs (Phase 2a)
        │   ├── jtbd-analysis.md
        │   ├── evolutionary-analysis.md
        │   ├── opportunity-map.md
        │   ├── market-analysis.md
        │   ├── short-cycle-analysis.md
        │   └── strategic-insights.md
        ├── approvals/            # Review gate receipts
        │   └── *.receipt.md
        └── sessions/             # Resume checkpoints
            └── {session-id}/
                └── checkpoint.json
```

---

## 📊 Version

**Current**: 0.1.0-alpha

---

## License

MIT - Cali 2024