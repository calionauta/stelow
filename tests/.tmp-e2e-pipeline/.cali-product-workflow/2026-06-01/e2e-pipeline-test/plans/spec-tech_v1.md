---
version: 1.1
based_on: spec-product_v1.md
---

## Scopes

### Scope 1: Inbox CLI Command
[TYPE: feature]
**Objective:** Implement `/pw-inbox add` CLI command with 3 structured prompts.
**DoD:** Command runs, prompts user, saves to inbox.json
**AC:** 
  - `/pw-inbox add` shows 3 sequential prompts
  - Input is validated (non-empty required fields)
  - Output is saved to .cali-product-workflow/inbox.json
  - Help text explains the command
**Dependencies:** None
**Effort:** 2 days

### Scope 2: Inbox File Storage
[TYPE: feature]
**Objective:** Implement inbox.json schema and file operations.
**DoD:** Inbox.json is created, read, written correctly
**AC:**
  - inbox.json follows defined schema
  - Items have status: pending/triaged/discarded
  - File is created on first write if not exists
  - JSON parse errors return meaningful error
**Dependencies:** [Scope 1]
**Effort:** 1 day

### Scope 3: Inbox List Command
[TYPE: feature]
**Objective:** Implement `/pw-inbox list` to display stored ideas.
**DoD:** Lists all inbox items with status, urgency, and preview
**AC:**
  - Shows empty state when no items
  - Sorts by urgency descending
  - Truncates long descriptions
**Dependencies:** [Scope 2]
**Effort:** 1 day

### Scope 4: Inbox Performance
[TYPE: optimization]
**Objective:** Ensure inbox handles 100+ items without slowdown.
**DoD:** Load + list 100 items in under 100ms
**AC:**
  - Benchmark test runs in CI
  - No O(n²) patterns in load or list
**Dependencies:** [Scope 2]
**Effort:** 0.5 day
