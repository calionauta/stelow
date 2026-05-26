## Stage 2: Strategic Context (optional)

> **Part of cali-product-workflow** — See [`SKILL.md`](./SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.

**After Stage 1 (Setup)**, the flow enters Stage 2 to enrich planning with optional context.
The LLM checks if the user should be offered strategic analysis and/or domain libraries.

### 2a. Strategic Exploration (always ask)

**ALWAYS ask** — use **Pattern 1** from `stages/ask-patterns.md` for the question format.
**ALSO read** the "Strategic Approaches" table in the main `SKILL.md` for the full approach list with skill names and outputs.

> **⚠️ Multi-Select Rule:** When using `multiSelect: true`, DO NOT include "None", "Skip", or similar meta-options. User can select nothing to skip.

**If user selects one or more approaches:**
1. Read `references/strategic-exploration.md` for each approach's details
2. Execute the selected ones **in parallel** via subagent:
```typescript
subagent({
  tasks: selectedApproaches.map(approach => ({
    agent: "delegate",
    task: `Execute the analysis using the corresponding skill for the context: [project context].
Use the skill: cali-product-${approach.skill}
Save results to .cali-product-workflow/{YYYY-MM-DD}/{_dir}/strategic/${approach.name}.md`,
    output: `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/strategic/${approach.name}.md`,
    context: "fork"
  })),
  concurrency: selectedApproaches.length // all in parallel
})
```
3. Consolidate into `strategic-insights.md`
4. Incorporate outputs as Shape Up input

**If nothing selected (No strategic analysis):** proceed directly to Stage 2b.

### 2b. Domain Context Detection (conditional — LLM-driven)

**After Stage 2a**, the LLM analyzes the user's original request for **domain signals**:

| User Input Signal | Domain | Skill |
|---|---|---|
| "price", "pricing", "how much to charge", "subscription" | Pricing | `cali-product-pricing` |
| "launch", "promotion", "black friday", "coupon", "discount" | Promotions | `cali-product-promotions` |
| "ad", "ads", "facebook ads", "google ads", "paid traffic" | Ads | `cali-product-ads` |
| "trust", "guarantee", "social proof", "credibility" | Trust | `cali-product-trust-building` |
| "business model", "revenue", "monetize", "make money" | Business Models | `cali-product-business-models` |
| "open source", "community edition" | Open Source | `cali-product-open-source` |
| "product health", "product metrics", "addiction", "wellbeing" | Health | `cali-product-health` |
| "marketplace", "marketplace supply", "marketplace demand" | Marketplace | `cali-product-marketplace-playbook` |

**Two detection modes:**

**Mode A — Purely domain-specific request** (user asks only about a domain topic):
The user's request is exclusively about one of these domains (e.g., "help me define a pricing strategy").
→ Route directly to the detected skill. Do NOT proceed to Shape Up.
→ The user can always choose to continue to Shape Up afterwards.

**Mode B — General product request with domain overlap** (user asks for product planning but mentions domains):
The user wants full product planning but the input also contains domain signals.
→ Offer domain libraries as **complementary context** using `ask_user_question`:

```typescript
ask_user_question({
  questions: [{
    question: `Your request mentions specific areas. Would you like to load reference playbooks to enrich planning?
Each playbook provides frameworks and references about the domain.`,
    header: "Domain Libraries",
    multiSelect: true,
    options: [
      // Only include options for detected domains, e.g.:
      // {
      //   label: "Pricing",
      //   description: "Exchange base, consumption control, interest alignment, perception techniques"
      // },
      // {
      //   label: "Promotions",
      //   description: "MAGIC framework, Loss Leader, Gift Card Sale, Limited Package"
      // },
      // ... (only the detected ones)
    ]
  }]
})
```

**If user selects libraries:**
1. Load the selected skill(s) content as additional context
2. Proceed to Stage 3 (Shape Up) with domain context enriched

**If nothing detected or user declines:** proceed directly to Stage 3 (Shape Up) or end.
