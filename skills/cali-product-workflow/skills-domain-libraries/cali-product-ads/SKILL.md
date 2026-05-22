---
name: cali-product-ads
description: >
  [Cali] Ads and monetization strategies for products. Covers exchange mechanisms,
  ad formats, metrics, and anti-patterns to avoid. For sustainable monetization
  that doesn't destroy user trust.

  Trigger keywords: advertising strategy, ad monetization, ad formats, pay-per-click,
  sponsored content, display ads, revenue model
---

# Product Ads

## Goal

Design ad monetization that is sustainable and doesn't destroy user trust — balancing revenue generation with user experience.

## Domain Context

Ads are a form of value exchange. Key themes:
- **Exchange Mechanism** — How payment is tied to value delivered
- **Format Selection** — Choosing the right ad format for your product
- **Metrics** — Measuring ad performance without sacrificing UX
- **Anti-patterns** — Patterns that destroy trust and long-term revenue

## Exchange Mechanisms

### Pay Per Impression (CPM)

Payment per thousand impressions. The advertiser pays for visibility, not for clicks or conversions. Best for brand awareness campaigns where reach is more important than immediate action.

**Considerations:**
- Requires significant traffic volume to generate meaningful revenue
- Risk of optimizing for impressions over engagement
- Best combined with other metrics (viewability, time on page)

### Pay Per Click (CPC)

Payment per click on the ad. The advertiser pays only when a user actively engages. Better alignment with advertiser goals than CPM.

**Considerations:**
- Click fraud is a real concern
- Incentivizes aggressive ad placement that can hurt UX
- Quality score systems help but don't eliminate the problem

### Pay Per Action (CPA / PPS)

Payment per completed action: sign-up, purchase, app install. The highest alignment between advertiser and publisher interests. The advertiser only pays for real value delivered.

**Considerations:**
- Requires careful conversion tracking
- Higher commission rates due to lower advertiser risk
- Lower volume but higher quality revenue

### Hybrid Models

Most mature ad platforms combine multiple mechanisms:
- Base CPM for brand awareness
- Performance add-ons (CPC, CPA) for direct response advertisers
- Dynamic allocation that favors higher-value actions

## Ad Formats

### Display Ads

Traditional banner ads. Sizes: 300x250 (medium rectangle), 728x90 (leaderboard), 160x600 (wide skyscraper). These remain effective for brand awareness.

**Best practices:**
- Keep animations subtle and non-intrusive
- Ensure high viewability (above the fold or in viewport)
- Match ad style to site design without being deceptive

### Native Ads

Ads that match the form and function of the surrounding content. Less intrusive, higher engagement, but require clear disclosure to maintain trust.

**Best practices:**
- Always label as "Sponsored" or "Advertisement"
- Don't mislead users about the nature of the content
- Quality matters more than volume

### Search Ads

Text-based ads displayed in search results. Highly intent-driven, typically CPC or CPC with maximum bid.

**Best practices:**
- Tight integration with organic results
- Clear separation from organic results (labeled)
- Relevance to search query is critical

### Video Ads

Pre-roll, mid-roll, or post-roll video advertising. High engagement but requires significant video content.

**Best practices:**
- Skip options improve perception without killing completion rates
- Keep under 15-30 seconds for non-skippable
- Respect frequency caps

### Interstitial Ads

Full-screen ads that appear between content transitions. High visibility but can be disruptive if overused.

**Best practices:**
- Use sparingly and only at natural transition points
- Provide clear close options
- Avoid during critical user actions

## Key Metrics

### For Publishers

| Metric | Definition | Target |
|--------|-----------|--------|
| CPM | Revenue per 1,000 impressions | Varies by niche |
| CPC | Revenue per click | Depends on audience value |
| Fill Rate | % of ad requests filled | >95% |
| Viewability | % of ads in viewport for 1+ seconds | >50% |
| View-through Rate | % clicking after viewing | >1% |

### For Advertisers

| Metric | Definition | Target |
|--------|-----------|--------|
| CTR | Click-through rate | >1-2% |
| Conversion Rate | Clicks resulting in action | Varies by industry |
| CPA | Cost per acquisition | Below customer LTV |
| ROAS | Return on ad spend | >3-5x |

## Anti-Patterns to Avoid

### Ad Injection

Inserting ads into third-party content without the site owner's knowledge or consent. This destroys trust with both publishers and users.

### Deceptive Ad Placement

- Ads that look like content
- Close buttons that don't work
- Ads that cover essential UI
- Auto-clicking ads

### Ad Clutter

Excessive ads that degrade the user experience. Studies show diminishing returns beyond certain ad density.

### Lack of Transparency

Not disclosing that content is sponsored or that the publisher is optimizing for ad revenue at the expense of user experience.

## Workflow

Use this domain skill within cali-product-workflow:

| Phase | Domain Skill Contribution |
|-------|---------------------------|
| Phase 1 (Setup) | Ad monetization model research |
| Phase 2 (Context) | Revenue model analysis |
| Phase 3 (Shape) | Ad strategy in scope |
| Phase 6 (Interface) | Ad placement and format decisions |
| Phase 10 (Planning) | Ad feature scopes |

## Output Format

This domain skill contributes to:
- **spec-product.md** — Ad monetization strategy section
- **spec-tech.md** — Ad-related feature scopes
- **interface proposals** — Ad placement designs

## Gotchas

1. **Trust erosion** — Aggressive monetization erodes trust faster than it generates revenue
2. **Format fit** — Choose ad formats that match your content and user context
3. **Transparency** — Always disclose sponsored content and ad-driven decisions
4. **Metric balance** — Don't optimize purely for revenue — balance with user experience

## Related Skills

- **cali-product-workflow**: Orchestrates product planning
- **cali-product-business-models**: Business model context
- **cali-product-trust-building**: Trust considerations for monetization
- **cali-product-promotions**: Promotional vs. advertising strategies

## Environment Adaptation

If a tool is unavailable, check:
`../../../../cali-product-workflow/references/cli-tools/`