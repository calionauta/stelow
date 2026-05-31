---
approved: true
version: 1.0
created_at: "2026-05-19T16:00:00Z"
---

## Proposal A — Modal Overlay
```
┌──────────────────────────┐
│  New Idea                │
│                          │
│  What problem? [______]  │
│  Who is it for? [______] │
│                          │
│  [Save] [Cancel]         │
└──────────────────────────┘
```

## Proposal B — Side Panel
```
┌────────────┬─────────────┐
│ Inbox      │ New Idea    │
│ ○ Idea 1   │ Problem: __ │
│ ○ Idea 2   │ Who: ______ │
│ ○ Idea 3   │             │
└────────────┴─────────────┘
```

## Proposal C — Chat Interface
```
──────────────────────────
Assistant: What problem
does this idea solve?
──────────────────────────
User: Users need faster
triage
──────────────────────────
```

## Proposal D — Wizard Steps
```
Step 1/3: What problem?
[________________________________]
Step 2/3: Who is affected?
[________________________________]
```

## Proposal E — Inline Annotations
```
[IDEA] Triage system
  ├ Problem: Slow triage
  ├ For: PMs
  └ Status: draft
```

## Hybrid Recommendation
Combine Proposal B (side panel) with Proposal C (chat) — use the
side panel for overview and chat for detailed triage flow.
```json
{
  "primary": "proposal-b",
  "secondary": "proposal-c",
  "rationale": "Overview + guided flow = best UX"
}
```
