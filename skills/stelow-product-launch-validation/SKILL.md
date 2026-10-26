---
name: stelow-product-launch-validation
description: >
  [stelow] Test real commitment before building: pre-sale, waitlists, fake doors,
  pioneer programs and price discovery. Use when the user asks: how do I validate
  before building, how do I run a pre-sale, should I build a waitlist, how do I
  test if people will actually pay, what is a fake door test, how do I run a pioneer
  or beta program, how do I find the price people will pay, or when discovery reaches
  stage 5 (assess commitment) and needs the concrete methods to separate curious
  people from true early adopters.
metadata:
  frequency: monthly
  category: product
  execution:
    mode: reference
    recipe: null
    capabilities: []
    write_policy: none
    permission_profile: inherit
  context-cost: low
  author: calionauta
  author-url: https://github.com/calionauta
---

# Launch Validation — Assessing Commitment

**Objective**: go beyond curiosity and test real commitment. Ask people to invest
something valuable: **their time or their money**. This is what separates curious
people from true early adopters.

Curiosity is free and therefore worthless as evidence. Commitment costs the person
something — money, a slot in their calendar, a public referral. Design every method
below around that cost, and read the cost as the signal.

**Note**: this stage is often run together with the offer stage (stage 4). Price is
part of the test, not a separate question.

## Methods

### Pre-sale

- **Direct pre-sale to a small group**: for the 10 people you already have a
  connection with (family, friends, colleagues, referrals) — in person, by phone, or
  by messenger.
- **Pre-sale to an email list**: if you already have a list on the topic, send a
  pre-sale opportunity.
- **Pre-sale on a landing page**: build a page with pre-sale functionality and watch
  the sales count. Tools: Notion (public page), Tally, Gumroad, Instapage, or build
  it with AI.
- **Pre-sale at a live event or recorded webinar**: if you ran an event or webinar,
  sell inside it.
- **Lifetime deals**: lifetime access for a single deeply discounted payment, to
  generate early cash flow and users fast. Platform: AppSumo. ⚠️ Platforms keep a
  high commission and that customer profile can be demanding. Evaluate with caution.

### Waitlist

Ranked from weakest to strongest commitment:

- **👉 Referral**: ask for an email, then ask for up to 3 referrals. ⚠️ Very low
  commitment — a "sniff" only, not validation. Combined with referral it does reach
  people you could not access. Tool: GetWaitlist. When contacting referred people,
  say who referred them: it acts as a trust bridge and raises social proof.
- **🪙🏷 Symbolic investment with proportional discount**: ask for email plus a
  symbolic payment to enter the list, and offer a discount proportional to what they
  invested. Example: minimum R$50 to join; at launch the discount is multiplied by a
  fixed factor (paid R$10, factor 10 → R$100 off).
- **🪙💲 Symbolic investment + predicted price + proportional discount**: the
  variation above, but showing the predicted price of the solution. Validates closer
  to reality because people know the price up front. Changing the predicted price and
  watching whether more people still invest is a signal of the balance between your
  financial needs and the audience.
- **🏷🎯 Discount with correct guess — price discovery**: ask for an email and ask
  the person to guess the price. Guessing within ±10% earns 30% off at launch.
  Discovers what people are willing to pay.

### Other methods

- **Marketplace ad**: advertise and watch sales (Facebook Marketplace, Mercado Livre,
  OLX, Reddit, etc.).
- **Contact after interview**: ask for email and phone right after interviewing about
  the solution, and commit to offering it when ready. The offering part is what
  reveals commitment.
- **App**: a mobile app with a single basic function, to measure downloads and opens.
- **Fake door**: measure intention without having the product or feature. People
  believe that by knocking on the door they can enter — there is nothing behind it
  yet. ⚠️ When someone knocks, deliver some value. Delight them, even without a
  solution.
- **Influencer**: give it free to an influential person in the niche — a prototype or
  a service for a trial period. In exchange, negotiate sharing the future solution
  with their audience (for a cut of future sales), or ask for nothing and let natural
  sharing happen.

### Pioneer program in exchange for feedback

Validates commitment to *use and collaborate*. Pre-sale tests willingness to pay; the
pioneer program tests willingness to invest time and attention.

**How it works**: run the pioneer offer defined in the offer stage. For a limited
group, grant free access in exchange for a commitment to be an active source of
insights.

**What to observe**:
- **Adhesion rate**: how many contacted pioneers accept the terms?
- **Quality of commitment**: do they actually show up to calls, answer surveys, give
  in-depth feedback or only superficial remarks?

A pioneer who pays with time and ideas can be as committed as one who pays with money.

## What risk this mitigates

Value risk — whether people will commit: pay, or genuinely use.

## What to observe (signals)

Once commitment is high enough you can validate and build a simplified version of the
solution. Possible measures:

- X pre-sales for the next product or service
- X subscribers on the waitlist
- R$ X in commissions generated by affiliates
- X listeners on the first podcast episode
- Fully funded, or X% funded, crowdfunding campaign

## Completeness contract

The host validates these minima — never submit fewer:

- The method chosen, and why it is the cheapest test of the riskiest assumption.
- Success and abort thresholds stated as numbers or events, before running.
- What was actually observed, reported as raw counts.

criteria:
  - id: method-justified
    kind: presence
    text: "The chosen commitment method is stated with the assumption it tests"
  - id: thresholds-precommitted
    kind: semantic
    text: "Success and abort thresholds are falsifiable numbers or events, set before the test"
  - id: raw-observation
    kind: presence
    text: "Results reported as counts of people/money, not adjectives"

## When to Use & Test Cases

Should activate: "how do I validate before building?", "should I run a pre-sale?",
"is a waitlist worth it?", "how do I know if people will actually pay?", "what's a
fake door test?", "how do I run a beta/pioneer program?".

Should NOT activate: "how much should I charge" (pricing), "who is my audience"
(audience-market), "start building the MVP" (execution).

## Examples

### Example: two-week validation of a course

**Input:** "I want to launch a course on narrative therapy. Should I build it first?"

**Steps:**
1. Riskiest assumption: will therapists pay R$400 for this before it exists?
2. Cheapest test: direct pre-sale to 10 known contacts, not a landing page.
3. Pre-commit: 3 sales of R$400 = proceed; fewer than 2 = change the audience or the
   offer, do not build.
4. Record actual counts.

**Output:** method, pre-committed thresholds, raw results.

### Example: waitlist that proves nothing

**Input:** "I got 800 emails on the waitlist. Am I validated?"

**Steps:**
1. Emails are the weakest form of commitment — free and easily abandoned.
2. Layer a cost: symbolic investment, or a price-guess discount.
3. Re-measure on the paid subset; that number is the real signal.

**Output:** revised test with a real cost, plus the interpretation that 800 emails
alone is not validation.

## Edge Cases

### Pre-sale to friends and family
- Legitimate, but mark it: warm contacts over-index on wanting to support you. Report
  them as a separate cohort from cold or referred buyers.

### Everyone says "I'd buy it" but nobody pays
- This is the normal result and the point of the stage. Treat verbal interest as zero
  evidence and move the ask from opinion to payment.

### Fake door breaks trust
- Deliver something real when someone knocks — a waitlist position with a real
  benefit, a bonus, an honest message. Never collect money for something that does not
  exist without saying so.

### Regulated or refund-required markets
- Use price discovery and pioneer programs instead of taking pre-sale money, and say
  why.

---

## Attribution

Based on the e-book **"Guia para criar produtos com aprendizado em ciclos curtos"**
by **calionauta** — [Substack](https://calionauta.substack.com/p/roteiro-pratico-para-validar-ideias).

<!-- stelow:scope3:begin -->
## Entry (mode detection)

When this skill loads, check for the stelow workflow marker:

```bash
if [ -n "$STELOW_WORKFLOW" ] && [ -n "$STELOW_STATE" ]; then
  echo "stelow: workflow mode (state=$STELOW_STATE)"
else
  echo "stelow: standalone mode (no STELOW_WORKFLOW marker)"
fi
```

In **standalone mode** (no marker), run the existing skill body unchanged.
In **workflow mode**, skip to `### Workflow slice` and emit a complete
`## Hand-off (workflow mode)` block at the end. See
`../stelow-workflow-entry/SKILL.md` for the full marker protocol.

## Hand-off (workflow mode)

```
stage          : shape
description    : Shape stage. Define run knobs, hill chart, rabbit holes.
status         : <done|partial|blocked>
artifacts      : <paths created or modified>
next-candidate : <the stage scripts/stelow next reports — run `scripts/stelow next`>
gate           : none
rework-on      : shape
```

Workflow mode: emit the above Hand-off block verbatim, then stop. Fill
`next-candidate` from `scripts/stelow next`: it is the workflow's own
answer, already accounting for this run's intent route and review mode.
The router skill consumes the next-candidate field and calls
`scripts/stelow advance <next-candidate>` to move state forward.

### Workflow slice

Workflow mode for the **shape** stage. Standalone behavior lives in
the rest of this file (unchanged). Summary:

> Shape stage. Define run knobs, hill chart, rabbit holes.

Primary actions (per stages.yaml): `read, write`. Run only the actions that
produce the artifacts promised in `## Hand-off`; skip anything that does
not advance the workflow.

<!-- stelow:scope3:end -->
