# Scope Lifecycle — Gap Analysis

After implementing bidirectional auto-sync (Pi extension `readTracking()`/`writeTracking()` hooks + Muxy panel `syncScopesForTracking()`), the following gaps remain:

## Gap 1: spec-tech.md v2 overwrites existing scopes

**Severity:** Low

The sync functions are **idempotent** — they only trigger when `wf.scopes` is empty. If a workflow reaches Execution, sync populates scopes, and then `spec-tech.md` gets a v2 (new/modified scopes), the sync will NOT re-run because scopes are already populated.

**Impact:** New or modified scopes from `spec-tech_v2.md` are never auto-synced. The LLM would need to manually update `stelow.json`.

**Possible fix:** Track `spec-tech-version` on the workflow or scope. If the file version exceeds the tracked version, re-sync. Or check file modification timestamps.

## Gap 2: No index.json write-through from Muxy panel

**Severity:** Medium

The panel's `syncScopesForTracking()` writes to `stelow.json` via `muxy.files.write()`, but does NOT write to `.stelow/{date}/{hash}/index.json`. The Pi extension's `writeTracking()` updates both, so index.json eventually catches up on the next `/sw-*` command. Until then, `scanWorkflowDirs()` (which reads from index.json) won't see the scopes.

**Impact:** Artifact scanning and disk-based workflow discovery may show inconsistent scope state.

**Possible fix:** Add index.json write-through in `syncScopesForTracking()` (same pattern as `persistWorkflowMeta`).

## Gap 3: Potential race on concurrent writes

**Severity:** Low (theoretically possible, practically mitigated)

Both Pi extension and Muxy panel write to `stelow.json`. The Pi extension uses `writeFileSync` (blocking, on command execution). The panel uses `muxy.files.write` (async, on 15s poll). The race window is:

1. Panel polls → reads stelow.json → sync triggers → writes back
2. Extension writes stelow.json between panel's read and write

**Mitigation:** The panel only writes when `changed = true` (i.e., first sync for a workflow with empty scopes). After initial population, subsequent polls are read-only.

## Gap 4: Legacy workflows without dirHash are invisible to sync

**Severity:** Low

Both `syncScopesFromPlanningFiles()` (TS) and `syncScopesForTracking()` (JS) skip workflows when `!wf.dirHash`. Legacy workflows created before dirHash tracking was added never get auto-synced scopes.

**Impact:** Affects users who upgraded from pre-dirHash versions.

## Gap 5: Phase numbering drift between TS and JS

**Severity:** Low

The JS mirror hardcodes `EXECUTION_PHASE = 13`. The TS source uses `STAGE.EXECUTION()` which derives from `PHASE_NAMES`. If a phase is ever added or removed, the TS version auto-updates but the JS constant would not.

**Mitigation:** Add a comment in both files referencing the mirror, and verify during phase changes.

## (Not a gap) readTracking() syncs in memory only

`readTracking()` calls `syncScopesIfNeeded()` which modifies the in-memory `TrackingData` but does NOT write back to disk. This is by design — the data is returned to the caller (a command handler) which typically calls `writeTracking()` later. Read-only commands like `/sw-status` benefit from the in-memory scopes for display. The Muxy panel independently handles persistence via `syncScopesForTracking()`.
