# stelow-board (herdr plugin)

Persistent split-pane TUI for [herdr](https://herdr.dev) showing the
[stelow](https://github.com/renatocaliari/stelow) workflow state:
projects → scopes → tasks, with click-to-drill navigation.

Companion to [`integrations/muxy/stelow-board/`](../muxy/stelow-board/)
which is the Muxy webview panel of the same product.

## Install

```bash
herdr plugin install renatocaliari/stelow-board
```

Or for local development:

```bash
git clone https://github.com/renatocaliari/stelow-board
cd stelow-board
cargo build --release
herdr plugin link .
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