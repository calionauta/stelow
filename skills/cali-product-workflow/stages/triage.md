## Inbox Triage

> **Part of cali-product-workflow** — See [`SKILL.md`](../SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.
### When This Stage Activates

Triggered when the user's initial request contains multiple items (bullets, numbered list, enumerations) or when explicitly invoked.

### Process

1. **Extract items** — Parse the user's message into individual items. Identify each as: feature, bug, debt, improvement, or idea.

2. **Present list** — Show the extracted items for confirmation. Ask the user to verify and adjust.

3. **For each item, offer:** 
   - **Accept** — enters the candidate pool for Selection stage
   - **Group** — merge with similar items (same domain/component/theme)
   - **Defer** — saved to `.cali-product-workflow/inbox/items.md` for later review via `/pw-inbox`
   - **Reject** — discarded with reason recorded

4. **Persist deferred** — Items marked as "defer" are saved to `.cali-product-workflow/inbox/items.md`.

   **Format (one item per line, no extra metadata):**

   ```markdown
   Implement dark mode
   Fix login race condition
   Refactor auth module
   ```

   - Type and date are deduced by LLM when reading
   - Simpler = easier to maintain

   **Format (one item per line):**

   ```markdown
   [feature] Implement dark mode — lower priority, 2026-05-21
   [bug] Fix login race condition — needs investigation, 2026-05-20
   ```

   **Format:** `[type] title — metadata, YYYY-MM-DD`
   - **type**: feature, bug, debt, idea
   - Metadata: comma-separated, human-readable notes
   - Data: ISO date (YYYY-MM-DD)

5. **Do NOT** show the inbox — show one decision at a time. Keep the UX focused.

### Completion

When all items have been triaged, advance to Item Selection automatically. If all items were rejected/deferred, end the workflow.
