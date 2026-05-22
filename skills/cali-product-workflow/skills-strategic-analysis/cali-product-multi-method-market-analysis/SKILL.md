---
name: cali-product-multi-method-market-analysis
version: 1.0.0
description: >
  [Cali] Multi-method market analysis combining qualitative and quantitative research.
  Covers surveys, analytics, qualitative interviews, and how to synthesize insights
  for confident product decisions.

  Trigger keywords: market analysis, survey design, quantitative research, qualitative research,
  data synthesis, product analytics, customer feedback analysis

  NOT for: small-sample qualitative deep dives (use cali-product-discovery instead)
---

# Multi-Method Market Analysis

## Goal

Synthesize multiple research methods to build confident, evidence-based product decisions — combining the depth of qualitative with the breadth of quantitative.

## Domain Context

No single method tells the whole story. Key themes:
- **Qualitative + Quantitative** — Combining depth and breadth
- **Survey Design** — Asking the right questions the right way
- **Analytics** — Using behavioral data to understand behavior
- **Synthesis** — Turning data into actionable insights

## Research Method Selection

### Method Comparison

| Method | Depth | Breadth | Speed | Cost | Best For |
|--------|-------|---------|-------|------|----------|
| **Interviews** | High | Low | Slow | Medium | Understanding motivations, edge cases |
| **Surveys** | Low | High | Medium | Low | Quantifying prevalence, measuring attitudes |
| **Analytics** | Medium | High | Fast | Low | Behavioral patterns, funnel analysis |
| **Usability Tests** | High | Low | Medium | Medium | Specific interaction problems |
| **A/B Tests** | Medium | High | Medium | Medium | Causal impact of changes |

### Mixed Methods Strategy

**Qual → Quant → Qual loop:**
1. **Qualitative first:** Explore the problem space, generate hypotheses
2. **Quantitative second:** Test hypotheses with larger samples
3. **Qualitative third:** Deep dive on surprising or conflicting results

## Survey Design

### Survey Fundamentals

**Types of questions:**

**1. Closed-ended (quantitative):**
- Multiple choice (single or multi-select)
- Rating scales (Likert, NPS, satisfaction)
- Binary (yes/no, true/false)

**2. Open-ended (qualitative):**
- Free text responses
- Ranking/prioritization
- Card sorting

**3. Behavioral:**
- Frequency questions (how often?)
- Recency questions (how recently?)
- Quantity questions (how much?)

### Survey Best Practices

**Do:**
✅ Keep surveys short (5-10 minutes maximum)
✅ Start with easy, engaging questions
✅ Use simple, unambiguous language
✅ Randomize order of non-sequential questions
✅ Pilot test with 5 users before launch

**Don't:**
❌ Ask leading questions
❌ Use double-barreled questions
❌ Offer too many response options
❌ Force answers that don't apply
❌ Ask for recall beyond 2 weeks

### Common Survey Mistakes

**1. Acquiescence bias:** People agree with statements
- **Fix:** Include reverse-coded items

**2. Social desirability bias:** People answer what they think sounds good
- **Fix:** Assure anonymity, ask indirectly

**3. Halo effect:** One impression colors everything
- **Fix:** Separate topics, randomize order

**4. Fatigue:** Late questions get lower quality answers
- **Fix:** Put most important questions first

### Survey Question Examples

**Problem validation:**
- "On a scale of 0-10, how frustrated are you with [problem]?"
- "How often do you experience [problem]?"
- "Have you tried to solve [problem]? What did you try?"

**Solution validation:**
- "How appealing is this solution? (Not at all → Extremely)"
- "What would this solution replace?"
- "Would you pay for this? If yes, how much?"

**Customer profiling:**
- "Which best describes your role?"
- "How large is your team/company?"
- "How long have you been dealing with this problem?"

## Analytics

### Analytics Framework

**1. Acquisition:**
- Where do users come from?
- Which channels drive qualified traffic?
- What's the cost per acquisition?

**2. Activation:**
- Do users reach their "aha moment"?
- What's the activation rate?
- Where do users drop off?

**3. Retention:**
- Do users come back?
- What's the retention curve?
- What behaviors predict retention?

**4. Revenue:**
- How do we monetize?
- What's the revenue per user?
- What's the lifetime value?

**5. Referral:**
- Do users recommend us?
- What's the viral coefficient?
- What's the net promoter score?

### Key Metrics

**Funnel Metrics:**
- Conversion rates between stages
- Drop-off points
- Time to conversion

**Engagement Metrics:**
- DAU/MAU (stickiness)
- Session frequency and duration
- Feature adoption rates

**Revenue Metrics:**
- MRR/ARR (recurring revenue)
- ARPU (average revenue per user)
- LTV (lifetime value)
- CAC (customer acquisition cost)

**Health Metrics:**
- NPS (Net Promoter Score)
- CSAT (Customer Satisfaction)
- CES (Customer Effort Score)

### Analytics Tools

**Product Analytics:**
- Amplitude, Mixpanel, PostHog, Heap

**Web Analytics:**
- Google Analytics, Plausible, Fathom

**Attribution:**
- Branch, AppsFlyer, Adjust

## Qualitative + Quantitative Synthesis

### The Synthesis Process

**1. Organize:**
- Group data by theme or topic
- Create data visualization (charts, graphs)
- Identify patterns and trends

**2. Connect:**
- Map qualitative themes to quantitative metrics
- Identify correlations
- Look for causation (vs. correlation)

**3. Interpret:**
- What does the data tell us?
- What are the key insights?
- What surprised us?

**4. Recommend:**
- What actions should we take?
- What should we build, change, or stop?
- What's the priority?

### Insight Quality Check

**Strong insight:**
- Based on multiple data sources
- Specific and actionable
- Surprising (not just confirming what we knew)
- Tied to customer impact

**Weak insight:**
- Based on single source
- Vague and general
- Just confirming existing beliefs
- Not tied to action

## Output Format

This domain skill contributes to:
- **spec-product.md** — Market analysis section
- **Research synthesis reports** — Combined insights from multiple methods
- **Decision briefs** — Evidence-based recommendations

Multi-method analysis artifacts:
- **Survey results** — Quantitative findings
- **Interview synthesis** — Qualitative themes
- **Analytics report** — Behavioral patterns
- **Combined insights** — Full synthesis with recommendations

## Gotchas

1. **Sample size matters** — Small samples can't support big claims
2. **Correlation ≠ causation** — Behavioral data shows what, not why
3. **Representativeness** — Survey results only valid for your sample
4. **Synthesize across methods** — No single method is definitive

## Related Skills

- **cali-product-discovery**: Provides qualitative deep-dive capability
- **cali-product-workflow**: Market analysis fits into Phase 2
- **cali-product-opportunity-mapping**: Uses market data for opportunity assessment

## Environment Adaptation

If a tool is unavailable, check:
`../../../../cali-product-workflow/references/cli-tools/`