# CLI Tools Reference

This directory contains tool abstractions for multiple AI coding agent harnesses.

## CLI Detection Strategy

### Environment Variable (Primary)

Set `PRODUCT_WORKFLOW_CLI` to specify the harness:

| Value | Harness |
|-------|---------|
| `pi` | Pi coding agent |
| `opencode` | OpenCode |
| `claude-code` | Claude Code |
| `codex` | Codex CLI |
| `generic` | Generic fallback (default if detection fails) |

**Important:** Default is `generic`, NOT a specific CLI.

- If we don't know the harness, we fall back to generic instructions
- Generic means "use built-in tools with standard names"
- This is safer than assuming a specific harness

### Automatic Detection (Fallback)

When `PRODUCT_WORKFLOW_CLI` is not set:

1. **Check platform-specific files:**
   - `~/.pi/` → `pi`
   - `~/.opencode/` → `opencode`
   - `~/.claude/` → `claude-code`
   - `~/.codex/` → `codex`

2. **Check skill naming patterns:**
   - All our skills start with `cali-*` prefix
   - This pattern indicates our workflow is installed
   - Does NOT indicate specific harness (works in any that supports npm packages)

3. **Default to `generic`:**
   - No detection succeeded
   - Use built-in tool names (read, bash, write, edit)
   - Fall back to generic instructions in each tool file

### Why `generic` is Safer

| Approach | Risk |
|----------|------|
| Default to `pi` | Assumes specific harness, may use wrong tools |
| Default to `generic` | ✅ Safe, uses standard tool names |

---

## Tool Files Pattern

Each tool file follows this structure:

```markdown
# {Tool Name}

## Quick Summary
> One-line description for LLM to find equivalent when unavailable.

## Available Commands by CLI

| CLI | Command | Available |
|-----|---------|-----------|
| pi | `specific command` | ✅ |
| opencode | `specific command` | ✅ |
| claude-code | `specific command` | ✅ |
| codex | `specific command` | ✅ |

## Command Details

### pi
```typescript
// command format
```

### opencode
```typescript
// command format
```

### claude-code
```typescript
// command format
```

### codex
```typescript
// command format
```

## Fallback (Generic)

When CLI not detected or tool unavailable:

> {quick_summary}
```

---

## Available Tool Abstractions

| File | Purpose |
|------|---------|
| `subagents.md` | Parallel task delegation |
| `structured-question.md` | Structured user questions (`ask_user_question`) |
| `plannotator.md` | Visual review gate |
| `goals.md` | Autonomous goal execution (replaces deprecated autoresearch) |
| `intercom.md` | Cross-session messaging |
| `supervise.md` | Outcome steering |
| `safe-change.md` | Git-safe changes |
| `stage-status.md` | Workflow status commands (`/sw-setphase`, `/sw-next`, `/sw-status`) |
| `context-efficiency.md` | Token-saving strategies (truncation, batching, caching) |
| `codequality-review.md` | Ultra-strict code quality review |
| `todo.md` | Phase task management with CLI-specific commands |
| `agent_browser.md` | Automated web browser for UI verification |

> **See also:** `references/permissions.md` (stage permissions) and `references/capabilities.md` (allowed tools per stage)

---

## Using Tool Abstractions

In skills, reference tools like this:

```markdown
> **Tools:** See `references/cli-tools/{tool-name}.md` for command patterns.
```

The LLM should:
1. Check `PRODUCT_WORKFLOW_CLI` environment variable
2. Load the appropriate tool file
3. Use the CLI-specific command
4. Fall back to generic if CLI not detected
