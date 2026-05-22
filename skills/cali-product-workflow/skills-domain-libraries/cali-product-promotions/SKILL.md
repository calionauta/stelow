---
name: cali-product-promotions
description: >
  [Cali] Promotional strategies and tactics for products. Covers promotional vehicles,
  mechanics, sequencing, and psychology to drive awareness, consideration,
  and conversion at strategic moments.

  Trigger keywords: promotions strategy, promotional campaigns, discounts, deals,
  seasonal promotions, launch promotions, conversion tactics
---

# Product Promotions

## Goal

Drive awareness, consideration, and conversion through strategically timed and sequenced promotional interventions.

## Domain Context

Promotions are temporary interventions that accelerate behavior change. Key themes:
- **Promotional Vehicles** — What type of promotion to use
- **Promotional Mechanics** — How the promotion works
- **Sequencing** — When and how often to promote
- **Psychology** — Why promotions work (and when they backfire)

## Promotional Vehicles

### Discount-Based

**Percentage Off:**
- Simple and clear
- "20% off" is easily understood
- Margin impact depends on current margin

**Fixed Amount Off:**
- Works well for lower-priced items
- "Save $50" creates clear value anchor
- Impact depends on perceived value

**BOGO (Buy One Get One):**
- Perceived high value ("get one free")
- Effective for inventory clearance
- Can be gamed by bulk purchase

**Bundle Discount:**
- Group related products together
- Increases average order value
- Makes per-item value harder to calculate

### Value-Add Based

**Free Shipping:**
- Removes a common friction point
- Works best when shipping is a barrier
- Can be threshold-based ("free shipping over $50")

**Bonus Content:**
- "Buy X, get Y free" with digital content
- Increases perceived value
- Low cost if content is digital

**Extended Warranty:**
- Adds security to purchase
- High margin product for seller
- Valuable signal for big purchases

**Loyalty Points:**
- Encourages repeat purchase
- Psychological "sunk cost" effect
- Requires program infrastructure

### Urgency-Based

**Limited Time:**
- "Sale ends Sunday"
- Creates urgency to act now
- Works best for established products

**Limited Quantity:**
- "Only 10 left"
- Creates scarcity signal
- Must be credible to work

**Flash Sales:**
- Very short duration
- High urgency
- Requires strong communication channel

### Access-Based

**Free Trial:**
- Reduces risk for new customers
- Trial-to-paid conversion is key metric
- Works best for sticky products

**Freemium Upgrade:**
- Premium features as promotion
- Showcases value of paid tier
- No margin impact during trial

**Early Access:**
- Rewards loyal customers
- Creates exclusivity feeling
- Works for launch campaigns

## Promotional Mechanics

### Threshold Mechanics

**Minimum Purchase Threshold:**
- "Spend $100, get 10% off"
- Increases average order value
- Threshold should be above typical purchase

**Quantity Thresholds:**
- "Buy 3, get 1 free"
- Effective for consumable products
- Encourages stockpiling behavior

### Conditional Mechanics

**First-Time Customer:**
- Converts new customers
- Typically one-time use
- Requires new account/customer detection

**Referral Bonus:**
- Both referrer and referee get benefit
- Viral loop potential
- Requires fraud detection

**Loyalty Rewards:**
- Based on purchase history
- Encourages repeat business
- Tiered benefits increase engagement

### Stacking Rules

Most programs have rules about combining promotions:
- Can stack or exclusive
- Priority rules ("biggest discount wins")
- Category restrictions

## Sequencing

### Launch Sequencing

For new product launches:

1. **Pre-Launch (2-4 weeks before):**
   - Early access for waitlist
   - Teaser content
   - Waitlist incentive

2. **Launch Day:**
   - Maximum discount
   - Maximum visibility
   - Clear CTA

3. **Post-Launch (1-4 weeks after):**
   - Fade to sustainable discount
   - Social proof accumulation
   - Transition to loyalty offers

### Seasonal Sequencing

For recurring seasonal events:

**Black Friday / Cyber Monday:**
- Biggest discount of the year
- Extended window (week vs. day)
- Cross-sell and upsell focus

**New Year:**
- Resolution alignment
- Annual planning cycle
- Subscription annual plans

**Summer / End of Year:**
- Clearance periods
- Planning for next year
- Often lower activity = lower prices

### Lifecycle Sequencing

**Acquisition → Activation → Retention → Referral:**

- **Acquisition**: First-time offers, trials
- **Activation**: Onboarding incentives
- **Retention**: Loyalty rewards, exclusive offers
- **Referral**: Mutual benefit programs

## Psychology

### Anchoring

Price anchors change perception:
- Show original price before discounted price
- Comparison to competitors
- "Worth $X, now $Y"

### Loss Aversion

People prefer avoiding losses to gaining equivalent gains:
- "Don't miss out" vs. "Save money"
- Limited time creates fear of loss
- Membership cancellation = losing benefits

### Social Proof

Others' behavior influences our own:
- "Most popular" badges
- Purchase notifications
- User reviews and ratings

### Decoy Effect

Adding a middle option makes others more attractive:
- 3-tier pricing with middle as target
- Good/Better/Best framing
- Decoy makes premium look reasonable

## Anti-Patterns

### Over-Discounting

- Erodes perceived value
- Attracts deal-hunters, not loyal customers
- Creates discount expectations that are hard to undo

### Fake Urgency

- "Only 2 left!" when stock is high
- Countdown timers that reset
- Destroys trust when exposed

### Discount Stacking

- Multiple simultaneous discounts
- Creates margin erosion
- Confuses pricing signals

### Inconsistent Application

- Some customers get better deals
- Hidden discounts for "insiders"
- Creates resentment

## Workflow

Use this domain skill within cali-product-workflow:

| Phase | Domain Skill Contribution |
|-------|---------------------------|
| Phase 1 (Setup) | Promotional research |
| Phase 2 (Context) | Seasonal/timing analysis |
| Phase 3 (Shape) | Promotional strategy in scope |
| Phase 6 (Interface) | Promotion UI and mechanics |
| Phase 10 (Planning) | Promotion feature scopes |

## Output Format

This domain skill contributes to:
- **spec-product.md** — Promotional strategy section
- **spec-tech.md** — Promotion feature scopes
- **interface proposals** — Promotion UI designs

## Gotchas

1. **Value erosion** — Over-promotion erodes perceived value
2. **Urgency authenticity** — Fake urgency destroys trust
3. **Margin awareness** — Discounts cost money — ensure healthy margins
4. **Stack management** — Control discount stacking

## Related Skills

- **cali-product-workflow**: Orchestrates product planning
- **cali-product-pricing**: Pricing strategies
- **cali-product-trust-building**: Trust considerations
- **cali-product-ads**: Advertising vs. promotion

## Environment Adaptation

If a tool is unavailable, check:
`../../../../cali-product-workflow/references/cli-tools/`