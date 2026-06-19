# Tool: npx skills

> Discover and use AI coding skills (prompt packages) for specific tech stacks.

## Specific Command

```bash
npx skills find <query>                   # Search for skills interactively
npx skills use <package>@<skill>          # Generate a prompt for one skill inline
npx skills add <package>                  # Install a skill package
npx skills list                           # List installed skills
```

| Info | Value |
|------|-------|
| Package | `skills` (npm) |
| Source | Vercel Labs — https://github.com/vercel-labs/agent-skills |

## When to Use

| Phase | Use? | Why |
|-------|------|-----|
| Tech Planning — stack choice | ❌ | Skills are prompt templates for agents, not planning artifacts. |
| Execution — setup | ✅ | After stack is confirmed, `npx skills find {stack}` loads best-practice prompts for the chosen tech. |
| Execution — per scope | 🟡 | `npx skills use <package>@<skill>` generates inline prompt. Useful when a scope needs specialized patterns (auth, payments, etc.). |

## Detection

```bash
npx skills --version
# If fails: skills not available. Skip — not blocking.
```

## Usage Pattern

```bash
# Find skills for a stack
npx skills find nextjs

# Use a specific skill inline
npx skills use vercel-labs/agent-skills@nextjs

# Add a package
npx skills add vercel-labs/agent-skills
```

## Fallback (npx skills unavailable)

If `npx skills` is not available:
1. Skip — skills are optional optimizations
2. Proceed with standard workflow tools
