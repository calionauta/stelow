# About Auto-Triggering (AGENTS.md)

## Why this package does NOT auto-copy AGENTS.md

By default, this package does **not** copy `AGENTS.md` to your global pi config. Here's why:

### The trade-off

| Enable Auto-Trigger | Trade-off |
|---------------------|-----------|
| ✅ Triggers in all projects | ❌ Adds context to ALL projects |
| ✅ No need to remember `/skill` | ❌ May be unwanted in quick scripts |
| ✅ Workflow available everywhere | ❌ Context pollution |

### What is context pollution?

When `~/.pi/agent/AGENTS.md` exists, pi loads it for **every project**. This means:
- Your quick scripts also get product workflow context
- Non-product tasks still have the workflow instructions
- Larger context window usage

### Our recommendation

**Start without auto-trigger:**
- Use `/skill:cali-product-workflow` explicitly
- Clean context for focused tasks
- Add auto-trigger only if you find yourself always enabling it

### How to enable auto-trigger

```bash
# After running ./scripts/setup.sh
cp ~/pi-product-workflow/AGENTS.md ~/.pi/agent/AGENTS.md
```

### How to disable

```bash
rm ~/.pi/agent/AGENTS.md
```

Or use the uninstall script:
```bash
./scripts/uninstall.sh
```

## Why keeping it optional is better

1. **Principle of least surprise** — Users opt-in to behavior changes
2. **Clean separation** — Skills are skill, triggers are triggers
3. **Easy cleanup** — Removing is as simple as adding
4. **Respect for workflow** — Only active when explicitly requested

---

## Alternative: Per-project trigger

If you want the workflow in specific projects only:

```bash
# In project directory
cp ~/pi-product-workflow/AGENTS.md .pi/AGENTS.md
```

This makes it active only in that project, not globally.