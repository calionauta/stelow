# Prompt 10: Job Map Steps — chronological steps, phase tags

**Source:** https://calionauta.substack.com/p/prompt-ia-descoberta-das-etapas-job

**When to use:** to map the steps a person actually takes to get the job done.
Run after the job and the actor are defined.

**Variables:**
- `{{Job}}`: the job statement
- `{{Actor}}`: the perspective
- `{{Depth}}`: `quick` (5–8 steps) | `standard` (8–14) | `deep` (14–20)
- `{{Map kind}}`: `core` | `consumption` (default `core`)
- `{{Start}}` / `{{End}}`: optional boundaries

**Read first:** `00-evidence-policy.md`.

---

## Prompt

```
## Job map
Job: {{Job}}
Actor: {{Actor}}
Depth: {{Depth}} — the step count comes from here, not from the phases
Map kind: {{Map kind}}
Boundaries: {{Start}} → {{End}} (optional)

## The distinction that governs this prompt

PHASES ARE TAGS. STEPS ARE THE MAP.

The six phases below label and audit coverage. They are not the structure of the
map, and they never set the step count. A phase may hold zero, one or many steps.

Phases:
1. Define and Plan — what must be known or decided before starting
2. Prepare and Execute — preparing inputs, then the core action
3. Evaluate and Adjust — checking during the work, and correcting
4. Conclude and Organize — finishing and putting things away
5. Document and Share — recording and handing off
6. Monitor subsequent effects — watching what happens after

## Steps

1. Write the chronological steps for THIS job and THIS actor, at the depth band.
2. Each step: verb-led name, one line of *what* (not *how*, not a tool), one
   phase tag.
3. Dense phases (usually Prepare and Execute) may hold several steps. Quiet
   phases may hold none.
4. After drafting, read only the steps. Do they cover the job without overlap?
   Is any phase's absence a real gap, or just a scope choice?
5. Respect the boundaries if given.

## Rules

- Steps are first person singular, verb first.
- No solution brand, no tool name, no technology in a step. A method word is
  allowed only when the job cannot be described without it — say why.
- No vague verbs: manage, facilitate, empower, enable, ensure, oversee.
- No conjunctions joining two actions into one step.
- A phase with zero steps is allowed. It requires one line of reason, not a
  filler step. `Document and Share` names a coverage area, not a method: the
  steps inside it still have to pass the no-tool rule.

## Output

### Boundary first

Before the table, state both ends of the map. A map without a start has no
trigger, and a trigger outside step 1 is the most common reason a step looks
missing.

```
## Boundaries
- Starts: <the event that makes the job begin> · <status>
- Ends: <the state that means the job is done> · <status>
```

Both ends carry a status on the same line, no exceptions. If either is unknown,
say `Open` and name what would settle it. Never leave
the line out: an unstated boundary reads as a stated one.

### Job line

`Job: <verb> + <object> + <contextual clarifier> · <status>` — the status sits on
the same line, always. One sentence, solution agnostic.

If the clarifier is unknown, write the sentence without it and mark it `Open` on
the same line. If you inferred the clarifier, say so: `· Hypothesis - bet`. An
inferred scope written without a status reads as a fact, and that is the exact
failure this line exists to prevent.

## The map

The header row is fixed and stays in English: it is schema, like the statuses.
Translate the content, never the headers.

| # | Step | Phase | Executor | Decider | Output | Failure mode | Status |
|---|-------|------|--------------|-------------|-------|---------------|--------|
| 1 | ... | ... | role class | role class, or `-` | what the step produces | how it fails | `Input-derived` / `Hypothesis - bet` / ... |

- **Who runs it** is the role class that performs the step. **Who decides** is who
  authorizes, approves or releases the step. When the role is not known, write
  `Open` - do not leave the column empty, and do not invent one. The `Who decides`
  column is what lets you point to where the unknown approver enters the flow.
- **Output** is the artifact or state the step hands to the next one. Without an
  output, the step has not finished.
- **Failure mode** is what breaks in this step, in the language of the person
  running it.
- **Status** uses the names from `00-evidence-policy.md`. The warrant, when there
  is one, goes in parentheses at the end of the line.
- Writing provenance as free text is forbidden ("it comes from what you said").
  It is either a status plus a fragment, or `Hypothesis - bet`.

### The last step is the final state

The last step delivers the outcome of the job, not the last correction. If the
job ends with the period closed, the final step is "period closed and checked";
correcting is a loop that goes back to checking, not the end of the list. A map
that ends in "I correct" models rework as if it were the goal.

### Metrics

A metric per step is not the Prompt 7 success criterion. Here it is the signal
that shows whether *this* step worked.

Produce them for the **3 riskiest steps** (`quick` and `standard`) or for all of
them (`deep`). Four types:

| Step | Metric | Type | How to measure | Source | Status |
|---|---|---|---|---|---|
| ... | ... | Time / Error / Effort / Completion | ... | ticket, log, interview, `none` | ... |

- **Time** - how long the step takes, and how long recovery takes when it fails.
- **Error** - how often the output comes out wrong or comes back for correction.
- **Effort** - how many actions, people or handoffs the step requires.
- **Completion** - whether the step ends: where it stops, who stops it, how long it
  stays stopped.

`Source` is mandatory. `none` is a valid answer and downgrades the metric to
`Hypothesis - bet` with the check. A metric without a source is a bet, not a
measurement.

## Coverage

| Phase | Steps | Why this count |
|---|---|---|
| Define and Plan | 0 | {reason, or the step names} |
| ... | ... | ... |

- Where a failure would show up first: {phase} - {why}
- The riskiest phase for this job: {phase} - {why}
- Steps the actor would take and you do not know whether they do: {list} - {Status}
```

## Completeness contract

- Steps within the depth band, or an explicit user override.
- Every step carries exactly one phase tag from the six, one executor, one
  decider (or `Open`), one output, one failure mode and one status.
- The last step is the job's outcome state, not a correction.
- The coverage table lists all six phases, including the ones with zero steps.
- No filler: a zero-step phase has a reason, not an invented step.
- No vague verbs, no brand names in steps.

criteria:
  - id: boundaries
    kind: presence
    text: "Both ends stated with a status, or Open with what would settle it"
  - id: table-shape
    kind: presence
    text: "The step table has the fixed columns: Step, Phase, Executor, Decider, Output, Failure mode, Status"
  - id: depth-band
    kind: count
    text: "Step count inside the depth band, or an explicit override"
  - id: step-fields
    kind: presence
    text: "Every step carries phase, executor, decider, output, failure mode and status"
  - id: actor-step-link
    kind: presence
    text: "The decider column names a role class or Open; no unknown approver is left blank"
  - id: final-state
    kind: semantic
    text: "The last step is the job's completed outcome, with corrections modelled as a loop"
  - id: metrics
    kind: presence
    text: "The riskiest steps carry a metric with type, measurement and source"
  - id: phase-coverage
    kind: presence
    text: "All six phases appear in the coverage table, with zero-step phases justified"
  - id: no-filler
    kind: semantic
    text: "No step exists only to populate a phase; each step is an action the actor takes"
  - id: no-vague-verbs
    kind: semantic
    text: "No step opens with manage, facilitate, empower, enable, ensure or oversee"

## Worked example — synthetic, not evidence

Job: `qualify a replacement sensor package for sour gas service`.
Actor: plant reliability engineer. Depth: `quick`, 7 steps.

| # | Step | Phase |
|---|---|---|
| 1 | Lock the operating envelope and the certification obligations | Define and Plan |
| 2 | Gather the applicable standards and prior certificate packages | Prepare and Execute |
| 3 | Assemble the constraint sheet from the envelope and the certificates | Prepare and Execute |
| 4 | Decide the go/no-go scope against site and insurer rules | Evaluate and Adjust |
| 5 | Specify the replacement configuration against the locked envelope | Prepare and Execute |
| 6 | Resolve divergences between the offered configuration and the envelope | Evaluate and Adjust |
| 7 | Close acceptance with traceability artifacts | Conclude and Organize |

`Document and Share` and `Monitor subsequent effects` hold **zero** steps here.
That is intentional, not an error: the job ends at acceptance, and handoff is
absorbed into step 7. The coverage table says so.

*Synthetic — not evidence.*
