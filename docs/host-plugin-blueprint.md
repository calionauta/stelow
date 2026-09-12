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
| Skill registry readable by workers | `bb skill list` equivalent so workers load vendored skills |
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
- ** terminal cards show terminal UI**: history + final state only, no worker
  controls except Delete.

Reference (copyable, zero host imports): `worker-action-policy.mjs`
(action visibility), `card-move.mjs` (board-move decisions),
`workflow-intent-policy.mjs` (type edits), `card-detail-presentation.mjs`
(archived hero copy), `tracks.mjs` (build vs lightweight routing).

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
4. Write atomically (tmp + rename); prune local `stelow-*` dirs missing
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
- **Static assets**: if the host bundler has no image loader, serve brand
  marks as data URIs over RPC — never runtime relative URLs (they 404 on
  managed installs).

## 8. Portable modules (copy freely)

These `bb-plugin-stelow/lib/*.mjs` files import nothing host-specific and
encode the rules above as tested pure functions: `worker-action-policy`,
`card-move`, `card-detail-presentation`, `card-question-state`,
`inbox-events`, `inbox-event-presentation`, `question-batch`,
`tracks`, `stage-bands`, `workflow-intent-policy`, `worker-ledger`,
`worker-failure`, `research-*`, `kanban-layout`, `github-lists`,
`promote-card`, `workflow-lineage`. Mirror the pattern (pure `lib/` +
node-test per rule, never inline-only in handlers) rather than the code.

## 9. Anti-patterns (each paid for at least once)

- Second workflow database beside `stelow.json`/`.stelow/` (they stay the
  source of truth).
- Hand-editing `current_stage` (only `advance` writes it).
- Blanket inbox resolution (per-kind, §3).
- Compat shims for dead RPCs (delete, don't shim).
- Status changes from activity signals (§2).
- Compat `fr` units stretching kanban columns (bounded minmax instead).

## 10. Contract tests to mirror

Pin the shared surface so upstream changes break your build loudly, not
your users silently: stage count + board order + transitions (see
`workflow-contracts`), card-insert placeholders derived from columns,
skill-count vectors. The reference `bb-plugin-stelow` suite is 42 checks;
steal its shape, not just its assertions.
