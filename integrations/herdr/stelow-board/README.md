# stelow-board (herdr plugin)

Persistent split-pane TUI for [herdr](https://herdr.dev) showing the
[stelow](https://github.com/renatocaliari/stelow) workflow state:
projects → scopes → tasks, with click-to-drill navigation.

Companion to [`integrations/muxy/stelow-board/`](../muxy/stelow-board/)
which is the Muxy webview panel of the same product.

## Requirements

- **herdr >= 0.7.0** — The `plugin` subcommand was added in 0.7.0.
  Older versions will fail with `unknown command: plugin`.
- **macOS or Linux** — `platforms = ["linux", "macos"]` in the manifest.
- **Rust toolchain** (only for local dev install) — `cargo` to build
  the binary.

### Check your herdr version

```bash
herdr --version
# Expected: herdr 0.7.0 or later
```

If you're on an older version, stop any running server and update:

```bash
herdr server stop
herdr update
```

`herdr update` may fail with "a herdr server is running and updating to
0.7.0 requires stopping it" — this is the same `server stop && update`
sequence, just be sure to run the two commands separately.

## Install from GitHub

The plugin lives as a subdirectory of the main
[stelow repo](https://github.com/renatocaliari/stelow) under
`integrations/herdr/stelow-board/`. Install via herdr's subdir support:

```bash
herdr plugin install renatocaliari/stelow/integrations/herdr/stelow-board
```

`herdr` will:

1. Clone the subdirectory into
   `~/.config/herdr/plugins/github/<hash>/integrations/herdr/stelow-board/`.
2. Show a preview of the manifest (id, actions, panes) and ask for
   confirmation in interactive terminals. Use `--yes` for
   non-interactive installs (e.g. CI).
3. Run the `[[build]]` command from the manifest (`cargo build
   --release`) which produces the `./target/release/stelow-board`
   binary.
4. Register the plugin so its keybindings, actions, and panes are
   immediately available.

A standalone `stelow-board` GitHub repo does not exist — install via
the subdir path above.

## Install from local source (development)

If you have a checkout of the stelow monorepo and want to link the
plugin from your local source (no GitHub round-trip, edits take effect
after re-link):

```bash
# From the stelow repo root
cd integrations/herdr/stelow-board
cargo build --release
herdr plugin link .
```

Or point at the absolute path:

```bash
herdr plugin link /path/to/stelow/integrations/herdr/stelow-board
```

After editing the manifest or `src/`, re-link:

```bash
herdr plugin unlink stelow.board
herdr plugin link .
```

## Verify the install

```bash
herdr plugin list
# Should show: stelow.board (Stelow Board) enabled
```

The `source:` field tells you which install method was used:

- `github:renatocaliari/stelow/integrations/herdr/stelow-board@<commit>` —
  installed from the GitHub subdir
- `local:/path/to/stelow-board` — linked from local source

Then inside a running herdr session, press `prefix+w` (default
`ctrl+b w`) to toggle the board. Or invoke the action directly:

```bash
herdr plugin action invoke stelow.board.toggle
```

## Keybinds

| Key | Action |
|---|---|
| `prefix+w` | toggle board (open / focus / close) |
| `Tab` / `w` | next workflow |
| `Shift+Tab` | previous workflow |
| `J` / `]` | next workflow |
| `K` / `[` | previous workflow |
| `j` / `↓` | next workflow (alias of Tab) |
| `k` / `↑` | previous workflow (alias of Shift+Tab) |
| `r` | manual refresh (also auto every 2s) |
| `?` | toggle help overlay |
| `q` / `Esc` | quit (close pane) |

## Mouse

- Click a workflow row in the **left column** → select that workflow
- Click anywhere else → no-op

## Data sources (single source of truth)

The plugin reads the **same** files the stelow extension writes. No config,
no overrides:

| What | Where |
|---|---|
| Workflows list | `<cwd>/stelow.json` (project-local) |
| Worktree filter | Compares `wf.cwd` against project cwd (matches muxy semantics) |
| Workflow status / current phase | `stelow.json` → `workflows[].currentPhase` + `phases[]` |
| Draft / prompt | `.stelow/<date>/<dirHash>/index.json` → `draft` |
| Scopes (with status) | `.stelow/<date>/<dirHash>/index.json` → `scopes[]` |
| Stages (PHASE_NAMES) | Hardcoded copy of `extensions/stelow/types.ts` (keep in sync) |

**Workflows are filtered to the current worktree.** A workflow is shown
only if its `cwd` equals the project cwd, or one is a sub-path of the
other. This mirrors the filter `muxy` uses (`isWorkflowCwdCompatible` in
`integrations/muxy/stelow-board/src/panel/data.js`).

**Archived / aborted / stopped / cancelled workflows are filtered out**
(`isHiddenWorkflowStatus` from muxy). Use `/sw-status` in pi to inspect
archived workflows.

Auto-refresh: signature-based polling (mtime + size of `stelow.json` and
all `.stelow/<date>/<dirHash>/index.json` files), every 2 seconds.
Manual `[r]` always reloads.

Stage IDs follow the canonical stelow phase names: `Triage`, `ItemSelect`,
`Setup`, `Context`, `Shape`, `Critique`, `Gate`, `Scope`, `Interface`,
`Int.Gate`, `Selection`, `Planning`, `Execution`, `Verification`, `Audit`.

## Layout

`placement = "split"` in the manifest opens the board docked to the
right of the active pane. It persists across panes in the same tab and
can be focused with the toggle action.

The pane is split into **two columns**:

- **Left (40%)**: workflow list, filtered to the current worktree. Each row
  shows the workflow name and a scope progress counter `(done/total sc)`.
- **Right (60%)** is split vertically into:
  - **Detail card (top, 8 lines)**: workflow name, status badge, original
    prompt (truncated to ~200 chars), current stage name, current scope
    (if any).
  - **Scopes list (bottom, rest)**: every scope from `index.json` with
    status, type, and iteration counter. Before `Execution` phase the
    panel shows a hint that scopes will appear there.

```
┌─── Stelow — cali-product-workflow · 4 workflow(s) ─────────────────┐
├────── Workflows (this worktree) ──────┬──────── Detail ───────────┤
│ ▶ wf-enz84q                (3/3 sc)   │ ● wf-enz84q    ▶ IN PROG  │
│   wf-eoq7r9                (2/3 sc)   │                            │
│   wf-31fl47                          │ Prompt: "build cali-pro..  │
│                                      │ Stage:  Gate  Scope: —    │
│                                      ├──────── Scopes (3/3) ──────┤
│                                      │ ✓ scope-1  Triage Prompt  │
│                                      │ ✓ scope-2  Inbox Storage  │
│                                      │ ✓ scope-3  Output Format  │
├─────────── Commands ───────────────────────────────────────────────┤
│ [Tab/j/k] workflow  [r] refresh  [?] help  [q] quit                │
├─────────── Context ────────────────────────────────────────────────┤
│ ws=...  cwd=/Users/.../cali-product-workflow  auto-refresh 2s     │
└────────────────────────────────────────────────────────────────────┘
```

## Scope status glyphs

| Glyph | Status |
|---|---|
| `·` | pending |
| `▶` | in-progress (current) |
| `✓` | completed |
| `⚠` | escalated (max iterations reached without verify pass) |
| `✗` | failed |

Matches `ScopeStatus` enum in `extensions/stelow/types.ts`.

## See also

- Plan: `docs/design/stelow-board-herdr.md` (in the stelow monorepo)
- Research: `.stelow/session-knowledge/2026-06-23-herdr-plugin-research.md`
- Muxy sibling: `integrations/muxy/stelow-board/` (shares worktree-filter semantics)
