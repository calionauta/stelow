# stelow Commands

> **Auto-generated** — `cli-agents/{opencode,claude}/commands/` are generated
> from the dispatcher single source of truth (`extensions/stelow/adapters/commands/dispatcher.ts`).
> Run `npm run generate-cli-commands` or `npx tsx scripts/generate-cli-commands.ts` after adding a command to the dispatcher.
>
> This file documents the authoritative state. See each CLI's `commands/` directory for the actual `.md` files.
> Install via `./install.sh` — it copies command files to each CLI's config directory.

## Support Levels

| Level | Harness | What it means |
|-------|---------|---------------|
| **✅ Full** | Pi (pi.dev) | Extension `extensions/stelow/` runs in-process. Auto-sync, stage guards, `ask_user_question`, goals, supervision, subagent contracts, TUI. **Guarantees apply.** |
| **⚠️ Reduced** | OpenCode, Claude Code | Command files delegate to `/skill:stelow-product-orchestrator`. No extension, no auto-sync, no gates. LLM must execute bash steps manually. **No extension-level guarantees.** |
| **❌ Removed** | Codex | Not actively maintained. Use the orchestrator skill directly if needed. |

## Command Matrix (15 commands)

| Command | Pi | OpenCode | Claude Code |
|---------|----|----------|-------------|
| `/sw-start` | ✅ Native | ⚠️ Skill | ⚠️ Skill |
| `/sw-abort` | ✅ Native | ⚠️ Skill | ⚠️ Skill |
| `/sw-pause` | ✅ Native | ⚠️ Skill | ⚠️ Skill |
| `/sw-resume` | ✅ Native | ⚠️ Skill | ⚠️ Skill |
| `/sw-status` | ✅ Native | ⚠️ Skill | ⚠️ Skill |
| `/sw-ls` | ✅ Native | ⚠️ Skill | ⚠️ Skill |
| `/sw-setphase` | ✅ Native | ⚠️ Skill | ⚠️ Skill |
| `/sw-next` | ✅ Native | ⚠️ Skill | ⚠️ Skill |
| `/sw-complete` | ✅ Native | ⚠️ Skill | ⚠️ Skill |
| `/sw-info` | ✅ Native | ⚠️ Skill | ⚠️ Skill |
| `/sw-rename` | ✅ Native | ⚠️ Skill | ⚠️ Skill |
| `/sw-archive` | ✅ Native | ⚠️ Skill | ⚠️ Skill |
| `/sw-unarchive` | ✅ Native | ⚠️ Skill | ⚠️ Skill |
| `/sw-inbox` | ✅ Native | ⚠️ Skill | ⚠️ Skill |

- **✅ Native** — Registered via `pi.registerCommand()`. Full TUI overlays, state hooks, interactive pickers.
- **⚠️ Skill** — Command file delegates to `/skill:stelow-product-orchestrator <command>`. Works but with reduced guarantees (no auto-sync, no tool blocking, no `ask_user_question`).

## What Reduced Support Means

Commands in OpenCode and Claude Code delegate to the orchestrator skill and **work**. However, several features depend on the Pi extension (`extensions/stelow/`) and are **unavailable** in other harnesses:

| Feature | Pi | OpenCode / Claude Code |
|---------|----|----------------------|
| Auto-sync scopes from spec-tech.md | ✅ Automatic via `readTracking()`/`writeTracking()` | ❌ LLM must run bash snippets |
| Stage guard / tool blocking | ✅ Blocks tools by phase | ❌ All tools available at all phases |
| `ask_user_question` tool | ✅ Structured questions | ❌ Falls back to chat prose |
| Goals tool | ✅ Optimization goals | ❌ Not available |
| Supervision mode | ✅ Autonomous overnight execution | ❌ Not available |
| TUI footer / notifications | ✅ Phase progress in footer | ❌ No status display |

## Per-CLI Architecture

### Pi — 15 commands (Native extension)
- Extension: `extensions/stelow/` (loaded via `pi` config or `install.sh`)
- Skills: `~/.agents/skills/` (20 flat skills via `install.sh`) or `~/.pi/agent/git/.../skills/` (via `pi install git:...`)
- Command registration: `registerCommands()` iterates `WORKFLOW_COMMANDS` → `HANDLER_BY_NAME` → `pi.registerCommand()`
- Script: `scripts/generate-cli-commands.ts` is NOT needed for Pi (extension handles registration natively)

### OpenCode, Claude Code — 15 commands each (Skill delegation, reduced support)
- Markdown files generated from dispatcher into `cli-agents/{cli}/commands/sw-*.md`
- Each file contains frontmatter (`name`, `description`) and body that invokes `/skill:stelow-product-orchestrator <command>`
- `install.sh` copies them to: `~/.config/opencode/commands/`, `~/.claude/commands/`
- No extension-level guarantees — see "What Reduced Support Means" above

## Adding a New Command

1. Add the entry to `WORKFLOW_COMMANDS` in `adapters/commands/dispatcher.ts`
2. Add the handler key to `HANDLER_BY_NAME` in `commands.ts`
3. Add the handler function (`cmdNewCommand`) in `commands.ts`
4. Run `npx tsx scripts/generate-cli-commands.ts` to regenerate all CLI `.md` files
5. Update this COMMANDS.md matrix
6. Test: `npm run build` must pass cleanly

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `/sw-start` not found in OpenCode | Command files not installed | `cp cli-agents/opencode/commands/sw-*.md ~/.config/opencode/commands/` |
| `/sw-inbox` not responding | CLI doesn't support `piOnly` commands | Use Pi CLI or `/skill:stelow-product-orchestrator` in other CLIs |
| Pi footer shows wrong phase number | `PHASE_NAMES` has 15 entries, `stages.yaml` has 7 | See [stages-mismatch](#stages-mismatch) below |
| Tools blocked after advancing phase | `stages-guard` caches state at session start | Restart Pi session |

## Stages / Phases Mismatch (Known Issue)

The project has two independent phase systems:

| System | File | Entries | Used by |
|--------|------|---------|---------|
| Workflow phases | `types.ts` → `PHASE_NAMES` | 15 (Triage, ItemSelect, Setup, Context, Shape, Critique, Gate, Scope, Interface, Int.Gate, Selection, Planning, Execution, Verification, Audit) | `/sw-next`, `/sw-setphase`, footer display |
| Stages guard | `stages.yaml` | 7 (triage, setup, selection, shape, gate, execution, audit) | `PreToolUse` hook — blocks `edit`/`write`/`bash` in early stages |

**Known issues:**
- `stages-guard` caches the stage at session start and never re-reads `current-stage.json`
- No code synchronizes `current-stage.json` with the workflow phase
- To unblock tools manually: edit `.stelow/state/current-stage.json` to `"execution"` and restart Pi
