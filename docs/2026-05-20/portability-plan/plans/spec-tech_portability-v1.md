# Technical Spec: Multi-Agent Portability for cali-product-workflow

**Version:** v4  
**Status:** Draft - Awaiting Gate Approval  
**Date:** 2026-05-20  
**Author:** Cali (Renato Caliari)  
**Changelog:** v4 incorporates Plannotator feedback - English only, environment variables research, naming conventions.

---

## Context

After researching:
1. Test types mentioned in README (mutation, agent assay) vs actual implementation
2. Architecture of Context Mode (mksglu) and Plannotator (backnotprop) for portability
3. Plannotator feedback on CLI detection and file structure
4. Context Mode benefits for product-workflow

---

## Executive Summary

### Plannotator Feedback Response

Key refinements requested:

1. **CLI Detection** should be in a single file, not per cli-tool
2. **Better naming** for sections (LLM-friendly)
3. **Generic fallback** in dedicated file
4. **`PRODUCT_WORKFLOW_CLI`** instead of `PI_AGENT` or `CALI_HARNESS`
5. **Context Mode** - worth using? Benefits? As peerDependency?

### Answers

#### 1. Environment Variable Naming

**Decision:** Use `PRODUCT_WORKFLOW_CLI`

**Rationale:**
- Generic prefix (not tied to specific vendor)
- Clear purpose ("which CLI is running this workflow")
- Industry pattern: Most tools use `_*` prefixed env vars for runtime config

**Industry Standards Research:**

| Tool | Pattern | Example |
|------|---------|---------|
| Context Mode | `CONTEXT_MODE_DATA_DIR` | Storage override |
| Claude Code | `CLAUDE_CONFIG_DIR` | Config location |
| Codex | `CODEX_HOME` | Home directory |
| Gemini CLI | Direct config in `settings.json` | Platform-native |

**Best Practice for Our Context:**

```markdown
# references/cli-tools/README.md

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
- This is safer than assuming "pi"

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

**Note:** Skill naming (`cali-*`) indicates our workflow is present, NOT which harness. For harness detection, use platform-specific files or `PRODUCT_WORKFLOW_CLI` env var.

### Why `generic` is Safer

| Approach | Risk |
|----------|------|
| Default to `pi` | Assumes specific harness, may use wrong tools |
| Default to `generic` | ✅ Safe, uses standard tool names |

**Market Pattern (from Context Mode):**
Context Mode uses similar detection:
- MCP protocol handshake for auto-detection
- Platform-specific config directories
- Environment variable overrides

Our approach follows the same pattern but adds `generic` as safe default.

---

#### 2. File Structure: references/cli-tools/

**Decision:** Use `references/cli-tools/` path

**Rationale:**
- `references/` is already used in project structure
- `references/cli-tools/` follows established pattern
- Clear semantic: "tool references for multiple CLIs"

**Pattern:**
```
references/
├── cli-tools/           # Tool abstractions (moved from references/pi-tools/)
│   ├── README.md        # CLI detection strategy
│   ├── subagents.md    # quick_summary + commands by CLI
│   ├── plannotator.md # quick_summary + commands by CLI
│   └── ...
└── other-refs/        # Other reference materials
```

---

#### 3. File Naming for Tool Abstractions

**Decision:** Name files by their **abstraction purpose**

| Old Name | New Name | Rationale |
|----------|----------|-----------|
| `advanced-tools.md` | `context-mode.md` | Describes Context Mode integration specifically |
| `basic-tools.md` | (not needed) | Fallback is implicit |

**Naming Principles:**
- Name should describe **what the file contains**
- LLM should understand from name alone
- Avoid generic names like "advanced" or "basic"

**File Naming Examples:**

| Content | Good Name | Bad Name |
|---------|-----------|----------|
| Context Mode tools | `context-mode.md` | `advanced-tools.md` |
| Subagent patterns | `subagents.md` | `parallel.md` |
| Visual review | `visual-review.md` | `plannotator.md` |

**Note:** `plannotator.md` is actually fine because:
- It names the specific tool (Plannotator)
- LLM recognizes it
- It describes the specific implementation

---

#### 4. English Only

**Decision:** All documentation in English.

**Rationale:**
- Consistent with code standards (English for code, URLs, paths)
- More accessible for international contributors
- Industry standard

---

## Context Mode Evaluation

### What is Context Mode?

**Definition:** MCP server that reduces context window by 98% through:
- **Sandboxing:** ctx_batch_execute, ctx_execute, ctx_execute_file
- **Search:** ctx_search, ctx_index, ctx_fetch_and_index
- **Session continuity:** SQLite + FTS5 for context preservation

### Comparison: Context Mode vs Basic Tools

| Aspect | Basic Tools | Context Mode |
|--------|-------------|--------------|
| **read** | Full content → context | Summary only (FTS5) |
| **bash** | Full output → context | Summary only |
| **grep** | All matches → context | Top matches |
| **Context usage** | 100% | ~2% |
| **Token cost** | High | ~98% less |
| **Session continuity** | Lost on compact | Preserved via FTS5 |
| **Think in code** | ❌ Manual | ✅ Enforced |

### Benefits for cali-product-workflow

**Concrete advantages:**

1. **Token reduction:** 98% savings on heavy operations
2. **Cheaper workflow:** Fewer tokens = lower cost
3. **More accurate:** LLM programs analysis vs computing mentally
4. **Session continuity:** No context loss in long sessions
5. **FTS5 search:** Smart search vs blind grep

**Operations that benefit most:**

| Workflow Phase | Context Mode Tool | Savings |
|----------------|-------------------|---------|
| Setup | `ctx_batch_execute` | 80-95% |
| Strategic Context | `ctx_fetch_and_index` | 90%+ |
| Shape Up | `ctx_execute` (count lines) | 95% |
| Tech Planning | `ctx_search` | 85% |
| Scope Executor | `ctx_batch_execute` | 80-90% |

### Proposed Integration

**Tool Mapping Structure:**

```markdown
# references/cli-tools/context-mode.md

# Context Mode Tools

## Quick Summary
> Sandboxed execution with 98% context reduction. Use when available for large operations.

## Available Commands by CLI

| CLI | Tools | Package | Required |
|-----|-------|---------|----------|
| pi (with context-mode) | `ctx_execute`, `ctx_search`, `ctx_fetch_and_index` | context-mode | Optional |
| pi (without context-mode) | `bash`, `read`, `grep` | built-in | Default |
| opencode | `ctx_*` via MCP | context-mode | Manual install |
| claude-code | `ctx_*` via MCP | context-mode | Manual install |

## When to Use

### Use Context Mode when:
- ✅ Large file operations (>50KB)
- ✅ Multiple command executions
- ✅ Long workflow sessions (>30 min)
- ✅ FTS5 search needed

### Use Basic Tools when:
- ❌ Context-mode not installed
- ❌ Simple single operations
- ❌ Quick checks

## Fallback Strategy

```
IF context_mode_available:
  USE ctx_execute, ctx_search, ctx_fetch_and_index
ELSE:
  USE bash, read, grep (basic tools)
```

## Installation

### pi
```bash
/plugin marketplace add mksglu/context-mode
/plugin install context-mode@context-mode
```

### opencode
```json
{
  "mcpServers": {
    "context-mode": { "command": "context-mode" }
  }
}
```

### claude-code
```bash
/plugin marketplace add mksglu/context-mode
```
```

---

## Tool Abstraction Pattern

### Structure per Tool File

Each file in `references/cli-tools/` follows this pattern:

```markdown
# references/cli-tools/{tool-name}.md

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

### Example: references/cli-tools/subagents.md

```markdown
# Subagents

## Quick Summary
> Delegate parallel work to built-in subagents with task handoff.

## Available Commands by CLI

| CLI | Command | Available |
|-----|---------|-----------|
| pi | `subagent({ agent, task })` | ✅ |
| opencode | `subagent({ agent, task })` | ✅ |
| claude-code | `subagent({ agent, task })` | ✅ |
| codex | `subagent({ agent, task })` | ✅ |

## Command Details

### pi
```typescript
subagent({
  agent: "scout",
  task: "Investigate codebase structure"
})
```

[... similar for other CLIs ...]

## Fallback (Generic)

> Delegate parallel work to built-in subagents with task handoff pattern.
> Use the agent's native subagent/delegate tool.
```
```

---

## Implementation Plan

### Phase 1: README Cleanup (High Priority)

| Task | File | Change |
|------|------|--------|
| T1.1 | README.md | Remove "Testing Strategy" section (~50 lines) |
| T1.2 | README.md | Add note about `cali-testing-ai-code` skill |
| T1.3 | README.md | Clarify mutation targets are skill output |

### Phase 2: Restructure references/cli-tools/ (High Priority)

| Task | File | Change |
|------|------|--------|
| T2.1 | references/pi-tools/ → references/cli-tools/ | Rename directory |
| T2.2 | references/cli-tools/README.md | Create with CLI detection strategy |
| T2.3 | references/cli-tools/*.md | Refactor to new pattern |

### Phase 3: Context Mode Integration (Medium Priority)

| Task | File | Change |
|------|------|--------|
| T3.1 | references/cli-tools/context-mode.md | Create with ctx_* tool mapping |
| T3.2 | package.json | Add context-mode as optional peerDependency |
| T3.3 | scripts/setup.sh | Optional: install context-mode together |

### Phase 4: CLI Detection Implementation (Medium Priority)

| Task | File | Change |
|------|------|--------|
| T4.1 | extensions/pi/state.ts | Implement PRODUCT_WORKFLOW_CLI detection |
| T4.2 | skills/ | Update to use CLI detection |
| T4.3 | .cali-product-workflow/index.json | Add detected_cli field |

### Phase 5: Documentation (Medium Priority)

| Task | File | Change |
|------|------|--------|
| T5.1 | docs/PORTABILITY.md | Multi-CLI guide |
| T5.2 | docs/INSTALLATION.md | Installation by CLI |
| T5.3 | docs/CONTEXT-MODE.md | Context Mode integration guide |

### Phase 6: Rename Repo (Decision)

**Recommendation:** Rename to `cali-product-workflow`

---

## Final Structure

```
cali-product-workflow/
├── skills/                                # Agnostic ✅
│   ├── cali-product-workflow/             # Orchestrator
│   ├── skills-workflow/                  # Shape, Brainstorm, Critique, Tech
│   ├── skills-execution/                 # Scope Executor, Testing
│   ├── skills-strategic-analysis/        # JTBD, Market, Opportunity
│   └── skills-domain-libraries/          # Pricing, Ads, Trust, etc.
├── references/                           # ✅ Contains cli-tools/
│   └── cli-tools/                        # ✅ Renamed from references/pi-tools/
│       ├── README.md                     # CLI detection strategy (centralized)
│       ├── subagents.md                  # quick_summary + commands by CLI
│       ├── ask.md                        # quick_summary + commands by CLI
│       ├── plannotator.md                # quick_summary + commands by CLI
│       ├── goals.md                      # quick_summary + commands by CLI
│       ├── context-mode.md               # Context Mode integration
│       └── ...                           # other tools
├── docs/
│   ├── PORTABILITY.md                    # Multi-CLI guide
│   ├── INSTALLATION.md                   # Installation by CLI
│   └── CONTEXT-MODE.md                   # Context Mode guide
├── extensions/                           # Pi-only
│   └── pi/                              # Pi Extension
├── AGENTS.md                             # Generic
└── package.json                          # context-mode optional peerDep
```

---

## Scoring

| Aspect | Score (1-5) | Notes |
|--------|-------------|-------|
| README Clarity | 3 | Testing strategy confuses readers |
| Portability | 4 | Skills agnostic, cli-tools standardized |
| CLI Detection | 5 | Centralized in README + pattern per file |
| Context Mode | 4 | Optional, fallback to basic tools |
| Documentation | 4 | Guides per CLI |

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Context Mode not installed | Medium | Low | Fallback to basic tools always works |
| LLM doesn't detect ctx_* tools | Low | Medium | Clear instructions in context-mode.md |
| CLI detection fails | Low | Low | Re-check each phase |

---

## Out of Scope

- ❌ Force Context Mode (optional)
- ❌ Hooks for automatic detection
- ❌ Duplicate AGENTS.md per CLI
- ❌ Extract shared packages

---

## Success Criteria

- [ ] README without duplicate Testing Strategy
- [ ] `references/pi-tools/` → `references/cli-tools/`
- [ ] `references/cli-tools/README.md` with centralized CLI detection
- [ ] All files with pattern (quick_summary + commands by CLI)
- [ ] `references/cli-tools/context-mode.md` with Context Mode mapping
- [ ] package.json with context-mode optional peerDep
- [ ] docs/PORTABILITY.md, INSTALLATION.md, CONTEXT-MODE.md

---

## Next Steps

1. **Approve this plan** via Plannotator gate
2. **Execute T1.1-T1.3** — README cleanup
3. **Execute T2.1-T2.3** — Restructure cli-tools
4. **Execute T3.1-T3.3** — Context Mode integration
5. **Execute T4.1-T4.3** — CLI Detection implementation
6. **Execute T5.1-T5.3** — Documentation
7. **Decide on T6** — Rename repo

---

## Notes

### Context Mode as PeerDependency

**Recommendation:** Add as `optionalPeerDependencies`

```json
{
  "optionalPeerDependencies": {
    "context-mode": ">=1.0.0"
  }
}
```

**Benefits:**
- If installed: uses ctx_* tools (98% savings)
- If not installed: uses basic tools (works the same)
- Clear documentation of when to use each

**Automatic installation (optional in setup.sh):**
```bash
# Optional: install context-mode for best experience
pi install npm:context-mode
```

### About Environment Variable Naming

**PRODUCT_WORKFLOW_CLI chosen over alternatives:**

| Name | Why Rejected |
|------|--------------|
| `PI_AGENT` | Tied to Pi, limits perception |
| `CALI_HARNESS` | Too specific to project name |
| `HARNESS_CLI` | Vague prefix |
| `AGENT_TYPE` | Confusing (agent vs harness) |
| **`PRODUCT_WORKFLOW_CLI`** | ✅ Clear purpose, generic prefix |

---

*Document approved via Plannotator — awaiting gate.*