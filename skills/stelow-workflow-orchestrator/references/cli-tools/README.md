# CLI Tools Reference

This directory contains tool abstractions for the stelow orchestrator. Each file
documents how to invoke a specific capability on two surfaces:

1. **Harness-native path** — the registered tool name (e.g. a delegate/subagent
    tool, a question tool, a todo tool) that the agent's harness provides
    as a first-class wrapper.

2. **Universal fallback** — the equivalent invocation any agent can use
    directly via the standard `bash` / `read` / `write` / `edit`
    tools. This works on any agent that follows the
    [agentskills.io](https://agentskills.io/) standard, since the skills are
    installed at `~/.agents/skills/<name>/` and the agent picks them up
    automatically.

## Detection Strategy

The orchestrator picks the path at runtime via two mechanisms:

1. **Explicit override** — `STELOW_WORKFLOW=1` + `STELOW_STATE=<path>` activates
   workflow mode (see `references/host-levers.md`); capability probing below
   decides the invocation shape.
2. **Capability probe** — check the tool registry top-down: acceptance-native
   delegate tool? native subagent/task tool? headless CLI binary on PATH?
   Otherwise `generic`.

Default is `generic`. This is intentional: harness-native wrapper tools only
exist when the harness provides them. Until probed, every agent looks
identical to the orchestrator and gets the universal-fallback instructions.

> **Important:** Default is `generic`, NOT a specific harness.
> - If we don't know the agent, we fall back to universal instructions
> - Universal means "use built-in tools with standard names"
> - This is safer than assuming a specific tool registry

## Tool Files Pattern

Each tool file follows this structure:

```markdown
# {Tool Name}

## Quick Summary
> One-line description for LLM to find equivalent when unavailable.

## Harness-native path

The registered tool is the recommended invocation when the harness provides it.

```typescript
tool_name({ ... })
```

The wrapper handles subprocess management + result parsing, so the LLM
sees a single tool call that maps to one or more CLI invocations.

## Universal fallback

For harnesses without the tool, fall back to the equivalent CLI
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
| `goals.md` | Acceptance contracts + optimization goals |
| `intercom.md` | Cross-session messaging |
| `supervise.md` | Outcome steering |
| `safe-change.md` | Git-safe changes |
| `stage-status.md` | Workflow status commands (`/sw-setphase`, `/sw-next`, `/sw-status`) |
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
1. Check whether a delegate/subagent tool, question tool, todo tool etc. are
    available in its tool registry.
2. If yes, use the harness-native path.
3. If no, fall back to the universal CLI invocation in the tool's file.
