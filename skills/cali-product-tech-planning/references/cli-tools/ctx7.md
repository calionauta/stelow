# Tool: ctx7

> Up-to-date documentation for any library. Fetches version-specific API docs.

## Specific Command

```bash
npx ctx7 library <name>          # Resolve library name to ctx7 ID
npx ctx7 docs <id> "<query>"     # Query docs for that library
```

| Info | Value |
|------|-------|
| Package | `ctx7` (npm) |
| Source | https://context7.com |

## When to Use

| Phase | Use? | Why |
|-------|------|-----|
| Tech Planning — stack choice | ❌ | ctx7 gives API docs, not comparison data. Use `web_search` for choices. |
| Tech Planning — scope gen | 🟡 | Useful when scopes reference specific libs and need accurate API patterns. |
| Execution — writing code | ✅ | Primary use case. Before using a lib API, query ctx7 for current docs. |

## Detection

```bash
npx ctx7 --version
# If fails: ctx7 not available. Fallback to LLM knowledge (may be stale).
```

## Query Pattern

```bash
# Step 1: Resolve library
npx ctx7 library next

# Step 2: Query docs
npx ctx7 docs /vercel/next.js "app router server components"
```

## Fallback (ctx7 unavailable)

If `npx ctx7` is not available:
1. Use `web_search` to find current docs
2. Use `fetch_content` to read the doc page
3. Fallback to LLM knowledge (note: "based on {training_cutoff} knowledge")
