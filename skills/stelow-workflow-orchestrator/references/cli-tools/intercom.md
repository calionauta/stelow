# Tool: intercom

> Cross-session messaging via the harness's message tool where available.

---

## Command (harness-native)

```typescript
intercom({ action: "send", to: "session-name", message: "..." })
intercom({ action: "ask", to: "session-name", message: "..." })
```

| Info | Value |
|------|-------|
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

## Fallback (no message tool)

If no cross-session message tool is available:
- Use shared file communication
- Schedule checkpoint for cross-session

**Abstraction:** "Cross-session agent messaging"