---
name: cali-product-pricing
description: >
  [Cali] Pricing strategies and models for product offerings. Covers exchange bases,
  consumption control, interest alignment, and perception techniques to formalize
  value exchange agreements.

  Trigger keywords: pricing strategy, subscription model, payment model, pricing page,
  freemium, value exchange, pricing research
---

# Product Pricing

## Goal

Think about pricing as a **formalization of value exchange** — an agreement on how risk and benefit are shared between provider and customer.

## Domain Context

Pricing decisions shape the business model. Key themes:
- **Exchange Base** — What the customer gets vs. what they pay
- **Consumption Control** — How usage is measured and billed
- **Interest Alignment** — Risk and reward sharing
- **Perception** — How value is communicated and understood

## Models — Exchange Base

### One-Time Payment for Ownership — "Buy It, It's Yours"

Definitive transaction. The customer pays once and assumes total ownership and responsibility. Works well for durable goods or digital products where the maintenance cost for the creator is zero after sale.

### Payment for Access (Instead of Ownership)

The logic is the exchange of permanent ownership for temporary access. Manifests in main forms:

**1. Access by Time Period:**
- *Recurring subscription*: periodic payment (usually monthly) to maintain continuous access. Standard model for Netflix, Spotify, most SaaS.
- *Finite term license*: one-time payment for access for a long and predetermined period (one or five years). At the end of the term, access ends without automatic renewal. Offers predictability for both sides.

**2. Access per Unit of Outcome:** payment is tied to a specific and transactional delivery. Example: AI service that transcribes audios — the customer pays R$ 0.10 per minute of transcribed audio. Pays for output, not for time of use.

⚠️ Don't confuse with "value-generated pricing": in access per unit of outcome, the price is fixed per transaction (X per minute, Y per image). In value-generated pricing, it's a variable percentage of a business impact (Z% of revenue increase).

## Models — Consumption Control

### Pre-Paid Credits Payment

The customer buys a package of "credits" in advance, consumed as they use the service. Gives clear control over spending and guarantees upfront revenue for the company. Forces awareness about use — each action has a visible cost that deducts the balance, making consumption more intentional.

### Computational Granularity Pricing

Driven by variable cost technologies like AI. Price is tied directly to the resource consumed: per seconds/minutes of time that an AI model uses a specialized processor (GPU/TPU), per token of text processed, or per image generated. Reflects the real economy behind the service.

## Models — Interest Alignment

### Performance Payment

The provider assumes part of the client's risk. Payment is not tied to the product or time of use, but to the concrete result it generates. If the expected result is not achieved, payment is reduced or non-existent. Requires high trust and ability to measure "performance", but creates powerful alignment of interests.

### Value-Generated Pricing

Evolution of performance payment. Price is tied to a high-level business indicator — percentage of additional revenue or cost savings that the service provided. It's the deepest form of partnership, turning the provider into a partner in the result.

### Payment with Data

The customer receives a discount or free access in exchange for permission for their data to be used to train and improve the system, especially AI models. Formalizes a value exchange that often happens in a hidden way.

## Models — Combinations and New Frontiers

### Bundling

Instead of selling items separately, group them in a "bundle" with a single price. Increases perceived value (the customer feels they get more for less) and simplifies the pain of purchase decision (a single transaction instead of several micro-transactions).

### Hybrid Pricing

Combine multiple models to capture different customer segments. Example: base subscription + consumption-based add-ons.

## Workflow

Use this domain skill within cali-product-workflow:

| Phase | Domain Skill Contribution |
|-------|---------------------------|
| Phase 1 (Setup) | Pricing model research |
| Phase 2 (Context) | Business model analysis |
| Phase 3 (Shape) | Pricing strategy in scope |
| Phase 6 (Interface) | Pricing page UI |
| Phase 10 (Planning) | Pricing feature scopes |

## Output Format

This domain skill contributes to:
- **spec-product.md** — Pricing strategy section
- **spec-tech.md** — Pricing feature scopes
- **interface proposals** — Pricing page designs

## Gotchas

1. **Value before price** — Define value proposition before setting prices
2. **Hidden exchanges** — Formalize implicit value exchanges (e.g., data for access)
3. **Cost awareness** — AI services have variable costs — reflect this in pricing
4. **Customer segmentation** — Different models for different segments (B2B vs B2C)

## Related Skills

- **cali-product-workflow**: Orchestrates product planning
- **cali-product-business-models**: Business model context
- **cali-product-promotions**: Pricing tactics and promotions
- **cali-product-marketplace-playbook**: Marketplace-specific pricing

## Environment Adaptation

If a tool is unavailable, check:
`../../../../cali-product-workflow/references/cli-tools/`