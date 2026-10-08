# Decision Point: guard-quality

 judges whether a new or changed guard (test) actually guards anything —
the one thing deterministic checks cannot decide. Formalizes the fresh-oracle
third lens: the judge reads the planned case plus the guard, never the
implementation.

## Placement

`verification`, after the suite is green, before `diff-gate`/`audit`.
Scope: guards added or changed in the working-tree diff only — never the
whole suite. A future extension may call it at `scope done` for test-*
scopes; v1 does not.

## Layers (cheapest verdict first)

1. **Rules** (no calls): no assertions · source-text-only assertions (unless
   topology/counts/refusals) · mocks > 3 · assertion roulette (many
   assertions, no single behavior). Fails here → `needs-revision`, no judge.
2. **Existing evidence** (`red_proof` + `freeze_sha` + `baseline`, already
   gated): a guard never observed failing is rejected before judging.
3. **Judge** (residue only): semantic verdict on the four binary criteria
   below. The LLM is optional in this stack — layers 1–2 deliver value with
   the judge off (`STELOW_GUARD_JUDGE=off` or rules-only mode).
4. **Mutation probe** (follow-up, not v1): judge proposes the inversion, a
   runner executes it in a scratch worktree, the guard must fail. Start
   where cheap (`go test -run`, `vitest run <file>`).

## Binary criteria

1. **Failure-mode capture** — inverting/removing the guarded behavior flips
   this guard.
2. **Behavior, not text** — executes behavior; source-text presence only for
   topology, counts, or refusal shapes, with the caught regression named.
3. **One guard, one behavior** — every assertion answers "which wrong
   behavior would make this fail?"
4. **Case fidelity** — guards the planned AC, not a weaker restatement of it.

## Verdicts

`pass` · `needs-revision` (with a concrete rewrite direction) ·
`human-review` (behavior intrinsically hard to observe — routed to a human
by design, never counted for or against the judge).

The judge never edits code. Deterministic failures ride along in the prompt
(suite result, red evidence present). Blind to the implementation; a
different model family from the implementer where configured, else fresh
context (breaks memory, not family blindness — recorded as a caveat).

## Routing

| | Critical path (auth/payment/data) | Standard | Experimental |
|---|---|---|---|
| Production | BLOCK — 1 revision round, then `human-review` (never judge↔worker ping-pong) | WARN in Record | advisory, sampled |
| Experimental | advisory | advisory | off |

## Modes and kill-switch

`STELOW_GUARD_JUDGE` env > `Workflow.config.guard_judge` > quality default
(production strict, experimental advisory). Read via `stelow_read_guard_judge`
(`references/cli-tools/read-config.sh`) or `stelow config get guard_judge`.

## Shadow-log (from day one, no calibration step)

Every verdict lands in `Record.guard_verdicts[]`:
`{guard, test_sha, verdict, human_decision?, cost_tokens?}`.
Cache key is guard path + `test_sha` — re-judge only on re-freeze.
`human_decision` (`approved`/`reworked`) records appeal/review outcomes;
absent means pending.

## Tripwire (counters, not training)

Trailing window of the last 30 **co-reviewed** guards
(`human-review` verdicts and pending entries excluded — the former are
routed to humans by design, the latter undecided). Overturns count **both
directions**: blocked guard the human approves AND passed guard the human
reworks — otherwise the metric is blind to false-pass, the dangerous
direction. Rate above 0.1 trips: `stelow guard-judge check` exits 1 naming
rate and window; `--apply` persists the strict→advisory downgrade (logged,
human re-arms). Evaluate with `stelow guard-judge status [--json]`.
Pure counting logic lives in `types/stages.ts` (`guardOverturnStats`) so
tests import production code.

## Calibration ledger

Track from day one: verdict counts, overturn rate (both directions),
sampled pass audits (every critical pass carries a human glance at
diff-gate — without this the rate lies downward), cost per verdict.
Downgrade the gate on the numbers, defend it on the numbers.
