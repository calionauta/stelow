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
`interface-brainstorming`

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
- IN items should be completable within the appetite
- OUT items can be revisited in future cycles

---

## 4. Output Frontmatter Template

The proposal MUST include this YAML frontmatter at the top:

```yaml
---
name: {product-name}
product_type: {software|service|hybrid}
interface: {none|standard|full}
created_at: {YYYY-MM-DD}
approved: false
generated_by: "{model_name}"
---
```

### product_type options:

| Type | Description | Testing Skill Activated? |
|------|-------------|--------------------------|
| `software` | Codebase product (web, mobile, CLI, library) | ✅ Yes — cali-product-testing-ai-code |
| `service` | Consulting, managed, or operational service | ❌ No |
| `hybrid` | Service + software components | ✅ Yes — cali-product-testing-ai-code |

**Decision rule:** If the outcome includes code that will be committed to a repository, use `software` or `hybrid`.

### When to ask:

Use `ask_user_question` to determine `product_type` if ambiguous:

```typescript
ask_user_question({
  questions: [{
    question: "What type of product is this?",
    header: "Product Type",
    options: [
      { label: "Software (codebase)", description: "Web app, mobile, CLI tool, library. Triggers AI-aware testing strategy." },
      { label: "Service (managed)", description: "Consulting, managed service, operations. No testing strategy." }
    ]
  }]
})
```