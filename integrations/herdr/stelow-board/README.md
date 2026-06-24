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
| `j` / `↓` | next item |
| `k` / `↑` | prev item |
| `l` / `→` / `Enter` | drill in |
| `h` / `←` / `Esc` | drill out (back) |
| `space` | toggle status of selected item |
| `r` | refresh from `.stelow/` |
| `e` | execute action on selected item |
| `q` | quit (close pane) |

## Mouse

The board is fully clickable. Click on:

- `▸` glyph → drill in
- `●` / `✓` / `·` glyph → toggle status
- item row → select

## Layout

`placement = "split"` in the manifest opens the board docked to the
right of the active pane. It persists across panes in the same tab and
can be focused with the toggle action.

## See also

- Plan: `docs/design/stelow-board-herdr.md` (in the stelow monorepo)
- Research: `.stelow/session-knowledge/2026-06-23-herdr-plugin-research.md`
- Muxy sibling: `integrations/muxy/stelow-board/`