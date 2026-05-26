## Stage 1: Item Selection

> **Part of cali-product-workflow** — See [`SKILL.md`](../SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.
> **Stage Status:** Read `references/cli-tools/stage-status.md` for ASCII status display and CLI commands.
### When This Stage Activates

After Triage (Stage 0) completes with one or more accepted items. If the user had a single idea (no Triage), this stage is skipped — proceed directly to Stage 2 (Setup).

### Process

1. **Rank items** — For each accepted item, evaluate:
   - Priority (user-stated urgency)
   - Dependencies (blocks or is blocked by other items)
   - Effort (estimated complexity from description)
   - Readiness (has enough context to model?)

2. **Present Top 3** — Show the highest-ranked items with a brief explanation of why each was selected:

```
  1. [Feature] User dashboard redesign — high priority, no dependencies
  2. [Bug] Login timeout — blocks release, known root cause
  3. [Debt] API response caching — medium effort, high impact
```

3. **User picks one** — Let the user choose which item to model in Shape Up. Do NOT proceed with multiple items.

4. **Route remainder** — Unselected items return to `.cali-product-workflow/inbox/items.md` as deferred.

### Do NOT
- Start implementing any item
- Model more than one item
- Combine items unless explicitly grouped in Triage

### Completion

When the user has selected one item, call `/pw-next` to advance to Phase 2 (Setup/Project Setup).
