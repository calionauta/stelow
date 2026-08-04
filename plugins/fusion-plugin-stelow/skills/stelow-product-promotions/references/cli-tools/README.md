# CLI Tools Reference

This directory contains tool abstractions for the stelow orchestrator. Each file
documents how to invoke a specific tool for two surfaces:

1. **Pi-native path** — the registered tool name (e.g. `ask_user_question`,
   `subagent`, `visual_review`, `todo`) that the stelow extension provides
   as a first-class wrapper around the underlying CLI binary or subagent
   harness.

2. **Universal fallback** — the equivalent CLI invocation a non-Pi agent
   can use directly via the standard `bash` / `read` / `write` / `edit`
   tools. This works in any agent that follows the
   [agentskills.io](https://agentskills.io/) standard (Pi, Claude Code,
   Codex, Cursor, Continue, OpenCode) since the skills are installed at
   `~/.agents/skills/<name>/` and the agent picks them up automatically.

## Detection Strategy

The orchestrator picks the path at runtime via two mechanisms:

1. **`PRODUCT_WORKFLOW_CLI` env var** — explicit override.
   - `pi` → use Pi-native paths
   - `generic` → use universal fallback for every tool
   - any other value → log warning, fall back to `generic`
2. **Directory probe** — if env var unset, check `~/.pi/`. If present, use Pi-native paths; otherwise `generic`.

Default is `generic`, not `pi`. This is intentional: the Pi-native wrapper
tools (`ask_user_question`, `subagent`, etc.) only exist when the stelow
extension has loaded. Until that happens, every agent looks identical to
the orchestrator and gets the universal-fallback instructions.

> **Important:** Default is `generic`, NOT a specific CLI.
> - If we don't know the agent, we fall back to universal instructions
> - Universal means "use built-in tools with standard names"
> - This is safer than assuming a specific tool registry

## Tool Files Pattern

Each tool file follows this structure:

```markdown
# {Tool Name}

## Quick Summary
> One-line description for LLM to find equivalent when unavailable.

## Pi-native path

The `tool_name` registered by the stelow extension is the recommended
invocation when the agent has the extension loaded.

```typescript
tool_name({ ... })
```

The wrapper handles subprocess management + result parsing, so the LLM
sees a single tool call that maps to one or more CLI invocations.

## Universal fallback

For agents without the extension, fall back to the equivalent CLI
binary or shell construct. Use the same tool namespace (bash, read,
write, edit, glob, grep) the agent already provides.

```bash
cli-binary ...args
```

## Failure modes

- Tool returns `decision: error` → see tool-specific fallback (manual
  receipt file, fail open to bash + retry once, etc.).
- Agent has no shell access → see tool-specific fallback.
```

---

## Available Tool Abstractions

| File | Purpose |
|------|---------|
| `subagents.md` | Parallel task delegation |
| `ask.md` | Structured user questions (`ask_user_question`) |
| `visual_review.md` | Visual review gate |
| `goals.md` | Autonomous goal execution (replaces deprecated autoresearch) |
| `intercom.md` | Cross-session messaging |
| `supervise.md` | Outcome steering |
| `safe-change.md` | Git-safe changes |
| `stage-status.md` | Workflow status commands (`/sw-setphase`, `/sw-next`, `/sw-status`) |
| `context-efficiency.md` | Token-saving strategies (truncation, batching, caching) |
| `codequality-review.md` | Ultra-strict code quality review |
| `todo.md` | Phase task management |
| `agent_browser.md` | Automated web browser for UI verification |
| `file-locking.md` | Convention-based scope locking (no git worktrees) |

> **See also:** `references/permissions.md` (stage permissions) and `references/capabilities.md` (allowed tools per stage)

---

## Using Tool Abstractions

In skills, reference tools like this:

```markdown
> **Tools:** See `references/cli-tools/{tool-name}.md` for invocation patterns.
```

The LLM should:
1. Check whether `ask_user_question`, `subagent`, `visual_review`, `todo` etc. are
   available in its tool registry.
2. If yes, use the Pi-native path.
3. If no, fall back to the universal CLI invocation in the tool's file.
