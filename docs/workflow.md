# Workflow

Three conceptual phases, 18 stages total for a full feature (`triage` →
`select` → `setup` → `context` → `shape` → `critique` → `gate` → `scope`
→ `interface` → `int-gate` → `selection` → `architecture` → `planning` →
`plan-gate` → `execution` → `verification` → `diff-gate` → `audit`).
Shorter intents run shorter routes (bugfix skips scope/interface/architecture/planning;
refactor skips shaping; investigate is triage-to-audit). The stage graph is enforced, not
advisory: `scripts/stelow advance` validates every move against
`transitions.md` (generated from `stages.yaml` — never edited by hand).

Explicit run knobs plus **Review Mode** control the whole pipeline.
Knobs bound consideration breadth and verification rigor — never calendar
duration. **Review Mode** controls which gates and human waits run.
These are the canonical names. Hosts may show friendlier labels — the bb
board calls them *Quality*, *Exploration* and *Pause for my
review* — but state and docs always use the canonical terms (see HOSTING.md
vocabulary).

## Run knobs — constraints, not estimates

Knobs bound breadth and rigor before the work is defined. The bounds never
widen; the scope gets cut to fit. (This departs from Shape Up's calendar
appetite: under LLM execution, wall-clock time is not a predictable
governor, so knobs cap consideration breadth and verification rigor
instead. A legacy `appetite:` line — Lean/Core/Complete — is still
accepted and mapped once to knobs, rigor always strongest, then rewritten.)

| Knob | Values | What it changes | Best for |
|---|---|---|---|
| **Quality** | `production` (default) / `experimental` | Full paths, edge cases, parallel reviewers, full test layers; experimental runs lighter, probes only | Production for anything shippable; experimental for idea evolution |
| **Exploration** | count 1–5 (default 3) + hybrid whenever count ≥ 2 | Directions compared per divergence, interaction and architecture | 2–3 for most work; 4–5 for high-stakes decisions |

Scope ceiling: 9 scopes maximum, discovered by mapping, never a target.
Cut first: breadth 1 keeps only the direct path; 2–3 drop low-value
variants; 4–5 cut nothing unless impossible. Verification stays at full
strength at production quality regardless of breadth. The Shape Up stage
writes a mechanical `appetite_fit` (`fits` / `cuts_needed` / `reshape`);
Plan Critique validates it with a fresh-context feasibility reviewer. The
human decides.

## Review Mode — tool gates always run, human waits vary

Every mode runs the visual-review **tool** gates that apply to it — they
are automated checks with receipts, not human waits. What Review Mode
controls is the **human** overhead: structured questions and picks that
park the workflow until a person answers.

| Review Mode | Human questions | Interface pick | Tech approval |
|---|---|---|---|
| **Auto** | None — LLM decides everything | LLM decides | Auto |
| **Product Spec Gate** | Spec review only | LLM decides | Auto |
| **+ Interface Gates** | + interface direction | User chooses | Auto |
| **+ Scopes** | + IN/OUT confirmation | User chooses | Auto |
| **+ Tech Review** | + plan gate + tech questions | User chooses | Gate |
| **+ Code Diff** | + diff review on the working tree | User chooses | Gate + diff |

`Experimental + Auto` is the shortest path (no questions, no picks); production
quality with `full review` on a feature intent runs the full 18 stages. (Note: one stage
file's table claims Auto skips all gates — the machine-enforced sources,
`stages.yaml` and `transitions.md`, say `gate`/`int-gate` block in every
mode as tool gates. The docs follow the enforced files.)

## The three phases

**1. Shaping.** Raw idea → shaped proposal with IN/OUT boundaries →
adversarial critique → gate approval → interface exploration → typed
technical plan. Two feedback loops let tech inform product *before*
execution:

- **Tech Preview** — lightweight codebase recon (cymbal when available,
  `find`/`git log` fallback) before shaping, so proposals don't conflict
  with codebase reality. Skipped on greenfield.
- **Codebase Feature Recon** — deeper impact analysis before tech planning
  generates scopes.
- **Alignment Check** — after planning, the tech plan is checked against
  the product spec. Auto modes resolve automatically; higher modes ask the
  user. Depth of all three is breadth-gated.

**2. Execution.** Each scope runs against an acceptance contract
(criteria, verify commands, stop rules). See
[scopes-tasks-records.md](scopes-tasks-records.md).

**3. Verification & Audit.** Tests and review, conditional diff gate, then
execution critique. Gaps classify as FIXED / DOCUMENTED / ESCALATED —
escalated gaps become new scopes and the workflow routes Audit back to
Execution until none remain pending.

## The interface map

The `selection` stage records two things about the interface it picked:

| Artifact | What it is |
|---|---|
| `interfaces/selected-interface.md` | The proposal in prose: work pattern, breadboarding notes, ASCII sketch, trade-offs. |
| `interfaces/breadboard.json` | The same decision as a graph: the **places** the user can be in, the **affordances** in each, and the **wiring** between them. |

The map is the source of truth for the interface's shape; the prose is its
commentary. Two consequences worth knowing:

- A place is perceptual, not technical. It is decided by the blocking test —
  *can the user interact with what is behind?* — not by the URL or the
  component tree. A modal is a place; a dropdown is not.
- Wiring separates **control flow** (`wiresOut` — what triggers what) from
  **data flow** (`returnsTo` — where the output flows), and both read forward.
  A display is fed by a wire pointing AT it; a store is read by its own wire
  pointing AWAY from it. Navigation wires to a place, not to an affordance
  inside it.

The map is what the architecture and planning stages read when they need the
shape of the thing they are building, and it is the thing an agent can edit
without rewriting a paragraph.

Before the map is saved, `scripts/render-diagram.mjs ... --check` runs the
executable rules from the breadboard reference plus the published contract
(`schemas/breadboard.json`). Findings carry a severity: an **error** means the
map contradicts itself (an unknown id, a duplicate, a kind that fights its
prefix) and no view is produced; a **gap** means the map may be incomplete (a
display nothing feeds) and is reported in the views, where the writer decides.

Views of the map are optional and clearly marked as views:

| Output | What it is for |
|---|---|
| `--emit-markdown --with-diagram` | The reading view a document review can open: places, affordance tables, both flows, the diagram source, and the checks' findings. |
| `--out <file.html>` | A self-contained page (inline SVG, zoom, light/dark theme) for a human who wants the picture offline. |
| `--emit-mermaid` | The diagram source alone, for a host that renders diagrams itself. |

The renderer is repo-side tooling and degrades rather than blocks — the JSON
is the artifact, the views are conveniences, and a missing renderer never
stops the pick. See
[the breadboard reference](../skills/stelow-workflow-orchestrator/references/breadboard.md)
for the schema, the rules, and the checks.

## Gates and receipts

The applicable gates (`gate`, plus `int-gate`, `plan-gate`, `diff-gate`
per Review Mode) each produce an approval receipt under
`.stelow/approvals/{dirHash}/` (e.g. `gate-approved.md`, following the
`{file}.approved.md` pattern). An approval is evidence, never a state
transition by itself. Final completion additionally produces
`audit-trail.md`, hashed against the exact repository tree that was
verified (`scripts/stelow audit-trail check` fails closed on any drift;
`--strict` refuses unregistered outputs; receipt contract `v3` — hosts
that don't recognize the version must fail closed).
