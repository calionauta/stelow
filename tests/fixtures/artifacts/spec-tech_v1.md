---
approved: true
version: 1.0
created_at: "2026-05-19T14:00:00Z"
---

## Scopes

### Scope 1: Triage Prompt System
[TYPE: feature]
**Objective:** Implement structured triage prompts that guide the user through 3-5 questions per idea.
**DoD:** All 5 triage prompts render correctly with ask_user_question tool
**AC:** User completes triage flow -> inbox item created with all answers
**Dependencies:** None

### Scope 2: Inbox Storage
[TYPE: feature]
**Objective:** Store triaged ideas in a structured inbox with status tracking.
**DoD:** Inbox items persist across sessions
**AC:** Inbox items loaded on workflow start, status update works
**Dependencies:** Scope 1

### Scope 3: Output Formatting
[TYPE: optimization]
**Objective:** Format triage output for downstream Shape Up stage.
**DoD:** Output matches spec-product_v{N}.md template
**AC:** Schema validation passes for all required fields
**Dependencies:** Scope 1
