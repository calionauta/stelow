---
name: cali-product-marketplace-playbook
description: >
  [Cali] Marketplace strategies for products. Covers supply/demand dynamics,
  quality control, trust mechanisms, and platform economics to build
  successful two-sided or multi-sided marketplaces.

  Trigger keywords: marketplace, two-sided platform, supply demand, trust mechanisms,
  platform economics, multi-sided, seller buyer
---

# Product Marketplace Playbook

## Goal

Build a thriving two-sided or multi-sided marketplace by solving the chicken-and-egg problem, establishing trust, and creating sustainable platform economics.

## Domain Context

Marketplaces match buyers and sellers (or other sides). Key themes:
- **Chicken-and-Egg** — How to get both sides active simultaneously
- **Quality Control** — How to maintain quality on both sides
- **Trust Mechanisms** — How to build trust between strangers
- **Platform Economics** — How the platform captures value

## The Chicken-and-Egg Problem

Every marketplace has this challenge: buyers want sellers, sellers want buyers. Which side do you start with?

### Supply-First Strategy

Start by building supply before demand.

**Why:**
- Sellers are easier to recruit (they have inventory/ services to sell)
- Sellers bring their existing customers
- Easier to onboard in batches

**How:**
- Recruit a small group of quality sellers
- Help them succeed with dedicated support
- Use seller success to attract more sellers

**Examples:**
- Airbnb (early hosts were easy to recruit — people with spare rooms)
- DoorDash (recruited restaurants before demand was proven)

### Demand-First Strategy

Start by building demand before supply.

**Why:**
- Buyers are easier to activate (lower commitment)
- Demand creates incentive for supply
- Can identify quality supply from engagement signals

**How:**
- Seed with a small group of enthusiastic buyers
- Use waitlist for demand pressure
- Recruit sellers who can handle the demand

**Examples:**
- Uber (recruited riders at conferences, then matched to drivers)
- Instagram (built photographer community before broad adoption)

### Platform-Side Strategy

Start with the platform itself as the seller (managed marketplace).

**Why:**
- Controls quality and supply
- Generates demand through advertising
- Proves concept before enabling third-party sellers

**How:**
- Recruit your own supply (employees or contractors)
- Operate the marketplace yourself
- Gradually transition to open marketplace

**Examples:**
- Amazon (started with Amazon-curated products)
- Instacart (started with their own shoppers)

## Quality Control

### Supply Quality

**Onboarding Standards:**
- Application process (not open sign-up)
- Verification requirements
- Quality audits

**Performance Metrics:**
- Rating thresholds
- Response time
- Cancellation rates

**Escalation and Removal:**
- Warning system
- Probation periods
- Removal criteria and appeals

### Demand Quality

**Buyer Verification:**
- Payment verification
- Identity verification (for high-value transactions)
- Historical behavior review

**Bad Actor Prevention:**
- Fraud detection
- Chargeback monitoring
- Review manipulation detection

**Accountability:**
- Clear terms of service
- Enforcement actions
- Appeal processes

### Matching Quality

**Algorithm vs. Human:**
- Algorithmic matching scales but can have bias
- Human curation adds cost but improves quality
- Hybrid approaches often work best

**Search and Discovery:**
- Relevance ranking
- Personalization
- Discovery vs. search balance

## Trust Mechanisms

### Review Systems

**Review Collection:**
- Timing (when to ask for reviews)
- Incentives (don't incentivize fake reviews)
- Moderation (detect and remove fake reviews)

**Review Display:**
- Star ratings (weighted or simple average)
- Written reviews (detailed feedback)
- Photo reviews (visual authenticity)
- Reviewer credibility (verified purchases)

**Trust Scores:**
- Seller ratings over time
- Recent reviews weighted higher
- Response to negative reviews

### Identity Verification

**For Sellers:**
- Business verification (business license, tax ID)
- Identity verification (background check)
- Credential verification (licenses, certifications)

**For Buyers:**
- Email/phone verification
- Payment method verification
- Address verification

### Transaction Protection

**Escrow:**
- Hold payment until delivery confirmed
- Dispute resolution process
- Partial refunds for partial satisfaction

**Insurance/Guarantees:**
- Platform-backed guarantees
- Seller guarantees
- Damage protection

**Dispute Resolution:**
- Clear process for raising disputes
- Evidence submission
- Resolution timeline

### Reputation Systems

**Multi-dimensional Ratings:**
- Overall + category-specific ratings
- Transaction-specific ratings
- Communication ratings

**Long-term Reputation:**
- Historical track record
- Consistency over time
- Growth and improvement

## Platform Economics

### Revenue Models

**Transaction Fees:**
- Percentage of transaction value
- Flat fee per transaction
- Tiered fees based on volume

**Listing Fees:**
- Pay to list (or list free, pay to feature)
- Featured placement fees
- Category-specific fees

**Subscription/Membership:**
- Seller subscriptions for premium features
- Buyer subscriptions for fee discounts
- Premium tiers for both sides

**Advertising:**
- Promoted listings
- Search ranking pay-to-play
- Category advertising

**Value-Add Services:**
- Shipping/fulfillment services
- Payment processing
- Analytics and insights
- Legal/financial services

### Fee Structure Decisions

**Platform Take Rate:**
- Industry norms: 10-30% for marketplaces
- Lower rates attract supply
- Higher rates fund platform investment

**Fee Transparency:**
- Clear fee breakdowns
- Hidden fees erode trust
- Comparison to alternatives

**Fee Balancing:**
- Don't overburden early participants
- Scale fees as volume grows
- Consider value received by seller

### Unit Economics

**Customer Acquisition Cost (CAC):**
- Cost to acquire buyer
- Cost to acquire seller
- Platform subsidized or paid by side

**Lifetime Value (LTV):**
- Revenue per buyer over time
- Revenue per seller over time
- Network effects on value

**Margins:**
- Gross margin on transactions
- Net margin after costs
- Path to profitability

## Liquidity and Network Effects

### Achieving Liquidity

**Definition:** A liquid marketplace has enough transactions that users find matches quickly.

**Signs of liquidity:**
- Fast match times
- High conversion rates
- Price stability

**Signs of illiquidity:**
- Long wait times
- Low conversion rates
- Price volatility

### Network Effects

**Direct Network Effects:**
- More buyers = more value for sellers
- More sellers = more value for buyers
- Classic two-sided network effect

**Indirect Network Effects:**
- More of one side enables new user types
- Ecosystem effects
- Third-party developer effects

**Data Network Effects:**
- Better matching with more data
- Fraud detection with more transactions
- Personalization with more history

### Lock-in and Switching Costs

**For Sellers:**
- Reviews and reputation
- Learning curve
- Integration with buyer tools

**For Buyers:**
- Review history
- Saved payment/shipping info
- Discovery personalization

## Workflow

Use this domain skill within cali-product-workflow:

| Phase | Domain Skill Contribution |
|-------|---------------------------|
| Phase 1 (Setup) | Marketplace model research |
| Phase 2 (Context) | Market sizing, competition |
| Phase 3 (Shape) | Marketplace mechanics in scope |
| Phase 6 (Interface) | Marketplace UI and flows |
| Phase 10 (Planning) | Marketplace feature scopes |

## Output Format

This domain skill contributes to:
- **spec-product.md** — Marketplace strategy section
- **spec-tech.md** — Marketplace feature scopes
- **interface proposals** — Marketplace UI designs

## Gotchas

1. **Chicken-and-egg first** — Solve the chicken-and-egg problem before scaling
2. **Quality over quantity** — A few high-quality participants beats many low-quality ones
3. **Trust is everything** — Without trust, transactions don't happen
4. **Platform economics** — Ensure unit economics work before scaling

## Related Skills

- **cali-product-workflow**: Orchestrates product planning
- **cali-product-trust-building**: Trust mechanisms
- **cali-product-business-models**: Business model context
- **cali-product-promotions**: Marketplace launch promotions

## Environment Adaptation

If a tool is unavailable, check:
`../../../../cali-product-workflow/references/cli-tools/`