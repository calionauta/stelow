Read .stelow/inbox/items.md.
Read all .stelow/*/*/index.json for active workflow context.

Skip any items prefixed with [human-in-the-loop], [hitl], or [human]. These need human judgement and are not for automatic processing.

Triage: group related items, rank by priority.
Select: pick the single highest-priority item or group.

Create workflow:
  1. Create .stelow/<YYYY-MM-DD>/<dirHash>/ with:
     - index.json: review_mode=Auto, appetite=Lean, status=in-progress,
       current_phase=Setup (index 2), draft = item text
  2. Add entry to stelow.json
  3. Remove processed item(s) from inbox (never remove [human-in-the-loop], [hitl], or [human] items)

Output a machine-parseable summary at the very end:
---
PROCESSED: <item text>
COUNT: <number of items processed this run>
WORKFLOW: <name>
DIR: .stelow/<date>/<hash>
PHASE: Setup
---
