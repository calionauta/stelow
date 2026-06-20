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
| Phase 12 (Execution) | Steering during execution |

---

## Appetite-Based Activation

The supervisor is not always necessary. Appetite (declared by human in setup)
determines whether and how aggressively to supervise:

| Appetite | Supervisor | Sensitivity | Rationale |
|----------|-----------|-------------|----------|
| `Lean` | **Activate** | `low` | Even small scopes can drift over multiple turns. Low sensitivity catches clear deviations without false-positive noise. |
| `Core` | **Activate** | `medium` | Standard feature scope. Medium sensitivity balances steering vs autonomy. |
| `Complete` | **Activate** | `high` | High-risk, multi-scope work. High sensitivity ensures drift is caught early. |

---

## Activation

**⚠️ IMPORTANT:** Never activate during Phases 3-11.
Supervisor re-submits Plannotator, causing loops.

Activate ONLY when STARTING each scope in Phase 12.

Respect the Appetite-Based Activation table above for sensitivity and skip decisions.