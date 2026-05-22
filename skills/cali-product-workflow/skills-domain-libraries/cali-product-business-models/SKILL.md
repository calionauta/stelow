---
name: cali-product-business-models
version: 1.0.0
description: >
  [Cali] Business model frameworks and patterns for products. Covers value creation,
  delivery, capture mechanisms, and model selection criteria to formalize
  how a product creates and captures value.

  Trigger keywords: business model, value creation, revenue streams, monetization,
  canvas, business model canvas, sustainable business
---

# Product Business Models

## Goal

Formalize how your product creates and captures value — not just what you build, but how the business engine works.

## Domain Context

A business model answers: "How do we create value? How do we deliver it? How do we capture money?" Key themes:
- **Value Creation** — What value are we creating and for whom?
- **Value Delivery** — How do we reach and serve customers?
- **Value Capture** — How do we convert value into revenue?
- **Model Selection** — Choosing the right model for your context

## Value Creation Patterns

### Value Proposition Design

The core of value creation. You need:
- **Jobs to Be Done**: What users are trying to accomplish
- **Pains**: What frustrates users, slows them down, or costs them money
- **Gains**: What benefits users want and are willing to pay for

**Fit indicators:**
- **Pain-Gain fit**: Your solution addresses the most urgent pain with the most desired gain
- **Product-Market fit**: Users actively seek out and recommend your product

### Customer Segment Selection

Not everyone is your customer. Defining segments:
- **Behavioral segments**: How users behave (power users, casual users)
- **Needs-based segments**: Different jobs to be done
- **Access-based segments**: How they reach you (mobile vs. desktop)

**Key question**: Which segment(s) are you targeting, and why?

## Value Delivery Patterns

### Distribution Channels

How you reach customers:

| Channel Type | Pros | Cons |
|-------------|------|------|
| **Direct** | Higher margins, full control, customer relationship | Slower growth |
| **Indirect** | Faster reach, partner credibility | Lower margins, less control |
| **Hybrid** | Balances reach and control | Complexity |

### Customer Relationships

**Self-Service:**
- No ongoing relationship required
- Works for standardized, low-touch products
- Requires excellent onboarding and documentation

**Personal Assistance:**
- Dedicated support or success manager
- High-touch for enterprise/high-value customers
- High cost — only works for high LTV customers

**Communities:**
- Users help each other
- Reduces support burden
- Builds loyalty and engagement

**Co-Creation:**
- Customers participate in product development
- Feedback loops, beta programs
- Builds investment in product success

## Value Capture Patterns

### Revenue Streams

**Transaction-Based:**
- One-time payments (product sales, licenses)
- Recurring payments (subscriptions)
- Usage-based payments (per transaction, per unit)

**Recurring Revenue Models:**
- **Subscription**: Flat monthly/annual fee
- **Membership**: Access to club benefits + product
- **Freemium**: Free tier + paid premium

**Advertising-Based:**
- Pay per impression (CPM)
- Pay per click (CPC)
- Pay per action (CPA)

**Marketplace Models:**
- Transaction fees (% of sales)
- Listing fees
- Featured placement fees

### Pricing as Strategy

Pricing is not just "how much do we charge" — it's a strategic lever:
- **Penetration pricing**: Low prices to gain market share
- **Premium pricing**: High prices to signal quality and filter customers
- **Freemium**: Free core to attract users, monetize through upgrades
- **Dynamic pricing**: Prices that vary with demand or customer segment

## Business Model Canvas Integration

The Business Model Canvas (Osterwalder) provides a structured way to think about business models:

| Block | Description |
|-------|-------------|
| **Customer Segments** | Who are we creating value for? |
| **Value Propositions** | What value do we deliver? |
| **Channels** | How do we reach customers? |
| **Customer Relationships** | What type of relationship? |
| **Revenue Streams** | How do we capture value? |
| **Key Resources** | What resources does this model require? |
| **Key Activities** | What activities does this model require? |
| **Key Partnerships** | Who are our partners? |
| **Cost Structure** | What are the major costs? |

## Common Business Model Patterns

### SaaS (Software as a Service)

- Recurring subscription revenue
- Cloud-hosted, always-available
- Typically multi-tenant architecture
- Customer success is key metric

### Marketplace

- Two-sided network effects
- Multi-sided value proposition
- Chicken-and-egg problem (supply/demand)
- Quality control is critical

### Platform

- Enables third-party developers/builders
- API-first architecture
- Ecosystem revenue share
- Network effects through extensibility

### Freemium

- Free tier attracts users
- Conversion rate is the key metric
- Premium features justify upgrade
- Viral loop for growth

### API Business

- Developer-centric product
- Usage-based pricing
- Documentation and DX matter
- Integration dependencies

## Model Selection Criteria

When choosing a business model:

| Criteria | Questions |
|----------|-----------|
| **Customer willingness** | How do customers prefer to pay? |
| **Value delivery** | How is value delivered? |
| **Market norms** | What models are standard in your industry? |
| **Margins** | What margin does each model support? |
| **Scalability** | How does each model scale? |
| **Competition** | What models are competitors using? |

## Workflow

Use this domain skill within cali-product-workflow:

| Phase | Domain Skill Contribution |
|-------|---------------------------|
| Phase 1 (Setup) | Business model research |
| Phase 2 (Context) | Model analysis |
| Phase 3 (Shape) | Business model in scope |
| Phase 6 (Interface) | Business model in UI |
| Phase 10 (Planning) | Business model feature scopes |

## Output Format

This domain skill contributes to:
- **spec-product.md** — Business model section
- **spec-tech.md** — Business model feature scopes
- **interface proposals** — Business model UI decisions

## Gotchas

1. **Model-market fit** — Not every model works for every product
2. **Unit economics** — Model must support healthy unit economics
3. **Value before capture** — Create value before worrying about capture
4. **Model evolution** — Business models can and should evolve

## Related Skills

- **cali-product-workflow**: Orchestrates product planning
- **cali-product-pricing**: Pricing strategies
- **cali-product-ads**: Ad-based revenue
- **cali-product-marketplace-playbook**: Marketplace-specific models

## Environment Adaptation

If a tool is unavailable, check:
`../../../../cali-product-workflow/references/cli-tools/`