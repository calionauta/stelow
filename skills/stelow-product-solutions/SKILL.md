---
name: stelow-product-solutions
description: >
  [stelow] Define and prioritize candidate solutions: the 9 components of a
  desirable solution and the impact/risk matrix. Use when the user asks: what
  features should the product have, how do I make my solution desirable, how do
  I prioritize between solutions, what makes a good product, differentiated vs
  dominant vs disruptive strategy, or when discovery reaches stage 3 (define and
  prioritize solutions) after the market is defined and needs concrete criteria
  for judging candidate solutions before committing.
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

# Solutions: Define and Prioritize

**Objective**: explore and prioritize possible paths, balancing what is desirable for
the audience with what is viable and strategic for the business.

This stage comes after the market is written (stage 2). Candidate solutions are judged
against the GPN story, not against your enthusiasm.

**Tips**:
1. Use AI to develop solutions and strategies.
2. If exploring convenience products (commodities), evaluate how to innovate in the
   product lifecycle — see `stelow-product-evolutionary-principles`.

## What to do, using the GPN story as reference

1. Draft an **innovation strategy**: differentiated, dominant, sustaining, discreet,
   or disruptive (see `references` of `stelow-product-discovery` for the five types).
2. Draft **potential platforms** — the ecosystem or infrastructure behind the product.
3. Draft **business models** — see `stelow-product-business-models`.
4. Draft the **main features** that address the GPN story.
5. Draft the **9 components for a desirable solution** (below).
6. Evaluate in three aspects: positive impact on the audience, positive impact on the
   business, level of risk for the business.

*"Draft" means 2 to 3 general business-product ideas. It is not a moment to document
details or bureaucratize.*

## The 9 components for a desirable solution

**1. Optimize the functional outcome**
Deliver the best possible result in terms of functionality and performance, within the
specific context of use. Understand what success criteria people use to evaluate the
functional job to be done.

**2. Reduce effort and sacrifice (daily use and lifecycle)**
Even a functionally superior solution gets rejected if it is too hard to use or demands
too much time. This applies to any lifecycle activity: acquire, prepare for first use,
maintain, dispose. Start by optimizing acquisition and first use. You can decrease the
effort or the perception of it.

**3. Reduce time to achievement**
Solutions that deliver results quickly, or minimize the perception of time through
predictability and visible progress, are more attractive — especially under urgency.
**TTFV — Time to First Value** lives inside this component.

**4. Optimize the investment-value relationship**
Maximize perceived value against required investment. It is not about the lowest price
but about justifying the cost through delivered value. Two levers: reduce the monetary
price, or increase perceived value (benefits, quality, exclusivity, return).

**5. Increase the perception that one will succeed**
Build trust and reduce hesitation. Social proof, testimonials and case studies show the
solution works for others, lowering perceived risk. Critical when the solution is new,
complex, or involves significant investment of time, money or effort.

**6. Maximize the perception of time well invested**
The user should feel the time spent with the solution was valuable, productive and
rewarding in itself. Beyond temporal efficiency, this is about experience quality:
meaningful engagement, learning, relaxation, clear progress, intrinsic reward.

**7. Offer autonomy with delimited options**
Offer autonomy to contribute (Ikea Effect) and customize, but within a clear, simplified
set of options that avoids decision fatigue (Paradox of Choice). Curate the contribution
possibilities so each adds real value.

**8. Create positive, meaningful, memorable personal experiences**
The emotional and experiential dimension: surprise, delight, exclusivity,
personalization, storytelling, aesthetics. Generates lasting positive memories attached
to the solution.

**9. Increase the sense of belonging, of being recognized and valued**
Social connection and acceptance. Solutions that build communities, facilitate
recognition among users, or value individual contributions generate belonging, raising
engagement and loyalty and turning users into advocates.

### Complementary elements

Beyond the nine, evaluate whether the solution helps people to:
- **Enjoy the moment with satisfaction** (present pleasure, not only future result)
- **Increase social influence** over issues that affect their lives
- **Increase social status**
- **Increase purchasing power** for goods and services

## Positive impact and level of risk

Evaluate candidate solutions in a matrix.

**Positive impact (low → high)**:
- Market / niche / innovation impact
- Financial impact
- Operational impact
- Brand and reputation impact
- Social and environmental impact

**Risk level (low → high)**:
- Probability of failure: market, technological, execution, financial,
  regulatory/legal, operational risk
- Impact of failure: financial loss, time loss, reputation loss, opportunity loss, legal

**Rule**: start with what has very high positive impact and very low risk.

## Completeness contract

The host validates these minima — never submit fewer:

- At least two candidate solutions, each scored on the impact/risk matrix.
- The nine components assessed per candidate, even if the verdict is "not addressed".
- A stated innovation strategy for the leading candidate.

criteria:
  - id: candidates-scored
    kind: count
    text: "At least two candidate solutions, each placed in the impact/risk matrix"
  - id: nine-components
    kind: presence
    text: "The nine components are assessed for the leading candidate, not skipped"
  - id: strategy-named
    kind: presence
    text: "An innovation strategy (differentiated/dominant/sustaining/discreet/disruptive) is named"
  - id: risk-not-ignored
    kind: semantic
    text: "Risk assessment names concrete failure modes, not a low/medium/high label alone"

## When to Use & Test Cases

Should activate: "what features should this have?", "how do I make it desirable?",
"how do I prioritize between these two ideas?", "differentiated or disruptive?".

Should NOT activate: "who is my audience" (audience-market), "how much do I charge"
(pricing), "how do I launch" (launch-validation).

## Examples

### Example: two candidate solutions for a meal-planning product

**Input:** "I have two ideas: an app and a weekly newsletter. Which do I pursue?"

**Steps:**
1. Write both against the GPN story from stage 2.
2. Score each on the nine components — the newsletter wins on effort (component 2) and
   time to achievement (3), loses on personalization (8).
3. Place both in the matrix: the app is high impact/high risk, the newsletter is medium
   impact/low risk.
4. Rule applies: start with the newsletter to validate the need, then build the app.

**Output:** two scored candidates, a leading candidate, an innovation strategy.

### Example: everything scored as high impact

**Input:** "All of my ideas score high impact and low risk."

**Steps:**
1. Treat the matrix as broken, not as good news.
2. Demand concrete failure modes per risk category.
3. Re-score relative to each other — the matrix ranks, it does not grade.

**Output:** re-scored candidates with explicit failure modes.

## Edge Cases

### Solution is a commodity
- The nine components still apply, but shift weight to the lifecycle (component 2) and
  experience (6, 8) — competing on function alone is a price war.

### User wants to document every detail now
- Stage 3 is drafts of 2-3 ideas. Detail belongs to a later stage; documenting now
  locks in a guess.

### Only one candidate exists
- Manufacture a second one, even a bad one. A single candidate cannot be prioritized —
  it can only be approved.

### High risk is unavoidable
- Then sequence it: find the cheapest experiment that reduces the dominant risk before
  committing — see `stelow-product-launch-validation`.

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
