# Tool: doc-search

> Fetch up-to-date, version-specific documentation for any library.
> Use before writing code against specific APIs — LLM training data may be
> stale for recent library versions.

## Tool: ctx7 (Recommended)

```bash
npx @vedanth/context7 library <name>          # Resolve library → ctx7 ID
npx @vedanth/context7 docs <id> "<query>"     # Query docs for that library
```

| Info | Value |
|-------|------|
| Command | `npx @vedanth/context7` (auto-install if missing) |
| Source | https://context7.com |

`npx` auto-installs. No `npm install -g` needed.

## When to Use

| Phase | Use? | Why |
|-------|------|-----|
| Tech Planning — stack choice | ❌ | doc-search gives API docs, not comparison data. Use `web_search` for choices. |
| Tech Planning — scope gen | 🟡 | Useful when scopes reference specific libs and need accurate API patterns. |
| Execution — writing code | ✅ | Primary use case. Before using a lib API, query for current docs. |

## Detection

```bash
# Detection (auto-installs if missing via npx)
npx @vedanth/context7 --version 2>&1
```

## Query Pattern

```bash
# Step 1: Resolve library name to ctx7 ID
npx @vedanth/context7 library next

# Step 2: Query docs for specific API or pattern
npx @vedanth/context7 docs /vercel/next.js "app router server components v15"

# Query during execution, before writing code
npx @vedanth/context7 docs /tanstack/query "useMutation optimistic update"
```

## Fallback (ctx7 unavailable)

If `npx @vedanth/context7` does not work (network, environment restrictions):

1. Use `web_search` with query: `"{library} {version} API documentation {current_year}"`
2. Use `fetch_content` to read the official doc page
3. Fallback to LLM knowledge — explicitly note:
   `"based on {training_cutoff} knowledge, may be outdated for {library}"`
