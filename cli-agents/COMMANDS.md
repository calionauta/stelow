# stelow Commands

> **Auto-generated** — `cli-agents/{opencode,claude,codex}/commands/` are generated
> from the dispatcher single source of truth (`extensions/stelow/adapters/commands/dispatcher.ts`).
> Run `npm run generate-cli-commands` or `npx tsx scripts/generate-cli-commands.ts` after adding a command to the dispatcher.
>
> This file documents the authoritative state. See each CLI's `commands/` directory for the actual `.md` files.
> Install via `./install.sh` — it copies command files to each CLI's config directory.

## Command Matrix (16 commands)

| Command | Pi | OpenCode | Claude Code | Codex | Limitations |
|---------|----|----------|-------------|-------|-------------|
| `/sw-start` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-abort` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-pause` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-resume` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-status` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-ls` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-setphase` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-next` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-complete` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-goto` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-rename` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-menu` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-archive` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-unarchive` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/sw-inbox` | ✅ Native | ✅ Skill * | ✅ Skill * | ✅ Skill * | Pi extension required for full TUI |

- **✅ Native** — Registered via `pi.registerCommand()`. Full TUI overlays, state hooks, interactive pickers.
- **✅ Skill** — Command file delegates to `/skill:stelow-product-orchestrator <command>`. The orchestrator skill routes to the correct handler.
- **\*** — These commands are marked `piOnly`. The `.md` file includes a warning and delegates to the skill for approximate behavior.

## Per-CLI Architecture

### Pi — 15 commands (Native extension)
- Extension: `extensions/stelow/` (loaded via `pi` config or `install.sh`)
- Skills: `~/.agents/skills/` (20 flat skills via `install.sh`) or `~/.pi/agent/git/.../skills/` (via `pi install git:...`)
- Command registration: `registerCommands()` iterates `WORKFLOW_COMMANDS` → `HANDLER_BY_NAME` → `pi.registerCommand()`
- Script: `scripts/generate-cli-commands.ts` is NOT needed for Pi (extension handles registration natively)

### OpenCode, Claude Code, Codex — 15 commands each (Skill delegation)
- Markdown files generated from dispatcher into `cli-agents/{cli}/commands/sw-*.md`
- Each file contains frontmatter (`name`, `description`) and body that invokes `/skill:stelow-product-orchestrator <command>`
- `install.sh` copies them to: `~/.config/opencode/commands/`, `~/.claude/commands/`, `~/.codex/commands/`
- `piOnly` commands include a warning banner — they still work via the orchestrator skill

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
| Pi footer shows wrong phase number | `PHASE_NAMES` has 14 entries, `stages.yaml` has 7 | See [stages-mismatch](#stages-mismatch) below |
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
