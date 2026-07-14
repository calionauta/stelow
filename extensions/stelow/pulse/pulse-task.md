Read .stelow/inbox/items.md.
Read stelow.json at project root for active workflow context (canonical source — contains Workflow.config.{appetite,review_mode,domains_detected}, scopes, etc).

Skip any items prefixed with [human-in-the-loop], [hitl], or [human]. These need human judgement and are not for automatic processing.

Triage: group related items, rank by priority.
Select: pick the single highest-priority item or group.

Create workflow:
  1. Create .stelow/<YYYY-MM-DD>/<dirHash>/ directories (specs, interfaces, plans/scopes, critiques, approvals, sessions). NO index.json (v0.53.0+) — stelow.json is the single canonical source.
  2. Add entry to stelow.json with: status=in-progress, currentPhase=2 (Setup), config: { appetite: "Lean", review_mode: "Auto", domains_detected: [] }, draftContent = item text.
  3. Remove processed item(s) from inbox (never remove [human-in-the-loop], [hitl], or [human] items)

Output a machine-parseable summary at the very end:
---
PROCESSED: <item text>
COUNT: <number of items processed this run>
WORKFLOW: <name>
DIR: .stelow/<date>/<hash>
PHASE: Setup
---
