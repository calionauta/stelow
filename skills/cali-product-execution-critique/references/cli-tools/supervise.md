# Tool: /supervise

> Execution steering for PI using pi-supervisor (tintinweb).

---

## Specific Command (PI)

```bash
/supervise [outcome]
```

| Info | Value |
|------|-------|
| Package | pi-supervisor (tintinweb) |
| Command | `/supervise` |

---

## When to Use

| Phase | Purpose |
|-------|---------|
| Phase 11 (Execution) | Steering during execution |

---

## Activation

**⚠️ IMPORTANT:** Never activate during Phases 3-11.
Supervisor re-submits Plannotator, causing loops.

Activate ONLY when STARTING each scope in Phase 12.

---

## Fallback (Other Harnesses)

If `/supervise` is not available:
- Monitor execution manually
- Use checkpoints for progress tracking

**Abstraction:** "Execution steering with outcome direction"