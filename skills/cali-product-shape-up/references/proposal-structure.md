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
`interface-alternatives`

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
- IN items should be scoped to fit the declared appetite
- OUT items can be revisited in future cycles
- If the scope doesn't fit the appetite: split, don't extend the appetite

---

## 4. Output Frontmatter Template

The proposal MUST include this YAML frontmatter at the top:

```yaml
---
name: {product-name}
product_type: {software|service|hybrid}
appetite: {PoC|Focused|Comprehensive}  # human-set: depth of scope to prepare
appetite_source: {setup|resume}         # where it was defined
complexity_estimate: {XS|S|M|L|XL}     # LLM-set: estimated review effort the output requires
interface: {none|standard|full}
created_at: {YYYY-MM-DD}
approved: false
generated_by: "{model_name}"
---
```

### appetite options:

| Level | Spec size | Scopes | Alternatives | Edge cases | Each checkbox adds |
|-------|-----------|--------|-------------|------------|-------------------|
| `PoC` | ~1 page | 1-2 | 1 direct | Not documented | +1 scope each |
| `Focused` | ~3 pages | 3-5 | 1-2 | Only obvious ones | +2-3 scopes each |
| `Comprehensive` | ~8+ pages | 8-15 | 3-5 compared | Fully mapped | +3-5 scopes each |

> **Appetite measures preparation depth, not human review time.** The LLM changes how it produces output based on appetite: PoC generates a minimal spec, Comprehensive generates a full multi-feature specification with alternatives and edge cases.

> **Who sets appetite:** The human in the setup stage, using two independent choices: Appetite (depth) + Mode (interaction level). Mode is stored separately in `index.json` and controls gates/questions/approvals.

> **`complexity_estimate`** is the LLM's estimate of how much review effort the proposed output will take. The LLM fills this by comparing the proposed scope against the human-declared appetite. If `complexity_estimate > appetite`, the scope is too large — it must be split before proceeding.

> **Golden rule:** If `complexity_estimate > appetite`, the LLM must suggest splits or scope reductions until it fits. The final decision to extend appetite (or accept the split) is always human.

### Mode (separate from appetite)

Mode is defined independently and stored in `index.json`. It affects gates and questions but NOT depth of scope:

| Mode | Plannotator Gates | User Questions | Interface | IN/OUT Confirmation | Tech Approval |
|------|------------------|---------------|-----------|---------------------|---------------|
| Auto | None | None | LLM recommends | LLM decides | Auto |
| Light | 1 (pre-tech) | None (final confirm) | LLM recommends | LLM decides | Gate only |
| Moderate | 1 (pre-tech) | Interface selection | User chooses | LLM decides | Gate only |
| Full Product | Gate + Int-Gate | All except technical | User chooses | User confirms | Auto |
| Full Product + Tech | Gate + Int-Gate | All including technical | User chooses | User confirms | Gate + tech Qs |

### Appetite Cascade (how each level affects the workflow)

| Level | Plan Critique | Codebase Critique | UX Critique | Interface Brain | Verification |
|-------|--------------|-------------------|-------------|----------------|-------------|
| `PoC` | Optional | Skip | Skip (no UI) | Skip | test-suite only |
| `Focused` | Required | Normal | Normal | Normal (5 props) | test + lint |
| `Comprehensive` | Parallel 4x | Complete | Live + a11y | Full (5 props) | Full test + audit + review |

**Note:** Mode blocks gates/questions independently of this cascade. E.g., even with Comprehensive appetite, if mode=Auto, Plannotator is skipped and no questions are asked. |

### product_type options:

| Type | Description | Testing Skill Activated? |
|------|-------------|--------------------------|
| `software` | Codebase product (web, mobile, CLI, library) | ✅ Yes — cali-product-testing-ai-code |
| `service` | Consulting, managed, or operational service | ❌ No |
| `hybrid` | Service + software components | ✅ Yes — cali-product-testing-ai-code |

**Decision rule:** If the outcome includes code that will be committed to a repository, use `software` or `hybrid`.

### When to ask:

Use the ask tool (see `references/cli-tools/structured-question.md`) to determine `product_type` if ambiguous:

```
ask tool: "What type of product is this?"
Options:
  - Software (codebase): Web app, mobile, CLI tool, library. Triggers AI-aware testing strategy.
  - Service (managed): Consulting, managed service, operations. No testing strategy.
```