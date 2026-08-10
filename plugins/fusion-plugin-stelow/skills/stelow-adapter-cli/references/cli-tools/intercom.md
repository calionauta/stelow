# Tool: intercom

> Cross-session messaging for PI using pi-intercom (nicobailon).

---

## Specific Command (PI)

```typescript
intercom({ action: "send", to: "session-name", message: "..." })
intercom({ action: "ask", to: "session-name", message: "..." })
```

| Info | Value |
|------|-------|
| Package | pi-intercom (nicobailon) |
| Actions | `send`, `ask`, `reply`, `pending`, `list`, `status` |

---

## Actions

| Action | Purpose |
|--------|---------|
| `list` | List active sessions |
| `send` | Send message to session |
| `ask` | Ask and wait for reply |
| `reply` | Reply to pending ask |
| `pending` | List unresolved asks |
| `status` | Show connection status |

---

## Fallback (Other Harnesses)

If `intercom` is not available:
- Use shared file communication
- Schedule checkpoint for cross-session

**Abstraction:** "Cross-session agent messaging"