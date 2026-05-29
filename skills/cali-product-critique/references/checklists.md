---
source: cali-product-planner (consolidated)
original_files: checklist-flows.md, checklist-states.md, checklist-affordances.md, checklist-data.md, checklist-system.md, checklist-feasibility.md
date: 2026-05-15
applies_to: [plan, codebase]
---

# Product Critique — All Checklists

## 1. Checklist: Flows

Analyze user/data flows for completeness and coherence.

### Questions to ask:
- Is the primary flow clear and linear?
- Are all branching paths (conditionals) defined?
- Can users get stuck in dead ends?
- Are there loops that need exit conditions?
- Do parallel flows sync properly?
- Are rollback/undo paths defined?

### Check for:
- [ ] Primary flow is clear
- [ ] Alternative flows are defined
- [ ] Error paths are specified
- [ ] Back/undo navigation works
- [ ] Confirmation points exist for destructive actions
- [ ] Progress indicators for long operations

---

## 2. Checklist: States

Define and verify all possible states.

### Required states per component/feature:
- **Empty** — no data, no content, first-time experience (empty state)
- **Loading** — fetching, processing, async operations
- **Partial** — some data loaded, more pending
- **Populated** — has data/content
- **Error** — failed to load, connection issues, validation errors
- **Boundary** — max items, overflow, very long content
- **Edge** — first item, last item, single item, two items

### For each state, verify:
- [ ] Visual representation exists
- [ ] Appropriate messaging/labels
- [ ] User knows what to do next
- [ ] Recovery path is clear

---

## 3. Checklist: Affordances & Interactions

Verify that interactive elements are discoverable and behave predictably.

### Check for:
- [ ] Buttons look like buttons (visual affordance)
- [ ] Links look like links (underline, color)
- [ ] Clickable elements have hover/focus states
- [ ] Drag targets are obvious
- [ ] Touch targets are ≥44x44px
- [ ] Disabled states are visually distinct
- [ ] Loading states disable interaction appropriately

### Interaction patterns:
- [ ] Click = immediate feedback (visual change)
- [ ] Double-click is not required
- [ ] Long-press is documented (mobile)
- [ ] Swipe gestures are discoverable
- [ ] Keyboard navigation works
- [ ] Tab order is logical

---

## 4. Checklist: Data

Verify data handling is complete and consistent.

### Data requirements:
- [ ] Required vs optional fields are explicit
- [ ] Data types are defined (string, number, date, etc.)
- [ ] Validation rules are specified
- [ ] Default values are defined
- [ ] Empty/null handling is clear
- [ ] Data persistence (session, localStorage, database)

### Data integrity:
- [ ] Duplicate detection rules
- [ ] Conflict resolution strategy
- [ ] Data migration path
- [ ] Backup/recovery plan
- [ ] Data retention policy

---

## 5. Checklist: System

Verify system integration and error handling.

### External dependencies:
- [ ] API contracts are defined
- [ ] Error codes are documented
- [ ] Timeout behavior is specified
- [ ] Retry logic is defined
- [ ] Fallback behavior exists
- [ ] Rate limiting is considered
- [ ] Offline behavior is defined

### Monitoring & observability:
- [ ] Key metrics are tracked
- [ ] Error reporting exists
- [ ] Audit logging is in place
- [ ] Performance metrics are defined

---

## 6. Checklist: Feasibility

Verify the proposal is technically achievable.

### Technical feasibility:
- [ ] Architecture supports the requirement
- [ ] Technology stack is adequate
- [ ] Third-party services are available
- [ ] Security requirements are achievable
- [ ] Performance targets are realistic

### Risk assessment:
- [ ] Unknowns are identified as spikes
- [ ] Technical risks are documented
- [ ] Integration complexity is estimated
- [ ] Testing strategy is defined

### Effort estimation:
- [ ] Scope is bounded
- [ ] Dependencies are identified
- [ ] Resources are available
- [ ] Timeline is realistic