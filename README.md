<p align="center">
  <img src="./stelow.png?1=1" alt="Stelow - Your Product Team" width="400">
</p>

# stelow · your agentic product team

[<img src="https://devin.ai/assets/askdeepwiki.png" alt="Ask DeepWiki" height="20"/>](https://deepwiki.com/calionauta/stelow)
[![Ask zRead](https://img.shields.io/badge/Ask%20zRead-10B981)](https://zread.ai/calionauta/stelow)
[![Version](https://img.shields.io/github/v/release/calionauta/stelow?logo=github&label=release)](https://github.com/calionauta/stelow/releases)
[![CLI](https://img.shields.io/badge/Skills%20run%20on-Any%20agent-3B82F6)](https://calionauta.github.io/stelow/docs/getting-started/)

> **Pre-1.0 status:** Stelow is under active product and market validation. Its
> public release line is `0.x`; APIs, workflow contracts, and skills may change
> incompatibly before a stable `1.0.0`.

> [!TIP]
> 💡 **New here? Start with the official plugin.**
>  Install now: [https://getbb.app/marketplace/stelow](https://getbb.app/marketplace/stelow).
>  Prefer another harness? The skills-only path is below and works anywhere.

Product methodology for AI coding agents: shape proposals with clear scope
boundaries, validate them through adversarial critique, and generate typed
technical scopes ready for autonomous execution.

---

## 📖 Docs (single source of truth)

The manual lives on the site, not in this file:
**[https://calionauta.github.io/stelow/docs/](https://calionauta.github.io/stelow/docs/)**
— overview, getting started (bb and skills-only paths), architecture,
workflow (run knobs × review mode, gates), scopes/tasks/records, CLI,
skill inventory, plugin guides, FAQ, and status.

---

## 🚀 Quick start

**Path A — bb desktop (recommended):** visual board, inbox, and worker CLI.

1. Install and authenticate a coding-agent CLI, then get
   [bb](https://getbb.app) (free) and open it.
2. Run `curl -fsSL https://calionauta.github.io/stelow/install.sh | bash`
   (or `bb plugin install stelow`, or the marketplace listing).
3. Open **Stelow** in bb's navigation, pick a project, choose run knobs
   (quality, supervision, exploration) and Review mode (default Auto), and describe the request.
   Details: [docs/install-bb.md](docs/plugin/install-bb.md).

**Path B — skills-only (any Agent Skills-compatible host):**

```bash
git clone https://github.com/calionauta/stelow.git
cd stelow
./install.sh
# or: npx skills add calionauta/stelow -g
```

```text
/sw-start "Here's what I want to build"
/sw-status
```

`./install.sh` variants: `--minimal`, `update`, `remove`, `--help`
(`ASSUME_YES=1` for CI). Advanced options and rationale:
[docs/INSTALLATION.md](docs/INSTALLATION.md).
Full onboarding for both paths:
[docs/getting-started.md](docs/getting-started.md).

---

## 📋 Skills

All 32 skills live flat in `skills/` and install into `~/.agents/skills/`: **17 workflow skills + 15 product skills**. `stelow-workflow-entry` and `stelow-workflow-router` are workflow control-plane skills (bootstrap + navigation).

| Prefix | Count | Meaning | Distribution |
|---|---|---|---|
| `stelow-workflow-*` | 17 | Skills that run the 18-stage workflow: the orchestrator, the stage skills, and the execution/verification support they invoke | **Core** — auto-vendored into `bb-plugin-stelow` and auto-refreshed from this repo (no manual step) |
| `stelow-product-*` | 15 | Product strategy and domain libraries consulted during stages (reference only, none execute stages) | **Vendored too** — `bb-plugin-stelow` ships all 32 and auto-refreshes them; standalone install via `npx skills`/`install.sh` unchanged |
| Total | **17 workflow skills + 15 product skills = 32** | Entry and router are part of the workflow family | — |

### 🏗️ Workflow (17)

<details>
<summary>17 workflow skills (machine-readable list — human inventory at <a href="https://calionauta.github.io/stelow/docs/skills/">docs/skills</a>)</summary>

| Skill | Purpose |
|-------|---------|
| `stelow-workflow-orchestrator` | Coordinates the multi-stage workflow (Setup → Context → Shape → Critique → Gate → Scope → Interface → Int.Gate → Selection → Architecture → Planning → Plan.Gate → Execution → Verification → Diff.Gate → Audit) |
| `stelow-workflow-entry` | Workflow entry point - classifies intent, scaffolds state, picks the first stage |
| `stelow-workflow-router` | Workflow router - reads state, validates hand-offs, advances stages |
| `stelow-workflow-shape-up` | Shape Up planning + **Tech Preview** (breadth-gated codebase recon via cymbal) — surfaces codebase reality before product decisions |
| `stelow-workflow-interface-alternatives` | Interaction alternatives exploration (1–5 directions by exploration breadth + hybrid) |
| `stelow-workflow-architecture-alternatives` | Architecture alternatives exploration (2–5 directions by exploration breadth + hybrid) |
| `stelow-workflow-architecture-contrast` | Invariants-first architecture decision loop with selection receipt |
| `stelow-workflow-plan-critique` | Product plan gap analysis (flows, states, affordances, data, system, compositional quality, feasibility); mode-dependent resolution |
| `stelow-workflow-tech-planning` | Technical scope generation + **Alignment Check** (mode-gated bidirectional product↔tech feedback loop) |
| `stelow-workflow-scope-executor` | Autonomous scope execution via acceptance contracts - child self-corrects (harness-dependent), parent evaluates final result |
| `stelow-workflow-ux-critique` | Full UX/UI audit (accessibility, Nielsen heuristics, personas, AI slop) |
| `stelow-workflow-codebase-critique` | Codebase structural critique (architecture, performance, AI slop) |
| `stelow-workflow-coding-standards` | Self-contained coding standards - KISS, DRY, LoB, SoC, Fail Fast, YAGNI, file/function size limits |
| `stelow-workflow-testing-ai-code` | AI-aware testing strategy with contextual mutation testing evaluation |
| `stelow-workflow-testing-execution` | Post-implementation testing protocol |
| `stelow-workflow-execution-critique` | Post-execution audit - classifies gaps as FIXED/DOCUMENTED/ESCALATED; ESCALATED gaps become new scopes |
| `stelow-workflow-interface-contrast` | Reaction-first Interface Contrast - preserves the first reaction, compares bounded alternatives, emits a named disposition |

</details>

### 📚 Product (15)

<details>
<summary>15 product skills (machine-readable list — human inventory at <a href="https://calionauta.github.io/stelow/docs/skills/">docs/skills</a>)</summary>

| Skill | Strategy |
|-------|----------|
| `stelow-product-discovery` | Product discovery and validation (the short-cycle learning method) |
| `stelow-product-job-to-be-done` | Job To Be Done - understand what job users hire the product to do |
| `stelow-product-opportunity-mapping` | Map opportunities to see where to focus |
| `stelow-product-scope-mapping` | Break a proposal into coherent vertical delivery scopes with explicit boundaries, dependencies, and open decisions |
| `stelow-product-multi-method-market-analysis` | Multi-method market analysis |
| `stelow-product-evolutionary-principles` | Evolutionary principles for sustainable development |
| `stelow-product-ads` | Advertising and growth channels |
| `stelow-product-business-models` | Business model canvas and options |
| `stelow-product-health` | Product health metrics (signals in tension) |
| `stelow-product-marketplace-playbook` | Marketplace dynamics |
| `stelow-product-open-source` | Open source strategy |
| `stelow-product-paywall` | Paywall and onboarding monetization funnel — paywall-first build order, paywall as PMF test, pain-matched onboarding, 3 funnel benchmarks, trial policy, web2app |
| `stelow-product-pricing` | Pricing strategy and tactics |
| `stelow-product-promotions` | Promotions and campaigns |
| `stelow-product-trust-building` | Trust-building mechanisms |

</details>

---

## 📌 Status and honesty

Pre-1.0 (`0.x`): behavior may change incompatibly. What changed recently:
[CHANGELOG.md](CHANGELOG.md) and
[releases](https://github.com/calionauta/stelow/releases).
Known limitations, evidence base, and experimental surfaces:
[docs/status.md](docs/status.md).

---

## License and support

MIT — see [LICENSE](LICENSE). Methodology questions and proposals:
[stelow issues](https://github.com/calionauta/stelow/issues).
Anything about the bb board, inbox, or workers:
[plugin issues](https://github.com/calionauta/bb-plugin-stelow/issues).
