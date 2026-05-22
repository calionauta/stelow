---
name: cali-product-discovery
description: >
  [Cali] Customer discovery and validation for products. Covers interview techniques,
  problem interviews, solution interviews, and MVP testing to validate hypotheses
  before building.

  Trigger keywords: customer discovery, problem interview, solution interview,
  MVP testing, hypothesis validation, customer interviews, discovery sprint

  NOT for: quantitative research (use cali-product-multi-method-market-analysis instead)
---

# Product Discovery

## Goal

Systematically discover, validate, and prioritize problems worth solving through direct customer engagement and rapid experimentation.

## Domain Context

Discovery is the process of learning what to build. Key themes:
- **Hypothesis Formation** — Making assumptions explicit
- **Problem Validation** — Is this a real problem worth solving?
- **Solution Discovery** — What solutions resonate with customers?
- **MVP Testing** — How do we test ideas quickly?

## The Discovery Framework

### Discovery vs. Delivery

| Aspect | Discovery | Delivery |
|--------|-----------|----------|
| Goal | Learn what to build | Build what we learned |
| Activities | Interviews, experiments | Development, shipping |
| Output | Validated learning | Working software |
| Uncertainty | High | Low |
| Approach | Breadth first | Depth first |

### The Build-Measure-Learn Loop

```
    BUILD  →  MEASURE  →  LEARN
      ↑                      |
      └──────────────────────┘
```

**Build:** Create minimum viable products (MVPs) to test hypotheses
**Measure:** Collect data on customer behavior
**Learn:** Draw conclusions and update hypotheses

### Risk Types

**Problem Risk:** Is this a real problem people have?
**Solution Risk:** Will our solution solve the problem?
**Business Model Risk:** Will people pay for this?
**Market Risk:** Is the market big enough?

## Problem Interviews

### The Goal

Validate that the problem you're solving is real, painful, and worth solving — before building anything.

### Interview Structure

**Opening (5 min):**
- Thank them for their time
- Brief context: "I'm exploring [topic] and want to learn from experts like you"
- No pitch — pure discovery

**Problem Deep Dive (20 min):**
- Tell me about the last time you [experienced the problem]...
- What did you try to do about it?
- How did that work out?
- What's the impact of this problem?

**Current Solutions (10 min):**
- What do you currently use to handle this?
- What works well about that?
- What doesn't work well?
- How much time/money does this cost you?

**Wrap Up (5 min):**
- Is there anything else I should know about this?
- Who else should I talk to?

### Problem Validation Criteria

**Strong signal:**
- Customer gets animated when describing the problem
- Customer mentions they've tried multiple solutions
- Problem has real consequences (time, money, relationships)
- Customer has attempted DIY solutions

**Weak signal:**
- Customer acknowledges problem but isn't actively trying to solve it
- Problem is theoretical or infrequent
- Problem is easily solved with existing tools

## Solution Interviews

### The Goal

Understand how customers perceive and value your proposed solution — before full development.

### Concept Testing

**Closed-ended test:**
- Show a mockup/prototype
- "Would you use this? (Yes/No)"

**Open-ended test:**
- "What do you think this does?"
- "Walk me through how you'd use it"
- "What would make this more useful?"

### Solution Validation

**What to look for:**
- Enthusiasm and energy when seeing the solution
- Specific use cases mentioned ("I would use this for...")
- Willingness to pay or recommend
- Concerns about implementation

**What to probe:**
- "What would this replace?"
- "How often would you use it?"
- "What's missing?"
- "Would you pay $X for this?"

## MVP Testing

### MVP Types

| Type | Purpose | Cost | Risk |
|------|---------|------|------|
| **Concierge** | Manual service delivery | High | Low |
| **Wizard of Oz** | Appears automated, isn't | Medium | Medium |
| **Landing Page** | Interest validation | Low | Medium |
| **Video** | Concept communication | Low | Medium |
| **Single Feature** | Core problem testing | Medium | Medium |
| **Prototype** | Usability testing | Low | Low |

### Concierge MVP

Manually perform the service for a few customers.

**When:** Very early, when you don't know the right solution
**How:** Do the work manually, iterate based on feedback
**Example:** Groupon (originally sent PDF deals manually)

### Wizard of Oz MVP

Build the illusion of an automated system.

**When:** Testing demand before full development
**How:** Manual back-end + automated front-end
**Example:** Zappos (showed product photos, then manually ordered from retailers)

### Landing Page MVP

Test interest with a compelling landing page.

**When:** Testing demand and messaging
**How:** Capture email signups, measure interest
**Example:** Most successful SaaS products start with landing pages

### Video MVP

Show the product before it's built.

**When:** Complex products, technical audiences
**How:** Explain with video, collect emails
**Example:** Dropbox (screencast demo), Pebble (promo video)

### Testing Framework

**Hypothesis:** "We believe [customer segment] will [action] because [reason]."

**Metric:** What number will change if the hypothesis is true?
- Sign-up rate
- Email capture rate
- Click-through rate
- Time on page

**Decision:** What will we do based on results?
- If > 10% sign-up → proceed with development
- If < 10% sign-up → pivot to different segment or problem

## Customer Interview Tips

### Do

✅ Be genuinely curious
✅ Ask open-ended questions
✅ Listen more than you talk
✅ Probe for specifics and stories
✅ Thank customers for their time
✅ Take notes immediately after

### Don't

❌ Pitch your solution
❌ Ask leading questions
❌ Defend your idea if challenged
❌ Promise anything you can't deliver
❌ Rush through the interview
❌ Take notes during the interview (eye contact matters)

## Output Format

This domain skill contributes to:
- **Problem validation reports** — Validated or invalidated problem hypotheses
- **Discovery learnings** — Key insights from interviews
- **MVP specifications** — What to build and test
- **spec-product.md** — Validated jobs and problems

Discovery artifacts:
- **Interview notes** — Raw observations and quotes
- **Insight synthesis** — Patterns across interviews
- **Hypothesis list** — Validated and invalidated assumptions
- **MVP spec** — What to test next

## Gotchas

1. **Talk to real customers** — Not just colleagues or friends
2. **Ask about behavior** — "What did you actually do?" not "What would you do?"
3. **Problems before solutions** — Validate problems before testing solutions
4. **Interpret carefully** — What people say ≠ what they do

## Related Skills

- **cali-product-jtbd**: Uses JTBD for interview framework
- **cali-product-workflow**: Discovery fits into Phase 2
- **cali-product-multi-method-market-analysis**: Complements with quantitative data

## Environment Adaptation

If a tool is unavailable, check:
`../../../../cali-product-workflow/references/cli-tools/`