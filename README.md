# @renatocaliari/pi-product-workflow

Complete product workflow package for pi.dev coding agent. Includes **15 specialized skills**, a powerful **extension with workflow commands**, and real-time **UI tracking**.

---

## 🚀 Quick Start

```bash
# Start a new workflow (auto-generates slug)
/product-workflow-start

# With file references and draft text
/product-workflow-start @brief.md "additional context here"

/product-workflow-start @spec.md @requirements.md "OAuth login flow"

# See status
/product-workflow-status

# Advance through phases
/product-workflow-next

# Emergency stop!
/product-workflow-stop
```

---

## 🎮 Workflow Commands

All commands use the `/product-workflow-` prefix.

### Core Commands

| Command | Description |
|---------|-------------|
| `/product-workflow-start` | Start new workflow. Auto-generates slug. Parses `@filename` as source and text as draft. |
| `/product-workflow-stop` | **Emergency stop!** Clears UI and aborts workflow immediately. |
| `/product-workflow-pause` | Pause workflow (keeps state for later). |
| `/product-workflow-resume` | Resume paused workflow. Optional: `slug=myslug` |
| `/product-workflow-status` | Show current workflow with progress bar and details. |
| `/product-workflow-list` | List all workflows (project + global). |
| `/product-workflow-setphase phase=N` | Set phase (0-5). See phases below. |
| `/product-workflow-next` | Advance to next phase. |
| `/product-workflow-complete` | Mark workflow as completed. |
| `/product-workflow-goto` | Show how to navigate to a workflow in another project. |

### Input Parsing

The `start` command intelligently parses your input:

```
/product-workflow-start                       → Random slug
/product-workflow-start @brief.md             → Slug from filename, file as source
/product-workflow-start Login flow            → Slug: "login-flow", text as draft
/product-workflow-start @spec.md "OAuth"       → Both file and draft text
/product-workflow-start @doc1.md @doc2.md      → Multiple source files
/product-workflow-start slug=custom-name      → Explicit slug (overrides auto)
```

### Smart Slug Generation

| Input | Generated Slug |
|-------|---------------|
| `@auth-brief.md` | `auth-brief` |
| `login with OAuth` | `login-with-oauth` |
| `build payment system` | `build-payment-system` |
| (nothing) | `workflow-20260615-a3b2` |

---

## 📊 Workflow Phases

The workflow follows 6 phases (inspired by Shape Up):

| # | Phase | Description |
|---|-------|-------------|
| 0 | **Clarify** | Understand the problem, gather requirements, define scope |
| 1 | **Shape** | Create rough solution sketch, evaluate appetite, identify Rabbit Holes |
| 2 | **Bet** | Commit to a scope, prepare for execution, stakeholder alignment |
| 3 | **Build** | Implement the solution, iterate based on feedback |
| 4 | **Critique** | Review and validate the implementation |
| 5 | **Gate** | Final approval, merge, deployment |

### Phase Progression

```
Clarify → Shape → Bet → Build → Critique → Gate
   ○        ○      ○      ○        ○        ○   (not started)
   ●        ▶      ○      ○        ○        ○   (Clarify in progress)
   ●        ●      ●      ▶        ○        ○   (Build in progress)
   ●        ●      ●      ●        ●        ●   (completed)
```

---

## 🖥️ UI Features

When a workflow is active, the extension shows:

### Footer Status
```
📍 auth-system [Shape 2/6] 33%
```

### Progress Widget (above editor)
```
🚀 auth-system
[████████░░░░░░░░░░░░] 33% — Shape
● Clarify ▶ Shape ○ Bet ○ Build ○ Critique ○ Gate
```

### Notifications
- Phase transitions: `📍 Phase 2: Shape`
- Session resume: `📍 Resumed: auth-system (Phase 2: Shape)`
- Workflow found: `📍 Found workflow: my-feature`

---

## 🌐 Cross-Project State

Workflows are tracked in two places:
1. **Local**: `{project}/cali-product-workflow.json` — per-project workflows
2. **Global**: `~/.cali-product-workflow-global.json` — all workflows

### State Persistence

| Scenario | Behavior |
|----------|----------|
| Session restart | UI restored from tracking file |
| Different project folder | No active workflow (unless from global) |
| `/product-workflow-list` | Shows workflows from all projects |
| `/product-workflow-goto` | Shows navigation instructions |

---

## 📋 Skills (15)

### Core Planning Skills (7)

| Skill | Invocation | What it Does |
|-------|-----------|--------------|
| **Product Workflow** | `/skill:cali-product-workflow` | Main workflow orchestrator: Shape Up + Interface Design + Tech Planning + Plan Critique + Plannotator Gate |
| **Short Cycle** | `/skill:cali-product-short-cycle` | Rapid validation method: experiments, metrics, pre-sales, MVP, customer discovery, pricing strategies |
| **Opportunity Mapping** | `/skill:cali-product-opportunity-mapping` | Strategic opportunity analysis with ranked solutions for any business problem |
| **Job-to-Be-Done** | `/skill:cali-product-job-to-be-done` | JTBD framework: contextual segmentation, thinking styles (Indi Young), job maps, desired outcomes |
| **Evolutionary Principles** | `/skill:cali-product-evolutionary-principles` | Stepping-stones theory, novelty search, adaptive product ecosystems |
| **Multi-Method Market Analysis** | `/skill:cali-product-multi-method-market-analysis` | Deep market research: PESTLE, Wardley Maps, Foresight, Delphi method |
| **Scope Executor** | `/skill:cali-product-scope-executor` | Autonomous execution of approved scopes with overnight capabilities |

### Growth & Marketing Skills (8)

| Skill | Invocation | What it Does |
|-------|-----------|--------------|
| **Ads** | `/skill:cali-product-ads` | Advertising strategies based on Transtheoretical Model of Change (5 stages of awareness) |
| **Business Models** | `/skill:cali-product-business-models` | Business model creativity for reducing costs and generating revenue |
| **Health** | `/skill:cali-product-health` | Product health monitoring through signals in tension (effectiveness vs well-being) |
| **Marketplace Playbook** | `/skill:cali-product-marketplace-playbook` | Marketplace stimulation tactics: supply/demand balance, 19 proven strategies |
| **Open Source** | `/skill:cali-product-open-source` | Open source strategy paradox: delivering value by giving up control |
| **Pricing** | `/skill:cali-product-pricing` | Pricing strategies: exchange bases, consumption control, interest alignment |
| **Promotions** | `/skill:cali-product-promotions` | MAGIC framework launch promotions: Loss Leader, Gift Card Sale, Limited Package, Irresistible Freebie |
| **Trust Building** | `/skill:cali-product-trust-building` | Trust mechanisms: 10 pillars, guarantee types, strategic approaches |

---

## 🔧 Dependencies & Integration

This package integrates with other pi.dev extensions for full orchestration:

| Extension | Package | Author | Purpose |
|-----------|---------|--------|---------|
| **pi-subagents** | `pi-subagents` | nicobailon | Parallel subagent execution, chain workflows, built-in agents (scout, reviewer, planner, worker) |
| **pi-goal** | `@capyup/pi-goal` | capyup | Goal mode: `/goal`, `/sisyphus`, `/goals-set` for long-running work |
| **plannotator** | `@plannotator/pi-extension` | backnotprop | Plan review with visual annotations (`--gate` flag for approval gates) |
| **autoresearch** | `pi-autoresearch` | davebcn87 | Autonomous experiment loop for optimization |
| **ask-user-question** | `@juicesharp/rpiv-ask-user-question` | juicesharp | Structured user questions with 2-4 options |
| **intercom** | `pi-intercom` | nicobailon | Session-to-session messaging and coordination |
| **supervisor** | `pi-supervisor` | tintinweb | Chat steering toward specific outcomes |

### Recommended Setup

```bash
# Install main package
pi install ~/Development/pi-product-workflow

# Install all dependencies
pi install npm:pi-subagents npm:@capyup/pi-goal @plannotator/pi-extension pi-autoresearch @juicesharp/rpiv-ask-user-question pi-intercom pi-supervisor
```

---

## 📁 Directory Structure

```
product-workflow/
└── {YYYY-MM-DD}/
    └── {slug}/
        ├── index.json                  # Workflow metadata
        ├── specs/                      # Shape Up output
        ├── interfaces/                 # Interface proposals
        ├── plans/                      # Tech plans
        ├── critiques/                  # Plan critiques
        ├── approvals/                  # Plannotator receipts
        └── sessions/                   # Session checkpoints
```

### Tracking Files

| File | Location | Purpose |
|------|----------|---------|
| `cali-product-workflow.json` | Project root | Local workflow state |
| `.cali-product-workflow-global.json` | Home directory | Cross-project workflows |

---

## 🔌 Extension Details

The extension (`extensions/cali-product-workflow/`) hooks into:

| Event | What it does |
|-------|--------------|
| `input` | Parse `@filename` refs and draft text for `/product-workflow-start` |
| `session_start` | Create directories, restore UI, register commands |
| `turn_end` | Check for phase changes, update UI |
| `agent_end` | Final UI update |

### Hot Reload

Commands are registered on session start. Use `/reload` to pick up changes without restarting pi.

---

## 📦 Installation

```bash
# From local path
pi install ~/Development/pi-product-workflow

# From npm (after publishing)
pi install npm:@renatocaliari/pi-product-workflow

# Copy AGENTS.md for automatic triggering (recommended)
cp ~/Development/pi-product-workflow/AGENTS.md ~/.pi/agent/AGENTS.md
```

---

## 📊 Version

**Current**: 0.1.0-alpha

---

## License

MIT - Cali 2024

---

## Examples

### Start from a document
```bash
/product-workflow-start @ PRD.md "We also need SSO support"
```

### Check status
```bash
/product-workflow-status
```
Output:
```
📋 Workflow: auth-system
Progress: [████░░░░░░░░░░░░] 17%
Phase: 1/6 — Clarify

Phases:
  ▶ 🔄 1. Clarify
    ⬜ 2. Shape
    ⬜ 3. Bet
    ⬜ 4. Build
    ⬜ 5. Critique
    ⬜ 6. Gate
```

### Navigate between projects
```bash
# List all workflows
/product-workflow-list
```
Output:
```
📁 Current Project:
  🔄 auth-system [in-progress] — Phase 2: Shape

🌐 Global (other projects):
  🔄 billing-api [in-progress] — Phase 4: Build
     Project: /Users/cali/projects/billing-api
```

### Jump to another project
```bash
/product-workflow-goto slug=billing-api
```
Output:
```
📍 Workflow: billing-api
Project: /Users/cali/projects/billing-api
Phase: Build

To continue this workflow:
  1. Navigate: cd /Users/cali/projects/billing-api
  2. Resume: /product-workflow-resume slug=billing-api

Or the LLM will auto-detect it when you open that project.
```