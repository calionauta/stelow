# RFC: Experimental Structured Parallel Scope Execution

> **Status:** proposal, partially implemented in v0.65.0-alpha.
> Complete appetite only.
>
> Shipped in v0.65.0-alpha (PR #16): `blockedBy` cycle refusal at ingest
> (`sync-scopes`), cymbal transitive-disjointness check before parallel
> dispatch, parent-owned test-gated merge, pre-change regression baseline,
> and the measurement mirror (`started_at/finished_at/duration_s/baseline`
> + host-reported `cost`). Still open (see §5 + issue #15): schema
> worktree-binding fields, G4 hub-first sequencing, CLI in-flight fields,
> host mechanics (per-scope workers, G6 attention cap), and measured
> comparative data from real Complete workflows.
> **Question it settles:** does the CAID/Co-Coder pattern (manager + isolation +
> test-gated merge) transfer from greenfield construction benchmarks to
> brownfield stelow scopes — measured, not asserted.

## 1. Why this exists

The README Evidence section now reads CAID and Co-Coder honestly: structured
parallel code execution beats the same single agent by large margins
(CAID +25.6pp PaperBench / +14.7pp Commit0; Co-Coder +11.3pp DevEval with
2.10× speedup), with gains largest on the densest cross-file dependencies —
provided work is partitioned by cohesion, not by file. Naive file-parallel is
worse than sequential (+44–60% cost, no latency gain). Unstructured and
self-organizing cooperation degrades (CooperBench −30% together vs solo;
Hold-Experts-Back −41.1% vs own expert).

Stelow's sequential default is therefore **not** a deduction from these papers.
It is a posture with three legs: (a) 1–5 scopes have a short critical path
where worktree/merge overhead eats the gain; (b) legacy coupling makes
cohesion partitioning unreliable in brownfield; (c) parallel completions
multiply the human-review bottleneck stelow exists to protect. Legs (a) and
partly (b) dissolve at Complete appetite (8–15 scopes). This RFC specifies the
experiment that tests whether the posture should change there — and the
measurement that decides it.

Non-goals: replacing the sequential default; parallelizing Lean/Core;
self-organizing scopes (banned — manager-owned plan always); line-level
merging (out of scope, per `scope-execution-strategy.md`).

## 2. Gates (all must pass; failure falls back to sequential)

- **G1 — Appetite.** Complete only. Lean/Core keep the sequential default:
  overhead dominates short critical paths.
- **G2 — Batch size.** ≥3 DAG-independent scopes in the batch. With 1–2
  independent scopes the sequential path wins on overhead alone.
- **G3 — Verified disjointness.** Transitive-closure disjointness over
  `target_files`, computed via cymbal `refs` + `impact` (code, tests,
  fixtures, config) — **not** `target_files` set intersection, which is
  coarser than Co-Coder's cohesion partitioning and would replicate the
  naive file-parallel failure. Undeclared-touch risk stays covered by the
  Layer 3 post-hoc audit.
- **G4 — Hub files first.** Scopes sharing transitive dependencies run
  sequential first (hub/abstraction scopes before leaf scopes), then the
  parallel batch. Never parallelize across a shared hub.
- **G5 — Parent-owned test-gated merge.** The parent (consolidator) merges
  each worktree; every merge runs the scope's contract verify commands.
  Merge failure routes to R1/R3, never to scope-worker negotiation.
- **G6 — Attention cap.** Max 2 scopes concurrently awaiting human review
  (default; human-adjustable). Excess completions queue. Parallelism is
  bounded by review throughput, not just by scope independence.
- **G7 — Brownfield flag.** If cymbal recon confidence is low or legacy
  coupling evidence exists (god files, dynamic imports, reflection),
  sequential stands unless the human explicitly overrides (recorded).

This also resolves an internal tension: `scope-executor` invocation guidance
calls "sequential when parallel is safe" *weak* execution, while the strategy
doc defaults to sequential. Under this RFC, **"safe" := G1–G7 pass**.

## 3. Recovery (ownership is doctrine, mechanics are host work)

- **R1 — Merge-break owner is the parent.** A scope worker never resolves a
  merge conflict involving another scope's output. Parent merges; on
  conflict, human decides (merge / sequential re-run / rework) — same three
  exits as the Layer 3 report.
- **R2 — Per-worktree receipt.** Each parallel scope records: base SHA,
  worktree path, merged SHA (or dropped), test-gate result. The unified
  `audit-trail.md` attests the final merged tree only.
- **R3 — Rollback = drop + re-dispatch.** Failed worktree is dropped
  (never force-pushed over shared branches); affected scopes re-dispatch
  sequentially. Discard semantics extend per worktree.
- **R4 — Stale worktree revalidation.** Base SHA is re-checked before merge;
  a moved base forces rebase-or-sequentialize, decided by the human.
- **R5 — Crash accounting.** A dead scope worker releases its locks by TTL
  (existing protocol); its worktree is quarantined, not auto-merged.

## 4. Metrics sidecar (the experiment's verdict)

Recorded per parallel batch, compared against the sequential counterfactual
estimate from the same scopes' contracts:

- **M1 latency:** wall-clock per scope + end-to-end batch latency.
- **M2 cost:** tokens/API cost per scope + batch total.
- **M3 quality:** gaps escalated per scope at audit (count + severity).
- **M4 conflict:** Layer-3 class distribution (a/b/c/d) + merge-conflict count.
- **M5 human load:** interventions count (decisions, re-runs, overrides).

**Abort criteria** (any one reverts the batch to sequential and records why):
cost >1.5× the sequential estimate without a latency win; any class-(b) real
overlap before merge completes; >2 escalated gaps per batch. Three consecutive
aborted batches retire the mode for that codebase (recorded in lessons).

## 5. Placement: core vs CLI vs host

Verdict: **both, split along the doctrine/mechanics seam.** Core owns
doctrine, contracts, and schema so hosts cannot fork the methodology; hosts
own substrate mechanics that differ per harness; the CLI is the seam.

| Piece | Lives in | Why |
|---|---|---|
| G1–G7 eligibility, "safe" definition | Core (`stages/execution.md`, scope-executor SKILL) | Methodology read by the LLM; a host fork would silently change behavior |
| Scope-contract extension (isolation requirement, worktree binding, merge owner) | Core (`stelow.json` / scope-contract schema) | Portable state; hosts read, never redefine |
| Metrics schema M1–M5 + abort criteria | Core (`stelow.json`) | Cross-host comparison must share units |
| Recovery doctrine R1–R5 | Core | Ownership semantics are methodology, not tooling |
| `lock acquire/release/check` | CLI (`scripts/stelow`) — exists | Already the portable prevention primitive |
| `status` / `sync-scopes`: in-flight + worktree fields | CLI (small extension) | State mechanics, host-agnostic |
| Worktree provisioning, per-scope workers, merge execution | Host | Threads, FS layout, and git substrate differ per harness (bb child threads, CLI subagents, …) |
| Attention cap G6 enforcement point | Host (cap value set by core doctrine) | Inbox/review surface is host-owned; the number is methodology |
| Token/cost readouts for M2 | Host | Provider usage data lives in the host |
| Test-gate execution | Host runs, core defines | Verify commands already live in the scope contract |

Concretely for `bb-plugin-stelow`: child threads per scope, worktree per
scope, parent-thread merge with `verify`, inbox cap on concurrent completions,
token rows feeding M2, automation-rule style scheduling for the reconcile
sweep. None of this changes `stelow.json` semantics — the board reads the
same state the CLI writes.

## 6. Open questions

1. Should G3 (cymbal transitive closure) hard-require cymbal, or degrade to
   `target_files` intersection with a recorded confidence penalty?
2. Exact G6 default (2 proposed) — needs calibration against real review
   behavior, not theory.
3. Does the per-worktree receipt need its own SHA-256 attestation, or is the
   final-tree `audit-trail.md` sufficient? (Lean: final tree only.)
4. Brownfield confidence signal: which cymbal outputs count as "legacy
   coupling evidence" for G7?

## 7. References

- CAID (Geng & Neubig, CMU, 2026) — https://arxiv.org/abs/2603.21489
- Co-Coder (Yang et al., 2026) — https://arxiv.org/abs/2606.00953
- CooperBench (Khatua et al., 2026) — https://arxiv.org/abs/2601.13295
- Multi-Agent Teams Hold Experts Back (Pappu et al., 2026) — https://arxiv.org/abs/2602.01011
- Building a C compiler with a team of parallel Claudes (Anthropic, Feb 2026) — https://www.anthropic.com/engineering/building-c-compiler
- stelow `docs/scope-execution-strategy.md` (3-layer pipeline; worktree rejection rationale this RFC partially reopens — experimentally, not by default)
- stelow `skills/stelow-workflow-orchestrator/references/cli-tools/file-locking.md` (lock protocol, "Why not worktree?")
