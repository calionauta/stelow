---
name: stelow-product-discovery
description: >
  [stelow] Orchestrator for the short-cycle product learning method: routes the eight
  stages to the skill or reference that holds each one, and names what each stage
  produces. Use this skill whenever the user asks about: idea validation, customer
  discovery, product experimentation, jobs to be done, pricing, business models,
  marketing channels, early adopters, MVP, product-market fit, pre-sales, launch
  strategies, product innovation, product lifecycle, trust, marketplace, open source
  as strategy, or any question about creating and validating digital products with low
  risk and fast learning. Start here; it points at the right skill for the stage.
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

# Product with Short Learning Cycles — Router

This guide replaces speculation with evidence, step by step.
**Core principle**: experiment before building. Reduce uncertainty with small, fast,
cheap experiments.

> "Life is too short to build something that nobody wants." — Ash Maurya

The method has **8 stages**, not necessarily linear. This skill routes; the content of
each stage lives in the skill or reference named in the map below. Read the target, not
this page, once you know which stage you are in.

## Stage map

| # | Stage | Where it lives | Artifact it produces |
|---|---|---|---|
| 1 | Find and understand the audience | `stelow-product-audience-market` | interview notes |
| 2 | Define the market | `stelow-product-audience-market` | GPN story (group, purpose, needs) |
| 3 | Define and prioritize solutions | `references/02-stage-3-solutions.md` | prioritized solution list |
| 4 | Develop and evaluate the offer | `references/03-stages-4-and-6.md` | offer definition |
| 5 | Assess commitment | `stelow-product-launch-validation` | pre-sales / waitlist counts |
| 6 | Discover the process | `references/03-stages-4-and-6.md` | manual delivery script |
| 7 | Evolve to a viable business | `references/04-stage-7.md` | product-market fit verdict + channel |
| 8 | The pulse of the system | `references/05-stage-8-signals.md` | signal tension read |

Before any stage, the reliability rules for evidence live in
`references/01-experimentation-principles.md`. Read it when a stage result looks
convincing but weak.

## Reference files

- `references/01-experimentation-principles.md` — criteria for reliable data + 6 principles
- `references/02-stage-3-solutions.md` — stage 3 only (9 components, impact/risk matrix)
- `references/03-stages-4-and-6.md` — stages 4 and 6 (offer, manual process)
- `references/04-stage-7.md` — stage 7 (viable business, product-market fit, channels)
- `references/05-stage-8-signals.md` — stage 8 (pulse of the system, signals in tension)
- `references/06-solutions-strategies-and-sources.md` — product shapes, 5 JTBD strategies, sources

## Domain skills

These are not stages. They are cuts you reach for by topic, in any order, when the
question is about that domain rather than about where you are in the method:

| Question | Skill |
|---|---|
| Who is the customer, what job are they hiring for? | `stelow-product-job-to-be-done` |
| Where is the opportunity? | `stelow-product-opportunity-mapping` |
| What does the market look like? | `stelow-product-multi-method-market-analysis` |
| How do I price it? | `stelow-product-pricing` |
| What business model? | `stelow-product-business-models` |
| How do I build trust? | `stelow-product-trust-building` |
| How do I run the launch promotion? | `stelow-product-promotions` |
| How do I advertise? | `stelow-product-ads` |
| Is it a paywall funnel? | `stelow-product-paywall` |
| Marketplace dynamics? | `stelow-product-marketplace-playbook` |
| Open source as strategy? | `stelow-product-open-source` |
| Is the product healthy? | `stelow-product-health` |
| How does it evolve over time? | `stelow-product-evolutionary-principles` |
| How do I break this into delivery scopes? | `stelow-product-scope-mapping` |

## Interaction tool guidelines

**IMPORTANT**: When the user needs to choose between predefined options, ALWAYS use
the `question` tool (if available) with enumerated format:
- Options with short `label` and `description`
- Examples: topic selection, next steps, etc.

When the `question` tool is not available, use enumerated text in chat (A/B/C/D or 1/2/3).

This is primarily a reference/exploratory skill. If the user wants to explore a specific
concept, you may ask clarifying questions to understand context before recommending
which stage to focus on.

## Rules for using this skill

1. **Route before answering.** Name the stage or domain, then read the skill that holds
   it. Do not answer a stage question from this page — it carries no stage detail.
2. **Never omit details** once routed — the e-book is already concise; every detail matters.
3. **Use concrete examples** from the method when explaining concepts.
4. **Preserve the order and logic** of stages when guiding the user.
5. **Combine stages** when context demands (e.g., stages 4 and 5 often go together;
   they now live in two different places, so read both).

---

## Attribution

This skill is based on the e-book **"Guia para criar produtos com aprendizado em
ciclos curtos"** (Guide to Creating Products with Short Learning Cycles) by
**calionauta**.

**Author**: calionauta
**Substack**: [Practical Guide to Validate Ideas](https://calionauta.substack.com/p/roteiro-pratico-para-validar-ideias)
**GitHub**: [@calionauta](https://github.com/calionauta)

This skill was translated and adapted by permission and attribution to the original author.

**Original Repository**: [github.com/calionauta/my-opencode-config](https://github.com/calionauta/my-opencode-config)

---

## Completeness contract

The host validates these minima — never submit fewer:

- Experiment plan with success/abort thresholds and the next step either way.
- At least 600 words and 3 headings.

criteria:
  - id: experiment-plan
    kind: presence
    text: "Experiment plan states success/abort thresholds and the next step either way"
  - id: word-count
    kind: count
    text: "At least 600 words and 3 headings"
  - id: threshold-falsifiability
    kind: semantic
    text: "Thresholds are falsifiable numbers or events, not vague aspirations"

## When to Use & Test Cases

Use when validating an idea or finding early adopters with short learning cycles.

Should activate: "validate this idea fast", "find early adopters for an MVP".
Should NOT activate: "write the launch post" (generation), "build the MVP" (execution).

## Examples

### Example: validate a meal-planning app idea in two weeks

**Input:** "I have an idea for an app. What do I do first?"

**Steps:**
1. Frame the riskiest assumption (will busy parents pay for planning?).
2. Pick the shortest-cycle experiment (concierge week, not a build).
3. Define abort criteria before running.

**Output:** Experiment plan with success/abort thresholds and next step either way.

## Edge Cases

### User wants to build immediately
- Slow down explicitly: name the unvalidated assumption building would bet on.
### No access to users
- Proxy with adjacent audiences; mark evidence weaker.
### Experiment succeeds ambiguously
- Treat as not-validated; tighten the threshold and re-run once.

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
stage          : context
description    : Strategic context. Market analysis, JTBD, domain detection. Gated by `context:5` (quality/review mode): experimental+Auto skips; experimental otherwise reduced ask. See the context stage, section 5.
status         : <done|partial|blocked>
artifacts      : <paths created or modified>
next-candidate : <the stage scripts/stelow next reports — run `scripts/stelow next`>
gate           : none
rework-on      : setup
```

Workflow mode: emit the above Hand-off block verbatim, then stop. Fill
`next-candidate` from `scripts/stelow next`: it is the workflow's own
answer, already accounting for this run's intent route and review mode.
The router skill consumes the next-candidate field and calls
`scripts/stelow advance <next-candidate>` to move state forward.

### Workflow slice

Workflow mode for the **context** stage. Standalone behavior lives in
the rest of this file (unchanged). Summary:

> Strategic context. Market analysis, JTBD, domain detection. Gated by `context:5` (quality/review mode): experimental+Auto skips; experimental otherwise reduced ask. See the context stage, section 5.

Primary actions (per stages.yaml): `read, write`. Run only the actions that
produce the artifacts promised in `## Hand-off`; skip anything that does
not advance the workflow.

<!-- stelow:scope3:end -->

