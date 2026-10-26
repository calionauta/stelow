---
name: stelow-product-manual-process
description: >
  [stelow] Discover the process with a valuable manual process before building:
  concierge, wizard of oz / Flintstoning, repackaging, integration, plus the
  integration and systemic validation rules for high-risk and consequence
  systems. Use when the user asks: should I build it now or do it manually
  first, what is a concierge MVP, what is wizard of oz testing, how do I test
  whether I can actually deliver, how do I validate a high-risk or AI system
  before release, or when discovery reaches stage 6 (discover the process) and
  needs execution and usability risk tested before productizing.
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

# Discover the Process — the Valuable Manual Process

**Objective**: test the **execution and usability risk** — can you actually deliver the
solution? Instead of jumping to full development, experiment with a "valuable manual
process".

**Tip**: only skip this stage if you (1) already have sufficient personal knowledge of
the process, or (2) have a strong assumption plus the resources to automate or produce a
new simplified solution within the same time and money it would take to discover the
process. **In general, run this stage.**

> Don't underestimate the real world: you will probably spend more time and money trying
> to develop something if you skip this stage without agreed limits.

## What to do

Systematize manual or outsourced solutions that let you learn the complete process people
will use to solve the problem with the new solution, and how it fits their context.
**Systematize the process before productizing it.**

> Sahil Lavingia: *"As you complete the first cycle with clients, document every part of
> the process so that with each subsequent client, you have a guide. This document will
> be the true MVP of your business — not the minimum viable product we're all trying to
> build and launch. I'm talking about the valuable manual process that precedes it and
> will be the foundation for the business you're trying to build. Methodically."*

Use the six experimentation principles while running it (see the `references` of
`stelow-product-discovery`, file `01-experimentation-principles.md`).

## Examples of a valuable manual process

**Personal assistant (concierge)** — do it together with the client, live if possible.
Identify and offer the best solution for them and collect feedback as you go.

**Artisanal backstage (Flintstoning / Wizard of Oz)** — offer a solution that looks
automated to the person while you do it manually behind the curtain. Reveals bottlenecks
and risks fast.

**Repackaging** — use another company's product or service under your own packaging.
Reveals whether something already solves it well and where the improvement points are.

**Solution integration** — offer an integration of several existing solutions, especially
digital ones. Tools: Windmill.dev, N8N, ActivePieces, Zapier, Make.com.

## What risk this mitigates

- **Execution / realization risk** — feasibility: are you capable of solving the problem?
- **Usability risk** — will people know how to use it?

## What to observe (signals)

Can the process be repeated with more people while keeping quality and depending less on
your specific performance? In other words: could someone else solve it following the same
process you followed? And better still: could you automate it by integrating solutions?

## High-risk and consequence systems — integration and systemic validation

This section applies to a category of solutions that needs an extra layer of rigour
before evolving into a viable business. For these, jumping from stage 6 straight to
stage 7 is not merely risky — it can be irresponsible. The biggest risk is not only
financial but operational, legal and human.

The focus shifts from "building something nobody wants" to also **"avoiding building
something that causes harm in ways we cannot control"**.

### Complicated vs. complex systems

**Complicated system** — like an airplane engine. Components and rules with linear,
predictable interactions. The risk lies in the quality of execution.
Examples: software for medical equipment, financial transaction systems, platforms with
sensitive fiscal or legal data, autonomous vehicle control. A failure is not a surprise;
it is a calculation or implementation error.

**Complex system** — like an ecosystem. Interconnected components with emergent, often
unpredictable behaviour. The risk emerges from unanticipated interactions.
Examples: a social network, a recommendation algorithm that creates filter bubbles,
products with AI models that learn and adapt continuously.

### What to do

**1. Modular development and contained experimentation**
Each module goes through its own validation cycle (stages 1 to 6, on a smaller scale)
before being integrated.

**2. Integration and system testing**
Connect the validated modules and test the connections between them.

- For **complicated systems**: verify compliance, absence of failures, and adherence to
  regulations.
- For **complex systems**: detect emergent behaviours, vulnerabilities and unintended
  consequences. Validation focuses on the **robustness of containment and control
  mechanisms**. Questions to answer:
  - Are the early warning systems effective?
  - Do the automatic "emergency brakes" that contain an escalation of damage work?
  - Are the user-facing controls to manage their experience and protect themselves clear
    and accessible?

**Process**: integrate two modules, test them exhaustively, add a third, and so on.
Document how each new component affects the system as a whole.

**3. Simulation in a controlled environment (staging / sandbox)**
Before any contact with the public or a real production environment, the integrated
system must run in a simulation that mirrors real conditions.

**Purpose**: observe behaviour over time, apply stress, and let an internal team — or a
very restricted group of expert pioneers — interact in a safe environment.

**Signals**: stability, resilience (how the system recovers from failure) and, above all,
the **absence of damage or negative consequences**.

Only after this process is it safe to advance to stage 7.

## Completeness contract

The host validates these minima — never submit fewer:

- The manual process written as repeatable steps someone else could follow.
- For high-risk systems: the complicated/complex classification, with the containment
  question answered.
- A stated verdict on whether the process can be handed to another person or automated.

criteria:
  - id: process-repeatable
    kind: presence
    text: "The manual process is written as steps another person could execute"
  - id: risk-classified
    kind: presence
    text: "High-risk systems are classified complicated or complex before integration"
  - id: handoff-verdict
    kind: semantic
    text: "States whether another person could run it, not merely that it worked once"

## When to Use & Test Cases

Should activate: "should I build it or do it by hand first?", "what's a concierge MVP?",
"how do I know if I can deliver this?", "how do I validate an AI/high-risk system?".

Should NOT activate: "what should the offer be" (offer), "who pays how much" (pricing),
"start writing the app" (execution).

## Examples

### Example: meal planning, done by hand first

**Input:** "I want to build the app. Can I start coding?"

**Steps:**
1. Run a concierge week: plan meals for 5 clients manually, over WhatsApp.
2. Record every step, including the ones that felt obvious.
3. Observe: can a VA repeat this with the written guide? Where does it break?

**Output:** repeatable manual process, plus the bottleneck list that defines v1.

### Example: AI recommendation feature

**Input:** "It's just a recommendation model. Can we ship it?"

**Steps:**
1. Classify: complex, not complicated — emergent behaviour is the risk.
2. Define containment: what stops a harmful recommendation loop? Are the brakes tested?
3. Run it in a sandbox with a restricted expert group before any public exposure.

**Output:** classification, containment mechanism, sandbox result.

## Edge Cases

### You already know the process cold
- Then skip, but write down why. Skipping because "it's obvious" is how bottlenecks get
  discovered after launch.

### Manual process does not scale
- That is the expected outcome and the useful finding. What does not scale by hand tells
  you exactly what to automate first.

### Wizard of Oz feels deceptive
- It is legitimate if the person gets real value and nothing is charged under false
  pretences. Say what you can honestly say; never take money for a service you cannot
  deliver.

### High-risk system with no staging environment
- Do not proceed. Building a staging path is part of the work, not an optional extra.

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
