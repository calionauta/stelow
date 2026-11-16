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

## Reading: one call, not six

Every tool call is a turn that re-sends the whole conversation, so the cheapest
work for a person — looking — is the most expensive thing an agent does. Measured
on a finished card: one build run made **601 shell calls** (123 `sed`, 104 `grep`,
33 `cat`, 125 one-line `python3`) and wrote 0.4% of its tokens as output. The card
was not expensive to think about; it was expensive to look at.

- **Read a file with `read`**, `offset`/`limit` for a range — not `sed -n`, not `cat`.
- **Search with the search tools** (`ffgrep` with `context`, `ast_grep_search` for
  structure) instead of `grep | sed | read`: one call returns the location *and* the
  lines around it.
- **Ask the tracking system once per decision** (`<cli> issue get <id> --output json`
  returns status, labels and every attachment in one answer) rather than re-fetching
  before each step to confirm what is already known.
- **Batch independent commands** into a single shell call when the answer fits on a
  screen: `git status --porcelain; git diff --stat; <test> 2>&1 | tail -20` is one
  turn, not three.
- **Do not re-derive what an artifact already cites.** Open a file to check a claim,
  not to re-read the repository around it.

## Detection Strategy

The orchestrator picks the path at runtime via two mechanisms:

1. **Explicit override** — `STELOW_WORKFLOW=1` + `STELOW_STATE=<path>` activates
   workflow mode; capability probing below
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
| `safe-change.md` | Git-safe changes |
| `stage-status.md` | Workflow status commands (`/sw-setphase`, `/sw-next`, `/sw-status`) |
| `codequality-review.md` | Ultra-strict code quality review |
| `todo.md` | Phase task management |
| `agent_browser.md` | Automated web browser for UI verification |
| `file-locking.md` | Convention-based scope locking (no git worktrees) |
| `web-research.md` | Layered web evidence procedure (host search → primary sources → agent-reach → last30days) |
| `acceptance-checklist.md` | Candidate acceptance criteria from checklist.design (shaping + verification) |

> **See also:** `../../../stelow-workflow-orchestrator/references/permissions.md` (stage permissions) and `../../../stelow-workflow-orchestrator/references/capabilities.md` (allowed tools per stage)

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
