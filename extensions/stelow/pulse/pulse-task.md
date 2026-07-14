Read .stelow/inbox/items.md.
Read stelow.json at project root for active workflow context (canonical source as of v0.50.0 — contains Workflow.config.{appetite,review_mode,domains_detected}, scopes, etc).

Skip any items prefixed with [human-in-the-loop], [hitl], or [human]. These need human judgement and are not for automatic processing.

Triage: group related items, rank by priority.
Select: pick the single highest-priority item or group.

Create workflow:
  1. Create .stelow/<YYYY-MM-DD>/<dirHash>/index.json with: status=in-progress, current_phase=Setup (index 2), draft = item text. This is a per-workflow mirror of the canonical stelow.json#workflows[] entry.
  2. Add entry to stelow.json with `config: { appetite: "Lean", review_mode: "Auto", domains_detected: [] }`
  3. Remove processed item(s) from inbox (never remove [human-in-the-loop], [hitl], or [human] items)

Output a machine-parseable summary at the very end:
---
PROCESSED: <item text>
COUNT: <number of items processed this run>
WORKFLOW: <name>
DIR: .stelow/<date>/<hash>
PHASE: Setup
---
