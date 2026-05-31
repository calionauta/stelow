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
| `PoC` | **Skip** | — | 1 component, 1 scope. Zero chance of drift — no context to degrade. |
| `Focused` | **Activate** | `low` | Short scope. Low sensitivity avoids false positives on minor detours. |
| `Comprehensive` | **Activate** | `medium` | Multiple scopes increase drift surface area; standard supervision. |

> **Rationale for PoC skip:** The supervisor's value is detecting drift over
> multiple turns. In a 1-2 turn scope, drift cannot occur — the context has
> not had time to degrade. Activating it adds tool call overhead (~1 extra
> API call) with zero marginal benefit. The 19% slowdown research (METR 2025)
> suggests minimizing unnecessary meta-tooling for small tasks.

---

## Activation

**⚠️ IMPORTANT:** Never activate during Phases 3-11.
Supervisor re-submits Plannotator, causing loops.

Activate ONLY when STARTING each scope in Phase 12.

Respect the Appetite-Based Activation table above for sensitivity and skip decisions.