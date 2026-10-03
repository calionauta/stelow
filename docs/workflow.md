# Workflow

Three conceptual phases, 17 stages total (`triage` → `select` → `setup` →
`context` → `shape` → `critique` → `gate` → `scope` → `interface` →
`int-gate` → `selection` → `planning` → `plan-gate` → `execution` →
`verification` → `diff-gate` → `audit`). The stage graph is enforced, not
advisory: `scripts/stelow advance` validates every move against
`transitions.md` (generated from `stages.yaml` — never edited by hand).

Two human-declared dimensions control the whole pipeline: **Appetite** (how
deep to prepare) and **Review Mode** (which gates run).

## Appetite — a constraint, not an estimate

Appetite asks "how much is this worth?" before the work is defined. The
budget never expands; the scope gets cut to fit. (This departs from Shape
Up's calendar appetite: under LLM execution, wall-clock time is not a
predictable governor, so appetite caps preparation depth instead.)

| Appetite | Scopes | Interface | Tests | Best for |
|---|---|---|---|---|
| **Lean** | 1–2 | 1 suggestion, no alternatives | Smoke + critical-path unit | Idea validation, spike, throwaway |
| **Core** (default) | 3–5 | 3 archetypes + 1 hybrid | Unit + integration at seams | Most features, bug fixes |
| **Complete** | 8–15 | 5 archetypes + 1 hybrid | Unit + integration + e2e + security | Critical, high-risk, production |

Cut first: Lean drops edge cases and secondary flows; Core drops low-value
variants; Complete cuts nothing unless impossible. The Shape Up stage writes
a mechanical `appetite_fit` (`fits` / `cuts_needed` / `reshape`); Plan
Critique validates it with a fresh-context feasibility reviewer. The human
decides.

## Review Mode — breadth of human oversight

| Review Mode | Gates | Interface choice | Tech approval |
|---|---|---|---|
| **Auto** | None | LLM decides | Auto |
| **Product Spec Gate** | Spec gate (pre-tech) | LLM decides | Auto |
| **+ Interface Gates** | Spec + interface gate | User chooses | Auto |
| **+ Scopes** | Above + IN/OUT confirmation | User chooses | Auto |
| **+ Tech Review** | Above + plan gate + tech questions | User chooses | Gate |
| **+ Code Diff** | Above + diff gate on the working tree | User chooses | Gate + diff |

Auto skips gates entirely; each level adds oversight without changing the
pipeline shape. `Lean + Auto` is ~6 stages; `Complete + full review` runs
all 17.

## The three phases

**1. Shaping (stages 0–11 + conditional gates).** Raw idea → shaped proposal
with IN/OUT boundaries → adversarial critique → visual gate approval →
interface exploration → typed technical plan. Two feedback loops let tech
inform product *before* execution:

- **Tech Preview** — lightweight codebase recon (cymbal when available,
  `find`/`git log` fallback) before shaping, so proposals don't conflict
  with codebase reality. Skipped on greenfield.
- **Codebase Feature Recon** — deeper impact analysis before tech planning
  generates scopes.
- **Alignment Check** — after planning, the tech plan is checked against
  the product spec. Auto modes resolve automatically; higher modes ask the
  user. Depth of all three is appetite-gated.

**2. Execution (stages 13–14).** Each scope runs against an acceptance
contract (criteria, verify commands, stop rules). See
[scopes-tasks-records.md](scopes-tasks-records.md).

**3. Verification & Audit (stages 14–16).** Tests and review, conditional
diff gate, then execution critique. Gaps classify as FIXED / DOCUMENTED /
ESCALATED — escalated gaps become new scopes and the workflow routes Audit
back to Execution until none remain pending.

## Gates and receipts

| Gate | Artifact under review | Receipt |
|---|---|---|
| `gate` | Product spec | `gate-approved.md` |
| `int-gate` | Interface proposals | `int-gate-approved.md` |
| `plan-gate` | Technical plan | `plan-gate-approved.md` |
| `diff-gate` | Working-tree diff | `diff-gate-approved.md` |

Receipts live in `.stelow/approvals/{dirHash}/`. An approval is evidence,
never a state transition by itself. Final completion additionally produces
`audit-trail.md`, hashed against the exact repository tree that was
verified (`scripts/stelow audit-trail check` fails closed on any drift;
`--strict` refuses unregistered outputs).
