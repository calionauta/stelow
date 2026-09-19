# Host Plugin Blueprint

How to wrap stelow in a visual host (board + inbox + workers) the way
`bb-plugin-stelow` does — without forking methodology. The contract lives in
[HOSTING.md](../HOSTING.md); this is the build guide: domain model, sync
recipe, and UI patterns, each mapped to the reference implementation files.

## 1. What the host must provide

Same table as [HOSTING.md](../HOSTING.md#what-a-host-provides), plus what the
board specifically needs beyond skill execution:

| Capability | Why the board needs it |
|---|---|
| Spawnable worker threads with presets (provider/model/reasoning) | One worker per card; preset swaps at band boundaries |
| Structured blocking input (form with options + timeout) | The ask/answer protocol (§4); plain chat text is not routable |
| Realtime pub/sub or polling | Card, board, and inbox refresh (§7) |
| Key/value or SQLite storage | Cards, comments, inbox events, ledger, sync state |
| Host-served reading list | exact state/transitions/stage-playbook paths per card — workers read what they are given, never discover skills through shell pipelines over content-hashed ids |
| Scheduler (cron-like) | 6h skills sync; idle reconciliation sweeps |

Missing structured input? Then questions degrade to chat text and the inbox
loses its "answerable" guarantee — the single most valuable property below.
Prefer a host that has it.

## 2. Card lifecycle model

```
Build:        draft → in-progress → completed
                              ↘ archived (terminal, from any state)
Research/Explore (lightweight):
              pending → in-progress → completed
                              ↘ archived (terminal, from any state)
```

`status` is durable board position. `activity` (`running`/`idle`/`error`/
`awaiting-answer`) is an ephemeral signal and must never move a card.
Invariants (encode every one; each has bitten us):

- **Archived is terminal.** No poll, event, error path, or user move may take
  a card out of `archived`. Enforce at the single write choke point, checked
  against a fresh read (a poll that read before Archive lands must not write
  after it).
- **One primary action per state.** Destructive actions (archive, delete,
  reseed) live behind confirm dialogs; never as the prominent choice.
- **Completed reopens only through defined paths** (user comment on
  lightweight tracks; explicit reseed/move) — never as a poll side effect.
- **Done is an explicit commit, never an inference.** The worker declares
  completion; the host verifies in code (terminal stage, artifact gates,
  no pending question) and every refusal names the fix. Inferring
  done-ness from `audit` + idle made narrate-and-stop indistinguishable
  from stuck — the same confusion that produced the stop-per-turn
  incidents.
- **Discard ≠ archive.** Archive parks with work intact; discard destroys
  unpushed work (worktree drop, branch reset to the pre-card base, or
  folder delete — refused on pushed history, shared lines, detached
  HEAD), then archives. Preview proves the blast radius (files, commits)
  and the confirm states it in full; execution stops the worker,
  re-validates, verifies clean, and leaves a trail comment.
- ** terminal cards show terminal UI**: history + final state only, no worker
  controls except Delete.
- **Terminal states release workspace claims.** `done`, archive, cancel,
  `blocked`, and delete drop every file claim the card holds, and the host
  resumes exactly the cards that waited on each freed file (paused event
  resolved as `resumed` plus an agent-only nudge to re-acquire). Per-card
  lock dirs are invisible to sibling cards — claims are keyed by the
  checkout the worker actually writes to (falling back to the project
  source), not by card state dir — so a parked card can never hold files
  hostage, and cards isolated in their own worktrees do not falsely
  serialize.

Reference (copyable, zero host imports): `worker-action-policy.mjs`
(action visibility), `card-move.mjs` (board-move decisions),
`workflow-intent-policy.mjs` (type edits), `card-detail-presentation.mjs`
(archived hero copy), `tracks.mjs` (build vs lightweight routing),
`card-claims.mjs` (workspace claim registry, terminal release, waiter
resume).

## 3. Inbox event model

Four kinds, each with its own lifecycle — never blanket-resolve:

| Kind | Created when | Resolved when |
|---|---|---|
| `question` | worker asks (structured) | answered (or expired → `expired_questions` flow) |
| `error` | worker fails / probe fails | worker moves again |
| `paused` | idle past the grace period with unfinished work | worker moves again |
| `completed` | card reaches Done | seen (read, never auto-resolved) |

- **Dedupe by stable identity** (interaction/question id), never by
  timestamp: a state flap (`awaiting-answer → running → awaiting-answer`)
  must not duplicate alerts.
- **Lock-blocked pauses name the holder and the unlock.** A card that hits a
  file claimed by another live card parks that scope (never a retry loop)
  and gets one `paused` event per file (`lock-blocked:<card>:<file>` dedupe)
  naming the holder and the automatic release (owner release or lease
  expiry). Release resolves it as `resumed` and nudges the worker to
  re-acquire — the scope, not the human, does the retrying.
- **Badge counts unresolved action items only**, plus unseen fresh
  completions (7-day window). Resolved items persist under history.
- Render sections: needs-you, recent updates, resolved (collapsed),
  archived. Never show a resolved event with an actionable label
  ("Needs a decision" on a decided event is a bug, not a copy choice).

Reference: `inbox-events.mjs` (insert/sync/resolve/badge),
`inbox-event-presentation.mjs` (one label function for list, banner, and
deep link — a single text rule for active/resolved/archived).

## 4. Ask/answer protocol

1. Worker calls structured ask (title + options + optional previews/
   artifacts + timeout, ~1h).
2. Card flips to `awaiting-answer` (activity only — same column).
3. Answers arrive as **one batch**: exactly one worker continuation for the
   whole batch, unanswered items stay open.
4. Timeout without answer → persist as `expired_questions` (still
   answerable on the card); answering an expired question resumes the
   *current* worker with the Q/A pair as context.
5. Cancellation splits in two: transient (timeout/reload/abort) persists
   like a timeout; explicit end states (dismissed, thread stopped) return
   as-is for the worker to interpret.
6. Optional contract linkage: a group may declare `--contract <id>`; answers
   naming it are trailed with the contract. Undeclared flows behave exactly
   as before — provenance without enforcement.
7. Selection asks carry evidence **per option** (wireframe preview +
   proposal artifact each); one evidenced option must never launder blind
   siblings. Other gates review one shared document — a single evidence
   anywhere in the ask suffices there.
8. Failed submits keep the draft and stay open with a persistent inline
   warning naming the cause — a transient toast alone loses the retry.

Reference: `question-batch.mjs` (pure parsing/grouping; the only
host-shaped corner is reading the payload top-level vs nested) +
`card-question-state.mjs` (pure wait-state transitions).

## 5. Skills sync recipe

This is the HOWTO that [HOSTING.md](../HOSTING.md) ("vendor them, sync
them") omits. All 28 `skills/stelow-*` directories (workflow AND product)
plus `scripts/stelow`, `data/stelow`, `data/product-strategies.json`:

1. `GET` the repo git tree (`.../git/trees/main?recursive=1`); **refuse
   the whole run if `truncated`** — a partial tree prunes valid skills.
2. Filter blobs to `skills/stelow-*/` (+ the single files above).
3. Compare git blob-sha per file against local state; download only what
   differs; verify downloaded bytes against the tree sha (CDN staleness
   guard) before recording.
4. Publish atomically per skill: stage each skill fully in a sibling
   directory invisible to scanners, then rename-swap into place, so a
   concurrent reader hashes a complete tree (old or new), never a
   half-written one. Prune local `stelow-*` dirs missing
   upstream (never touch non-`stelow-*` entries); record a verification
   timestamp **only on fully clean runs**.
5. Keep sync state **outside ephemeral install paths** (beside the plugin
   database, never in the served skills dir which scanners read) and run
   one fail-soft pass **at boot** plus a periodic schedule (6h works:
   methodology changes gradually).
6. Fail-soft always: network errors log and keep old files; the plugin
   never breaks because sync failed.

Reference: `workflow-skills-sync.mjs` (including `readLastSyncAt`,
`SYNC_TIMESTAMP_KEY`). Surface freshness in the UI ("N skills · synced
X ago" + inventory dialog) — silent syncs become mystery meat otherwise.

## 6. Worker configuration (operational, not prescriptive)

- One worker thread per card; spawn with explicit provider/model/
  reasoning/permission (never inherit ambient defaults silently).
- Swap presets only at stage-band boundaries (analysis → planning →
  execution → review) so context survives within a band; record the swap
  as an inline mention of the archived predecessor thread.
- Restart (same state, fresh thread) beats reseed (restart from triage)
  for broken workers; reseed is for broken *direction*.
- Research/Explore run single stages with their own band and default.
- **Completion is a worker verb with a host-side gate** (§2): build
  completes only at the terminal stage, research/explore only with
  passing artifact checks and no pending question.
- **Retry transient start failures with backoff, bounded and idempotent**
  (one in flight per card, attempts claimed per failed thread,
  fresh-state revalidation; inbox pings only on exhaustion).
  Deterministic failures fail fast — backoff never fixes the same input
  failing twice.
- **Workers write conventional commits on repos that release from them**
  (detect release automation from repo markers; freeform elsewhere,
  never empty/`wip`).
- **Verify question-contract receipts at advance time** (agent receipts
  by fresh file + marker, human asks by recorded answer; unreadable
  state fails open, never deadlocks).
- **Fence shared-config mutation off worker threads.** Preset/model
  assignment is a host/UI concern; a worker rewriting it mid-flight
  changes every other card's brain. Refuse with a redirect (ask for it
  via the structured ask protocol instead of reassigning it yourself).
- **Surface child threads under their worker, never as peers.** Workers
  may fan work out to fresh BB child threads under the `subagents.md`
  contract; the host lists each child (title, status, provider,
  per-child token total, open link) beneath its worker row and leaves
  synthesis to the parent.

## 7. UI patterns that survived contact with users

- **Quiet inbox**: interrupt only when the agent needs the human; everything
  else is browsable history.
- **Result-oriented copy**: say "results", never "index"; "result", never
  "artifact". Internal filenames stay out of user-facing text.
- **No destructive primary actions while a worker is healthy**: recovery
  options appear only on error/pause/stuck; archive is secondary with
  confirm.
- **Debounced realtime**: batch mutation bursts (≈250ms) so panels don't
  stampede; reload on `card-state`/`board-changed`, never on a timer.
- **Freshness signals over vibes**: show running build version + build
  time and skills verification age so "did the reload take effect?" is
  checkable.
- **Update status as a tone-coded box under the plugin title**
  (`role="status"`): current/available/checking/not-managed/unreachable
  each name their state and path forward. Installs the manager cannot
  update additionally surface the newest upstream release (fail-soft
  lookup) with the manual path; one update signal drives every badge
  (sidebar row, tab, status box).
- **Creation failures stay open**: a failed submit keeps the dialog and
  draft with a persistent inline warning — never a toast alone.
- **Automation proposes, never disposes**: scheduled rules may only
  create unstarted drafts and notifications — never start workers, move
  cards, clear labels, merge code, or import work behind the user's back.
- **Static assets**: if the host bundler has no image loader, serve brand
  marks as data URIs over RPC — never runtime relative URLs (they 404 on
  managed installs).

## 8. Portable modules (copy freely)

These `bb-plugin-stelow/lib/*.mjs` files import nothing host-specific and
encode the rules above as tested pure functions: `worker-action-policy`,
`card-move`, `card-detail-presentation`, `card-question-state`,
`inbox-events`, `inbox-event-presentation`, `question-batch`,
`question-contracts`, `advance-contracts`, `ask-gate`, `ask-contracts`,
`gate-ask-evidence`, `context-ask-gate`, `stage-skips`, `split-proposal`,
`tracks`, `stage-bands`, `workflow-intent-policy`, `worker-ledger`,
`worker-failure`, `spawn-retry`, `discard-policy`, `github-release`,
`automation-rules`, `thread-children`,
`research-*`, `kanban-layout`, `github-lists`,
`promote-card`, `workflow-lineage`, `completion`, `card-claims`, `playbook`,
`preview-session`, `preview-runtime`, `audit-receipt`,
`audit-trail-contract`, `audit-verification`, `vcs-publication`,
`workspace-recovery`, `workflow-config`, `remote-url`. Mirror the pattern (pure `lib/` +
node-test per rule, never inline-only in handlers) rather than the code.

## 9. Anti-patterns (each paid for at least once)

- Second workflow database beside `stelow.json`/`.stelow/` (they stay the
  source of truth).
- Hand-editing `current_stage` (only `advance` writes it).
- Blanket inbox resolution (per-kind, §3).
- Compat shims for dead RPCs (delete, don't shim).
- Status changes from activity signals (§2).
- Compat `fr` units stretching kanban columns (bounded minmax instead).
- Inferring completion from stage + idle instead of an explicit
  worker commit verified in code (§2).
- Workers discovering playbooks through skill-list shell pipelines
  instead of reading host-served paths (§1).
- Fail-closed on unreadable contract/methodology sources (fail open;
  pin the source with tests so drift breaks the build instead).
- Pasted prompt clauses across spawn paths (single-source consts with a
  test pinning definition + references).
- Fire-and-forget RPC writes that update UI before the server confirms
  (await, then write from the response — or revert on failure).
- Per-card lock directories as cross-card coordination (sibling cards never
  see each other's state-dir locks; key claims by workspace path, §2).
- Gating composite output on the primary file alone (validate every
  registered substep individually — a 200-char file with the right filename
  is not a playbook result).

## 10. Contract tests to mirror

Pin the shared surface so upstream changes break your build loudly, not
your users silently: stage count + board order + transitions (see
`workflow-contracts`), card-insert placeholders derived from columns,
methodology-mirror pins (vendored `stages.yaml`/`transitions.md` against
the host mirror), refusal-matrix tests for every gate,
skill-count vectors. The reference `bb-plugin-stelow` suite pins every
contract above plus a suite-wiring test that fails when any test file is
unwired from CI (unwired tests once shipped green-but-never-run); steal
its shape, not just its assertions.

## 11. Artifact quality strategy

Thin files with right filenames read as complete work unless the host
says otherwise in code. Layer the guarantee:

1. **Countable contracts in the skills.** Every playbook states its
   machine-checkable minima (sections, item counts, tables, scores) in a
   Completeness contract the worker reads. Counts restate what the
   methodology already demands — never invent rigor the playbook doesn't
   promise.
2. **Deterministic host validation as the blocking gate.** The host
   validates every registered artifact individually (including composite
   substeps, not just the primary file) and refuses completion with
   file + expected-vs-found. Prompts teach the contract; code enforces it.
   Unknown shapes never block — only matched documents that fail depth do.
3. **Optional cross-lineage review, never blocking by default.** A reviewer
   from a different model family judges only what code cannot (coherence,
   scope fit), against the deterministic report as rubric, with findings
   anchored to verbatim quotes the host re-verifies. Reviews cost budget:
   explicit opt-in, shift-left refusal on thin files, no silent fallback
   to the worker's own preset. Enforcement waits for a golden set with
   measured agreement — wire the rubric to the gate only then.
4. **Provenance seals, not truth claims.** Surfaces show checked
   provenance (verified / hypothesis-only / needs-revision / unverified)
   resolved live from revalidation, with progressive disclosure down to
   the failing checks. A seal without backing content reads unverified —
   a first-class state, never an error, never "true".
