# Archived: Multi-CLI Surface (v0.45.0)

**Status:** Archived — kept here for archaeology only. Do **not** depend on this surface from v0.45.0 onward.

## Why this is here

The v0.43.x line shipped per-harness integrations for OpenCode, Claude Code, and Codex:

- 15 slash-command `.md` files per harness under `cli-agents/{harness}/commands/`
- A TypeScript OpenCode plugin (`cli-agents/opencode/plugin/`)
- Adapter implementations under `extensions/stelow/adapters/{opencode,claude-code,codex}/`
- Per-harness install code in `install.sh`
- Per-harness entries in `extensions/stelow/state.ts`, `types.ts`, `adapters/cli-adapter.ts`, `adapters/ui-factory.ts`, `adapters/commands/dispatcher.ts`
- Plugin marketplace manifests in `.codex-plugin/`, `.claude-plugin/`, `.opencode-plugin/`
- Per-harness rows/columns in skill reference docs (`skills/*/references/cli-tools/*.md`)

In practice, those integrations were a maintenance tax disproportionate to their value:

1. **Skill-level integration was already harness-agnostic.** The 25 skills + orchestrator skill live at `~/.agents/skills/<name>/SKILL.md` — the [agentskills.io standard](https://agentskills.io/) adopted by Pi, Claude Code, Codex, Cursor, Continue, and others. Once `install_skills_flat` copies the skills to that directory, **any** compatible agent picks them up via implicit description matching or explicit `$skill-name` invocation. The per-harness command files added a slash-command surface on top — but the surface itself wasn't carrying much weight; the workflow ran from the orchestrator skill.

2. **The OpenCode plugin was a TypeScript app with its own build step.** `tsc + bundle` produced 5KB of `dist/index.js` + 19KB of `dist/tui.js`. To register a single slash command required editing four files (Pi extension, OpenCode generator, Codex generator, dispatcher). The plugin needed tests for the lifecycle hook that only OpenCode's plugin model exposed.

3. **The adapters were never tested against their claimed CLIs.** They were written from a read of the docs, not from running them in OpenCode/Claude Code. The Codex adapter used `@agent` syntax that turned out to be a hallucination of how Codex parses command files.

4. **Each new command required 4 + 3*N file edits** (where N = number of supported harnesses). For a project where the orchestrator skill is the real interface, that overhead multiplied without proportional value.

v0.44.0 + v0.44.1 + v0.45.0 narrow to **Pi-first**: one well-tested integration with full TUI/gates/auto-sync beats three half-broken ones. The 25 skills + orchestrator skill remain harness-agnostic and continue to work on every `~/.agents/skills/`-compatible agent.

## What's in this archive

`v0.43.4-multi-cli-surface.tar.gz` is a snapshot of the v0.43.4 release tree for the multi-CLI surface only:

| Path (under v0.43.4) | Files | Purpose |
|---|---|---|
| `cli-agents/claude/commands/*.md` | 15 | Claude Code slash commands |
| `cli-agents/claude/install.sh` | 1 | Claude Code install script |
| `cli-agents/codex/commands/*.md` | 16 | Codex slash commands (had wrong `@agent` syntax) |
| `cli-agents/opencode/commands/*.md` | 15 | OpenCode slash commands |
| `cli-agents/opencode/install.sh` + `README.md` | 2 | OpenCode install script |
| `cli-agents/opencode/plugin/` | full source tree + dist | TypeScript OpenCode plugin (9 source files + 5 dist files + lockfile) |
| `extensions/stelow/adapters/opencode/` | 451 lines | OpenCode adapter (BaseAdapter subclass + UI adapter) |
| `extensions/stelow/adapters/claude-code/` | 460 lines | Claude Code adapter (BaseAdapter subclass + UI adapter) |
| `extensions/stelow/adapters/codex/` | 455 lines (deleted in v0.44.0) | Codex adapter |
| `.codex-plugin/*.json`, `.claude-plugin/*.json`, `.opencode-plugin/*.json` | 5 | Plugin marketplace manifests |

Total: ~1700 lines of adapter/plugin code + 70+ reference doc files.

## Restoring an adapter (if you want first-class support for your harness)

The contract for adapter integration is stable across v0.45.0:

1. Add `extensions/stelow/adapters/<harness>/{index.ts, ui.ts}` — both export a function that returns a `BaseAdapter` subclass and a `UIAdapter` implementation.
2. Add your harness to `CLI` union in `extensions/stelow/types.ts`.
3. Add a `getCLICapabilities(<harness>)` entry in the same file.
4. Add a detection signal in `extensions/stelow/state.ts:CLI_DETECTION_SIGNALS` + extend `detectCLI()` if needed.
5. Add a case in `extensions/stelow/adapters/cli-adapter.ts:createAdapter()` and `ui-factory.ts:createUIAdapter()`.
6. (Optional) Add a per-harness command-file generator in `extensions/stelow/adapters/commands/dispatcher.ts:generateCommandFiles()`.

The v0.43.4 tag's adapter source (in this tarball) is the cleanest reference for the BaseAdapter pattern.

## Why we kept this archive

- **Recurrence cost is zero** — it's a frozen tarball under `docs/archive/`, never updated.
- **Deprecation lore** — anyone digging through commit history sees this `README.md` and gets the full context in one read.
- **Migration shorthand** — anyone wanting their own adapter PR starts from a known-working baseline.
- **Git history already has the full code** — but GitHub's UI doesn't surface it nicely. A tarball is one download.

## When to delete this archive

After v0.50.0 ships, or after 12 months, whichever comes first. The code is preserved in git history (tags `v0.43.4` and earlier) — this archive is for convenience, not for durability.
