## Phase 0: Inbox Triage

> **Part of cali-product-workflow** — See [`SKILL.md`](../SKILL.md) for phase sequence, safety rules, and capability reference.

### When This Phase Activates

Triggered when the user's initial request contains multiple items (bullets, numbered list, "and", "also", "também", etc.) or when explicitly invoked.

### Process

1. **Extract items** — Parse the user's message into individual items. Identify each as: feature, bug, debt, improvement, or idea.

2. **Present list** — Show the extracted items for confirmation. Ask the user to verify and adjust.

3. **For each item, offer:** 
   - **Accept** — enters the candidate pool for Selection phase
   - **Group** — merge with similar items (same domain/component/theme)
   - **Defer** — saved to `.cali-product-workflow/backlog/items.yaml` for later review via `/pw:backlog`
   - **Reject** — discarded with reason recorded

4. **Persist deferred** — Items marked as "defer" are saved to `.cali-product-workflow/backlog/items.yaml`. Format:

```yaml
deferred:
  - title: "Item description"
    type: feature|bug|debt
    date: 2026-05-21
    reason: "deferred by user"
```

5. **Do NOT** show a backlog — show one decision at a time. Keep the UX focused.

### Completion

When all items have been triaged, call `/pw:next` to advance to Phase 1 (Selection). If all items were rejected/deferred, end the workflow.
