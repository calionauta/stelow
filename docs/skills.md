# Skills

30 skills, flat in `skills/`, installed into `~/.agents/skills/`: 15 that
run the workflow (`stelow-workflow-*`, the machinery) + 15 consulted as
knowledge while doing it (`stelow-product-*`, reference only — none
executes a stage). Every skill is self-contained and invokable standalone,
independent of the orchestrator.

## Workflow (15)

| Skill | Purpose |
|---|---|
| `stelow-workflow-orchestrator` | Coordinates the 17-stage pipeline |
| `stelow-workflow-entry` | Entry point: classifies intent, scaffolds state, picks the first stage |
| `stelow-workflow-router` | Reads state, validates hand-offs, advances stages |
| `stelow-workflow-shape-up` | Shape Up planning + appetite-gated codebase recon (Tech Preview) |
| `stelow-workflow-plan-critique` | Adversarial plan review (gaps, risks, assumptions, feasibility) |
| `stelow-workflow-interface-alternatives` | 1/3/5 interface archetypes by appetite + hybrid |
| `stelow-workflow-interface-contrast` | Reaction-first contrast with a recorded disposition |
| `stelow-workflow-tech-planning` | Typed scope generation + Alignment Check |
| `stelow-workflow-scope-executor` | Acceptance-contract scope execution with self-correction |
| `stelow-workflow-execution-critique` | Post-execution audit (FIXED / DOCUMENTED / ESCALATED gaps) |
| `stelow-workflow-codebase-critique` | Structural codebase review |
| `stelow-workflow-ux-critique` | UX/UI audit (a11y, heuristics, AI slop) |
| `stelow-workflow-testing-ai-code` | AI-aware testing strategy |
| `stelow-workflow-testing-execution` | Post-implementation testing protocol |
| `stelow-workflow-coding-standards` | Coding standards (KISS, DRY, LoB, SoC, Fail Fast, YAGNI, size limits) |

## Product (15)

Nine are **domain libraries**, detected from your language at the context stage (eight carry explicit signal rows; paywall is consulted without one); six are **method playbooks** used across the context, triage, and scope stages. The split is derived, not hand-maintained — `node site/build.mjs --check` pins it against the context-stage signal table (paywall is the one documented exception).

| Skill | Kind | Strategy |
|---|---|---|
| `stelow-product-pricing` | domain | Pricing strategy and tactics |
| `stelow-product-trust-building` | domain | Trust-building mechanisms |
| `stelow-product-ads` | domain | Advertising and growth channels |
| `stelow-product-promotions` | domain | Promotions and campaigns |
| `stelow-product-paywall` | domain | Paywall-first monetization funnel |
| `stelow-product-open-source` | domain | Open source strategy |
| `stelow-product-health` | domain | Product health metrics (signals in tension) |
| `stelow-product-marketplace-playbook` | domain | Marketplace dynamics |
| `stelow-product-business-models` | domain | Business model options |
| `stelow-product-discovery` | method | Short-cycle product validation |
| `stelow-product-job-to-be-done` | method | Segmentation, job map, desired outcomes |
| `stelow-product-opportunity-mapping` | method | Ranked solutions for a problem |
| `stelow-product-multi-method-market-analysis` | method | PESTLE, foresight, Delphi, Wardley maps |
| `stelow-product-evolutionary-principles` | method | Adaptability and optionality beyond roadmaps |
| `stelow-product-scope-mapping` | method | Vertical delivery scopes with boundaries and dependencies |

Per-strategy output contracts (single / variant / composite) live in
`product-strategies.json` — the canonical registry hosts consume. Any
skill add/remove/rename updates that registry in the same commit.

## Distribution

- In bb, the plugin vendors all 30 and auto-syncs them from this repo —
  no manual step (`bb skill list` to confirm).
- Everywhere else, `./install.sh` or `npx skills add calionauta/stelow -g`
  installs them standalone. Never hand-edit vendored copies downstream;
  fix methodology here and let the sync propagate.
