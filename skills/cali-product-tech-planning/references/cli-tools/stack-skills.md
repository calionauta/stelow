# Tool: stack-skills

> Discover and load AI coding skills (prompt packages) optimized for the chosen
> tech stack. These provide best-practice patterns, conventions, and anti-pattern
> guidance that accelerate execution.

## Tool: npx skills (Recommended)

```bash
npx skills find <query>                   # Search for skills interactively
npx skills use <package>@<skill>          # Generate a prompt for one skill inline
npx skills add <package>                  # Install a skill package globally
npx skills list                           # List installed skills
```

| Info | Value |
|------|-------|
| Command | `npx skills` (auto-install if missing) |
| Source | Vercel Labs — https://github.com/vercel-labs/agent-skills |

`npx` automatically downloads and runs the latest version. No `npm install -g` needed.

## When to Use

| Phase | Use? | Why |
|-------|------|-----|
| Tech Planning — stack choice | ❌ | Skills are prompt templates, not planning artifacts. |
| Execution — setup | ✅ | After stack is confirmed, `npx skills find {stack}` loads prompts optimized for that tech. |
| Execution — per scope | 🟡 | `npx skills use <package>@<skill>` generates inline prompt. Useful for auth, payments, testing. |

## Detection + Install

```bash
# Detection (auto-installs if missing via npx)
npx skills --version 2>&1

# If needed later (rare):
npm install -g skills
```

## Examples

```bash
# Find skills for Next.js
npx skills find nextjs

# Use a specific skill inline
npx skills use vercel-labs/agent-skills@nextjs

# Add a skill package for recurring use
npx skills add vercel-labs/agent-skills
```

## Fallback (npx skills unavailable)

If `npx skills` does not work:
1. Skip — stack-skills are an optional optimization
2. Proceed with standard workflow tools
3. The cali-product-workflow skills already cover general patterns
