---
approved: true
version: 1.0
---

## Proposal A — CLI Prompts
```
$ /sw-inbox add
What problem does this solve?
> Users forget ideas before triage
Who is the target audience?
> PMs and product designers
Urgency (1-5)?
> 4
✓ Idea saved to inbox
```

## Proposal B — Editor Integration
```
┌──────────┬─────────────────────┐
│ Inbox    │ Idea Detail          │
│──────────│─────────────────────│
│ ○ Triage │ Problem: forgot...  │
│ ○ Export │ Audience: PMs       │
│ ○ Sync   │ Urgency: 4/5        │
└──────────┴─────────────────────┘
```

## Proposal C — File-based
```
.stelow/inbox/
├── 2026-06-01-triage.md
├── 2026-06-01-export.md
└── README.md
```

## Proposal D — Interactive Session
```
> /sw-inbox start
────────────────────
Step 1/3: Problem
────────────────────
Users forget ideas before triage
────────────────────
```

## Proposal E — Notifications
```
[Inbox] Reminder: 3 ideas waiting for triage
Run /sw-inbox to review them now.
```

## Hybrid Recommendation
Combine Proposal A (CLI prompts for input) with Proposal C (file-based
storage for persistence). The CLI prompt captures structured data,
files provide inspectable state for debugging and export.
