---
"@calionauta/stelow": patch
---

Add `scripts/check-extensions-freeze.sh`: a CI guard that blocks any diff under `extensions/` or `WORKFLOW_COMMANDS/` relative to `origin/main`. Prevents accidental drift while the skills-only refactor is in progress. Override via `.extensions-freeze-override` marker.
