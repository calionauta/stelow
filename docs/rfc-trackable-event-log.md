# RFC: Append-only trackable event log (`events.jsonl`)

> **Status:** proposal (reference implementation: `bb-plugin-stelow`
> `trackable_events` table — same envelope, SQLite instead of JSONL).
> **Question it settles:** can every host project the same decision history
> from one log without re-executing anything?

## 1. Why this exists

`stelow.json` stores desired state; `audit-trail.md` projects lineage at
completion. Between them there is no causal trail: *who decided what, on
which evidence, when* — scope starts, sync outcomes, rework creation,
refusals — lives in prose or nowhere. Hosts that want an honest activity
feed, replayable postmortems, or cross-host audit each invent their own
table. One append-only log, owned by the CLI, ends that.

## 2. Proposal

Per workflow, `<stateDir>/events.jsonl`: one JSON object per line,
append-only, per-workflow monotonic `seq`:

```json
{"seq": 1, "at": "2026-09-21T00:00:01.000Z", "kind": "scope", "id": "scope-1", "transition": "started", "actor": "cli", "evidence": "deps done"}
{"seq": 2, "at": "2026-09-21T00:05:00.000Z", "kind": "scope", "id": "scope-1", "transition": "completed", "actor": "cli", "evidence": "record.verified=true"}
{"seq": 3, "at": "2026-09-21T00:06:00.000Z", "kind": "scope", "id": "all", "transition": "execution-refused", "actor": "cli", "evidence": "human-dialect spec"}
```

Rules (mirroring the ESAA invariants already cited in `architecture.md`
discussions):

- **Append-only.** Never rewrite history; corrections are new events.
  `done`/`completed` never regress (enforced by `stelow scope done`).
- **Single writer per line.** The CLI appends for transitions it commits
  (`scope start|done`, `sync-scopes` outcomes, `advance` entries); hosts
  append for host-owned decisions with `actor: "host:<id>"`.
- **Evidence, not prose.** `evidence` cites the check that fired
  (counts, hashes, refusal reasons), so replay needs no LLM.
- **Projection, not truth.** Current statuses stay where they are
  (`stelow.json` desired, evidence files observed); the log answers
  *why*, never *what*.

## 3. Non-goals

- No event-sourced *state*: the log does not replace `stelow.json`, it
  trails it. (Full ESAA-style projection is a later RFC if this proves out.)
- No cross-workflow ordering: `seq` is per workflow; hosts correlate by
  wall-clock `at` when they must.
- No daemon: appends happen inside the commands that already commit the
  transition — no background process, no new dependency.

## 4. Migration

1. CLI appends on `scope start|done`, `sync-scopes` (synced/refused),
   `advance` (entries). Behind nothing — appends are fail-open
   (a logging failure warns, never refuses).
2. `doctor` reports log health (missing log, seq gaps).
3. Hosts project activity feeds from the log instead of private tables.

## 5. Open questions

- Retention/rotation for very long workflows ( Trail growth is
  kilobytes per transition — likely a non-issue; measure first).
- Whether `advance` should append (host-owned in bb; standalone CLI
  owns it) — actor namespacing covers both.
