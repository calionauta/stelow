# CLI Agent Support — Architecture & Extension Guide

> **stelow is Pi-first.** This directory explains why, and how to extend.
>
> See `architecture.md` (top-level) for the broader module breakdown and
> `docs/archive/2026-07-09-deprecated-multi-cli-integration/README.md`
> for the historical multi-CLI surface (pre-v0.45.0) and the rationale for
> narrowing.

## What ships

- **1 Pi adapter** — `extensions/stelow/adapters/pi/` provides the native slash
  commands (`/sw-*`), TUI overlay, lifecycle hooks, and CLI detection.
- **1 Generic adapter** — `extensions/stelow/adapters/generic.ts` provides
  no-op implementations for the universal fallback when no specific agent has
  the extension loaded.

That's the entire harness surface. There are no per-harness command files
or per-harness plugin manifests in the shipped release.

## Why this is narrow on purpose

The 25 skills + the orchestrator skill land at `~/.agents/skills/<name>/SKILL.md`,
which is the [agentskills.io](https://agentskills.io/) standard adopted by
Pi, Claude Code, Codex, Cursor, Continue, OpenCode, and others. **Any
agentskills-compatible agent picks the orchestrator up automatically** —
no per-harness wiring required.

The pre-v0.45.0 release shipped slash-command files for three other agents
plus an OpenCode TypeScript plugin. In practice they were a maintenance tax
disproportionate to their value:

- Skill-level integration was already harness-agnostic (skills land in the
  standard directory).
- The OpenCode plugin was a TypeScript app with its own build step (`tsc +
  bundle`) that registered as a separate npm extension.
- The handlers reused the same `WORKFLOW_COMMANDS` driver the Pi adapter
  consumes, so wiring changes had to touch 4 files per command.

By v0.44.x the per-harness code had become a maintenance bottleneck. v0.45.0
removes it.

## How to extend

Anyone can add first-class support for a new agent harness via a PR. The
contract is stable:

### 1. Create the adapter directory

```
extensions/stelow/adapters/<harness>/
  ├── index.ts     # exports create<Harness>Adapter(): CLIAdapter
  └── ui.ts        # exports create<Harness>UIAdapter(): UIAdapter
```

Both files subclass `BaseAdapter` (`extensions/stelow/adapters/base.ts`) and
implement `UIAdapter` (`extensions/stelow/adapters/ui-adapter.ts`) respectively.

### 2. Wire it into the types

`extensions/stelow/types.ts`:

```typescript
export type CLI = "pi" | "<harness>" | "generic";

const overrides: Record<CLI, Partial<CLICapabilities>> = {
  "pi": { /* ... full feature set ... */ },
  "<harness>": {
    hasPluginSystem: true,
    hasSubagent: true,
    // ... whatever the harness supports
  },
  "generic": {},
};
```

### 3. Add detection

`extensions/stelow/state.ts:CLI_DETECTION_SIGNALS`:

```typescript
"<harness>": {
  dirs: ["~/<harness-config-dir>"],
  cmds: ["<harness-binary>"],
  confidence: "high",
},
```

And extend `detectCLI()` if needed.

### 4. Add to factories

- `extensions/stelow/adapters/cli-adapter.ts:createAdapter()` — add `case "<harness>": return create<Harness>Adapter();`
- `extensions/stelow/adapters/ui-factory.ts:createUIAdapter()` — same shape
- `extensions/stelow/adapters/commands/dispatcher.ts:getCommandSystem()` — if the harness has a command-file format

### 5. (Optional) Update detection / sync scripts

- `scripts/version-sync.mjs` — list any plugin manifests the harness ships
- `scripts/generate-cli-commands.ts` — re-implement with the new format
- `.release.yml` — list the same manifests in `version_files`
- `install.sh` — add a per-harness install function if the agent needs special setup

### 6. Reference prior implementations

The git history at tag `v0.43.4` (or the snapshot at
`docs/archive/2026-07-09-deprecated-multi-cli-integration/v0.43.4-multi-cli-surface.tar.gz`)
contains the prior OpenCode/Claude Code adapter source (~900 lines combined).
Read those for an end-to-end example of the full adapter pattern.

## Writing a new harness command

After the adapter ships, adding a new `/sw-<cmd>` slash command requires
**one** edit, not four:

1. Add a `CommandDescriptor` entry to `WORKFLOW_COMMANDS` in
   `extensions/stelow/adapters/commands/dispatcher.ts`.
2. Pi picks it up automatically through `extensions/stelow/commands.ts`.

For agents that consume command files (slash-command syntax in
`~/.config/<harness>/commands/`), the `dispatcher.ts:generateCommandFiles()`
hook can be extended to emit a per-harness variant from the same descriptor
list. The pre-v0.45.0 archive shows the opencode/claude-code pattern as a
starting point.

## Command reference (shipped)

| Command | Description |
|---------|-------------|
| `/sw-start [idea]` | Start new workflow |
| `/sw-status` | Show active workflow status |
| `/sw-next` | Advance to next phase |
| `/sw-pause` | Pause active workflow |
| `/sw-resume [name=]` | Resume paused workflow |
| `/sw-abort [name=]` | Abort and archive workflow |
| `/sw-archive [name=]` | Archive completed or inactive workflow |
| `/sw-unarchive name=` | Restore archived workflow |
| `/sw-ls [all\|archived]` | List workflows |
| `/sw-setphase phase=N` | Jump to specific phase |
| `/sw-info [name=]` | Print workflow path and resume commands |
| `/sw-rename <name>` | Rename active workflow |
| `/sw-complete` | Force-complete active workflow |
| `/sw-doctor [--fix]` | Diagnose workflow health |
| `/sw-unlock` | Disable stage guard (debug only) |
| `/sw-inbox [add\|remove\|clear\|history]` | Manage deferred inbox items |
| `/sw-pulse [status\|pause\|resume\|process\|log]` | Autonomous inbox processing |
| `/sw-audit [--scope <id>] [--format json\|markdown]` | Show audit trail — full lineage from origin to delivery |

All commands have `stelow-*` aliases (e.g. `stelow-audit` alongside `sw-audit`).

## Why no per-harness install script anymore

The shipped `install.sh`:

1. Builds the Pi extension (`extensions/stelow/`)
2. Installs npm packages (`pi-subagents`, `pi-intercom`, `plannotator`, …)
3. Copies the 25 skills to `~/.agents/skills/`

That's it. Step 3 is what makes agentskills-compatible agents work — no
per-harness flag is needed because they all read from the same directory.

If your adapter needs agent-specific install steps (e.g., wrapper script
registration in `~/.config/<harness>/`), add a `install_<harness>()` function
in `install.sh` and route through `install_for_cli()`. Pre-v0.45.0 had three
such functions; their structure is the right starting point.
