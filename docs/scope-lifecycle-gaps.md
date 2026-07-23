# Scope Lifecycle — Gap Analysis

After implementing auto-sync (host-agnostic `readTracking()` / `writeTracking()`
hooks both call `syncScopesIfNeeded`, which calls the single
`parseSpecTechScopes` implementation in `extensions/stelow/state.ts`), the
following gaps remain. The Muxy / Herdr integration trees were removed in
v0.55 and SW-002; this document no longer describes those paths.

## Current behavior (for reference)

For every workflow in `data.workflows`:

1. Skip when `wf.status !== "in-progress"` or `wf.currentPhase < STAGE.EXECUTION()`.
2. Skip when `!wf.dirHash || !wf.created` (legacy metadata limitation).
3. Locate the latest `spec-tech_*.md` under `.stelow/{date}/{dirHash}/plans/`.
4. If `Array.isArray(wf.scopes) && wf.scopes.length > 0` and
   `wf.specTechFile === latest`, skip (idempotent).
5. Otherwise, read the latest file, call `parseSpecTechScopes(content)`, and
   when the parse yields entries, replace `wf.scopes` and set
   `wf.specTechFile = latest`.

`readTracking()` and `writeTracking()` both invoke this loop. The loop modifies
the in-memory `TrackingData`; persistence happens when the caller (a command
handler) invokes `writeTracking()` later. Read-only commands such as
`/sw-status` benefit from the in-memory scopes for display.

## Gap 1: Legacy workflows without dirHash/created are invisible to sync

**Severity:** Low

`syncScopesIfNeeded` short-circuits when `!wf.dirHash || !wf.created`.
Workflows created before either field was added to the schema never get
auto-synced scopes; they only see scopes if a caller explicitly populates
`wf.scopes` through other channels (manual edit, seed, etc.).

**Impact:** Users who upgraded from pre-`dirHash` versions retain static
scopes (or no scopes) until the workflow is re-seeded.

**Possible fix:** A one-time backfill that derives `dirHash` from the workflow
name and `created` from filesystem mtime; out of scope here because it
changes runtime behavior.

## Gap 2: `readTracking()` syncs in memory only (no immediate persistence)

**Severity:** Low (by design)

`syncScopesIfNeeded` mutates `data.workflows` in place but does NOT call
`writeTracking()`. The caller is expected to call `writeTracking()` later
when its own changes are ready to persist. Read-only commands such as
`/sw-status` benefit from seeing the freshly synced scopes without paying
for a disk write.

**Impact:** If a caller forgets to invoke `writeTracking()` after handling
a read result that logically depends on the synced scopes, the next
`readTracking()` will re-do the parse work. There is no correctness loss —
only a redundant read.

**Possible fix:** None recommended. Forcing `writeTracking()` from inside
the read path would couple read and write I/O for callers that explicitly
want read-only behavior.

## Resolved / removed-host claims (kept here only as a regression note)

The following were listed as open gaps in earlier versions of this
document but are no longer accurate against current source:

- ~~spec-tech.md v2 overwrites existing scopes~~ — **resolved**. The current
  `wf.specTechFile` check in `syncScopesIfNeeded` skips when the latest
  filename matches, and re-syncs when the filename changes; the workflow
  always reflects the latest `spec-tech_*.md`.
- ~~No `index.json` write-through from Muxy panel~~ — **moot**. The Muxy
  panel and the per-workflow `index.json` mirror were both removed
  (SW-002 in v0.55; the `index.json` removal completed in v0.53).
- ~~Potential race between Pi extension and Muxy panel writes~~ — **moot**.
  Only the TypeScript implementation exists; there is no second writer
  from a removed host.
- ~~Phase numbering drift between TS and JS mirrors~~ — **moot**. The
  JavaScript `EXECUTION_PHASE` mirror was deleted with the Muxy
  integration tree; `STAGE.EXECUTION()` is the single source of truth
  and tracks `PHASE_NAMES` automatically.

If any of these descriptions reappear in this document or in source
comments, that is a regression; remove them.