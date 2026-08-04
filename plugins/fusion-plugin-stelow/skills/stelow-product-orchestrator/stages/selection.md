## Item Selection

> **Part of stelow** — See [`SKILL.md`](../SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.
> **Stage Status:** Read `references/cli-tools/stage-status.md` for ASCII status display and CLI commands.
### When This Stage Activates

After Triage completes with one or more accepted items. If the user had a single idea (no Triage), this stage is skipped — proceed directly to Setup.

### Process

1. **Collect candidates** — Read all candidates from the triage outcome:

   ```bash
   # Individual items: items that were accepted or kept separate
   INBOX_ITEMS=$(grep -v '^#' .stelow/inbox/items.md | grep -v '^$' || echo "")
   
   # Groups: read from groups directory
   GROUPS=$(ls .stelow/inbox/groups/*.json 2>/dev/null || echo "")
   ```

2. **Show full candidate pool** — Present ALL candidates (individuals + groups)
   so the user sees the complete picture before deciding:

   ```
   📋 Candidates ready for shaping:

     Groups:
     🔒 [Group] Auth improvements (3 items)
          ├─ Passwordless login
          ├─ Rate-limit attempts
          └─ OAuth scope validation

     Individuals:
     🎨 [Feature] Dark mode toggle
   ```

3. **User picks one** — Let the user choose one candidate:
   - **Individual**: proceeds to Shape Up for that single item
   - **Group**: proceeds to Shape Up with the group manifest

   Remove the selected item(s) from `.stelow/inbox/items.md`:
   - Group: remove all group items from inbox, delete `.stelow/inbox/groups/{slug}.json`
   - Individual: remove that item from inbox

4. **Route remainder** — After picking one, offer:

   ```
   What about the remaining candidates?
     ⏳ Defer for later — saved to inbox (default)
     ❌ Reject — remove permanently
     📋 Keep for this session — stay in candidate pool
   ```

   This is where items get deferred or rejected — NOT in triage.
   Triage organizes; selection decides what to work on vs what to leave.

5. **Group context for Setup** — If a group was selected, write a group context file:

   ```bash
   mkdir -p .stelow/{date}/{dir}/group-context
   cp .stelow/inbox/groups/{slug}.json .stelow/{date}/{dir}/group-context/manifest.json
   ```

   The Setup stage reads this and passes `group_items: [...]` to Shape Up.

6. **Update inbox** — After routing remainders:
   - Deferred items stay in `.stelow/inbox/items.md`
   - Rejected items removed from `.stelow/inbox/items.md`
   - Items kept for session stay in the candidate pool (visible via `/sw-status`)

### Do NOT
- Start implementing any item
- Model more than one candidate (one individual or one group)
- Combine items across groups or with individuals unless the user explicitly re-groups

### Completion

When the user has selected one candidate and routed remainders, advance to Setup automatically.
