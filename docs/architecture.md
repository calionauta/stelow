# stelow — Architecture

**Skills-only, host-agnostic.** The product is 30 portable agentskills-compatible
skills plus one zero-dependency shell helper. There is **no extension host code,
no compiled plugin, and no per-host adapter** in the repo — every agent that can
read `~/.agents/skills/<name>/SKILL.md` (the agentskills.io standard) runs the
same workflow. Hosts only add an optional marker protocol
(`STELOW_WORKFLOW=1` + `STELOW_STATE=<path>`).

## Top-level layout

| Path | Purpose |
|------|---------|
| `skills/` | All workflow skills (LLM-facing content). One directory per skill, each self-contained: `SKILL.md` + `references/` + `references/cli-tools/` + optional `stages/` files. |
| `skills/stelow-workflow-entry/` | Entry point. Classifies intent, scaffolds `state.md`, picks the first stage. Loaded when `STELOW_WORKFLOW=1`. Never runs stage logic. |
| `skills/stelow-workflow-router/` | Router. Validates the next candidate against `transitions.md`, calls `scripts/stelow advance`, loads the next stage skill, appends the hand-off audit record. |
| `skills/stelow-workflow-orchestrator/` | Orchestrator. Coordinates the 18-stage pipeline (Setup → Shape → Critique → Gate → Scope → Interface → Selection → Architecture → Planning → Execution → Verification → Audit). |
| `skills/stelow-product-<area>/` | Product strategy playbooks + domain tactics (15 total, reference-only). |
| `scripts/stelow` | Portable helper (bash + python3): `status`, `advance`, `doctor`, `seed`, `schema`, `check`, `ask`. Single source of runtime mechanics. |
| `skills/stelow-workflow-orchestrator/references/cli-tools/` | Single source for shared tool references. Sub-skills link it via sibling-relative paths (`../stelow-workflow-orchestrator/...`) — no copies, no sync step. |
| `install.sh` | Installer. Flattens `skills/*` into `~/.agents/skills/`, prunes retired/orphaned skills, offers optional tooling (cymbal, sem, ctx7). |
| `types/stages.ts` | Shared TypeScript interfaces for the `stages.yaml` stage model (transitions, gates). |
| `stelow.schema.json` / `stelow.json` | Workflow tracking JSON schema + per-project runtime tracking state. |
| `tests/` | Vitest suite (`unit/`, `integration/`, `skills/`) + contract tests (skill-count, dual-mode, fs/e2e). |
| `docs/design/`, `docs/agents-md-refs/` | Historical design docs / agent reference notes (EN artifacts, PT-BR discussion). |
| `references/` | Canonical shared docs: `host-levers.md` (per-harness recipes) + `cli-tools/stelow-helper.md` (helper contract). Host integration contract: `HOSTING.md` (root). |

## Stage model (the 18-stage state machine)

- **Single source of truth:** `skills/stelow-workflow-orchestrator/stages.yaml`
  (tools per stage, transitions, gates).
- **Behavioral companion:** `skills/stelow-workflow-orchestrator/stages/*.md`
  (one file per stage, describing what happens in that stage).
- **Data-only mirror:** `skills/stelow-workflow-orchestrator/references/transitions.md`
  — generated from `stages.yaml`; this is the file `scripts/stelow advance` and
  the router validate against. Do not edit by hand; edit `stages.yaml` and regen.
- The 18 stages: `triage` → `select` → `setup` → `context` → `shape` →
  `critique` → `gate` → `scope` → `interface` → `int-gate` → `selection` →
  `architecture` → `planning` → `plan-gate` → `execution` → `verification` →
  `diff-gate` → `audit`.
- Visual review gates (`gate`, `int-gate`, `plan-gate`, `diff-gate`) are
  conditional on `review_mode` — see `stages.yaml`.

## Runtime state

| Path | Contents | Owner |
|------|----------|-------|
| `state.md` | Per-workflow frontmatter at `$STELOW_STATE` (or `<root>/state.md` in standalone mode). | entry/router skills + `scripts/stelow advance` |
| `lock/` | Advisory lock inside `$STELOW_STATEDIR` (or `<root>/.stelow`) with TTL (`STELOW_LOCK_TTL_SEC`, default 120). | `scripts/stelow` |
| `invariants.json` | Append-only advance history inside `$STELOW_STATEDIR` (or `<root>/.stelow`) written by `scripts/stelow advance`. | `scripts/stelow` |
| `stelow.json` | Multi-workflow tracking (schema `stelow.schema.json`): `workflows[]` with phases, scope sync from `spec-tech.md`. | workflow skills (agent) |
| `.stelow/{date}/{dirHash}/` | Per-workflow artifacts: `specs/`, `interfaces/`, `plans/`, `critiques/`, `approvals/`, `execution/`, `verification/`. | workflow skills |

### The interface map

`interfaces/breadboard.json` is the structured form of the chosen interface:
places (`P1`), UI affordances (`U1`), code affordances (`N1`), data stores
(`S1`), and the wiring between them — `wiresOut` for control flow,
`returnsTo` for data flow. The contract is `schemas/breadboard.json`; the
writing rules are in
`skills/stelow-workflow-orchestrator/references/breadboard.md`.

It is the source of truth for the interface's shape, and the prose in
`selected-interface.md` is its commentary — the same "the map is the truth,
the text explains it" rule the rest of the workflow already follows.

The map's rules live in the portable helper: `stelow check breadboard` enforces
the contract and the affordance checks, and
`stelow advance` runs it on the `selection` transition — a map with errors is
refused, a map with only gaps advances with the findings printed. The placement
is deliberate: the helper is the one artifact every execution environment runs
(the host spawns it for `advance`), so the check happens where the map is
written instead of in repo-side scripting a workflow never reaches.

The helper carries its own copy of the contract rather than reading
`schemas/breadboard.json` at runtime, because it has to stay one portable file
a host can run with `bash` and no dependencies. The two are bound by
`tests/integration/breadboard-check.test.ts`, which derives its cases from the
schema: a rule the schema declares and the helper does not implement fails the
suite, and so does a rule the helper implements that the schema no longer
declares.

`scripts/render-diagram.mjs` projects the map into Mermaid and then into
views: a self-contained HTML file (inline SVG, zoom, CSS-variable theme, no
external request) and a markdown reading view. It reads the verdict from the
helper — never a second opinion — and refuses to draw a map with errors,
because a view of a broken map presents a hole as a decision.

The renderer is repo-side tooling, not part of the installed skill surface:
`install.sh` and the plugin sync ship only `scripts/stelow`. It therefore
degrades — no renderer means no diagram, and the map still stands. The check
is not part of that degradation: it ships with the helper.

## Data flow

1. Host sets `STELOW_WORKFLOW=1`; entry skill loads, classifies intent, scaffolds
   `state.md`, and selects the first stage from `transitions.md`.
2. Router validates the candidate stage against `transitions.md`, then
   `scripts/stelow advance <candidate>` acquires `.stelow/lock`, checks the
   pre-condition (transitions.md presence) and stage-transition invariants,
   updates `state.md` frontmatter, appends `.stelow/invariants.json`, and
   releases the lock.
3. Stage skill loads and runs, writing artifacts under `.stelow/{date}/{dirHash}/`.
   The stage's `artifacts:` list in `stages.yaml` names what it must produce;
   `scripts/stelow advance` refuses the transition when one is missing. The
   check resolves the workflow's own directory from `STELOW_STATE`, so an
   artifact belonging to a DIFFERENT workflow cannot satisfy this one.
4. `scripts/stelow doctor` detects drift classes (stale-lock, missing-dir,
   parallel-lock, state-transitions) across the workflow tree.

## Portability rules

- Zero npm-dependency runtime: skills are markdown + the `scripts/stelow` shell
  helper (bash + python3). No compile step at install time.
- Skills never call host-native tool names directly; `stages.yaml#tools` defines
  a portable vocabulary (`ask_user_question`, `visual_review`, `subagent`) and
  `skills/stelow-workflow-orchestrator/references/cli-tools/*.md` document the
  canonical shapes — hosts wrap them.
- Distribution is Git/GitHub only (no `npm publish`). Version lives in
  `package.json` and is pinned by the SW-034 trailer contract, enforced by
  `scripts/check-version-coherence.sh` (`--hook=commit-msg` mode for local
  commits; the `.husky/commit-msg` hook file was removed with the tooling-dirs cleanup).

## How to extend

- New stage → edit `stages.yaml`, regenerate `references/transitions.md`.
- New skill → add `skills/stelow-workflow-<name>/SKILL.md` (workflow stage
  skills) or `skills/stelow-product-<name>/SKILL.md` (product strategy /
  domain libraries) with `metadata.category` matching the prefix
  (`workflow` / `product`); keep counts consistent (README contract test
  pins 32 / 17 workflow + 15 product skills).
- New host → no code required. Ensure the host can read agentskills.io skill
  directories and set the marker env vars. Host levers are documented in
  `references/host-levers.md`.
