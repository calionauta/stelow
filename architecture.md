# stelow — Architecture

**Skills-only, host-agnostic.** The product is 25 portable agentskills-compatible
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
| `skills/stelow-workflow-orchestrator/` | Orchestrator. Coordinates the 17-stage pipeline (Setup → Shape → Critique → Gate → Scope → Interface → Planning → Execution → Verification → Audit). |
| `skills/stelow-product-<area>/` | The 23 other product/planning sub-skills (shape-up, plan-critique, tech-planning, ux-critique, domain playbooks, etc.). |
| `scripts/stelow` | Portable helper (bash + python3): `status [--json]`, `advance <candidate>`, `doctor [--json]`. Single source of runtime mechanics. |
| `scripts/sync-cli-tools.sh` | Regenerates each sub-skill's `references/cli-tools/` from the orchestrator's copy. Run after editing a cli-tools reference. |
| `scripts/setup.sh` / `install.sh` | Installers. `install.sh` flattens `skills/*` into `~/.agents/skills/` and prunes retired/orphaned skills; `setup.sh` is the zero-to-running path (optionally pi.dev + toolchain). |
| `types/stages.ts` | Shared TypeScript interfaces for the `stages.yaml` stage model (transitions, gates, supervisor). |
| `stelow.schema.json` / `stelow.json` | Workflow tracking JSON schema + per-project runtime tracking state. |
| `tests/` | Vitest suite (`unit/`, `integration/`, `skills/`) + contract tests (skill-count, dual-mode, fs/e2e). |
| `docs/design/`, `docs/agents-md-refs/` | Historical design docs / agent reference notes (EN artifacts, PT-BR discussion). |
| `references/` | Legacy root copies of orchestrator reference files (consumed by tooling, not by skills at runtime). |

## Stage model (the 17-stage state machine)

- **Single source of truth:** `skills/stelow-workflow-orchestrator/stages.yaml`
  (tools per stage, transitions, gates, supervisor activation).
- **Behavioral companion:** `skills/stelow-workflow-orchestrator/stages/*.md`
  (one file per stage, describing what happens in that stage).
- **Data-only mirror:** `skills/stelow-workflow-orchestrator/references/transitions.md`
  — generated from `stages.yaml`; this is the file `scripts/stelow advance` and
  the router validate against. Do not edit by hand; edit `stages.yaml` and regen.
- The 17 stages: `triage` → `select` → `setup` → `context` → `shape` →
  `critique` → `gate` → `scope` → `interface` → `int-gate` → `selection` →
  `planning` → `plan-gate` → `execution` → `verification` → `diff-gate` →
  `audit`.
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

## Data flow

1. Host sets `STELOW_WORKFLOW=1`; entry skill loads, classifies intent, scaffolds
   `state.md`, and selects the first stage from `transitions.md`.
2. Router validates the candidate stage against `transitions.md`, then
   `scripts/stelow advance <candidate>` acquires `.stelow/lock`, checks the
   pre-condition (transitions.md presence) and stage-transition invariants,
   updates `state.md` frontmatter, appends `.stelow/invariants.json`, and
   releases the lock.
3. Stage skill loads and runs, writing artifacts under `.stelow/{date}/{dirHash}/`.
4. `scripts/stelow doctor` detects drift classes (stale-lock, missing-dir,
   parallel-lock, state-transitions) across the workflow tree.

## Portability rules

- Zero npm-dependency runtime: skills are markdown + the `scripts/stelow` shell
  helper (bash + python3). No compile step at install time.
- Skills never call host-native tool names directly; `stages.yaml#tools` defines
  a portable vocabulary (`ask_user_question`, `visual_review`, `subagent`) and
  `references/cli-tools/*.md` document per-host invocation syntax.
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
  pins 28 / 14 workflow + 14 product skills).
- New host → no code required. Ensure the host can read agentskills.io skill
  directories and set the marker env vars. Host levers are documented in
  `skills/stelow-workflow-entry/references/host-levers.md`.
