# Proposal Structure

## 1. 🤔 unanswered questions and unexplored issues

Generate:
- unresolved tensions
- hidden assumptions
- operational ambiguities
- validation unknowns
- missing rules

Questions should materially improve shaping quality.

---

## 2. 🧭 strategic shaping alternatives

Focus on:
- workflow strategy
- operational ownership
- automation boundaries
- rollout philosophy
- integration strategy
- responsibility models

Alternatives should:
- optimize different trade-offs
- intentionally sacrifice something
- expose implications clearly

Do NOT deeply explore UI here.

---

## 3. 📝 structured shape up proposal

### 🎯 problem

Describe:
- affected actors
- context
- operational/business impact
- current failure modes

Do not include solutions.

---

### 💡 solution

Describe:
- core approach
- linchpins
- workflows
- operational rules
- critical constraints

Avoid:
- low-level implementation detail
- visual/UI specifics

Use:
- capability name
- what it is
- why it exists
- critical behavior
- constraints
- operational implications

---

### ⚠️ dangers and uncertainties

Include:
- assumptions
- undefined rules
- integration risks
- workflow gaps
- architectural pressure
- adoption risks
- UX/workflow risks
- technical risks

Escalate major interaction complexity to:
`interface-contrast` (reaction-first decision loop with scope coverage; `interface-alternatives` only for standalone breadth exploration)

---

### 🚫 out of scope

Explicitly define:
- exclusions
- deferred integrations
- unsupported workflows
- avoided complexity

Out-of-scope protects focus.

---

### 📋 Scope Table (OUT/IN)

Use OUT/IN order (convention from Shape Up):
- **OUT**: what's intentionally excluded
- **IN**: what's committed to this cycle

| OUT | IN |
|-----|-----|
| Multi-language support | English only |
| Admin dashboard | User-facing features only |
| [feature-x] | [feature-y] |

**Rules:**
- If unclear, mark as OUT (conservative scoping)
- IN items should be scoped to fit the declared knobs
- OUT items can be revisited in future cycles
- If the scope doesn't fit the knobs: cut or split, never widen the knobs

---

## 4. Output Frontmatter Template

The proposal MUST include this YAML frontmatter at the top:

```yaml
---
name: {product-name}
product_type: {software|service|hybrid}
quality: {production|experimental}  # human-set: verification rigor
supervisor: {low|med|high}          # human-set: execution checkpoint cadence
exploration_count: {1-5}            # human-set: directions compared per divergence
exploration_hybrid: {true|false}    # hybrid synthesis whenever count >= 2
appetite: {Lean|Core|Complete}      # DEPRECATED alias, accepted and mapped once, then rewritten to knobs
appetite_fit: {fits|cuts_needed|reshape}  # LLM-set: does the shaped proposal fit within the declared knobs?
interface: {standard|full}
created_at: {YYYY-MM-DD}
approved: false
generated_by: "{model_name}"
---
```

### Run knob reference:

| Knob | Values | What it changes |
|------|--------|-----------------|
| `quality` | `production` (default), `experimental` | Production: full paths, edge cases, parallel reviewers, full test layers including security where applicable, full critique depth. Experimental: reduced paths and checks for probes; never ships as-is. |
| `supervisor` | `low`, `med`, `high` (default) | Checkpoint cadence during execution. |
| `exploration_count` | 1–5 (default 3) | Directions compared per divergence (interaction + architecture). |
| `exploration_hybrid` | true (default whenever count ≥ 2) | Hybrid synthesis after all directions complete. Count 1 has no hybrid. |

Scope ceiling: **9 scopes maximum in every cycle.** Mapping discovers the count (1–9); a narrow bugfix may record a one-scope plan with its reason. No tiers, no count targets.

**Cut policy implied by exploration breadth:**

| Breadth | What to cut first |
|----------|-------------------|
| `1` | Everything but the direct path. Trivial changes only, by explicit choice. |
| `2–3` | Low-value variants. Keep the main JTBD and obvious edge cases. |
| `4–5` | Cut nothing unless impossible. Keep full edge case mapping and domain context. |

> **Knobs measure consideration breadth and verification rigor, not human review time, and never calendar duration.** The worker changes how much it compares based on exploration breadth; verification rigor follows quality. Quality gates such as build/test/lint/typecheck and a11y checks when UI exists are never cuts.
>
> **Implementation strategies** are explored by the architecture alternatives skill (workflow strategy, rollout philosophy, integration approach, responsibility models — see §2 🧭 strategic shaping alternatives). **Interaction directions** are explored by the interaction alternatives skill; the number explored in both follows exploration breadth.

> **Who sets the knobs:** The human in the setup stage, using independent choices: quality + supervisor + exploration, then Mode (review level) separately. Mode is stored in `stelow.json#workflows[].config.review_mode` and controls gates/questions/approvals.

> **`appetite_fit`** is validated by the Plan Critique's fresh-context feasibility reviewer (see `stelow-workflow-plan-critique` checklists — Scope Fit dimension). The Shape Up stage writes a preliminary value based on a mechanical check (scope count against the ceiling of 9). The Plan Critique evaluates it properly using the existing 5-reviewer infrastructure.
>
> | Value | Meaning |
> |-------|---------|
> | `fits` | Proposal fits within the knobs — proceed as shaped |
> | `cuts_needed` | Proposal almost fits but needs targeted cuts (LLM suggests what to cut; human decides) |
> | `reshape` | Proposal fundamentally exceeds the knobs — must be reshaped before continuing |
>
> **This is NOT an estimate.** Knobs are constraints, not targets. The LLM does not estimate effort — it checks whether the shaped design fits the human's declared bounds. If it doesn't fit, the LLM proposes cuts or reshaping, never wider knobs. The final decision is always human.

### Mode (separate from knobs)

Mode is defined independently and stored in `index.json`. It affects gates and questions but NOT breadth or rigor:

| Review Mode | visual review Gates | User Questions | Interface | IN/OUT Confirmation | Tech Approval |
|-------------|------------------|---------------|-----------|---------------------|---------------|
| Auto | None | None | LLM decides | LLM decides | Auto |
| Product Spec Gate | 1 (pre-tech) | None | LLM decides | LLM decides | Auto |
| Product Spec + Interface Gates | Gate + Int-Gate | Interface selection | User chooses | LLM decides | Auto |
| Product Spec + Interface + Scopes | Gate + Int-Gate | Interface selection + scope | User chooses | User confirms | Auto |
| Product Spec + Interface + Tech Review | Gate + Int-Gate + Tech Gate | All including technical | User chooses | User confirms | Gate + tech Qs |

### Knob-specific execution budget

| Knob | Setting | Effect |
|------|---------|--------|
| Quality `production` | Always unless Experimental chosen | Full paths, edge cases, parallel reviewers, full test layers including security where applicable, full critique depth |
| Quality `experimental` | Probes only | Reduced paths and checks; output must be upgraded before shipping |
| Supervisor | low / med / high | Checkpoint cadence during execution |
| Exploration | 1–5 + hybrid (≥2) | Direction counts for interaction and architecture divergence |

**Note:** Mode blocks gates/questions independently of these knobs. E.g., even with exploration 5, if mode=Auto, visual review is skipped and no questions are asked.

### product_type options:

| Type | Description | Testing Skill Activated? |
|------|-------------|--------------------------|
| `software` | Codebase product (web, mobile, CLI, library) | ✅ Yes — stelow-workflow-testing-ai-code |
| `service` | Consulting, managed, or operational service | ❌ No |
| `hybrid` | Service + software components | ✅ Yes — stelow-workflow-testing-ai-code |

**Decision rule:** If the outcome includes code that will be committed to a repository, use `software` or `hybrid`.

### When to ask:

Use the ask tool (see `cli-tools/ask.md`) to determine `product_type` if ambiguous:

```
ask tool: "What type of product is this?"
Options:
  - Software (codebase): Web app, mobile, CLI tool, library. Triggers AI-aware testing strategy.
  - Service (managed): Consulting, managed service, operations. No testing strategy.
```