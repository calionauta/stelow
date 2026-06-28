<p align="center">
  <img src="./logo.svg" alt="Stelow logo" width="400">
</p>

# stelow · opinionated agentic product workflow

[![CI](https://github.com/renatocaliari/stelow/actions/workflows/ci.yml/badge.svg)](https://github.com/renatocaliari/stelow/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-70%25-brightgreen)](https://github.com/renatocaliari/stelow/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/release/renatocaliari/stelow?logo=github&label=release)](https://github.com/renatocaliari/stelow/releases)
[![Pi](https://img.shields.io/badge/Deep%20integration-Pi-8B5CF6)](https://pi.dev)
[![Muxy](https://img.shields.io/badge/Webview%20panel-Muxy.app-10B981)](https://muxy.app)
[![Herdr](https://img.shields.io/badge/Split%20pane%20TUI-Herdr-EA580C)](https://herdr.dev)
[![CLI](https://img.shields.io/badge/Works%20on-Any%20CLI-3B82F6)](https://github.com/renatocaliari/stelow#cli-compatibility)

**Transform product ideas into approved, testable plans - systematically.**

This package brings [Shape Up](https://basecamp.com/shapeup) methodology to AI coding agents. Instead of open-ended feature lists, you shape proposals with clear scope boundaries, validate them through adversarial critique, and generate typed technical scopes ready for autonomous execution.

> **Built by a former product manager and developer, for AI agents and humans.** I've led product teams, taught product leadership, advised product strategy, and written code across the full stack. stelow is that experience, systematized — no conference-room theory, no abstract architecture. Lessons from live products, shipped features, real teams, and real codebases. [More about my background.](#about-the-author)

---

> 🎯 *"Measure thrice, cut once"* - applies to product decisions, not just code.

**Key differentiators:**

- **Shape Up methodology for AI agents** - IN/OUT scope boundaries, appetite-driven sizing, risk analysis, focused scoping. Every proposal is a shaped bet, not a wishlist.
- **Appetite × Review Mode stage control** - Two orthogonal dimensions control the full workflow: how deep to prepare (Appetite: Lean / Core / Complete) and which gates run (Review Mode: Auto / Only Product Spec / Product Spec + Interface Choice / All Above + Scopes In/Out / All Above + Tech Review). The cascade propagates automatically through critique depth, supervisor use, verification rigor, and gate requirements - no manual stage skipping needed.
- **Adversarial plan critique** - Plans are reviewed for gaps, risks, and assumptions by parallel (fresh context) reviewers, not just approved in chat.
- **Visual review gate** - Plannotator opens the full plan for point-by-point comments before implementation, not a rubber-stamp approval.
- **Appetite-scaled interface exploration** - 1, 3, or 5 ASCII archetypes plus hybrid depending on scope depth - no coded mockups wasted.
- **Product domain libraries** - 8 domains auto-detected from your language (Pricing, Trust, Ads, Promotions, Open Source, Health, Marketplace, Business Models).
- **Typed technical scopes** - feature, spike, optimize, test-* with dependency mapping and sequencing for autonomous execution.
- **Acceptance-based scope execution** - each scope is delegated with a contract (criteria, verify commands, stop rules). On acceptance-native harnesses (e.g. pi-subagents), the child self-corrects in the same context before returning. On other harnesses, the parent re-delegates with feedback until criteria pass or max iterations exhaust.
- **Audit gap-to-scope loop** — post-execution audit classifies gaps (FIXED / DOCUMENTED / ESCALATED). ESCALATED gaps become new scopes in the tracking file. `/sw-next` enforces the loop: when pending scopes exist at the Audit phase, it blocks completion and resets to Execution. The cycle repeats until no scopes remain pending.
- **Bidirectional product ↔ tech flow** — tech constraints and opportunities inform product decisions *before* execution. Tech Preview uses cymbal for appetite-gated codebase recon; Alignment Check catches product-vs-tech misalignment with mode-dependent resolution (auto or user-flagged).
- **Stack-matched skills + fresh docs** — during execution setup, the workflow discovers skills (via `npx skills`) optimized for the chosen tech stack and fetches current library docs (via `ctx7`). Both skip if already installed or unavailable. Skills install in project scope only, after user confirmation.
- **Real-time TUI tracking** - see workflow state as it progresses through all stages.

---

## 📋 Table of Contents

- [Why stelow](#why-stelow)
- [🎚️ Appetite & Review Mode](#️-appetite--review-mode)
- [🔄 Process](#--process)
- [📋 Skills](#--skills)
- [🚀 Quick Start](#--quick-start)
- [📦 Installation](#--installation)
- [External Dependencies](#external-dependencies)
- [🎮 Commands](#--commands)
- [Setup per CLI](#setup-per-cli)
- [🖥️ Visual & TUI Integrations](#️-visual--tui-integrations)
- [📁 Artifact Directory](#--artifact-directory)
- [📖 Evidence & Limitations](#--evidence--limitations)
- [About the Author](#about-the-author)
- [License](#license)
- [📞 Support](#--support)

---

## Why stelow

> *"Let's go slow to go fast: invest time in thorough planning to gain speed and deliver value in execution."*

**Traditional AI development:** "Here's what I want. Start coding."

**With stelow:** The user just says:

```
/sw-start "Here's what I want to build"
```

And the workflow begins asking questions, exploring scope, shaping the proposal, reviewing for gaps, getting visual approval, and only then generating typed technical scopes for execution.

**Critique → Gate → Scope sequencing.** Execution (stage 12) only runs after all three pass. Lighter review modes (Auto/Only Product Spec) skip some gates; the full path is there when you need it.

### The Problem

Building products with AI agents often leads to:

- Scope creep and unclear boundaries - defining *what not to build* is harder than *what to build*
- Plans without adversarial review - no one questions assumptions before coding begins
- Technical work before business validation - shipping features that shouldn't exist
- No systematic testing for AI-generated code - AI writes fast, but also writes wrong
- Generic workflows missing product-specific insights - pricing, trust, ads, and launch strategy are product decisions, not code decisions

### What stelow does

A structured workflow that makes AI think like a product manager:

- ✅ **Measure thrice, cut once** - shapes proposals with IN/OUT boundaries BEFORE coding
- ✅ **Strategic exploration** - Job To Be Done, Opportunity Mapping, Evolutionary Principles, Market Analysis, and Product Discovery knowledge integrated
- ✅ **Adversarial critique** - reviews every plan for gaps, risks, and assumptions
- ✅ **Visual review gate** - Plannotator opens the full plan for point-by-point comments (not just chat)
- ✅ **Interface exploration in ASCII art** - visualize 5 different approaches in seconds, no coding wasted, then LLM creates a hybrid version combining the best points for the context
- ✅ **Domain libraries** - auto-detects 8 product domains (Pricing, Trust, Ads, etc.) from your language
- ✅ **Technical scope mapping** - breaks down into typed scopes, maps dependencies, sequences execution
- ✅ **AI-aware testing strategy** - for software products, with coverage targets, CI gates, and contextual evaluation of mutation testing for critical paths
- ✅ **Greenfield & Brownfield** - works for new products and existing product evolution

### Key Features

- **24 sub-skills** organized into 4 layers - orchestrator + strategies + workflow stages + tactics
- Part of a broader ecosystem of **25 skills within the project** (plus additional skills from other packages in the user's agent environment)
- Real-time TUI tracking with visual status overlay (`/sw-status`)
- Gate approval via Plannotator - review, comment, approve or reject before implementation
- Typed scopes for autonomous execution (feature, spike, test-*, optimize)

---

## 🎚️ Appetite & Review Mode

The workflow is controlled by two orthogonal dimensions: **Appetite** (declared by the human) and **Review Mode** (declared by the human). Appetite controls scope/exploration depth. Review Mode controls which gates, questions, and approvals are active.

### Appetite (Constraint, Not Estimate)

Appetite is the **scope and exploration budget** - how much product depth the human wants prepared before execution.

> **Appetite is a constraint, not an estimate.** Unlike traditional estimation (which asks "how long will this take?"), appetite asks "how much is this worth?" before the work is defined. This forces scope cuts to fit the budget - the budget never expands.

| Appetite | What it means | Scope depth | Interface exploration | Supervisor | Testing | Best for |
|----------|---------------|-------------|----------------------|------------|---------|----------|
| **Lean** | Validate an idea fast. Minimal scope ceremony. | 1 minimal feature, 1-2 scopes | 1 suggested interface; no alternative exploration | Low sensitivity | Smoke tests + critical-path unit tests; a11y lint/static if UI exists | Idea validation, spike, throwaway prototype |
| **Core (default)** | Standard product feature. Enough depth to catch obvious gaps. | Main JTBD, 3-5 scopes | 3 interface archetypes explored + 1 hybrid recommendation | Medium sensitivity | Unit tests + integration tests for external seams; a11y codebase/browserless audit if UI exists | Most features, bug fixes, small improvements |
| **Complete** | Multi-feature or high-risk product work. | 8-15 scopes, full edge mapping | 5 interface archetypes explored + 1 hybrid recommendation | High sensitivity | Unit + integration + behavior/e2e + security tests; live a11y audit if UI exists | Critical features, high-risk changes, production releases |

**Cut policy implied by appetite:**

| Appetite | What to cut first |
|----------|-------------------|
| **Lean** | Edge cases, secondary flows, alternative strategies, non-critical integrations. Keep only the happy path. |
| **Core** | Low-value variants. Keep the main JTBD, obvious edge cases, and one alternative only if it changes the core flow. |
| **Complete** | Cut nothing unless impossible. Keep full edge case mapping, multiple implementation strategies, and domain context. |

The Shape Up stage runs a mechanical check (scope count, spec size) and writes a preliminary `appetite_fit` in the spec frontmatter. The **Plan Critique** stage validates it via its fresh-context feasibility reviewer (see `cali-product-plan-critique` checklists — Scope Fit dimension). This uses the existing 5-reviewer infrastructure instead of adding a dedicated subagent.

| `appetite_fit` | Meaning |
|----------------|---------|
| `fits` | Proposal fits within appetite - proceed as shaped |
| `cuts_needed` | Proposal almost fits but needs targeted cuts (LLM suggests what; human decides) |
| `reshape` | Proposal fundamentally exceeds appetite - must be reshaped before continuing |

This is **not an estimate**. The LLM does not estimate effort - it checks whether the shaped design fits the human's declared budget. If it doesn't fit, the LLM proposes cuts or reshaping, never an appetite extension. The final decision is always human.

All three appetites benefit from `appetite_fit` validation by the **Plan Critique**'s fresh-context feasibility reviewer — this uses the existing 5-reviewer infrastructure, no dedicated subagent needed. The Shape Up stage provides only a preliminary mechanical check (scope count, spec size). This aligns `appetite_fit` with the workflow's convention: all critical evaluations use fresh context via the Plan Critique stage.

**Critique and Gate are Review Mode controls, not Appetite controls.** Product Critique and Plannotator Gate are governed by Review Mode: Auto skips gates; all other modes run the configured gates. Appetite changes the depth of the shaped proposal, interface exploration, supervisor sensitivity, and test scope breadth — not whether quality gates exist.

**Appetite-specific execution budget:**

| Area | Lean | Core | Complete |
|------|------|------|----------|
| **Spec + scopes** | ~1 page; 1-2 scopes; one direct implementation path | ~3 pages; 3-5 scopes; 1-2 implementation alternatives with brief rationale | ~8+ pages; 8-15 scopes; 3-5 alternatives with trade-offs |
| **Cut policy** | Cut edge cases, secondary flows, alternative strategies, non-critical integrations. Keep the happy path. | Cut low-value variants. Keep main JTBD, obvious edge cases, and one alternative only if it changes the core flow. | Cut nothing unless impossible. Keep full edge mapping, multiple strategies, and domain context. |
| **Interface exploration** | 1 suggested interface only | 3 archetypes explored + 1 hybrid recommendation | 5 archetypes explored + 1 hybrid recommendation |
| **Supervisor** | Low sensitivity | Medium sensitivity | High sensitivity |
| **Testing** | Smoke tests + critical-path unit tests | Unit tests + integration tests for external seams | Unit + integration + behavior/e2e + security tests |
| **Quality baseline** | Build/test/lint/typecheck always; a11y lint/static if UI exists | Build/test/lint/typecheck always; a11y codebase/browserless audit if UI exists | Build/test/lint/typecheck always; live a11y audit if UI exists |

### Review Mode

Review Mode controls the **breadth** of human review — which gates, questions, and approvals are active. Unlike Appetite (depth of scope), Review Mode determines the **level of human oversight** during the workflow.

Review Mode is set explicitly during the setup phase via `ask_user_question`. It is NOT auto-detected.

| Review Mode | Plannotator Gates | Interface | IN/OUT Confirmation | Tech Approval | Best for |
|---|---|---|---|---|---|
| **Auto** | None | LLM decides | LLM decides | Auto | Throwaway prototype, quick validation, spike |
| **Only Product Spec** | **1 pre-tech** | LLM decides | LLM decides | Auto | Standard feature, bug fix, small improvement |
| **Product Spec + Interface Choice** | **1 pre-tech + Int.Gate** | **User chooses** | LLM decides | Auto | Feature where interface matters |
| **All Above + Scopes In/Out** | **Gate + Int.Gate** | User chooses | **User confirms** | Auto | Critical feature, product with domain context |
| **All Above + Tech Review** | **Gate + Int.Gate + Tech Gate** | User chooses | User confirms | **Gate + tech Qs** | Full pipeline, high-risk changes, production |

**Key rules:**

- **Auto:** No gates, no Plannotator, no questions. LLM decides everything. Quickest path.
- **Only Product Spec:** One Plannotator gate (spec-product visual approval before tech planning). AI resolves all gaps. Interface auto-generated, no choice. No IN/OUT confirmation.
- **Product Spec + Interface Choice:** Product spec gate + interface gate. User chooses between generated interface alternatives. AI resolves trivial gaps, asks about moderate/critical.
- **All Above + Scopes In/Out:** All product gates active (pre-tech + scope IN/OUT + int-gate). User confirms boundaries. Tech approval uses Auto.
- **All Above + Tech Review:** Everything in product review + tech plan goes through Plannotator gate + user answers technical questions.

### How Appetite & Review Mode Interact

```
Review Mode controls WHAT runs (breadth)      →  Which gates are active
Appetite controls HOW DEEP it runs             →  Scope depth per gate
```

| | Lean | Core | Complete |
|---|---|---|---|
| **Auto** | No gates. Fastest path: smaller spec, minimal verify. | No gates. Standard planning depth, standard verify. | No gates. Deep planning, full verify. |
| **All Above + Scopes In/Out** | 2 gates (Gate + Int.Gate). User confirms IN/OUT. | 2 gates + IN/OUT confirmation. Full workflow. | 2 gates + all questions. No shortcuts. |

**Examples:**
- `Lean + Auto` → Fastest path: no gates, no questions, no Plannotator. LLM decides scope. Interface runs automatically with 1 suggested interface. (~6 stages)
- `Core + Only Product Spec` → Standard feature: 1 Plannotator gate (pre-tech), interface runs automatically with 3 interfaces + hybrid. (~10 stages)
- `Core + Product Spec + Interface Choice` → Feature where interface matters: 1 Plannotator gate + user chooses among 3 interfaces + hybrid. (~8 stages)
- `Complete + All Above + Tech Review` → Critical feature: 3 Plannotator gates + all questions. Interface explores all 5 archetypes + hybrid. No shortcuts. (~15 stages)

### Motivation

Product ideas vary widely in scope and risk. A throwaway prototype should not require the same planning depth as a critical production feature. The Appetite × Review Mode cascade system ensures:

- **Lean appetite limits scope and exploration** - smaller spec, fewer scopes, one interface suggestion, and critical-path tests only.
- **Complete appetite expands exploration and verification** - full edge mapping, all 5 interface archetypes + hybrid, behavior/e2e tests, security tests, and live a11y audit when UI exists.
- **Auto review mode skips Plannotator** - for lightweight validations where visual review is overkill
- **All Above + Scopes In/Out review mode enforces strategy** - JTBD, Opportunity Mapping, etc. run before shaping if product context exists

This is an **appetite-first** design: the human's declaration of review budget propagates automatically through all stages - no estimation step required.

---

## 🔄 Process

The workflow has **3 conceptual phases** (15 stages total), from idea triage to post-execution audit. See the [Stage Index](#skills) in the orchestrator skill for the complete stage map with auto-chain rules and flow diagram.

### 1. 🎨 Shaping

**Stages 0-11** - From raw idea through shaped proposal, adversarial critique, visual gate approval, interface exploration, to typed technical scopes ready for execution.

#### Bidirectional Product ↔ Tech Flow

Traditional planning is linear: product spec → tech spec. stelow adds **two feedback loops** that let tech constraints and opportunities inform product decisions *before* execution:

- **Tech Preview** — Before shaping the product spec, a lightweight codebase analysis runs (via [cymbal](https://github.com/1broseidon/cymbal), when available) to surface existing architecture, entry points, hotspots, and constraints. This prevents shaping features that conflict with the codebase reality. Depth is appetite-gated. Additionally searches existing features by workflow name/topic to avoid duplicating or conflicting with what already exists.

- **Codebase Feature Recon** — Before tech planning generates typed scopes, a deeper cymbal investigation runs: searches for related modules, maps references (who connects to what), and analyzes impact (what breaks if changed). Depth varies by appetite — see table below.

- **Alignment Check** — After tech planning generates typed scopes, a bidirectional check compares the tech plan against the product spec. If tech reveals constraints that change the product scope, the LLM classifies alignment and acts per Review Mode: Auto/Only Product Spec auto-updates the product spec; Product Spec + Interface Choice and above ask the user. This catches "tech discovered too late" before any code is written.

| Appetite | Tech Preview (shaping) | Codebase Feature Recon (planning) | Alignment Check |
|----------|----------------------|-----------------------------------|----------------|
| **Lean** | `cymbal search --text` by workflow name | `cymbal search --text` — verify existence | Quick feasibility |
| **Core** | Structure overview (entry points, hotspots) + feature search | `search` + `cymbal refs` — find connections | Standard IN/OUT vs feasibility |
| **Complete** | Structure + impact analysis (blast radius) + feature search | `search` + `refs` + `cymbal impact` — blast radius | Deep: each scope's ACs vs codebase |

Greenfield skips all codebase analysis (no code to inspect).
If cymbal is not installed, falls back to `find` + `git log` — no cross-references or impact data.

| Review Mode | Alignment Check behavior |
|------------|------------------------|
| **Auto/Only Product Spec** | Auto-resolve. Updates spec-product if needed. No questions. |
| **Product Spec + Interface Choice** | Auto-resolve if aligned; flags user if misaligned. |
| **Full/Full+Tech** | Always shows diff, asks user to choose update/ignore/reshape. |

These loops are **appetite- and mode-respecting by design** — they inherit the same two-axis control as the rest of the workflow. No new mechanism needed.

### 2. ⚡ Execution

**Stages 12-13** - Autonomous scope execution via acceptance contracts: each scope is delegated with criteria, verify commands, and stop rules. Self-correction is harness-dependent - native acceptance loops (pi-subagents) let the child fix gaps in the same context; other harnesses use parent-controlled re-delegation. Optimization scopes use benchmark-driven iteration. Scope completion is gated - `/sw-next` blocks advance to Verification if any scopes remain incomplete.

### 3. ✅ Verification & Audit

**Stage 14** — Full test suite, parallel code review, UI quality audit, and execution critique (scope fidelity, NFR coverage, edge cases, docs, test quality). The audit classifies gaps as FIXED / DOCUMENTED / ESCALATED. ESCALATED gaps become new scopes. `/sw-next` detects pending scopes at the Audit phase and loops back to Execution.

---

## 📋 Skills

All 25 skills are flat in `skills/` directory, ready for `~/.agents/skills/`. They're organized into 4 layers plus 1 complementary skill.

**Each skill is fully self-contained** - the installer copies the complete directory tree including its own `references/cli-tools/`, `references/`, and `stages/` files. This means:
- ✅ **Skills work standalone** - invoke any sub-skill (e.g., `cali-product-shape-up`, `cali-product-plan-critique`) independently of the orchestrator
- ✅ **Portable across CLIs** - Pi, Claude Code, Codex, OpenCode all reference skills by name (`~/.agents/skills/`)
- ✅ **References resolve locally** - every `references/cli-tools/*.md` path is relative to the skill's own directory
- ❌ **Not in `~/.agents/skills/`?** Use `./install.sh` or `npx skills add renatocaliari/stelow -g`

### 🎛️ Orchestrator (1)

| Skill | Purpose |
|-------|---------|
| `stelow` | Coordinates the multi-stage workflow (Setup → Context → Shape → Critique → Gate → Scope → Interface → Int.Gate → Selection → Planning → Execution → Verification → Audit) |

### 🧠 Product Strategies (5)

| Skill | Purpose |
|-------|---------|
| `cali-product-job-to-be-done` | Job To Be Done - understand what job users hire the product to do |
| `cali-product-discovery` | Customer discovery and validation |
| `cali-product-opportunity-mapping` | Map opportunities to see where to focus |
| `cali-product-multi-method-market-analysis` | Multi-method market analysis |
| `cali-product-evolutionary-principles` | Evolutionary principles for sustainable development |

### ⚙️ Workflow Stages (10)

| Skill | Purpose |
|-------|---------|
| `cali-product-shape-up` | Shape Up planning + **Tech Preview** (appetite-gated codebase recon via cymbal) — surfaces codebase reality before product decisions |
| `cali-product-interface-alternatives` | Interface alternatives exploration (1/3/5 archetypes by appetite) |
| `cali-product-plan-critique` | Product plan gap analysis (flows, states, affordances, data, system, compositional quality, feasibility); mode-dependent resolution |
| `cali-product-codebase-critique` | Codebase structural critique (architecture, performance, AI slop) |
| `cali-product-ux-critique` | Full UX/UI audit (accessibility, Nielsen heuristics, personas, AI slop) |
| `cali-product-tech-planning` | Technical scope generation + **Alignment Check** (mode-gated bidirectional product↔tech feedback loop) |
| `cali-product-testing-ai-code` | AI-aware testing strategy with contextual mutation testing evaluation |
| `cali-product-testing-execution` | Post-implementation testing protocol |
| `cali-product-scope-executor` | Autonomous scope execution via acceptance contracts - child self-corrects (harness-dependent), parent evaluates final result |
| `cali-product-execution-critique` | Post-execution audit - classifies gaps as FIXED/DOCUMENTED/ESCALATED; ESCALATED gaps become new scopes |

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

### 📐 Complementary (1)

| Skill | Purpose |
|-------|---------|
| `cali-product-coding-standards` | Self-contained coding standards - KISS, DRY, LoB, SoC, Fail Fast, YAGNI, file/function size limits |

---

## 🚀 Quick Start

This package works across **multiple coding agents** - not just pi.dev. See the compatibility table in [Installation](#installation) to pick your path.

| Your situation | Recommended command | What you get |
|----------------|--------------------|-------------|
| **New to CLIs** (no Node, no agent) | `curl -fsSL https://raw.githubusercontent.com/.../setup.sh \| sh` | Node.js + pi.dev + all extensions + 25 skills |
| **Already use pi.dev** | `git clone ... && ./install.sh` | 25 skills + TUI overlay + slash commands |
| **Use OpenCode / Claude Code / Codex** | `git clone ... && ./install.sh` | 25 skills + command files (no TUI) |
| **Any CLI (skills only)** | `npx skills add renatocaliari/stelow -g` | 25 skills + cross-CLI support |

### Intent-Aware Start

`/sw-start` auto-detects what kind of request you're making:

```bash
/sw-start "reduce complexity of the codebase"
# → Detected as: Refactor
# → Pipeline: Planning → Execution → Verification → Audit
# → Skips Shape Up, Interface, all Gates

/sw-start "fix login crash when email is empty"
# → Detected as: Bugfix
# → Pipeline: Planning → Execution → Verification → Audit

/sw-start "create a new invoicing platform"
# → Detected as: New Product
# → Full pipeline: Setup → Shape → ... → Execution → Audit
```

If detection is ambiguous or incorrect, you can change the category before the workflow starts. This prevents token waste from running the full Shape Up pipeline on a simple bugfix.

### Drift-Aware Resume

`/sw-resume` checks for git changes before resuming a paused workflow. If files changed while paused, it warns you and asks for confirmation before proceeding.

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for detailed options.
Per-agent configuration files (commands, install scripts) are in [`cli-agents/`](cli-agents/).

---

## 📦 Installation

### CLI Compatibility

Not every feature works on every CLI. Here's what to expect:

| Feature | pi.dev | OpenCode | Claude Code | Codex |
|---------|--------|----------|-------------|-------|
| **Skills (all 25)** | ✅ | ✅ | ✅ | ✅ |
| **`/sw-start` command** | ✅ Slash commands | ✅ Via `sw-*.md` files | ✅ Via command files | ✅ Via command files |
| **TUI overlay (real-time status)** | ✅ Native extension | ❌ | ❌ | ❌ |
| **Plannotator visual gate** | ✅ Extension | ⚠️ Manual | ⚠️ Manual | ⚠️ Manual |
| **Deep hooks (events, gates)** | ✅ Extension | ❌ | ❌ | ❌ |

> **Bottom line:** The **25 skills work identically on every CLI** - they run the full Shape Up workflow, generate plans, critique, scopes, everything. The deep integration features (real-time TUI overlay, slash commands, lifecycle hooks, Plannotator gate) are native to pi.dev, which has the extension system to support them. Two CLI-agnostic surfaces also read workflow state from `.stelow/` files on disk: the [Muxy.app](https://muxy.app/) webview panel (macOS terminal multiplexer) and the [Herdr](https://herdr.dev) split-pane TUI plugin (terminal multiplexer). Both work with any CLI. All CLIs can still complete the workflow; on non-Pi CLIs it happens via chat and command files rather than extensions.

---

## External Dependencies

stelow is designed to be **self-contained** — the 25 skills + installer cover the full workflow. Some features optionally integrate with external tools for enhanced capability. Every external dependency has a documented fallback.

| Dependency | Required? | Used by | Install method | Fallback if absent |
|---|---|---|---|---|
| [cymbal](https://github.com/1broseidon/cymbal) | Optional | Tech Preview, Codebase Feature Recon, Alignment Check | `brew install 1broseidon/tap/cymbal` (macOS), or `go install` / binary release | Basic `find` + `git log` — no cross-references or impact data |
| [npx skills](https://github.com/vercel-labs/skills) | Optional | Stack-matched skill discovery during execution setup | Part of Node.js ecosystem (`npx` bundled with npm) | Skip — workflow runs without stack-matched skills |
| [ctx7](https://github.com/upstash/context7) | Optional | Current library doc fetching during execution setup | `npx @vedanth/context7` (auto-install via npx) | Skip — docs not fetched (less informed execution) |
| [plannotator](https://plannotator.ai/) | Optional | Visual review gate annotation | Pi: `@plannotator/pi-extension` · OpenCode: `@plannotator/opencode` · Claude Code: `@backnotprop/plannotator` · Codex: built-in hook | Manual review with approval receipt file — no structured annotation |
| [safe-change (pi-agent-codebase-workflows)](https://github.com/PriNova/pi-agent-codebase-workflows) | Optional | Pre-execution code safety checks | `npx skills add Prinova/pi-agent-codebase-workflows -g` (works on Pi, OpenCode, Claude Code, Codex) | Skip — pre-execution check omitted |
| Subagents (built-in to all CLIs) | Optional | Parallel reviewer orchestration during Plan Critique | `subagent({ agent, task })` — built-in on Pi/OpenCode/Claude Code/Codex | Sequential execution — slower, same outcome (single-context review) |
| [pi-subagents](https://github.com/nicobailon/pi-subagents) | Optional (Pi only) | Advanced subagent features (fork/fresh context semantics, parent-child contracts) | `npm:pi-subagents` | Use the CLI's built-in `subagent()` instead — same outcome, fewer features |
| [pi-intercom](https://github.com/nicobailon/pi-intercom) | Optional (Pi only) | Session-to-session coordination | `npm:pi-intercom` | Skip — no intercom capability |
| [pi-supervisor](https://github.com/tintinweb/pi-supervisor) | Optional (Pi only) | Conversation supervision during execution | `npm:pi-supervisor` | Skip — no supervision; rely on `stages-guard` for invariant enforcement |
| [Muxy.app](https://muxy.app/) + stelow Muxy extension | Optional (macOS) | Webview panel showing workflow state with phase progress and quick actions | Install Muxy.app, then load extension from `integrations/muxy/stelow/` | No webview — read `.stelow/` files directly or use Herdr split-pane TUI |
| [herdr](https://herdr.dev/) + stelow plugin | Optional | Split-pane TUI showing workflow state with click-to-drill | `herdr plugin install renatocaliari/stelow` | No TUI — read `.stelow/` files directly or use Muxy webview panel |

**Design principle:** stelow is **harness-agnostic**. Zero external tools are required to run the full product workflow. Each optional integration enhances a specific phase but never blocks progress. The installer (`./install.sh`) auto-installs Pi npm packages when Pi is detected — other tools (cymbal, ctx7) remain user-managed.

For every external tool above, the workflow teaches the agent the **specific fallback strategy** in `skills/stelow-product-orchestrator/references/cli-tools/<tool>.md`. When a tool is unavailable, the orchestrator instructs the agent to use harness-native capabilities (built-in `subagent()`, `git grep`, terminal-based review with approval receipts) rather than skipping the workflow step entirely. Degraded capability is the trade-off — see the Fallback column above for what you lose without each tool.

### 🚀 Path A: From Zero (pi.dev + Everything)

**One command, everything included.** Pick this if you don't have pi.dev yet.

```bash
curl -fsSL https://raw.githubusercontent.com/renatocaliari/stelow/main/setup.sh | sh
```

**What gets installed (in order):**

| Step | Component | Details | Works on |
|---|---|---|---|
| 1 | Node.js | v20+ via Homebrew (macOS) or nvm (Linux/Windows) | - |
| 2 | pi.dev | `@earendil-works/pi-coding-agent` via npm | pi.dev |
| 3 | Pi extensions | 12 npm packages: pi-subagents, pi-skillful, pi-intercom, pi-supervisor, @plannotator/pi-extension, pi-rewind, pi-powerline-footer, plus 5 harness tooling packages | pi.dev only |
| 4 | Skills (25) | stelow orchestrator + 24 subskills, copied to `~/.agents/skills/` | **All CLIs** ✅ |
| 5 | Settings | theme, model defaults, skill shortcuts in `~/.pi/agent/settings.json` | pi.dev |
| 6 | cymbal | codebase navigation via `brew install 1broseidon/tap/cymbal` (macOS) or `go install` (Linux). Skipped gracefully if brew/Go absent | macOS, Linux |
| 7 | ctx7 | library docs fetcher via `npx @vedanth/context7` (interactive OAuth — prompts the user) | All CLIs |
| 8 | safe-change | pre-planning regression check via `npx skills add PrinNova/pi-agent-codebase-workflows -g` | All CLIs |
| 9 | Herdr plugin | stelow split-pane TUI installed via `herdr plugin install renatocaliari/stelow` — **only if** `herdr` CLI is on PATH | All CLIs (via Herdr) |
| 10 | Muxy detection | detects `/Applications/Muxy.app` or `muxy` binary; prints install link if absent (cannot auto-install — Muxy is macOS-only, distributed via GitHub releases) | macOS |

> **Not using pi.dev?** Skills land in `~/.agents/skills/` and work on OpenCode, Claude Code, and Codex too. You just won't get the Pi-only extensions or TUI overlay. The workflow itself runs fine.
>
> **Muxy.app can't be auto-installed.** It's a macOS-only app (SwiftUI + libghostty), open-source under MIT license, distributed via [GitHub releases](https://github.com/muxy-app/muxy/releases). Path A detects whether it's present and tells you how to install if not. Once installed, load the stelow extension from `integrations/muxy/stelow/`.

### 📋 Path B: Existing pi.dev User

```bash
git clone https://github.com/renatocaliari/stelow.git
cd stelow
./install.sh
```

The installer auto-detects your CLIs and installs skills + extensions + slash commands. Skills go to `~/.agents/skills/`.

### 📋 Path C: Other CLI (OpenCode / Claude Code / Codex)

The **skills** are the core of this project - they work on **any** agent (Pi, OpenCode, Claude Code, Codex).

```bash
git clone https://github.com/renatocaliari/stelow.git
cd stelow
./install.sh
```

The installer detects your CLI and installs **skills + command files**. No extensions, no TUI - just the 25 skills that run the workflow.

**Or, with npx (no clone needed):**

```bash
npx skills add renatocaliari/stelow -g
```

This installs all 25 skills to `~/.agents/skills/` - works on any CLI.

> For CLI-specific setup (OpenCode config, Claude Code plugin, Codex plugin), see [docs/INSTALLATION.md](docs/INSTALLATION.md).

### Manual setup & dependencies

For per-CLI commands, required npm packages, third-party skills, and updates, see [docs/INSTALLATION.md](docs/INSTALLATION.md).

For toolchain dependencies (TypeScript, Vitest), see [package.json](package.json).

This project distributes exclusively via GitHub (no npm) — see [docs/SECURITY.md](docs/SECURITY.md) for rationale.

---

## 🎮 Commands

### Primary Commands

| Command | Description |
|---------|-------------|
| `/sw-start [idea]` | Start new workflow. Auto-detects intent type (new-product, feature, bugfix, refactor, investigate) and routes to appropriate stage pipeline. If the input contains multiple items, auto-runs **triage** (group items) + **select** (pick one, defer the rest) before setup. |
| `/sw-status` | Show active workflow phase list, stage progress, and scopes. |
| `/sw-next` | Advance to next stage. Auto-completes workflow on last phase. |
| `/sw-pause` | Pause active workflow (keeps state for resume). |
| `/sw-resume [name=]` | Resume paused/in-progress workflow. Checks git drift before resuming. |
| `/sw-abort [name=]` | Abort and archive active workflow. |
| `/sw-archive [name=]` | Archive completed or inactive workflow. |
| `/sw-unarchive name=` | Restore archived workflow to paused state. |
| `/sw-status` | Display current phase, progress, and scope status. |
| `/sw-ls [all\|archived]` | List workflows in current project (or all projects). |
| `/sw-setphase phase=N` | Jump to specific phase by index. |
| `/sw-info [name=]` | Print workflow path, current stage, and copy-pasteable `cd` + `/sw-resume` commands. |
| `/sw-rename <name>` | Rename active workflow. |
| `/sw-complete` | Force-complete active workflow. |
| `/sw-inbox [add\|remove\|clear]` | View or manage deferred inbox items. |
| `/sw-doctor [--fix]` | Diagnose workflow health. Detects zombie workflows, index mismatches, orphaned entries. |
| `/sw-unlock` | Disable stage guard for current session (debug only). |

> All 16 commands work in **Pi** natively (via `pi.registerCommand()`). In **OpenCode, Claude Code, Codex**, 15 commands work via Skill delegation — the `.md` files in `cli-agents/<cli>/commands/sw-*.md` invoke `/skill:stelow-product-orchestrator <command>` and route through the orchestrator. The exception is `/sw-inbox`, which is marked `piOnly` because its handler operates on filesystem state with toast notifications; in non-Pi CLIs it shows a warning banner and the agent will fall back to reading `.stelow/inbox/items.md` directly, without the native command surface.

---

## Setup per CLI

When working on software projects, trigger the product workflow:

1. **Trigger:** Use `/skill stelow`
2. **Execute:** Only after visual review gate (Plannotator approval)

| CLI | File |
|-----|------|
| **Pi** | `~/.pi/agent/AGENTS.md` |
| **OpenCode** | `~/.config/opencode/AGENTS.md` or project `AGENTS.md` |
| **Claude Code** | `~/.claude/CLAUDE.md` or project `CLAUDE.md` |
| **Codex** | `~/.codex/AGENTS.md` or project `AGENTS.md` |

---

## 🖥️ Visual & TUI Integrations

Two CLI-agnostic surfaces read workflow state from `.stelow/` files on disk and present it alongside your terminal. Pick one or both — they share no code and don't require each other.

| Surface | Host | UI model |
|---|---|---|
| **Muxy webview panel** | [Muxy.app](https://muxy.app/) (macOS terminal multiplexer) | `WKWebView` docked/floating panel with HTML/CSS/JS |
| **Herdr split-pane TUI** | [Herdr](https://herdr.dev) (terminal multiplexer) | Rust+ratatui TUI in split pane (`placement = "split"`) |

Muxy plugin           |  Herdr Extension
:-------------------------:|:-------------------------:
![](https://github.com/user-attachments/assets/6254c08e-dc92-4b5d-9fc6-144868e53621)  |  ![](https://github.com/user-attachments/assets/e348fd87-f428-4d33-afd6-e08363d16eab)

Herdr Extension

Both integrations share the same workflow state (`.stelow/`), both work with any CLI (Pi, OpenCode, Claude Code, Codex), neither requires pi.dev.

### Muxy Webview Panel

> **Requires [Muxy.app](https://muxy.app/) + the stelow extension loaded.** Muxy is a **macOS terminal multiplexer** — think tmux with a native Mac UI: project-based terminal workspaces, tabs, splits, and custom panels. The webview panel is a Muxy plugin surface, not a web app or a Pi feature.

The panel shows:

- Current phase and progress
- Phase artifacts and outputs
- Upcoming tasks
- Quick actions

**Install:** Muxy.app (macOS-only) + the stelow Muxy extension at `integrations/muxy/stelow/`. To load the extension in Muxy: open **Extensions modal → Create**, pick the folder, and Muxy auto-detects the built `dist/`. See [Muxy's Get started guide](https://muxy.app/docs/extensions/get-started) for the official workflow.

### Herdr Split-Pane TUI

> **Requires [Herdr](https://herdr.dev/) + the stelow plugin installed.** Herdr is a **terminal multiplexer** — tmux-style persistence, mouse-native panes, agent state tracking, CLI + socket API. The TUI plugin runs as a Rust binary in a split pane, the same model as `herdr-file-viewer`.

The TUI shows:

- Current stage (Discovery → Shape Up → Tech Planning → ...)
- Per-stage status (✓ done, ▶ active, · pending, ! blocked)
- Drill-down: stage → project → scope → task
- Quick action invocation via `herdr plugin action invoke`

**Keybinds:** `prefix+w` toggle · `Tab`/`j`/`k` next/prev workflow · `r` refresh · `?` help · `q`/`Esc` quit. Detail card shows prompt + current stage + scope; click workflow rows to select.

**Install:** `herdr plugin install renatocaliari/stelow` (or `herdr plugin link integrations/herdr/stelow/` for local dev after `cargo build --release`). Source under `integrations/herdr/stelow/`. See [herdr's plugin docs](https://herdr.dev/docs/plugins/) for the official install/link workflow.

---

## 📁 Artifact Directory

All workflow artifacts are stored in:

```
<project>/.stelow/
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

## 📖 Evidence & Limitations

### ✅ Evidence-Based Design

This workflow is grounded in empirical evidence from the 2025-2026 AI agent research boom. Every architectural decision - from parallel subagent orchestration to cross-session learning - is backed by peer-reviewed papers, open-source tools, and industry benchmarks.

| Practice | Source | Evidence | Where We Implement |
|----------|--------|----------|-------------------|
| **Parallel orchestration** | [CAID](https://arxiv.org/abs/2603.21489) (Geng & Neubig, CMU, 2026) | +26.7% accuracy using git-worktree isolation + dependency DAG | 5 parallel reviewers + consolidator during plan critique |
| **Cross-session learning** | [Cat](https://arxiv.org/abs/2512.22087) (Liu et al., Beihang, 2025); [Memory Transfer](https://arxiv.org/abs/2604.14004) (Kim et al., KAIST, 2026) | Context as callable tool; +3.7% via abstract memory pools | Session knowledge from past cycles read during workflow setup |
| **Output validation guards** | [Stage-Gate Agentic](https://community.pdma.org/knowledgehub/bok/product-innovation-process/stage-gate-agentic-the-coming-revolution-in-the-new-product-process) (PDMA, 2026); [Phaselock](https://github.com/infinri/Phaselock) (2026) | AI agents with gates reduce execution failures; 80 enforceable rules | Shape Up output guard + Tech Planning validation guard |
| **Context isolation** | [Clean Context Pattern](https://agentfactory.panaversity.org/docs/General-Agents-Foundations/context-engineering/context-isolation) (Agent Factory, 2026); [GAM](https://arxiv.org/abs/2604.12285) (Zhejiang U., 2026) | Fresh context per agent outperforms shared pipelines; write isolation prevents contamination | `subagents.md` - `context:"fresh"` per subagent; disk-based artifacts |
| **Visual review gate** | [Plannotator](https://plannotator.ai/) (backnotprop, 2025); [Placement Theory](https://tianpan.co/blog/2026-04-17-hitl-placement-theory-approval-gates) (Tian Pan, 2026) | Browser-based plan annotation with structured feedback loop | Plannotator gate active when Review Mode > Auto; skipped in Auto |
| **Intra-step recovery** | [Try-Heal-Retry](https://adriennevermorel.com/notes/try-heal-retry-pattern/) (Nweke, 2026); [PALADIN](https://arxiv.org/abs/2509.25238) (Chaudhary et al., 2025) | 89.68% recovery rate via annotated failure trajectories | `subagents.md` - Retry 1× + skip with logged error per subagent |
| **Metric-driven optimization** | [ReflexGrad](https://arxiv.org/abs/2511.14584) (Kadu et al., 2025); [ReliabilityBench](https://arxiv.org/abs/2601.06112) (Gupta et al., 2026) | +40pp lift via dual-process routing; standardized reliability measurement | `optimization` scopes routed to optimization goals (subagent + acceptance) |
| **Acceptance-based execution** | Pattern inspired by [Try-Heal-Retry](https://adriennevermorel.com/notes/try-heal-retry-pattern/) (Nweke, 2026) and [PALADIN](https://arxiv.org/abs/2509.25238) (Chaudhary et al., 2025) | Self-correction in same context outperforms fresh re-delegation | Scope executor delegates with acceptance contract - child self-corrects (harness-dependent) before parent evaluates |
| **Audit gap-to-scope loop** | Pattern inspired by [Agentic Debugging](https://arxiv.org/abs/2504.18032) (Zhang et al., 2025) | Multi-agent feedback loops improve fix rate | Audit classifies gaps → ESCALATED become new scopes → `/sw-next` enforces loop back to Execution |

### ⚠️ Known Limitations & Radical Transparency

Even with these guardrails, the AI agent still exhibits predictable failure modes. This workflow is a tool for **amplifying human judgment**, not a substitute for it.

**How to read this table:** Each row is honest about what the workflow can and cannot do. Every mitigation has a corresponding "not solved" assessment. Read both before deciding whether this workflow helps your context.

| # | Limitation | Impact | What the workflow tries to do | Why it's not solved |
|---|-----------|--------|------------------------------|---------------------|
| 1 | **Context rot** - compliance with own rules drops from ~73% (turn 5) to ~33% (turn 16) in long sessions | [Gamage 2026](https://arxiv.org/abs/2604.20911), 4,416 trials, 12 models/8 providers. Replicated by Liu et al. 2023 "Lost in the Middle". | Subagents use `context: "fresh"`. Ordered-execution-goal creates isolated scope execution. Execution stage has explicit "Context Rot Check" re-reading plan from disk. | **Reduced but not solved.** The orchestrator itself can forget its own rules in long sessions spanning multiple stages. The core transformer limitation (U-shaped attention curve) remains intrinsic. |
| 2 | **Confabulated research references** - Agents cite nonexistent papers or books (~11-57% hallucination rate across models) | [arXiv 2604.03173](https://arxiv.org/abs/2604.03173) - 10 models/3 databases/69K citation instances | Claim verification via Lessons Learned cross-referencing during setup. | **Caught by structure, not guaranteed.** Multi-model consensus (≥3 LLMs citing same work) yields 95.6% accuracy, but the workflow doesn't enforce this. |
| 3 | **Silent wrong answers** - Cross-task state leakage produces plausible but incorrect outputs | [UCC (arXiv 2604.01350)](https://arxiv.org/abs/2604.01350), 2026 | Write isolation per subagent; clean context pattern | **Mitigated by isolation, not by detection.** No mechanism to detect when contamination happens despite isolation. |
| 4 | **Overconfidence in estimates** - AI systematically underestimates implementation complexity | [Agentic Overconfidence (ICLR 2026)](https://openreview.net/forum?id=Ld4bvamfKj) - all tested agents exhibit agentic overconfidence | Appetite is declared by human as a **constraint**, not estimated by the LLM. The LLM only checks `appetite_fit` (fits/cuts_needed/reshape). No estimation step. | **Addressed by design - appetite is a constraint, not an estimate.** The human sets the budget before shaping. The LLM checks fit, not effort. But the human still needs to set appetite honestly. |
| 5 | **Approval gate fatigue** - Users can desensitize to visual gates and approve without scrutiny | [Tian Pan Apr 2026](https://tianpan.co/blog/2026-04-23-hitl-queue-dynamics-approver-fatigue) - HITL queues have dynamics | Plannotator requires active annotations (deletions, comments, labels). Auto/Only Product Spec review modes skip gates entirely when appropriate. | **Delayed, not prevented.** Review Mode selection helps reduce unnecessary gates, but if the human always picks Complete+All Above + Scopes In/Out, fatigue still sets in. |
| 6 | **80% Problem** - AI ships the happy path (CRUD, main flow) but omits error handling, observability, security, retry, rollback, edge cases | [Osmani Jan 2026](https://addyo.substack.com/p/the-80-problem-in-agentic-coding) (coined the term); [GitClear 2025](https://www.gitclear.com/ai_assistant_code_quality_2025_research) | Tech Planning requires NFRs per scope. Acceptance contracts can include NFR criteria (if the plan specifies them). Audit classifies omissions as gaps - ESCALATED ones become new scopes. | **Partially mitigated, not solved.** NFRs must be in the plan to appear in the contract. Audit classification depends on the LLM - misclassification means gaps slip through. Same model evaluates both stages. |
| 7 | **Model dependency** - Claude Opus, Gemini Flash, GPT-4o produce significantly different quality | [Veracode 2025](https://www.veracode.com/wp-content/uploads/2025_GenAI_Code_Security_Report_Final.pdf) - 45% of AI-generated code contains flaws across 100+ models; [Anthropic Jan 2026](https://arxiv.org/abs/2601.20245) - RCT: AI-assisted devs score 17% lower on comprehension tests | Every artifact tracks `generated_by: {model_name}` in frontmatter. Gate stage shows provenance before Plannotator review. | **Transparency, not mitigation.** Knowing the model helps calibrate expectations, but it doesn't fix the quality gap. The comprehension penalty (Anthropic 2026) affects users regardless. |
| 8 | **Constraint decay** - AI progressively violates its own self-imposed rules over time | [arXiv 2026 (Constraint Decay)](https://arxiv.org/abs/2605.06445) - structural constraints drift in backend code generation; [HORIZON](https://arxiv.org/abs/2604.11978) - agents break on long-horizon tasks | Context rot rules explicitly warn about this. "No patching in degraded context" rule blocks the most common decay pattern. | **Same root cause as context rot.** The warning helps, but stopping a session mid-flow is disruptive and users rarely do it. |
| 9 | **Code hallucination** - AI invents APIs, functions, or contracts that don't exist (~20% of failures) | [CloudAPIBench](https://arxiv.org/abs/2407.09726) - 20.41% of failures are hallucinated APIs; [Code LLM failures](https://arxiv.org/abs/2407.06153) | Verification stage runs the test suite, which catches some hallucinated APIs. | **Caught by tests, not by the workflow.** If tests don't exist (or are also hallucinated), neither Verification nor Critique detects it. |
| 10 | **Shallow review trap** - same LLM that wrote the code also reviews it | [Ox Security 2025](https://www.ox.security/wp-content/uploads/2025/10/Army-of-Juniors-The-AI-Code-Security-Crisis.pdf) - 300+ repos, 10 anti-patterns, AI code in production with critical flaws | Verification uses `context: "fresh"` subagent reviewers - same model but fresh session context. | **Automatic via `context: "fresh"`** - fresh context restores full rule awareness lost to context rot (~33% rule adherence at turn 16 vs ~73% at turn 5). True cross-model independence offers marginal additional benefit. |
| 11 | **Expertise cliff** - AI fails in mature codebases with implicit conventions, undocumented architecture | [Tian Pan Mai 2026](https://tianpan.co/blog/2026-05-04-expertise-cliff-tacit-knowledge-ai-coding-agents); [METR 2025 RCT](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) - experienced devs 19% slower with AI | Domain libraries and structured specs help surface some conventions. Execution Critique checks for broken refs and anti-patterns. | **Not addressed.** This workflow was designed for greenfield or well-documented features. If your codebase has 10 years of undocumented architecture decisions, the AI will violate them. |
| 12 | **Plan staleness** - plans generated against one snapshot; by execution time, target has changed | [Superpowers Issue #989](https://github.com/obra/superpowers/issues/989) - parallel sessions cause spec/plan staleness | Git diff check before scope execution detects if target files changed since plan creation. | **Staleness detected but not auto-resolved.** Only detects file-level changes, not semantic staleness. LLM decides whether staleness matters - no forced re-plan. |
| 13 | **Pipeline memory loss** - no cross-session memory of own failure patterns | [Flamehaven 2026](https://flamehaven.space/writing/the-two-problems-no-one-talks-about-in-ai-agent-coding-pipelines/) - cross-session memory, MICA governance schema | Execution Critique saves lessons from each cycle. Setup stage automatically reads past lessons with forced reflection. | **Captured and injected, but not verified.** Same model that made mistakes reads the lessons. Context rot can still cause mid-session forgetting. Cannot auto-verify lesson adherence. |
| 14 | **Code complexity growth** - AI-generated code increases complexity over time | [Cursor Study (MSR 2026)](https://arxiv.org/abs/2511.04427) - static analysis warnings +30%, code complexity +41% after month 2 | Execution Critique includes anti-pattern detection (god functions >100 lines, global mutable state). Optional Code Quality Gate with static analysis. | **Caught too late.** Complexity analysis happens after code is written. No mechanism to prevent complexity during generation - only flag it after. |
| 15 | **Activity ≠ productivity** - more PRs, more commits does not mean more value delivered | [METR 2025 RCT](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) - 19% slower for experienced devs; [Faros AI 2025](https://www.faros.ai/ai-productivity-paradox) - 9% more tasks, 0% DORA improvement | Appetite system anchors scope size to human attention budget. OUT/IN scoping keeps proposals focused. Execution Critique includes "close without follow-up" as valid outcome. | **Honest assessment:** Appetite system mitigates scope bloat, but requires human to set appetite honestly. `appetite_fit` is validated by the Plan Critique stage's fresh-context feasibility reviewer (reusing existing 5-reviewer infrastructure). The appetite system is new - its real-world effectiveness is not yet measured. |

### What this means for you

- **Every artifact is a draft.** Treat spec-product.md, spec-tech.md, critique reports, and interface proposals as first drafts that need human eyes.
- **Results vary by model and codebase.** A small model generating a plan for a mature codebase is a recipe for failure - regardless of how structured the workflow is.
- **Human review is required.** The workflow catches structural gaps (missing scopes, contradictory requirements, some untested edge cases). It does NOT catch logic errors in individual lines, security flaws in business logic, or nuanced architectural trade-offs - those need you.

> We don't claim to solve product planning. We claim to **structure the thinking** so you catch more before you code. The rest is still up to you.

*Research sourced May 2026. All references are hyperlinked for verification.*

---

## About the Author

**[Cali (Renato Caliari)](https://www.linkedin.com/in/calirenato82/)**

This workflow wasn't designed in a vacuum. It comes from years inside real teams — as a developer, product manager, consultant, and leader across different organizations. The skills, patterns, and disciplines here were tested, broken, and rebuilt in live product environments and real codebases, not conference rooms.

### 📚 Published Work

- 🇧🇷 [e-book, Brazilian Portuguese] *Inovação baseada em Jobs To Be Done* (Innovation based on Jobs To Be Done)
- 🇧🇷 [e-book, Brazilian Portuguese] *A Arte da Experimentação: Da Ideia ao Produto* (The Art of Experimentation: From Idea to Product - Innovate with a simplified process and AI assistance)

### 💼 Experience

- Former **Developer** — built products across the full stack before moving into product
- Former **Product Manager** at tech companies
- **Product Consultant** helping leaders with strategy and teams with processes
- Creator of **Triple Track Agile** - adds an opportunity mapping track to product cycles
- Developed **Contornos** - a social technology for decentralized decisions

### 🌐 Resources

| Site | Description |
|------|-------------|
| [timeproduto.com.br](https://www.timeproduto.com.br/) | Product process divided into stages, with AI tools and prompts for each stage |
| [calirenato82.substack.com](https://calirenato82.substack.com) | Blog exploring AI, organizational culture, daily philosophy, narrative practices, and product thinking - with published prompts and free e-books |

---

## License

MIT

---

## 📞 Support

- [Documentation](docs/)
- [Issues](https://github.com/renatocaliari/stelow/issues)
- [Discussions](https://github.com/renatocaliari/stelow/discussions)
