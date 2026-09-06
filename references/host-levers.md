# Host Levers

This file documents how the stelow skills-only workflow integrates with each
target harness. The workflow is **pure markdown skills** — no host registration,
no code changes, no native plugin required. Each harness activates workflow
mode through the same explicit marker protocol.

**Mandate:** stelow does NOT re-implement host capabilities (TUI, scheduling,
notifications, session hooks). It documents only what it needs from the host
and how the host can provide it.

---

## Marker Protocol (chosen)

The **only** mechanism that activates workflow mode:

```
STELOW_WORKFLOW=1
STELOW_STATE=<absolute path to state.md>
```

Detection rule: the marker is **explicit and deterministic**. The entry/router
skill checks `env.STELOW_WORKFLOW === "1"`. There is **no fallback detection
from file presence** — file presence alone is ambiguous (is the user working in
workflow mode or just checking status?).

Activation triggers (any of these from the user):

| User says | Host does | Entry skill sees |
|---|---|---|
| `workflow` / `use stelow` / `/stelow` | Sets `STELOW_WORKFLOW=1` + `STELOW_STATE=<path>` before loading entry | `STELOW_WORKFLOW=1` |
| *(blank)* / `help` / `status` | No vars set | Standalone mode |

The router skill additionally requires `STELOW_STATE` to be set when
`STELOW_WORKFLOW=1` (absolute path, no guessing).

---

## Per-Harness Activation Recipe

### Claude Code

**Activation:**
```bash
# Option A: explicit activation (recommended)
claude --print "workflow" --system "Activate stelow: set STELOW_WORKFLOW=1 STELOW_STATE=/path/to/state.md"

# Option B: prompt template in .claude/commands/stelow.md
# /path/to/state.md is injected by the user or the entry skill on first run
@stelow-workflow-orchestrator/entry/SKILL.md
Set: STELOW_WORKFLOW=1, STELOW_STATE=<path>
```

**Subagent skill passing:** `--skill stelow-product-<name>` is NOT a Claude Code
flag. Pass the skill markdown explicitly in the task prompt and require
echo-validation:
```
Subagent task: "Run stage skill: <skill-path>.md.
On completion, echo the ## Hand-off block verbatim to confirm."
```

**Failure modes:**
- `STELOW_WORKFLOW` not set → standalone mode (safe degradation)
- `STELOW_STATE` missing → router skill refuses to advance with clear error
- Skill not in allowed directories → ensure `.agents/skills/` is in Claude Code
  search path (Agent Skills convention)

---

### Cursor

**Activation:**
```bash
# Cursor Composer or Agent mode: paste or reference the skill path
# Entry skill path: skills/stelow-workflow-orchestrator/entry/SKILL.md
# Set Cursor agent environment variables before the session:
STELOW_WORKFLOW=1
STELOW_STATE=<path>
```

**Subagent skill passing:** Cursor Composer agents receive skills through explicit
prompt attachment. Attach the stage skill file directly to the subagent prompt.
Echo-validation pattern applies.

**Failure modes:**
- Cursor caches skills at session start — changing `STELOW_WORKFLOW` mid-session
  requires a new Composer session
- `@stelow` reference in Composer chat → loads the skill markdown; the skill
  reads `env.STELOW_WORKFLOW` at runtime

---

### OpenCode (Zen)

**Activation:**
```bash
# OpenCode with stelow orchestrator skill loaded
export STELOW_WORKFLOW=1
export STELOW_STATE=/path/to/project/state.md
opencode
# Then: "activate stelow workflow" — entry skill loads and detects the vars
```

**Subagent skill passing:** OpenCode agents support skill directories. Add
`.agents/skills/` (stelow's 28 skills) to the OpenCode skills search path in
`~/.opencode/config.json`:
```json
{ "skills": { "search_paths": [".agents/skills", "~/.skills"] } }
```

**Failure modes:**
- `opencode` does not pass env vars from the parent shell automatically unless
  prefixed: `STELOW_WORKFLOW=1 opencode`
- Echo-validation: require subagent to echo `## Hand-off` block back to the
  parent LLM

---

### Codex CLI (OpenAI)

**Activation:**
```bash
# Explicit activation with environment variables
STELOW_WORKFLOW=1 STELOW_STATE=/path/to/state.md \
  codex "use stelow" --skills-dir .agents/skills
```

**Subagent skill passing:** Codex CLI subagents receive skills via `--skill`
flag (if supported) or via prompt injection. Echo-validation is the required
fallback.

**Failure modes:**
- Codex CLI does not have a native skill registry in the Claude CLI sense.
  Skills must be passed as inline content in the task prompt.
- No session hooks → the entry skill must be explicitly invoked on each
  session resume.

---

### Gemini CLI (Google)

**Activation:**
```bash
# Gemini CLI: explicit invocation
STELOW_WORKFLOW=1 STELOW_STATE=/path/to/state.md \
  gemini "run stelow workflow" --skills .agents/skills
```

**Subagent skill passing:** Gemini CLI agents receive skills through the
`--skill` flag. If not supported, pass the skill markdown as the first
turn of the subagent task.

**Failure modes:**
- Gemini CLI skill directory convention: `.agents/skills/` or the host's
  default skills path — confirm before assuming
- No `STELOW_WORKFLOW` detection → entry skill shows help and waits for
  explicit activation

---

### Pi (pi.dev)

**Activation:**
```bash
# Pi: set environment before starting the session
export STELOW_WORKFLOW=1
export STELOW_STATE=/path/to/project/state.md
pi

# Inside Pi: "start stelow workflow" — the entry skill sees the vars
```

**Subagent skill passing:** Pi's agent system supports `.pi/skills/` as the
standard skill directory. Symlink the 25 stelow skills there:
```bash
ln -s $(pwd)/.agents/skills ~/.pi/skills/stelow-product
```

**Failure modes:**
- Pi may not propagate env vars from the parent shell — use `pi env set`
  or set in `~/.pi/env` before starting
- Echo-validation: Pi agents return structured output; require the subagent
  to include the `## Hand-off` block in its final message

---

### Goose (ossHAI/goose)

**Activation:**
```bash
# Goose: explicit activation
export STELOW_WORKFLOW=1
export STELOW_STATE=/path/to/state.md
goose

# Inside Goose: "start stelow" — entry skill loads with vars set
```

**Subagent skill passing:** Goose supports `.goose/skills/` as the skills
directory. Symlink:
```bash
ln -s $(pwd)/.agents/skills ~/.goose/skills/stelow-product
```

**Failure modes:**
- Goose skill registry is file-based — ensure `.goose/skills/` contains the
  28 stelow-product-* / stelow-workflow-* skills
- Echo-validation applies for subagent handoffs

---

## Subagent Pattern: Echo-Validation

Every harness passes skills to subagents either natively or via prompt
injection. The **echo-validation** pattern compensates when native passing is
not available:

```
When spawning a subagent for a stage:
1. Include the full stage skill markdown as the first turn of the subagent task.
2. Instruct the subagent: "On completion, echo the ## Hand-off block verbatim
   as your final output."
3. The parent LLM parses the echoed ## Hand-off block to confirm the stage
   completed and extract next-candidate + gate result.
4. If the ## Hand-off block is missing or malformed, the parent aborts and
   re-runs the stage.
```

This pattern is harness-agnostic. It works with Claude Code, Cursor Composer,
Pi, Goose, and any other Agent Skills-compatible harness.

---

## Host Capabilities vs. Stelow's Instructions

| Host capability | Stelow instruction to the host |
|---|---|
| Session-start / precompact hooks | Re-inject `state.md` content at turn start if a hook exists; else the entry skill re-reads it from disk at the first activation. |
| Scheduling / autopilot | Jump straight to the router skill with `STELOW_WORKFLOW=1 STELOW_STATE=<path>` — the router handles resume from `current_stage`. |
| TUI / notifications | Surface within the host natively. Stelow's router and entry skills render no UI. |
| Slash commands | Register only `/stelow` (description-match is the fallback). `stelow status` and `stelow doctor` are bash commands, not slash commands. |
| Subagent spawning | Pass stage skills explicitly in the task + require echo-validation. Subagents do NOT inherit skills automatically. |
| Visual review | Already covered in `references/cli-tools/`: use `visual_review` when present, else write `.stelow/approvals/<dirHash>/<file>.approved.md` as a receipt. |
| Session persistence | `state.md` at `<git-root>/state.md` is the persistence boundary. `git log` is the audit trail. |
| Concurrent session protection | The `stelow advance` helper uses a `mkdir`-based lock with TTL. If two sessions race, the second fails with a clear message. |

---

## Known Failure Modes by Harness

| Harness | Known gap | Mitigation |
|---|---|---|
| Claude Code | No native subagent skill passing | Echo-validation in prompt |
| Cursor | Env vars not propagated mid-session | Start a new Composer session to switch modes |
| OpenCode | Env vars from parent shell need explicit prefix | `STELOW_WORKFLOW=1 opencode` |
| Codex CLI | No skill registry | Inline skill markdown in task prompt |
| Gemini CLI | Skill directory convention unclear | Use `.agents/skills/` (Agent Skills standard) |
| Pi | Env propagation from parent shell | `pi env set` or `~/.pi/env` before session |
| Goose | Skill registry is file-based | Symlink `.agents/skills/` → `~/.goose/skills/` |

---

## Smoke Test

To verify the marker protocol works on a new harness:

```bash
cd /path/to/project
export STELOW_WORKFLOW=1
export STELOW_STATE=$(pwd)/state.md
<harness-cli> "read the entry skill and report what current_stage is in state.md"
# Expected: entry skill reads state.md and reports the stage name without error
# If it fails: check STELOW_STATE is an absolute path and state.md exists
```

---

## Changelog

| Date | Change |
|---|---|
| 2026-08-13 | Initial version. 8 harnesses documented. |
