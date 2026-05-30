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
- **[Shape Up](https://basecamp.com/shapeup) methodology** — IN/OUT scope boundaries, risk analysis, focused scoping
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
- [📋 Skills (22)](#-skills-22)
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

- **22 sub-skills** organized into 4 layers — orchestrator + strategies + workflow stages + tactics
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
| **Phases** | 4 (Analysis → Planning → Solutioning → Implementation) | Skills system (14 skills) | 15 stages (Triage → Setup → Strategy → Shape Up → Critique → Gate → Scope → Interface → Int.Gate → Selection → Tech Planning → Execution → Verification → Execution Critique) |
| **Scope Definition** | User stories, epics | Implementation plans | Shape Up with IN/OUT boundaries |
| **Domain Knowledge** | Generic product workflows | Code patterns, best practices | 8 domain libraries (Pricing, Trust, Ads, Promotions, Open Source, Health, Marketplace, Business Models) + 5 strategic approaches (JTBD, Discovery, Opportunity Mapping, Market Analysis, Evolutionary Principles) |
| **Review** | Manual or configured checklists | Subagent quality check | Plannotator visual gate with point-by-point comments |
| **Interface** | 1 UX design workflow (ux-spec.md) | 2-3 text approaches + optional browser | 5 ASCII archetypes + LLM hybrid creation |
| **Testing** | Sprint-based (dev-story + code-review) | TDD-first with subagents | Context-aware: TDD critical paths, mutation targets (70/50/30%), greenfield/brownfield |
| **Execution** | Story-by-story sprint cycle | Batch execution with review checkpoints | Typed scopes with dependency mapping and sequencing |

---

## ❤️ Radical Transparency

This workflow is a tool for **amplifying human judgment**, not a substitute for it.
It forces structure that teams often skip: multi-angle critique, IN/OUT boundaries,
tech sequencing, gap analysis. But the underlying AI still has real limitations you
need to know about.

### What the AI still gets wrong (even with this workflow)

| # | Problem | Evidence | What the workflow tries to do | Why it's not solved (honest assessment) |
|---|---------|----------|------------------------------|----------------------------------------|
| 1 | **Context rot** — compliance with own rules drops from ~73% (turn 5) to ~33% (turn 16) in long sessions | [Gamage 2026](https://arxiv.org/abs/2604.20911), 4,416 trials, 12 models/8 providers (Omission Constraints Decay). Replicated by Liu et al. 2023 "Lost in the Middle". | Subagents use `context: "fork"` per [`subagents.md`](skills/cali-product-workflow/references/cli-tools/subagents.md) — each subagent starts fresh, bypassing context rot. Ordered-execution-goal (`/sisyphus-set`) creates isolated scope execution. Execution stage has an explicit "Context Rot Check" that re-reads the plan from disk (not memory). Setup stage has Resume Mechanics for cross-session handoff. Session-knowledge artifacts preserve decisions per session. | **Reduced but not solved.** The orchestrator itself can forget its own rules in a long session spanning multiple stages — the markdown instructions are still processed inside a potentially degraded context. The subagent fork helps for individual scope execution (each subagent starts fresh), but the orchestrator's own context degrades. The core transformer limitation (U-shaped attention curve) remains intrinsic. You will still experience context rot in long overall sessions. |
| 2 | **80% Problem** — AI ships the happy path (CRUD, main flow) but omits error handling, observability, security, retry, rollback, edge cases | [Osmani Jan 2026](https://addyo.substack.com/p/the-80-problem-in-agentic-coding) (coined the term); [GitClear 2025](https://www.gitclear.com/ai_assistant_code_quality_2025_research) (refactored code 22% → 10%, copy/paste 8.3% → 12.3% over 211M LOC, 2020-2024) | Tech Planning requires NFRs per scope. Verification includes an explicit "invisible 20%" checklist (error handling, security, observability, validation). Execution Critique checks NFR coverage as its own criterion. | **Partially mitigated.** Explicit checklists catch some omissions — if the LLM reads them. But the same model that implemented the code also evaluates the checklist. Blind spots transfer. No guarantee the LLM will understand what "retry with exponential backoff" means in your specific domain. Human review of error paths is still the only reliable mitigation. |
| 3 | **Model dependency** — Claude Opus, Gemini Flash, GPT-4o produce significantly different quality. Smaller models miss more. | [Veracode 2025](https://www.veracode.com/wp-content/uploads/2025_GenAI_Code_Security_Report_Final.pdf) (45% of AI-generated code contains flaws across 100+ models, 4 languages); [Anthropic Jan 2026](https://arxiv.org/abs/2601.20245) (RCT: AI-assisted devs score 17% lower on comprehension tests, 0% productivity gain) | Every artifact tracks `generated_by: {model_name}` in frontmatter so you know what generated it. Gate stage shows provenance before Plannotor review ("Spec by X, Critique by Y, Interfaces by Z"). | **Transparency, not mitigation.** Knowing the model helps you calibrate expectations, but it doesn't fix the quality gap. If a small model generated your tech plan, the entire execution rests on an unreliable foundation. The workflow cannot compensate for the model you chose. The comprehension penalty (Anthropic 2026) affects users regardless of which model does the work. |
| 4 | **Constraint decay** — the AI progressively violates its own self-imposed rules over time | [arXiv 2026 (Constraint Decay)](https://arxiv.org/abs/2605.06445) — structural constraints drift in backend code generation; [HORIZON (arXiv 2026)](https://arxiv.org/abs/2604.11978) — agents break on long-horizon tasks; [Beyond pass@1 (arXiv 2026)](https://arxiv.org/abs/2603.29231) — reliability drops as task duration increases | Context rot rules explicitly warn about this in the orchestrator. "No patching in degraded context" rule blocks the most common decay pattern. | **Same root cause as context rot.** The warning helps, but stopping a session mid-flow is disruptive and users rarely do it. The workflow's own stage index can drift if a long session handles multiple stages — the LLM might skip steps it already "remembers" doing. |
| 5 | **Code hallucination** — AI invents APIs, functions, or contracts that don't exist (~20% of failures) | [arXiv 2024 (CloudAPIBench)](https://arxiv.org/abs/2407.09726) — 20.41% of failures are hallucinated APIs; [arXiv 2024 (Code LLM failures)](https://arxiv.org/abs/2407.06153) — extensive empirical study; [arXiv 2024 (Package Hallucinations)](https://arxiv.org/abs/2406.10279) — novel package confusion attack vector | Verification stage runs the test suite, which catches some hallucinated APIs. Execution Critique includes implementation quality as a criterion. | **Caught by tests, not by the workflow.** If the hallucinated API compiles but has wrong behavior, tests should catch it. If tests don't exist (or are also hallucinated), neither Verification nor Critique detects it. This workflow structures what to build — it cannot verify what the AI built matches reality. |
| 6 | **Shallow review trap** — the same LLM that wrote the code also reviews it. Green tests are not evidence of correctness when the same AI wrote both. | [Ox Security "Army of Juniors" 2025](https://www.ox.security/wp-content/uploads/2025/10/Army-of-Juniors-The-AI-Code-Security-Crisis.pdf) (300+ repos, 10 anti-patterns, AI code deployed to production with critical flaws); verified by [InfoQ](https://www.infoq.com/news/2025/11/ai-code-technical-debt/) and [Help Net Security](https://www.helpnetsecurity.com/2025/10/27/ai-code-security-risks-report/) | Verification uses `context: "fork"` subagent reviewers per [`subagents.md`](skills/cali-product-workflow/references/cli-tools/subagents.md) — same model but fresh context with reviewer instructions. Cross-model review documented in [`cross-model-review.md`](skills/cali-product-workflow/references/cli-tools/cross-model-review.md) — commands for `pi -p`, `opencode --file`, `claude -p`, `codex`. Mutation testing recommended. Execution Critique includes "Don't trust the same model" warning. | **Opt-in, not automatic, but subagent fork already helps.** The `context: "fork"` subagent reviewers give a fresh-context review even with the same model — same model but clean context with reviewer instructions, which catches different issues than the original executor's degraded context would. Cross-model review requires a second CLI installed; the workflow does NOT auto-detect which CLIs are available. True cross-model independence requires at least two distinct provider CLIs on the system. |
| 7 | **Expertise cliff** — AI fails in mature codebases with implicit conventions, undocumented architecture, organizational knowledge that isn't in any file | [Tian Pan Mai 2026](https://tianpan.co/blog/2026-05-04-expertise-cliff-tacit-knowledge-ai-coding-agents) (tacit knowledge violation in brownfield); [METR 2025 RCT](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) (experienced devs 19% slower with AI, 0% AI PRs mergeable as-is) | The workflow's domain libraries and structured specs help surface some conventions, but they don't replace organizational knowledge. Execution Critique checks for broken refs and anti-patterns. | **Not addressed.** This workflow was designed for greenfield projects or well-documented features. If your codebase has 10 years of undocumented architecture decisions, the AI will violate them regardless of how structured the plan is. The 19% slowdown (METR 2025) applies here too — experienced devs navigating mature codebases with AI may actually be slower. |
| 8 | **Plan staleness** — plans are generated against one snapshot of the codebase; by the time execution starts, the target has changed | [Superpowers Issue #989](https://github.com/obra/superpowers/issues/989) (parallel sessions cause spec/plan staleness, fixed via worktree isolation in PR #997) | Each stage re-reads artifacts from disk. Execution has a Context Rot Check that re-reads spec-tech.md from disk (not memory). Gate stage freezes spec-product.md after Plannotator approval. Git worktree check creates isolated branches.  **Plan staleness detection now added:** before scope execution, `git diff HEAD -- $(paths from spec-tech.md)` detects if target files changed since the plan was created. If diff > 0, alert: "Target files changed since plan. Verify before continuing?" | **Staleness detected but not auto-resolved.** The new git diff check surfaces staleness, but: (1) it only detects file-level changes, not semantic staleness (renamed functions, restructured modules), (2) the LLM decides whether the staleness matters — no mechanism forces re-plan, (3) the spec-tech.md might reference files that don't exist at those paths anymore. |
| 9 | **Pipeline memory loss** — the pipeline has no cross-session memory of its own failure patterns. The same mistake repeats in every cycle. | [Flamehaven 2026](https://flamehaven.space/writing/the-two-problems-no-one-talks-about-in-ai-agent-coding-pipelines/) (cross-session memory, MICA governance schema); validated by [CODESKILL (arXiv 2026)](https://arxiv.org/abs/2605.25430), [FORGE (arXiv 2026)](https://arxiv.org/abs/2605.16233), [Agent Learning Flywheel (Augment Code 2026)](https://www.augmentcode.com/guides/agent-learning-flywheel) — all confirm cross-cycle learning improves agent performance | Execution Critique saves lessons to `.cali-product-workflow/lessons-learned/{date}-{name}.md`. Setup stage (0b) automatically reads past lessons and injects them with explicit instruction to check for repeated patterns **plus forced reflection:** "List 3 patterns to avoid in THIS cycle." No user action needed. The gap registry tracks recurring patterns. Academic research (CODESKILL 2026, FORGE 2026) confirms that injecting past learnings as structured context improves future agent decisions, especially for meta-knowledge (validation routines, failure patterns). | **Captured, injected with forced reflection, but limits remain.** Research validates the approach (CODESKILL: meta-knowledge transfers better than code; FORGE: same-LLM memory evolution works). Forced reflection improves the LLM's processing of lessons. However: (1) the same model that made mistakes reads the lessons, (2) context rot can still cause mid-session forgetting of the reflection, (3) lesson quality depends on Execution Critique's blind spots, (4) cannot auto-verify lesson adherence. |
| 10 | **Code complexity growth** — AI-generated code tends to increase complexity over time. Static analysis warnings +30%, code complexity +41% after month 2 of sustained AI use. | [Cursor Study (MSR 2026)](https://arxiv.org/abs/2511.04427) — causal estimate: static analysis warnings +30%, code complexity +41% after month 2; [Faros AI 2025](https://www.faros.ai/ai-productivity-paradox) (47% more PRs/day, 0 DORA improvement across 10K developers, 1,255 teams) | Execution Critique includes anti-pattern detection (god functions >100 lines, global mutable state). Execution's optional Code Quality Gate now includes language-agnostic static analysis: `go vet ./...` (Go), `npm run lint` (Node), `ruff check .` or `pylint` (Python), `cargo clippy` (Rust). | **Caught too late, but now static analysis is language-agnostic.** Complexity analysis happens after code is written. The Code Quality Gate's static analysis commands work across Go/Node/Python/Rust (not just eslint/tsc). Still, the workflow has no mechanism to prevent complexity during generation — only flag it after. Preventive measures (architecture boundaries, human review) are outside workflow scope. |
| 11 | **Activity ≠ productivity** — more PRs, more commits, more tasks completed does not mean more value delivered. AI teams look busy without being effective. | [METR 2025 RCT](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) (19% slower for experienced devs, $0.5M-2M cost/repo for full rollout); [Faros AI 2025](https://www.faros.ai/ai-productivity-paradox) (9% more tasks, 47% more PRs, 0% DORA improvement); [Stack Overflow 2025 Survey](https://survey.stackoverflow.co/2025) (45% of devs find AI debugging takes longer, 66% frustrated with "almost right" AI solutions) | The workflow is designed to reduce activity — OUT/IN scoping in Shape Up keeps proposals focused. The Execution Critique's decision matrix includes "close without follow-up" as a valid outcome. | **Philosophical tension.** The workflow itself generates activity (artifacts, sessions, gates, critiques). More structure could mean more busywork. The Shape Up skill has OUT/IN scoping BUT no explicit appetite mechanism (no time-constrained betting) — so there is no enforced limit on scope size. The 19% slowdown for experienced devs (METR 2025) raises an uncomfortable question: this workflow might add overhead without proportional value for some teams. |

### How to read this table

Each row is honest about what the workflow can and cannot do. We don't claim mitigations
are solutions. Every "What the workflow tries to do" cell has a corresponding "Why it's
not solved" cell. Read both before deciding whether this workflow helps your context.

### What this means for you

- **Every artifact is a draft.** Treat spec-product.md, spec-tech.md, critique reports,
  and interface proposals as first drafts that need human eyes.
- **Results vary by model and codebase.** A small model generating a plan for a mature
  codebase is a recipe for failure — regardless of how structured the workflow is.
- **Human review is required.** The workflow catches structural gaps (missing scopes,
  contradictory requirements, some untested edge cases). It does NOT catch logic errors
  in individual lines, security flaws in business logic, or nuanced architectural
  trade-offs — those need you.
- **None of the 11 problems above are solved by any framework.** Not BMAD (47K⭐), not
  Superpowers (199K⭐), not SpecKit, not GSD. We're transparent about it because the
  limitation is not in any framework — it's in the technology itself.

> We don't claim to solve product planning. We claim to **structure the thinking**
> so you catch more before you code. The rest is still up to you.

---

## 🚀 Quick Start

This package works across **multiple coding agents** — not just pi.dev. See the compatibility table in [Installation](#-installation) to pick your path.

| Your situation | Recommended command | What you get |
|----------------|--------------------|-------------|
| **New to CLIs** (no Node, no agent) | `curl -fsSL https://raw.githubusercontent.com/.../setup.sh \| sh` | Node.js + pi.dev + all extensions + 22 skills |
| **Already use pi.dev** | `git clone ... && ./install.sh` | 22 skills + TUI overlay + slash commands |
| **Use OpenCode / Claude Code / Codex** | `git clone ... && ./install.sh` | 22 skills + command files (no TUI) |
| **Any CLI (skills only)** | `npx skills add renatocaliari/cali-product-workflow -g` | 22 skills via DotAgents Protocol |

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for detailed options.
Per-agent configuration files (commands, install scripts) are in [`cli-agents/`](cli-agents/).

---

## 📦 Installation

### CLI Compatibility

Not every feature works on every CLI. Here's what to expect:

| Feature | pi.dev | OpenCode | Claude Code | Codex |
|---------|--------|----------|-------------|-------|
| **Skills (all 22)** | ✅ | ✅ | ✅ | ✅ |
| **`/pw-start`, `/pw-menu` commands** | ✅ Slash commands | ✅ Via `pw-*.md` files | ✅ Via command files | ✅ Via command files |
| **TUI overlay (real-time status)** | ✅ Native | ❌ | ❌ | ❌ |
| **Plannotator visual gate** | ✅ Extension | ⚠️ Manual | ⚠️ Manual | ⚠️ Manual |
| **Deep hooks (events, gates)** | ✅ Extension | ❌ | ❌ | ❌ |

> **Bottom line:** The **22 skills work identically on every CLI** — they run the full Shape Up workflow, generate plans, critique, scopes, everything. The TUI overlay and deep integration features are Pi-only because only Pi exposes an extension system. All CLIs can still complete the workflow; it just happens in chat rather than a visual panel.

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

The installer detects your CLI and installs **skills + command files**. No extensions, no TUI — just the 22 skills that run the workflow.

**Or, with npx (no clone needed):**

```bash
npx skills add renatocaliari/cali-product-workflow -g
```

This installs all 22 skills to `~/.agents/skills/` — works on any CLI.

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

The workflow has **3 conceptual phases** that contain **15 sequential stages**, from idea triage to post-execution audit. See the [`🥙 Stage Index`](#-skills-22) in the orchestrator skill for the complete stage map with auto-chain rules and flow diagram.

### 1. 🎨 Shaping

**Stages 0–11** — From raw idea through shaped proposal, adversarial critique, visual gate approval, interface exploration, to typed technical scopes ready for execution.

### 2. ⚡ Execution

**Stages 12–13** — Autonomous scope execution via ordered-execution-goal, supervised, with context-rot and plan-staleness checks before each scope.

### 3. ✅ Verification & Audit

**Stage 14** — Full test suite, parallel code review, UI quality audit, and execution critique (scope fidelity, NFR coverage, edge cases, docs, test quality).

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

## 📋 Skills (22)

All 22 skills are flat in `skills/` directory, ready for `~/.agents/skills/`. They're organized into 4 layers:

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

### ⚙️ Workflow Stages (8)

| Skill | Purpose |
|-------|---------|
| `cali-product-shape-up` | Shape Up planning — IN/OUT boundaries, risk analysis, focused scoping |
| `cali-product-interface-brainstorm` | Interface exploration in ASCII art |
| `cali-product-critique` | Multi-dimensional critique (plan / codebase / site) |
| `cali-product-tech-planning` | Technical scope generation with dependency mapping |
| `cali-product-testing-ai-code` | AI-aware mutation testing strategy |
| `cali-product-testing-execution` | Post-implementation testing protocol |
| `cali-product-scope-executor` | Autonomous scope execution with dependency mapping |
| `cali-product-execution-critique` | Post-execution audit (scope fidelity, NFRs, edge cases, docs, test quality) |

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