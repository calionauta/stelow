# cali-product-workflow Commands

> **Auto-generated** — `cli-agents/{opencode,claude,codex}/commands/` are generated
> from the dispatcher single source of truth (`extensions/cali-product-workflow/adapters/commands/dispatcher.ts`).
> Run `npm run generate-cli-commands` or `npx tsx scripts/generate-cli-commands.ts` after adding a command to the dispatcher.
>
> This file documents the authoritative state. See each CLI's `commands/` directory for the actual `.md` files.
> Install via `./install.sh` — it copies command files to each CLI's config directory.

## Command Matrix (16 commands)

| Command | Pi | OpenCode | Claude Code | Codex | Limitations |
|---------|----|----------|-------------|-------|-------------|
| `/pw-start` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-stop` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-pause` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-resume` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-status` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-ls` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-setphase` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-next` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-complete` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-goto` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-rename` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-menu` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-archive` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-unarchive` | ✅ Native | ✅ Skill | ✅ Skill | ✅ Skill | — |
| `/pw-todo` | ✅ Native | ✅ Skill * | ✅ Skill * | ✅ Skill * | Pi extension required for full TUI |
| `/pw-inbox` | ✅ Native | ✅ Skill * | ✅ Skill * | ✅ Skill * | Pi extension required for full TUI |

- **✅ Native** — Registered via `pi.registerCommand()`. Full TUI overlays, state hooks, interactive pickers.
- **✅ Skill** — Command file delegates to `/skill:cali-product-workflow <command>`. The orchestrator skill routes to the correct handler.
- **\*** — These commands are marked `piOnly`. The `.md` file includes a warning and delegates to the skill for approximate behavior.

## Per-CLI Architecture

### Pi — 16 commands (Native extension)
- Extension: `extensions/cali-product-workflow/` (loaded via `pi` config or `install.sh`)
- Skills: `~/.agents/skills/` (20 flat skills via `install.sh`) or `~/.pi/agent/git/.../skills/` (via `pi install git:...`)
- Command registration: `registerCommands()` iterates `WORKFLOW_COMMANDS` → `HANDLER_BY_NAME` → `pi.registerCommand()`
- Script: `scripts/generate-cli-commands.ts` is NOT needed for Pi (extension handles registration natively)

### OpenCode, Claude Code, Codex — 16 commands each (Skill delegation)
- Markdown files generated from dispatcher into `cli-agents/{cli}/commands/pw-*.md`
- Each file contains frontmatter (`name`, `description`) and body that invokes `/skill:cali-product-workflow <command>`
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
| `/pw-start` not found in OpenCode | Command files not installed | `cp cli-agents/opencode/commands/pw-*.md ~/.config/opencode/commands/` |
| `/pw-todo` says "Pi only" | Expected — marked `piOnly` in dispatcher | Use `pw-todo` in Pi or `/skill:cali-product-workflow` in other CLIs |
| Pi footer shows wrong phase number | `PHASE_NAMES` has 14 entries, `stages.yaml` has 7 | See [stages-mismatch](#stages-mismatch) below |
| Tools blocked after advancing phase | `stages-guard` caches state at session start | Restart Pi session |

## Stages / Phases Mismatch (Known Issue)

The project has two independent phase systems:

| System | File | Entries | Used by |
|--------|------|---------|---------|
| Workflow phases | `types.ts` → `PHASE_NAMES` | 14 (Triage, Select, Setup, Context, Shape, Critique, Gate, Scope, Interface, Int.Gate, Select, Planning, Execution, Audit) | `/pw-next`, `/pw-setphase`, footer display |
| Stages guard | `stages.yaml` | 7 (triage, setup, selection, shape, gate, execution, audit) | `PreToolUse` hook — blocks `edit`/`write`/`bash` in early stages |

**Bugs:**
- `PHASE_NAMES[1]` and `PHASE_NAMES[10]` are both `"Select"` (duplicate name)
- `stages-guard` caches the stage at session start and never re-reads `current-stage.json`
- No code synchronizes `current-stage.json` with the workflow phase
- To unblock tools manually: edit `.cali-product-workflow/state/current-stage.json` to `"execution"` and restart Pi
