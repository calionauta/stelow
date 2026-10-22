# Guard Contract — canonical test-guard reference

Single source of truth for every test-guard claim in stelow. All skills link here; none copy.

Code truth lives in `types/stages.ts` (`validateScopeContract`, `classifyRecordEvidence`,
`guardOverturnStats`) and `stelow.schema.json#/definitions/scope-contract`. This file is prose
commentary on that contract — if they diverge, code wins.

## The 5 questions (cheapest verdict first)

| Question | Tool | Where | Notes |
|----------|------|-------|-------|
| Does the test pin the behavior? | hand-mutation per invariant (invert/remove, MUST FAIL) | `verification.md` Guard red-proof | `scripts/mutation-gate.py` is the repo-self-gate for `scripts/stelow` only (14 mutants, `npm run test:mutation`). Full Stryker/mutmut/PIT **not recommended by default** — nightly, scoped, no score target. |
| Is the test new work? | full-suite baseline + impact subset (`sem impact <entity> --tests`, TDAD subset) | `execution.md`, `fail-observed-and-brownfield.md` test-impact | `diff-cover` / `jest-diff-coverage` **not wired** — deliberate. `test:coverage` (vitest full) + impact subset is the current gate. |
| Is it a shape smell? | `scan-test-value.ts` (DELETE/REVIEW/OK) + `rigor-scan.sh` (threshold 60) | `AGENTS.md` Test value scanner | Static only. Local signal, not CI. Scanner finds SHAPE problems; mutation gate decides. |
| Does it assert anything specific? | `testSignals()` in `scan-test-value.ts` | same as above | Zero asserts / only-no-throw / all-trivial / mocks-subject / snapshot-only → DELETE. Low assert density + no edge + mock-heavy → REVIEW (needs 2+ signals). |
| Did it fail before the fix? | `red_proof` + `freeze_sha` + `baseline` + `test_map` | Record (`records-and-tasks.md`), `scope done` gate, audit Criterion 6 | `strict` (production default): refuse close without all four. `advisory`: warn. `off`: skip. Applies to **workflow-generated guards**, not to stelow's own `tests/` suite (which uses mutation-gate + scanner instead). |

## Ritual: FAIL-OBSERVED-FREEZE-PASS

1. **GUARD:** write the guard from `test_map` BEFORE implementing. Worker materializes the planned case — never invents cases to make its own test pass.
2. **RED (`red_proof`):** run once against the intact tree — MUST FAIL. Capture `failed_command` + `exit_code != 0` + excerpt.
3. **FREEZE (`freeze_sha`):** pin the guard text. Never edit the frozen guard to pass — re-freeze under a new sha + recorded `human_decision`.
4. **PASS:** implement the minimum to pass, without touching the guard.
5. **BASELINE:** pre-change exits for every verify command (`{command: exitCode}`). Empty only when commands cannot run pre-change (say so in Limitations).

`scope done` enforces: `verified + red_proof + freeze_sha + baseline` (+ feature refuses while test-* open). Audit flags: `red-missing` (warning), `baseline-empty` (warning), `frozen-edited` (block).

## Layers (guard-quality-decision order)

1. **Rules** (no LLM): no assertions · source-text-only (unless topology/counts/refusals) · mocks > 3 · assertion roulette. Fail → `needs-revision`, no judge.
2. **Existing evidence** (`red_proof` + `freeze_sha` + `baseline`, already gated): never-seen-failing → reject before judging.
3. **Judge** (residue only): 4 binary criteria — failure-mode capture · behavior-not-text · one-guard-one-behavior · case fidelity. Verdicts: `pass` / `needs-revision` / `human-review`. Never edits code. Fresh-oracle, different family when available.
4. **Mutation probe** (follow-up, not v1): judge proposes inversion, runner executes in scratch worktree, guard must fail.

Conflict rule: planned case (`test_map` + `freeze_sha`) wins by default. Worker never silently edits guard or case to green.

## Anti-patterns (canonical — do not copy elsewhere)

- ❌ Mock count > 3 per test; mocks for simple objects (use real objects)
- ❌ 100% coverage target (coverage ≠ quality)
- ❌ Snapshot tests for non-UI components; snapshot of "whatever it produces" and nothing else
- ❌ Single-run validation (agents are non-deterministic)
- ❌ Same AI for code AND tests (circular validation); mandated fail-pass micro-cycles in-loop by the implementing agent (ProgramBench −3.6pp, +55% cost)
- ❌ Presence tests (source-text existence without behavioral consequence). Allowed only for topology, counts, refusal shapes — with the caught regression named
- ❌ Assertion Roulette (many asserts, no single behavior); unreasoned oracles (executes code without capturing a failure mode — every assertion answers "which wrong behavior would make this fail?")
- ❌ Suite growth without pruning (TENET 2026: small targeted sets beat large suites)
- ❌ Full-suite mutation as per-PR gate; any mutation score target; no equivalent-mutant filter

## CI gates (canonical)

| Gate | Condition | Action |
|------|-----------|--------|
| missing required critical-path tests | no guard for a critical AC | BLOCK |
| AC-sem-teste | unmapped AC | REJECT (never executes) |
| security_findings > 0 on critical | SAST dirty | BLOCK |
| flaky_rate > 5% | non-deterministic suite | WARN |
| test duration > 10min | pipeline impact | WARN |

## Boundaries (deliberate non-goals)

- No Stryker/PIT/mutmut by default (`test-targets-and-gates.md` Step 6 rationale: oracles bottleneck, triage ~4.6min/mutant, adequacy not practical).
- No diff-coverage gate (cost > signal today; impact subset covers it).
- Rigor stays local (`npm run test:rigor`, threshold 60, binary downloads to `~/.cache/rigor`). CI runs `quality:report` + suite.
- Own-suite quality (`AGENTS.md`, `scan-test-value.ts`, `mutation-gate.py`) vs generated-work quality (this contract) stay separate — different audiences, different gates.

## Owners

| Concern | Owner file | This file's role |
|---------|-----------|------------------|
| Strategy/breadth per quality | `testing-ai-code/SKILL.md` + `test-targets-and-gates.md` Steps 4–5 | link |
| Brownfield/regression/impact | `fail-observed-and-brownfield.md` | link |
| Execution + Record | `../../stelow-workflow-scope-executor/references/step-3-feature.md` 3b-bis, `records-and-tasks.md` | link |
| Verification enforce | `../../stelow-workflow-orchestrator/stages/verification.md`, `testing-execution/SKILL.md` | link |
| Judge routing/tripwire | `../../stelow-workflow-testing-execution/references/guard-quality-decision.md` | link |
| Audit check | `../../stelow-workflow-execution-critique/references/workflow-audit.md` Criterion 6 | link |
