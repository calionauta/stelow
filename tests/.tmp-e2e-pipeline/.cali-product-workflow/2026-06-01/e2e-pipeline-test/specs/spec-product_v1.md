---
approved: false
version: 1.0
appetite: 2 weeks
hill_chart: "50%"
---

## Problem
Users cannot quickly capture raw ideas before they forget them.
Current flow requires opening Slack, Notion, or email — all friction.

## Solution
A lightweight triage system integrated into the workflow CLI.
When user types `/sw-inbox add "idea"`, it prompts 3 structured
questions and saves to a local inbox file.

## Scope

### IN
- CLI command: `/sw-inbox add`
- 3 triage questions: problem, audience, urgency
- Local inbox file at .stelow/inbox.json
- List inbox: `/sw-inbox list`
- Clear inbox: `/sw-inbox clear`

### OUT
- Multi-user inbox sharing
- External integrations (Slack, Notion)
- Voting/ranking system
- Push notifications

## Rabbit Holes
- Over-engineering the inbox format (keep to JSON, no DB)
- Adding undo/redo before shipping

## Risks
- User might ignore inbox entirely (mitigation: prompt on start)
- Scope creep toward a full PM tool (mitigation: strict IN/OUT)
