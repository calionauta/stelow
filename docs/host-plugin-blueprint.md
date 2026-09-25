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
- **Tier the queue deterministically, never suppress.** Score every event
  at write from observable signals (kind, age, stall count, error
  repetitions) into escalating / action / routine, recompute open rows on
  the reconcile sweep, and order reads by tier then newest. Each tier
  carries reason chips (`stalled 3d`, `error ×2`) so the ranking explains
  itself. The badge still counts every open action; resolved history stays
  chronological; thresholds live in one file, no migration to retune. A
  semantic bump (one yes/no per open item, confidence-gated, provenance
  chip) may promote within a tier later — never assign it, only after a
  golden set shows measured agreement.
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
- **Let models veto, never act, where a heuristic owns the decision.**
  When deterministic rules already decide (e.g. idle resume on fresh
  output within budget), a model judgment may only cancel a cleared
  action on confident contrary evidence — it must never authorize one
  the rules refused, spend budget, or write state. Every fallback keeps
  the heuristic standing; vetoes leave a log trail with the verdict.
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
- **Explicit saves, local refresh**: router and settings rows stage edits
  locally and save through one button; a save refreshes only its own
  section, never the board — flipping a select must not fire a request
  by itself.
- **Project picker with re-anchor**: any cross-project dialog offers every
  project, defaults to the board's, and re-anchors on every open, so a
  stale pick never writes to the wrong project.
- **Bucket lives in the header gallery, never as a column**: the
  captured-but-unstarted pile is labeled Bucket on every track (never
  Inbox — that word belongs to the notification center) and opens from
  a header button into the shared gallery; stored keys, statuses, and
  move targets keep the old identifier, so the rename is labels-only
  with no migration. Rendered boards skip the column while grouping,
  moves, and filters keep the full catalog.
- **One gallery dialog for piles**: bucket columns and hill clusters open
  the same expanded modal — fixed dimensions (70vw wide, 85dvh tall,
  internal scroll), the board tiles
  themselves at the board's own column bounds (240–320px, auto-fill per
  row, natural height, never stretched to equal row heights), filling left
  to right then down, vertical scroll, titled by params (count plus
  context). Creation
  checkboxes link the same gallery from their "park in Bucket" copy.
  Never a second modal, never a positioned overlay.
- **Result-oriented copy**: say "results", never "index"; "result", never
  "artifact". Internal filenames stay out of user-facing text.
- **No destructive primary actions while a worker is healthy**: recovery
  options appear only on error/pause/stuck; archive is secondary with
  confirm.
- **Debounced realtime**: batch mutation bursts (≈250ms) so panels don't
  stampede; reload on `card-state`/`board-changed`, never on a timer.
  The reconcile tick additionally watches a scope-progress fingerprint per
  live card and publishes on movement only — silent worker edits surface
  within one tick, first sight baselines silently, cosmetics never publish.
- **Freshness signals over vibes**: show running build version + build
  time and skills verification age so "did the reload take effect?" is
  checkable.
- **Update status as a tone-coded box under the plugin title**
  (`role="status"`): current/available/checking/not-managed/unreachable
  each name their state and path forward. Installs the manager cannot
  update additionally surface the newest upstream release (fail-soft
  lookup) with the manual path; one update signal drives every badge
  (sidebar row, tab, status box). That signal is one shared store, not
  a per-surface mount poll: a forced check republishes it, so a check
  run inside one tab lights every surface at once instead of only the
  component that asked.
- **Unavailable controls state why, in place**: a disabled control
  cannot be focused and `title` is never announced, so the reason an
  action is unavailable is visible text the control is described by —
  never a hover tooltip, never a silent no-op. The same rule covers
  background work: a scheduled rule or setup-dependent job that cannot
  run names the missing dependency and where to fix it, instead of
  returning quietly while an empty list reads as "nothing to do".
- **Creation failures stay open**: a failed submit keeps the dialog and
  draft with a persistent inline warning — never a toast alone.
- **Automation proposes by default, disposes only isolated and opted-in**:
  scheduled rules create unstarted drafts unless the user explicitly opts
  into auto-start — and then only into an isolated worktree destination
  verified against the *effective* spawn environment (band routing wins
  over any passed preset; checking preset existence is not enough).
  Enabling a rule records the current backlog as seen without drafting;
  a dry-run preview names what would match now and exactly why the rest
  would not; every refusal names the fix. Never move cards, merge code,
  or import behind the user's back.
- **Progress hero above work detail**: one glanceable readout (scope/task
  bars with counts — never percentages — doing-now names, blocked names)
  over the same scopes/tasks contract the detail list renders — presentation
  only, no second data source, refreshed by the same realtime channel.
  Board-level flow keeps tempo (lead/cycle) apart from attention (stuck,
  review-awaiting) in tabs; signal chips ride the closed header only when
  nonzero, so a calm board shows no amber.
- **Destructive confirms state the full blast radius**: name data rows,
  run files, and what explicitly survives (e.g. Git checkouts) before
  anything runs — the dialog text must match what the handler deletes,
  in both directions (no silent leftovers, no silent preservation).
- **Sync is the refresh signal for file-owned state**: when workers edit
  tracking files the host cannot watch, an idempotent sync command the
  worker runs after each edit doubles as the notify — the host publishes
  its realtime event on the sync, so boards reload live instead of on
  the next lifecycle event. A re-sync must preserve host/worker overlay
  (rework scopes, discovered items), never replace it.
- **Name the checkout, never guess it**: open cards show where the worker
  runs in one stored word (isolated worktree, shared checkout,
  BB-managed, exploratory) plus the live branch — decided once at spawn
  from the resolved environment, read back afterwards. Path-sniffing
  rots; a stored label does not.
- **Decouple features into modules with their own kill switch**: one
  feature (contract fragment + migrations + scheduler + RPCs) behind one
  seam of explicit dependencies; the host wires a contract spread, one
  migration call, one schedule line. An env-gated flag disables the
  scheduler, the RPCs (each refusal names the variable), and the panel
  entry — evolving, refactoring, or switching a feature off never touches
  the core.
- **Keep host entry files as composition roots**: `app.tsx` and the server
  entry wire slices, shared contracts, and migrations; they do not retain
  the slice implementations. A server slice depends downward on its
  contract, host-neutral libraries, and injected host services, never back
  into the composition root. This applies across layers: a capability may
  own pure policy in `lib/`, host adapters in the server, presentation in
  components, and its tests together without creating a new architecture
  layer.
- **Route fuzzy judgments through decision routers, not prompts**: one
  decision endpoint configured once (endpoint + key + model for
  Jev-compatible APIs; endpoint only for keyless labels APIs such as
  classifier.dev); each judgment is a registry entry with modes (built-in
  rules vs API) and a confidence floor. Providers differ only in a small
  request/response adapter behind one shared client — questions,
  thresholds, and fallbacks stay provider-agnostic. Unconfigured means
  built-in rules; failures degrade, never block; the key never leaves the
  host (reads report presence only); an explicit probe is the only
  on-demand spend. Seeds are advisory — whatever the router suggests, the
  worker re-settles it in its own stage.
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
`tracks`, `workflow-vocabulary`, `workflow-intent-policy`, `worker-ledger`,
`worker-failure`, `spawn-retry`, `discard-policy`, `github-release`,
`automation-rules`, `github-intent`, `github-automation-gate`, `thread-children`,
`research-*`, `kanban-layout`, `github-lists`,
`promote-card`, `workflow-lineage`, `completion`, `card-claims`, `playbook`,
`preview-session`, `preview-runtime`, `audit-receipt`,
`audit-trail-contract`, `audit-verification`, `vcs-publication`,
`workspace-recovery`, `workflow-config`, `remote-url`, `trackables`,
`trackable-contracts`, `trackable-relations`, `trackable-evidence`,
`trackable-events`, `tracking-paths`, `spec-scope-reader`, `build-gates`,
`scope-command`, `artifact-roles`, `reliable-preset`,
`preset-staleness`, `decision-api`, `decision-points`, `preset-judge`,
`hill-position`, `card-metrics`, `skill-criteria`, `task-evidence`,
`delegation-evidence`, `inbox-severity`, `delegation-map`, `draft-burst`,
`app-support-state`, `board-list-presentation`, `board-views`,
`build-detail-lifecycle`, `build-diff-presentation`, `build-panel-state`,
`build-progress-presentation`, `build-review-target`, `card-attention`,
`detail-presentation`, `explore-panel-state`, `host-tools`,
`inbox-panel-state`, `message-directives`, `panel-state`, `panel-storage`,
`plugin-update-signal`, `plugin-update`, `preset-assignment`,
`preset-onboarding-state`, `publication-mutation`, `question-form`,
`relative-time`, `research-panel-state`, and `scope-order`.

Feature slices use those modules as their pure seam: test each rule directly
with a node test, then test the host adapter only where the wiring or injected
service is part of the contract. Keep regex pins for topology, counts, and
terminal refusals; behavior belongs in executable tests. Mirror the pattern
rather than copying the code.

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
- Scope/task status as worker-edited JSON without host validation
  (single-writer transitions: the worker proposes via `stelow scope
  start|done`, the CLI validates containment/order/terminality and commits;
  hosts project observed state from claims and records instead of trusting
  the self-report).
- Machine-readable plans without a machine dialect (specs that only use
  human headings sync zero scopes; `sync-scopes` now accepts `### SCOPE-N`
  as a fallback, but the `[SCOPE-N]` block stays canonical).
- Evidence scattered per kind (one registry, one condition shape, one
  event log, one path rule — a new pendency adds a contracts-table row,
  never a new strategy).
- Guessing the active scope from open-task counts (no conditions without a
  named writer and citable evidence; unknown reads unknown).
- Workers discovering playbooks through skill-list shell pipelines
  instead of reading host-served paths (§1).
- Fail-closed on unreadable contract/methodology sources (fail open;
  pin the source with tests so drift breaks the build instead).
- Pasted prompt clauses across spawn paths (single-source consts with a
  test pinning definition + references).
- Checking that *some* isolated preset exists instead of the *effective*
  spawn environment (band routing silently wins over passed presets —
  gate on what the spawn resolves, at save time and on every tick).
- Check-then-insert dedupe across concurrent flows (claim the key with an
  owner token before working; losers read already-imported/in-flight,
  never a second card).
- Treating issue text as trusted prompt input (allowlist authors on
  auto-dispatch rules; no host permission mode is read-only, so the gate
  is the protection, not the sandbox).
- Trusting the send instead of verifying the write (match a hidden
  marker back on the remote; a run that posted nothing is not success;
  retries must never double-post).
- Fire-and-forget RPC writes that update UI before the server confirms
  (await, then write from the response — or revert on failure).
- Per-card lock directories as cross-card coordination (sibling cards never
  see each other's state-dir locks; key claims by workspace path, §2).
- Gating composite output on the primary file alone (validate every
  registered substep individually — a 200-char file with the right filename
  is not a playbook result).
- Background jobs that fail setup silently: a scheduler without its
  integration loaded returns quietly, and the empty result is
  indistinguishable from "nothing to do" — the unavailable state is
  content, not a log line.
- Hover-only explanations for disabled controls (`title` on a control
  that cannot be focused is invisible to keyboard and screen-reader
  users, and the reason for the refusal is the part they need).

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
   machine-checkable minima (sections, item counts, tables with required
   columns, scores) in a Completeness contract the worker reads. Counts restate what the
   methodology already demands — never invent rigor the playbook doesn't
   promise. Prefer column presence over prose mentions: a criterion named
   once in passing must not satisfy a per-item requirement — the table
   carrying the per-item column is the check.
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
   to the worker's own preset — and the designation UI lives below the
   subagent tiers, never among them, so capability (reliable/generation)
   is never mistaken for independence (review). Enforcement waits for a golden set with
   measured agreement — wire the rubric to the gate only then.
   Gate entry with a reviewer designated fires one hidden pre-review of
   the gate artifact as a card comment before approval (advisory,
   fire-and-forget, silent on every miss).
4. **Provenance seals, not truth claims.** Surfaces show checked
   provenance (verified / hypothesis-only / needs-revision / unverified)
   resolved live from revalidation, with progressive disclosure down to
   the failing checks. A seal without backing content reads unverified —
   a first-class state, never an error, never "true".
5. **Close the rework loop in code, not prose.** When the methodology
   classifies findings (fixed / documented / escalated), require the
   classification as structured frontmatter on the report so the host
   can check it: every row needs a known impact + resolution, and the
   methodology's escalation rule (e.g. high/critical impact escalates)
   becomes a deterministic failure when violated — a misclassified row
   must never pass silently. Stated effort is checked the same way
   (medium impact with moderate-or-heavier effort must not resolve as
   an inline fix), fail-open when absent so older reports never
   retro-fail. Escalations become rework scopes through a
   host-owned idempotent command (never by asking the worker to edit
   tracking JSON), each scope linked to its gap on the same card —
   never new cards: a card with open gaps loops back through the
   methodology's audit-rejects-to-execution transition, reworks,
   re-critiques, and only then completes. Completion refuses
   while escalations lack scopes or linked scopes stay open, and refuses
   with any non-terminal scope still open (done, completed, or explicitly
   skipped pass) — done
   means every gap has a disposition, every escalation is executed,
   and no promised scope was walked past.
   Surface the loop state early (verify-time warnings, not just
   completion refusals) and name the loop-back: an audit-to-execution
   advance should state which open rework it picks up. Validate every
   matched critique, not just the newest — a lingering superseded file
   still makes claims, and newest-wins would let a clean rewrite silently
   drop registered escalations; re-critique overwrites the same file.
   Judgment
   stays automatic with full transparency (counts, per-escalation
   scope status, trail record) rather than human-gated: gating
   completion on per-item human confirmation stalls autonomous runs,
   while over-escalation is cheap and visible and under-escalation is
   blocked by the rule above.
7. **Commit the run bundle, link it with trailers.** Git commits cannot
   carry file attachments and hosting UIs show no git-notes, so the
   convention is two halves: (a) a flat `docs/runs/<card-id>/` directory
   in the checkout holding the registered artifacts under stable
   basenames plus a `manifest.md` (SHA pin per file, gap counts,
   unreadable entries listed, trailer embedded) — committed with the
   work, versioned by git log, never per-commit subdirectories;
   (b) a `Stelow-*` trailer block below the commit subject (card id,
   artifact paths, gap counts) as the grepable audit link. The host
   provides an idempotent, path-confined export command; the worker
   protocol requires export → commit → trailer on every commit. Seeding
   a git checkout ignores the live runtime dir (`.stelow/`) so a worker
   `git add -A` can never sweep live runs into history — only the
   exported bundle is committed.
8. **Route delegated work by capability, not by stage.** Subagent tiers:
   Reliable runs on the band preset (tools/web/exact shapes/multi-step)
   unless a board-level override is set — empty means the band preset, and
   every live worker re-evaluates restart-pending when it changes;
   Generation (a cheap preset for disposable
   text-only bursts the worker judges 100% before using) is one board
   default with a board → band cascade (a card-level pin is reserved
   in the resolver, unwired — no per-card UI today). The tier rides the spawn
   call site where output is disposable by construction — never user
   choice per task, never a band × tier matrix. Rule of thumb: when the
   worker rewrites over 20% of a burst's output, that call site belongs
   back on Reliable. Every spawn is fresh by contract: context travels
   inside the call, never as inherited history — previous threads are
   referenced for selective retrieval, never forked.
6. **Critique generated UI once, after implementation — never before
   and after.** Visual critique (accessibility, heuristics, design
   quality) runs post-implementation, gated by appetite and whether
   UI files actually changed; its gap report feeds the execution
   critique as evidence. The "before" is already covered without LLM
   cost by the interface stage (proposals + review gate). Running the
   full critique twice per visual card doubles the most expensive
   audit for no new signal — the pre-implementation direction is
   chosen by proposal, the post-implementation reality is what needs
   checking.

9. **Mirror Completeness contracts as structured criteria for the checks
   code cannot do.** Count/shape minima stay deterministic (layers 1–2
   above). For semantic minima ("grounded in context", statement rules,
   trade-off quality), each playbook carries a fenced `criteria:` block
   beside its prose contract — `{id, kind, text}` with kinds `presence`
   | `count` | `semantic`. The host parses the blocks (`skill-criteria`
   pattern), routes deterministic kinds to the existing validators, and
   translates each semantic criterion into one atomic Score question
   against the artifact (one call per criterion, never batched; low
   confidence abstains). Semantic findings start advisory with quoted
   evidence, promoted to blocking only after a golden set shows measured
   per-criterion agreement — never on launch day.
10. **Calibrate judges with golden sets before enforcing.** Humans label
    artifacts met/unmet per criterion; the judge scores the same files;
    Cohen's kappa per criterion decides keep (≥0.6), repair, or drop —
    under 5 labels always repairs, abstentions never enter kappa.
    Recalibrate when criteria text, judge model, or thresholds change;
    a drifted criterion fails kappa and gets quarantined, not argued
    with.

## 12. Automation rules (propose, never decide)

Scheduled rules may draft work and notify — never start workers, move
cards, merge, or import behind the user's back. Reference implementation:
`bb-plugin-stelow` watches one GitHub label per project on a 5-minute
schedule; each newly matching open issue becomes one unstarted Inbox draft
carrying an origin marker ("Drafted from GitHub issue #X", source link),
idempotent by `repo#number` so re-runs never duplicate. Rules never clear
labels and never touch workflow state — every rule action is an inbox event
or a reversible draft. Copy the shape: event + filter + draft/notify
template, per-project settings, one fire record per source key.

## 13. Execution adapters and canonical stage data

A host may provide a native workflow engine, but the methodology must remain
engine-neutral. `skills/stelow-workflow-orchestrator/stages.yaml` owns stable
stage identity, phase, routing, owner skill, and execution requirements;
`recipes/*.yaml` owns task DAGs; `SKILL.md` frontmatter owns skill execution
profiles. Hosts consume the generated `stage-catalog.json` rather than copying
stage literals or parsing YAML.

An adapter publishes capabilities and implements `run`, `status`, `resume`,
`cancel`, and `result`. Required capabilities are negotiated before start.
Missing capabilities produce a named refusal or a documented coordinator-owned
sequential route, never a silent downgrade. The existing card coordinator may
execute that sequential route, but it is not a synthetic native adapter: it has
no native run ID, status endpoint, resume handle, or cancel operation. A real
sequential adapter is a separate capability and must implement the full durable
lifecycle before selection. Native run IDs and provider details stay in the
adapter. The host control plane owns the card and owns `needs_input`: the worker
reports the boundary, the card creates and persists the real question, and an
answer invokes `resume`. A native run must not own the card.

A richer host may map recipes to a native pipeline, worktrees, queues, or file
claims. Hosts that do not support per-call permissions must refuse recipes that
require them; permission inheritance is not equivalent to per-call permission.
See `references/execution-contract.md` for the vocabulary and
`stages.schema.json` for the canonical shape.

## 14. Host runtime composition and lifecycle slices

A host with a large plugin entrypoint should keep the package entry as a
bounded composition root and keep only wiring in the runtime module. Each
capability owns one seam: contract fragments, migrations, handlers, schedules,
and disposal for that capability. The runtime constructs the seams, passes
explicit dependencies, registers their handlers, and publishes lifecycle
events; capability modules do not import the entry or runtime module.

Extraction is a migration, not a relabeling. Until the runtime module is
actually decomposed, architecture notes must name it as transitional debt and
must not claim that creating directories or factories completed the split.

The portable seam pattern is:

- **Card lifecycle and RPC dispatch** own card reads, writes, question state,
  and card-detail composition. Their handlers receive storage and host services
  through a small dependency object.
- **CLI command families** own argument parsing, refusals, and command-specific
  output. A command family may call a capability service, but it does not
  duplicate lifecycle policy.
- **Execution composition** owns the native adapter, durable run ledger,
  reconciliation, and stage advance policy. A missing capability is a named
  refusal or coordinator-sequential route. The card remains answerable while a
  native run waits for input.
- **Preview, publication, and update composition** own read models and
  user-facing presentation data. They leave durable state changes to their
  owning capability.
- **Startup and disposal** are observable seams. Migrations run before
  registration, schedules are named, and event handlers are registered once.
  Every owned timer, child process, and retry is disposed idempotently; host
  event subscriptions remain scoped to the plugin instance. Disposal must not
  stop live worker threads: hot reload is not uninstall.

Reference evidence in `bb-plugin-stelow`: `server.ts` is the package entry;
`server/rpc-contract.ts` composes capability fragments;
`server/core-migrations.ts` orders persisted-state migration;
`server/runtime/lifecycle-startup.ts`, `thread-lifecycle.ts`, and
`reconciler.ts` expose startup, event, and timer seams; and capability
factories return the handlers and disposal handles consumed by
`server/plugin-runtime.ts`. `tests/plugin-startup.test.mjs` runs every disposer
twice and fails if a live thread is stopped, while
`tests/runtime-reconciler.test.mjs` pins timer cleanup.

Every registered contract method must have a handler, and representative
behavior tests must cover success, refusal, fail-soft, publication, and
disposal paths at each seam. A topology assertion complements behavior tests;
it never substitutes for them. Cross-capability changes update this blueprint
and the host's architecture note in the same change.

