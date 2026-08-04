## Inbox Triage

> **Part of stelow** — See [`SKILL.md`](../SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.
### When This Stage Activates

Triggered when the user's initial request contains multiple items (bullets, numbered list, enumerations) or when explicitly invoked.

### Process

1. **Extract items** — Parse the user's message into individual items.
   Identify each as: feature, bug, debt, improvement, or idea.

2. **Present full list** — Show ALL extracted items for confirmation.
   Ask the user to verify the list FIRST, before any organization decisions.

3. **Smart organization** — Analyze items and suggest logical groups
   based on shared domain/component/theme. Present everything at once
   so the user sees the full picture:

   ```
   📋 I found 4 items:
      1. [feature] Implement passwordless login
      2. [feature] Rate-limit login attempts
      3. [bug]    OAuth scope validation fix
      4. [feature] Add dark mode toggle

   I noticed items 1, 2, and 3 are all about authentication.
   Here's my suggested organization:

     🔒 Auth improvements (items 1, 2, 3)
     🎨 UI (item 4)

   How would you like to proceed?
   ```

   Use `ask_user_question` with these options:

   ```typescript
   ask_user_question({
     questions: [{
       question: `📋 Found {N} items. I organized them into suggested groups.
   See the list above. How would you like to proceed?`,
       header: "Triage",
       options: [
         {
           label: "Looks good",
           description: "Use suggested groups. All items accepted and ready for Selection."
         },
         {
           label: "Adjust groups",
           description: "Rename, merge, split groups, or move items between them."
         },
         {
           label: "Keep separate",
           description: "No grouping. Each item stays individual in Selection."
         },
         {
           label: "Triage one by one",
           description: "Decide each item individually: accept, defer, or reject."
         }
       ]
     }]
   })
   ```

4. **After user choice:**

   **"Looks good"** — Accept the suggested groups as-is:
   - Create a group manifest per group at `.stelow/inbox/groups/{slug}.json`
   - Remove grouped items from `.stelow/inbox/items.md`
   - Advance to Selection

   **"Adjust groups"** — Show the current groups and offer adjustments:
   - "Which group would you like to change?"
   - Allow: rename group, move item to another group, split group into separate items
   - After each adjustment, re-show the updated organization and ask if more changes needed
   - Once confirmed, create manifests and advance to Selection

   **"Keep separate"** — No groups created. All items go to Selection as individuals.
   Advance to Selection.

   **"Triage one by one"** — Sequential per-item decisions (power users):
   ```
   For each item, show it individually and offer:
     ✅ Accept — enters candidate pool
     ⏳ Defer — saved to inbox for later
     ❌ Reject — discarded
   ```
   Update `.stelow/inbox/items.md` after each decision.
   After all items decided, advance to Selection.

5. **Group size bound:** When creating groups, appetite limits apply:
   - Lean: ≤2 items per group
   - Core: ≤4 items per group
   - Complete: ≤6 items per group
   
   If LLM's suggested group exceeds the limit, flag it and suggest a split.
   If user manually creates an oversized group, warn and confirm.

6. **Persist deferred** (only when "Triage one by one" is chosen):
   Deferred items saved to `.stelow/inbox/items.md`.

   **Format:**

   ```yaml
   ---
   items:
     - type: feature
       title: "Implement dark mode"
       metadata: "lower priority"
       date: "2026-06-21"
   ---
   ```

   **Fallback (human-readable):**
   ```markdown
   [feature] Implement dark mode — lower priority, 2026-06-21
   ```

### Group manifest format

When a group is created, save to `.stelow/inbox/groups/{slug}.json`:

```json
{
  "name": "Auth improvements",
  "slug": "auth-improvements",
  "created_at": "2026-06-21T10:30:00Z",
  "source": "triage",
  "group_rationale": "All items touch the authentication layer",
  "items": [
    {
      "content": "Implement passwordless login",
      "type": "feature",
      "priority": "high"
    },
    {
      "content": "Rate-limit login attempts",
      "type": "feature",
      "priority": "medium"
    },
    {
      "content": "OAuth scope validation bug",
      "type": "bug",
      "priority": "high"
    }
  ]
}
```

### Completion

When organization is settled (or all one-by-one decisions made), advance to Selection automatically. If all items were rejected/deferred (one-by-one mode only), end the workflow.
