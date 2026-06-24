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

```bash
herdr plugin install renatocaliari/stelow-board
```

## Install from local source (development)

```bash
# 1. Clone and build the Rust binary
git clone https://github.com/renatocaliari/stelow-board
cd stelow-board
cargo build --release

# 2. Link the local plugin directory into herdr
herdr plugin link .
# Or point at the directory from your stelow checkout:
herdr plugin link /path/to/stelow/integrations/herdr/stelow-board/
```

The `link` command registers the plugin from a local path (no GitHub
round-trip). After linking, edits to the manifest or `src/` require
re-linking:

```bash
herdr plugin unlink stelow-board
herdr plugin link .
```

## Verify the install

```bash
herdr plugin list
# Should show: stelow-board  ✓ enabled
```

Then inside a running herdr session, press `prefix+w` (default
`ctrl+b w`) to toggle the board.

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