---
name: stelow-product-job-to-be-done
description: >
  [stelow] Jobs To Be Done (JTBD) analysis and discovery. Contextual
  segmentation, thinking styles (Indi Young), JTBD discovery, competitor
  mapping, job actors, situational variables, job map steps, functional needs
  (desired outcomes), financial needs, emotional/social jobs, and switch
  interviews. Use whenever the user mentions jobs to be done, JTBD, contextual
  segmentation, thinking styles, Indi Young, job map, job steps, desired
  outcomes, user needs, JTBD competitors, job actors, situational variables,
  emotional jobs, social jobs, forces diagram, or switch interview.
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

# Jobs To Be Done — Complete Skill

Eleven specialized prompts for a JTBD analysis. Every prompt is a slot that must
be **answered**, never a slot that must be **filled**. An answer may be
`Not applicable` or `Open`; a fabricated answer may not.

## What this skill is not

- Not a research method. It structures what the user brings; it does not
  generate evidence.
- Not an interview service. Prompt 11 is a switch-interview protocol; other
  interview styles are out of scope.
- Not a prioritization model. The composite score ranks work; it does not
  estimate demand.
- Not a publisher. Nothing here writes to an external tool.

## Prompt map

| # | Prompt | When to use |
|---|---|---|
| 1 | Contextual Segmentation | Segment a market by situation, not demographics |
| 2 | Thinking Styles (Indi Young) | Distinct ways a performer thinks about a purpose |
| 3 | JTBD Discovery | Reframe a solution, action or outcome into jobs |
| 4 | Competitor Discovery | Direct, indirect and hidden competitors |
| 5 | Job Actors | Every role around the job, including the ones that do not exist |
| 6 | Situational Variables | Factors and variables that change the outcome |
| 7 | Functional Needs | `Ensure` / `Avoid` success criteria |
| 8 | Financial Needs | `Minimize the cost of` criteria for the buyer |
| 9 | Emotional & Social Jobs | How the performer wants to feel and be seen |
| 10 | Job Map Steps | Chronological steps, tagged by phase |
| 11 | Switch Interview | Timeline and the four forces behind one switch |

## Routing, intake, depth

**Intake, before generating.** Two batches, never one wall.

**Batch 1 — material.** Ask before anything else: *do you have interviews,
notes, support tickets, messages, recordings or links?* Three lanes:

| lane | what it means | what changes |
|---|---|---|
| **material** | the user supplies transcripts, tickets, docs or recordings | read them first; quotes are `Input-derived`; findings may be `Inference — high confidence` |
| **research** | no material, but the web may supply candidate language, context and alternatives | everything is `Research-derived` or `Hypothesis — bet`; the web never establishes that a job exists |
| **none** | nothing to read | hypothesis mode: the most plausible bet at every slot, each with its check |

The lane is declared on the **first line** of every output — `Lane: material`,
`Lane: research` or `Lane: none` — and does not change mid-run. Omission is not
neutral: two runs of the same skill classified the same input differently when
the line was optional. Moving from `none` to `material` means a new run, not a
patch. Quotes the user repeats from their own support channel count as
`material`, and the lane is then `material (thin)`.

**Batch 2 — frame.** Required: the job (or the solution, which gets reframed),
the actor, and the decision the output supports. Optional: segment, depth.
Missing required input is a question, not a guess. Four short questions total
across both batches.

**Route from the user's words.** If the ask names a prompt, go there. Ask only
when the ask is genuinely ambiguous or spans prompts that produce different
artifacts. Never open with an eleven-option question.

**Route by lane, not by topic.** What the ask can deliver depends on what exists
to read. The lane from intake decides which prompts are allowed:

| ask | material | research | none |
|---|---|---|---|
| what job is this? | 3 | 3 | 3 |
| who is involved, who approves? | 5 | 5 | 5 |
| where does it break? | 10 | 10 | 10 |
| why do they switch or churn? | 11 | 11 as a plan | 11 as a plan |
| how do they think? | 2 | **blocked** | **blocked** |
| how do they feel, how do they want to be seen? | 9 | 9, hypothesis | 9, hypothesis |
| which segment? | 1 | 1 | 1 |
| who competes? | 4 | 4 | 4 |
| what does good mean? | 7 | 7 | 7 |
| what does it cost them? | 8, if the gate passes | 8 | 8 |
| **which of these two do I build?** | 5 + 10 + record | same | same |

`blocked` is literal: Prompt 2 without interviews produces five invented
personalities. Say what material would unlock it, and stop.

**Decision route.** When the user is choosing between two or more things, do not
run a full mapping. Run Prompt 5 and Prompt 10 at `quick`, then write the
**decision record** (below). That route exists because it was the single most
useful output of the empirical rounds, and it started as an improvisation.

**Depth** (default `standard`):

| depth | segments | contextual jobs | styles | steps | Prompt 7 top | Prompt 8 top |
|---|---|---|---|---|---|---|
| `quick` | 4–6 | 6–10 | 3–4 | 5–8 | 5 | 10 |
| `standard` | 6–8 | 10–15 | 4–6 | 8–14 | 10 | 20 |
| `deep` | 8–10 | 15–20 | 5–7 | 14–20 | 10 | 30 |

The band is a contract. Deviating from it needs the user's explicit override.

**Depth is capped by the lane.** In lane `none`, `deep` needs an explicit
override and the output says the extra detail is structure, not evidence. More
fields over the same absence of material multiply invention, not insight: a
twelve-step map built on nothing is twelve guesses with a table around them.

**Restate before a full run.** One line: job, actor, depth. Proceed unless
corrected.

## Closing

Every run closes with a **reading**. Two extensions are optional and independent
of the surface, the tab, and the depth:

- **Bet** — when the user needs a direction: to build, to test with partners, to
  justify a POC, to keep exploring. A bet is a claim with a falsifier, not
  necessarily a build decision.
- **Option table** — only when the bet is between concrete alternatives. Without
  competing options there is nothing to tabulate, and forcing one invents a
  choice the user does not have.

A consultant in research may want `deep + reading + bet` (the map is the
deliverable, the bet is what to test next). A founder in build may want
`quick + bet` (a Friday decision, not a report). Complete analysis and a bet are
not the same axis.

What the extensions depend on:

| question | if yes | if no |
|---|---|---|
| is there a choice between concrete options? | option table | bet only, or reading only |
| is there something to test (POC, partner, interview)? | bet + check | reading |
| is being wrong expensive or irreversible? | deeper + a counted check | `quick` is enough |
| who reads it? | partner or investor → needs credibility (metrics, sources) | internal use → `quick` |

The surface sets only a starting default: research starts lighter, build starts
with a bet. Both are overridable, and the user can ask for the other at any point.

## The betting record

When the run carries a bet, the last artifact is a record, not a summary. It is
the only artifact that carries frontmatter, because it is the only one a script
should index. The `Option → step` table is present only when there are options.

```markdown
---
job: <the job statement>
segment: <segment name>
depth: quick | standard | deep
lane: material | research | none
bet: <the claim the run is willing to defend>
confidence: low | medium | high
# the two below exist only when there are competing options
options: [<option A>, <option B>]
verdict: <option A or B or undecided>
---

## Option → step
Only when there are competing options. Omit the section otherwise.

| Option | Steps it touches | What it covers | What it leaves out |
|---|---|---|---|

## Bet
<the chosen option, as a `Hypothesis — bet`, with the failure that would disprove it>
**Direction:** <A can cause B, not the reverse> | `symmetric`
**Chain starts at:** <step N>

## Check
<the cheapest test with what the user already has, with a number and a cost>

## Not run
<the prompts that would add information, and what each would add>
```

### What a bet can be about

A bet is not only "build A instead of B". It is any claim about the job that, if
false, changes the next move. The option case is the rarest.

| kind | claim | check |
|---|---|---|
| **Boundary** | the job starts or ends elsewhere than assumed | watch one run end to end |
| **Actor** | the decider is X, not Y | follow one case to the decision |
| **Step** | the break is at step N, not later | classify tickets by step |
| **Segment** | the pain concentrates in group G | split churn or tickets by G |
| **Value** | this job justifies a POC or a partner conversation | 3 conversations with the map in hand |
| **Option** | build A, not B | the counted test that separates them |

Only `Option` needs the option table. A `Boundary`, `Actor`, `Step`, `Segment` or
`Value` bet closes with the claim, its falsifier and its check.

Examples of a non-option bet:

- **Boundary:** "the job is monthly close, not continuous entry — the entry is a
  step, not the job." Falsified by finding firms whose pain is in entry itself.
  Check: watch one close and time each step.
- **Actor:** "the approver is the firm owner, not the owner's client." Falsified
  by an expense that waits on the client. Check: follow three expenses to the
  decision.
- **Value:** "this is worth a POC with two partners." Falsified by neither partner
  recognising the map. Check: two conversations, the map on the table.

Rules:

- `bet` is required whenever the record exists; `options` and `verdict` are not.
  A bet without competing options is the normal case for a POC, a partner
  conversation, or a research direction.
- `verdict` may be `undecided`. That is a result, not a failure, and the check is
  what resolves it.
- **Asymmetry comes before tie.** Before declaring a tie, ask whether one symptom
  can *produce* the other. If option A failing can generate option B's symptom,
  the choice is not symmetric: favor A, and write the direction explicitly —
  `A can cause B, not the reverse` — plus the check that would confirm the causal
  link. Two symptoms at different steps are not automatically a tie; they are a
  tie only when neither can produce the other.
- **Tie rule.** When neither symptom can produce the other, and the strongest
  argument for A mirrors the strongest argument for B, the verdict is
  `undecided`, and the check must be the test that separates them. Picking one
  anyway is a coin flip with a rationale.
- **Every verdict names the chain.** `verdict` is not enough: the record states
  which step starts the chain it bets on. A verdict with no step is a preference.
- `confidence` is directional. It is never a probability.
- The record is written **after** the map and the actors, never instead of them.
- A run that only produces the record has skipped the work that justifies it.

## The one rule that governs all eleven prompts

Every item carries a `Status`. Read `references/00-evidence-policy.md` before
running any prompt. The short version:

`Input-derived` · `Research-derived` · `Inference — high confidence` ·
`Hypothesis — bet` · `Not applicable` · `Mesmo ator que {role}` · `Open`

`Inference — high confidence` requires a **warrant**: the fragment of the job
statement or segment that entails the item. No quotable fragment, no high
confidence. For a step or a job, the warrant must contain the action.

**Reproduce this legend verbatim at the top of every output.** The first round
lost three statuses to paraphrase. Free-text provenance ("vem do que você falou")
is not a status and is not allowed.

**Line budget** (excluding the Q&A log): `quick` ≤ 120 lines, `standard` ≤ 200,
`deep` ≤ 320. The floor is set by the structure — twelve roles plus six steps
plus metrics plus the record already costs about a hundred lines. Over budget
means padding or the wrong depth, not richness.

## Pass-forward

Every prompt ends with the block the next one consumes. A missing field is a
visible gap, not a silent invention.

```
## Pass-forward
job      : <the job statement this prompt settled on>
segment  : <segment name + one-line market definition>
actors   : <populated role classes only>
carry    : <the artifact the next prompt needs>
open     : <what is Hypothesis or Open>
```

## Interaction

When the user must choose between options, use the portable ask contract
(`../stelow-workflow-orchestrator/references/cli-tools/ask.md` — host-native
question tool, else `stelow ask`, else enumerated text). Options carry a short
`label` and a `description`. Include an "you choose" option in the user's
language.

Output language: the prompts are written in English; the result is delivered in
the language the user writes in.

## Research

Research may surface candidate language, contexts, competitors and alternatives.
It never establishes that a job exists, that people struggle, or how many do.
Use the shared web-research contract
(`../stelow-workflow-orchestrator/references/cli-tools/web-research.md`).
Research-led items are `Research-derived` or `Hypothesis — bet`, never
`Input-derived`.

## Close

End any standalone run with these five lines:

```
built   : <what this run produced>
not run : <prompts that would add information, and what they would add>
open    : <what is Hypothesis or Open>
riskiest: <the one assumption that would sink the decision>
next    : <the cheapest check, or the next prompt>
```

`not run` exists because absence must never be implicit. If the run produced a map
without metrics, say so and name Prompt 7. If it produced roles without steps,
say so and name Prompt 10.

## References
- `references/00-evidence-policy.md` — statuses, warrant test, banners
- `references/01-contextual-segmentation.md`
- `references/02-thinking-styles.md`
- `references/03-jtbd-discovery.md`
- `references/04-competitors.md`
- `references/05-job-actors.md`
- `references/06-situational-variables.md`
- `references/07-functional-needs.md`
- `references/08-financial-needs.md`
- `references/09-emotional-social-jobs.md`
- `references/10-job-map-steps.md`
- `references/11-switch-interview.md`

## Attribution

The method and the original prompts are by **calionauta** — product strategist
and JTBD practitioner. Each rewritten reference keeps its source line:

- Prompts 1–10: [Jobs To Be Done in Portuguese](https://calionauta.substack.com/p/e-book-jobs-to-be-done-em-portugues),
  [Recursos Principais](https://calionauta.substack.com/p/recursos-principais),
  [Substack](https://calionauta.substack.com).
- Prompt 11 (switch interview) is new; the four forces and the switch timeline
  follow Bob Moesta's work, restated here as a protocol, not quoted.

## When to use & test cases

Use when segmenting by situation or mapping a job to be done — never by
demographics.

Should activate: "segment this market by situation", "map the jobs for expense
approvals", "who is involved in this job", "why did this customer switch".

Should NOT activate: "build personas by age and income" (out of scope).

## Examples

### Example: why accounting firms churn

**Input:** "support hears 'não sei onde aprovar' and 'o relatório não fecha'".

**Steps:** intake (job, actor, decision) → Prompt 5 for the roles, with four of
them `Not applicable` → Prompt 10 for the map, at `quick` depth → one
`Hypothesis — bet` naming the cheapest check.

**Output:** a role table where every role is populated, hypothetical or
explicitly absent, and a map where at least one phase holds zero steps and says
why. *Synthetic — not evidence.*

## Edge cases

- **The user names a tool, not a job.** Reframe until solution-agnostic, restate
  the reframe, then map.
- **A role has no plausible actor.** `Not applicable — <reason>`. Never a name.
- **The user has no material at all.** Hypothesis mode banner, then proceed;
  every item is a bet with its disconfirming check.
- **A criterion cannot be measured by speed, ease and consistency together.**
  Rewrite it; do not keep it and hope.
- **Two thinking styles would merge.** Merge them and say so. Fewer distinct
  styles is a finding, not a gap.

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
