# Comparative study: where stelow's `/goal` fails and how Plannotator fixes it

**Date:** 2026-10-26
**Status:** study draft (not a change proposal)

## The real problem

`/goal` today produces a goal document. What it does not do is **guarantee that
the goal was reviewed by a human before execution starts**. In a long session, an
agent that writes its own goal and then executes it is validating its own
premise - and no test catches that, because the test validates the execution, not
the question that originated it.

Plannotator exists for that hole: turning an artifact the agent produced into an
artifact the human **explicitly approved**, with a record that survives the
session.

## What each one covers today

| Capability | `/goal` | Plannotator |
|---|---|---|
| Structures the intent into phases | yes | not applicable |
| Interviews the user | partial | yes (`/plannotator-setup-goal`) |
| Produces a reviewable fact sheet | no | yes |
| Explicit approval with a record | **no** | yes |
| Session survives a context switch | no | yes |
| Tracks execution per phase | yes | not applicable |
| Completion check per criterion | yes | no |

Neither one is complete. The question in this study is which gap matters more.

## Where `/goal` fails - four concrete modes

### 1. Self-validation of the premise

The agent writes the goal and then executes it. Nothing between the two steps asks
the human "is this what you want?". In long sessions, the goal written in phase 1
is restated in phase 5 by the same context that wrote it, so a premise error does
not show up as an error - it shows up as consistency.

### 2. Phases with no evidence of approval

The phases exist, but there is no artifact saying "this phase was approved on such
a date, for these reasons". When execution goes off the rails in phase 4, there is
no way to know whether the phase 1 premise was accepted or merely assumed.

### 3. Context evaporates

Compaction and session switching erase the why. The goal survives as text; the
conversation that justified it does not. The agent resumes with the statement and
without the reasoning, and tends to re-derive a simplified version of it.

### 4. No real gate

Since nothing requires approval, "goal completed" and "goal correct" collapse into
the same check. `/goal` verifies that the phases ran, not that the right question
was asked.

## How Plannotator fixes it

The `plannotator-setup-goal` flow turns intent into a **goal package**:

1. **Interview** - the human answers structured questions before any plan exists.
2. **Fact sheet** - what was understood becomes a reviewable document, with facts
   separated from assumptions.
3. **Review in Plannotator** - the human edits and approves the fact sheet
   explicitly, not "did not object".
4. **Execution** - only then is the plan produced, and it references an artifact
   that is already approved.

The underlying difference is the **record**: approval is an artifact with a date,
not a mental state of the human in that session.

## Proposal: `/goal` with a Plannotator gate

Three changes, in order of increasing cost:

### Change 1 - Mandatory fact sheet before the phases (cheap)

Before generating phases, `/goal` produces a fact sheet in the Plannotator format
and asks for approval. No approval, no phases. That closes failure mode 1 with one
step, no new infrastructure.

### Change 2 - Each phase references the fact sheet (medium)

Phases start citing the fact sheet item that justifies them. When execution
diverges, the divergence becomes visible as "this phase does not match what was
approved", instead of turning into silent reinterpretation.

### Change 3 - Approval per phase in Plannotator (expensive)

Each phase becomes its own review. More rigorous, and slower - probably only for
high-risk goals.

## What I would recommend

Start with **Change 1**. It solves the most serious failure mode (self-validation
of the premise) with one step and no new infrastructure dependency. Changes 2 and 3
are only worth it if 1 shows that the real bottleneck is execution, and not the
premise.

It is also worth considering the opposite alternative: keep `/goal` as it is and
use Plannotator only on the goals that justify the cost. Not every goal needs an
approved fact sheet - a routine refactor does not, an architecture change does.

## Open questions

1. Should the approved fact sheet be per goal or per session?
2. Who approves when there is more than one human on the project?
3. What happens when execution discovers the fact sheet was wrong - reopen the
   approval or go ahead with the divergence recorded?
