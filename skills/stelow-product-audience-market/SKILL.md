---
name: stelow-product-audience-market
description: >
  [stelow] Find and understand an audience, then define the market as a group of
  people pursuing a functional purpose. Use when the user asks: who is my audience,
  how do I find early adopters, how do I define my market, what is my segment,
  how do I talk to potential customers, SEDIF, GPN story, jobs to be done market
  definition, or when discovery reaches stages 1-2 (find the audience, define the
  market) and needs the concrete moves: where people gather, how to interview
  without pitching, how to write a market definition and segment it.
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

# Audience and Market Definition

Two stages of the short-cycle method. Stage 1 explores the problem space; stage 2
turns what you learned into a market you can act on. Both come before any solution
thinking — if you skip them you will build for an audience you invented.

**Core rule**: in stage 1 you are not validating your idea. You are understanding
people. The moment you mention your solution, the conversation stops being evidence.

## Stage 1 — Find and Understand the Audience

**Objective**: explore the "problem space" — the contexts, difficulties, and needs
of people who are actively trying to solve something. It is not to validate your
idea, but to understand the audience deeply.

**Tips**:
1. If you already have a solution idea, it is still worth going through this stage.
2. If you lack time or resources, explore with AI — especially the purposes people
   want to accomplish and the needs attached to them.
3. Useful tools: GummySearch, AnswerThePublic, Glimpse, Google Trends, Globe.engineer.

### SEDIF — where to find people

**S=Follow, E=Entertain, D=Invest Money, I=Go/Attend, F=Frequent** — four practical
dimensions (D and I collapse into "invest"):

- **Follow**: who do they follow, which people inspire them? (friend network, work
  colleagues, authors and influencers on social media)
- **Entertain**: how do they have fun? (hobbies, places)
- **Invest**: what do they invest money and time in? (conferences, events, stores
  that sell the resources they use)
- **Frequent**: what places do they frequent, physical or virtual, to talk about the
  subject? (forums and communities — Facebook, Reddit, etc.)

### Create a space to gather people

- **Webinar** on the topic — to register, ask for name and contact.
- **WhatsApp or Telegram group** for people who want to discuss the topic (or a
  Discord server).
- **Quiz** on the topic helping the person evaluate their knowledge — to receive the
  result, ask for name and email. Tools: Tally, Scoreapp, Limesurvey (open-source).

### Understand people

Discover:
- What is the person's context when facing the current challenge?
- What is the person's purpose at that moment?
- What are the needs related to that purpose?

**Conduct interviews** as open conversations, without pressure or a fixed structure —
people should feel like they are chatting. Consult the summary of *The Mom Test* for
how to hold this kind of conversation.

Other sources: past conversations, interviews and surveys on the subject (company
files, internet), support tickets.

**Remember**:
- Do not talk about your idea: focus on the problem you want to understand.
- Talk about past experience, not the future. Instead of "what would you do if…?",
  ask "tell me about the last time you needed…".

## Stage 2 — Define the Market

**Objective**: translate what stage 1 taught you into a clear market definition — not
generic, but a group of people trying to accomplish a specific purpose.

**Market definition (jobs to be done)**:

> A **(1) group of people** who want to accomplish a **(2) functional purpose**
> (action or expected result).

⚠️ Focus on the **functional purpose**, not emotional or social purposes. Emotional
and social purposes matter for experience and communication, but they give no
practical direction for innovation.

**Examples**:
- [Music enthusiast] who wants to [listen to music]
- [Person] who wants to [find a new job]

### Segments

A segment is a group of people pursuing the same purpose but facing different
challenges.

Examples:
- [Music enthusiast] who wants to [listen to music] [while on the street]
- [Unemployed person with long professional experience] who wants to [find a new job]
- [Person] who wants to [find a new job] [in a new city or country]

Your definition can be the broad group or directly a specific segment. Strategically,
focus on 1–3 segments.

### GPN story (Group, Purpose, Needs)

After defining the market and refining the list of needs, write:

> As [group — general or segment] who wants to [purpose] [optional: context], I want a
> solution that makes it easier, faster, cheaper, and more accurate to: [need 1],
> [need 2], [need 3]…

**Example**:

> As [unemployed person with long professional experience] who wants to [find a new
> job], I want a solution that makes it easier, faster, cheaper, and more accurate to:
> - Identify opportunities for my experience level
> - Demonstrate the value of my experience
> - Prepare for the selection process

## Completeness contract

The host validates these minima — never submit fewer:

- A market definition in the GPN shape, naming the group and a functional purpose.
- At least two needs attached to that purpose.
- Evidence of at least one real conversation, listed as notes, not conclusions.

criteria:
  - id: gpn-shape
    kind: presence
    text: "Market definition names a group and a functional (not emotional) purpose"
  - id: needs-listed
    kind: count
    text: "At least two distinct needs tied to the stated purpose"
  - id: real-contact
    kind: presence
    text: "At least one real conversation recorded as notes, not paraphrased conclusions"
  - id: no-pitch
    kind: semantic
    text: "Interview notes describe past behaviour, not reactions to a described idea"

## When to Use & Test Cases

Should activate: "who is my audience for this?", "how do I define my market?", "how do
I talk to potential customers without pitching?", "what segment should I focus on?".

Should NOT activate: "how do I price it" (pricing), "how do I launch it"
(launch-validation), "write the persona document" (generation with no evidence).

## Examples

### Example: finding an audience for a meal-planning app

**Input:** "I want to build a meal-planning app for busy parents. Who do I talk to?"

**Steps:**
1. Run SEDIF: parents follow nutrition accounts, entertain at kids' activities,
   invest in grocery delivery and cooking courses, frequent parenting groups.
2. Pick one space with contact capture — a quiz on "how much do you spend planning
   meals?" gated behind an email.
3. Interview 5 people about the last time they planned a week of meals. No pitch.
4. Write the GPN story from what they actually said.

**Output:** GPN story naming the segment, two or three needs, and interview notes.

### Example: market too broad

**Input:** "My market is everyone who eats."

**Steps:**
1. Reject the emotional/generic definition; demand a functional purpose.
2. Narrow to a group plus an action: "people who want to plan a week of meals in
   under 10 minutes".
3. Pick 1–3 segments by context: parents of toddlers, shift workers, people with
   dietary restrictions.

**Output:** Functional-purpose market definition with segments named by context.

## Edge Cases

### User wants to skip to the solution
- Stage 1 and 2 exist precisely because the solution is unknown there. Name the
  assumption they would be betting on and go talk to someone instead.

### No access to the audience
- Use adjacent groups and mark the evidence as weaker. Second-hand evidence from
  forums and reviews is acceptable for stage 1, not for stage 5.

### The audience is already known and hands-on
- Do not skip stage 2. A known audience still needs a written functional purpose —
  otherwise every later experiment measures the wrong thing.

### Segment choice stalls
- Pick by access, not by size. The segment you can reach this week beats the larger
  one you cannot interview.

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
