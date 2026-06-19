# Tool: stack-skills

> Discover and load AI coding skills (prompt packages) optimized for the chosen
> tech stack. These provide best-practice patterns, conventions, and anti-pattern
> guidance that accelerate execution.

## Tool: npx skills (Recommended)

```bash
npx skills find <query>                   # Search for skills interactively
npx skills use <package>@<skill>          # Generate inline prompt (no install)
npx skills add <package>                  # Install skill package (project scope)
npx skills list                           # List installed skills
```

| Info | Value |
|------|-------|
| Command | `npx skills` (auto-install if missing) |
| Source | Vercel Labs — https://github.com/vercel-labs/agent-skills |

`npx` auto-installs. No `npm install -g` needed.

## When to Use

| Phase | Use? | Why |
|-------|------|-----|
| Tech Planning — stack choice | ❌ | Skills are prompt templates for agents, not planning artifacts. |
| Execution — setup | ✅ | After stack is confirmed, discover skills matched to the tech. |
| Execution — per scope | 🟡 | `npx skills use` generates inline prompt per scope. Useful for auth, payments, testing. |

## Detection-First (Never Override Installed)

**Before discovering or installing, check what's already installed:**

```bash
npx skills list 2>/dev/null | grep -i "{chosen_stack}" | head -5
```

**If skills for this stack already exist:**
- Do NOT install new ones. Use existing ones.
- If a specific skill seems relevant, `npx skills use` generates the prompt without installing:
  ```bash
  npx skills use <package>@<skill>
  ```

**If no skills found for this stack:**
- `npx skills find {chosen_stack}` to discover available packages
- Present top results to user via `ask_user_question`:
  ```
  question: "Skills found for {stack}: {list}. Install?"
  options: [Yes (Recommended): Add {N} skills, project scope | No: Skip]
  ```
- Default: **ask first, never auto-install.**
- Install in project scope only:
  ```bash
  npx skills add <package>         # project scope (default, no -g needed)
  ```

## Examples

```bash
# Discover what's already installed
npx skills list

# Search for stack-matched skills (no install)
npx skills find nextjs

# Use a skill inline without installing
npx skills use vercel-labs/agent-skills@nextjs

# Install (project scope, only after user confirms)
npx skills add vercel-labs/agent-skills
```

## Fallback (npx skills unavailable)

If `npx skills` does not work:
1. Skip — stack-skills are an optional optimization
2. Proceed with standard workflow tools
3. The cali-product-workflow skills already cover general patterns
