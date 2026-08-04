# Implementation Plan: Plugin `stelow-board` for Herdr

**Data:** 2026-06-23
**Status:** Research complete — ready for execution after approval
**Purpose:** Build a herdr plugin (Rust + ratatui) that renders a persistent split panel with a clickable list of **stelow** workflow projects/scopes/tasks, replicating the Muxy panel mentality inside herdr's terminal-native model.

---

## ⚠️ REGRA DE IDIOMA

> **This plan document is in Portuguese for discussion. ALL implementation artifacts**
> **(code, SKILL.md instructions, stage files, CLI commands, comments, README, plugin manifest)**
> **will be in ENGLISH.** Every instruction inside ` ``` ` blocks and every file created/modified
> will use English exclusively. Portuguese only in this document and in user-facing
> UI text rendered by the TUI itself (per project convention: UI text is exempt).

## ⚠️ SURGICAL PRECISION RULE

> **Every existing line in every file must be preserved untouched.** Only add new
> content at the specified insertion points. Never remove, rephrase, or restructure
> existing content. Each edit targets a specific location (before/after an anchor) and
> inserts only the new planned content.

---

## 📋 General Scope

| # | Task | Files | Priority |
|---|--------|----------|------------|
| 1 | Create `stelow-board` repo (herdr plugin) under `integrations/herdr/stelow-board/` | `Cargo.toml`, `herdr-plugin.toml`, `src/main.rs`, `scripts/open-board.sh` | 🔴 High |
| 2 | Add data layer that reads `.stelow/` from workspace cwd | `src/data.rs` (new module) | 🔴 High |
| 3 | Implement view state machine (Overview → ProjectDetail → ScopeDetail) | `src/app.rs` (new module) | 🔴 High |
| 4 | ratatui UI with 3 states + mouse hit-test | `src/ui.rs` (new module) | 🔴 High |
| 5 | Idempotent action wrapper (open/focus/close) | `scripts/open-board.sh` | 🟡 Medium |
| 6 | Optional `prefix+w` keybinding | `herdr-plugin.toml` (decl `[[keys.command]]`) | 🟡 Medium |
| 7 | README with install + keybinds + ASCII screenshots | `README.md` | 🟡 Medium |
| 8 | Publish on GitHub with `herdr-plugin` topic for auto-index on marketplace | public repo | 🟢 Low |

---

## 🏗️ Architecture

### Execution model (research summary)

```
┌──────────────────────────────────────────────────────────────────┐
│ herdr (Rust multiplexer)                                         │
│ ┌────────────────────────────────────────┐  ┌────────────────┐  │
│ │ Pane 1 (split esquerdo)                │  │ Pane 2 (split) │  │
│ │ $ user's normal shell                  │  │ plugin TUI     │  │
│ │                                        │  │ (stelow-       │  │
│ │                                        │  │  board)        │  │
│ └────────────────────────────────────────┘  └────────────────┘  │
│                                                                  │
│ mouse forward: herdr → pane PTY como protocolo ANSI              │
│   (X10 / PressRelease / ButtonMotion / AnyMotion)                │
└──────────────────────────────────────────────────────────────────┘
```

### Interaction flow

```
1. user: `prefix+w` ou `:plugin action invoke stelow.board.toggle`
2. herdr: executa `scripts/open-board.sh` (action) OU `[[panes]]` declaration
3. action script: detecta estado atual via `herdr pane list` JSON
   - no pane existe       → `herdr plugin pane open --placement split`
    - exists, not focused → `herdr pane zoom <id> --on` (focus)
    - exists, focused   → `herdr pane close <id>` (hide)
4. pane launched: `target/release/stelow-board`
5. TUI: reads `HERDR_PLUGIN_CONTEXT_JSON` → workspace_cwd → reads `.stelow/` → renders
6. user clica/tecla → action handler → se for action, invoca via `HERDR_BIN_PATH herdr ...`
```

---

## 🧩 File structure (final artifacts in English)

```
stelow-board/
├── herdr-plugin.toml          # plugin manifest
├── Cargo.toml                 # rust deps (ratatui, crossterm, serde, anyhow)
├── README.md                  # install + screenshots + keybinds
├── src/
│   ├── main.rs                # entrypoint: enable raw mode, loop, dispatch
│   ├── app.rs                 # state machine: View enum, App struct, input handler
│   ├── data.rs                # read .stelow/ → Project, Scope, Task structs
│   ├── ui.rs                  # ratatui rendering for 3 views + hit-test math
│   └── action.rs              # invoke herdr via HERDR_BIN_PATH
└── scripts/
    └── open-board.sh          # idempotent action wrapper (open/focus/close)
```

---

## 📐 Task Breakdown

### Task 1: Scaffold + manifest

**`herdr-plugin.toml`:**
```toml
id = "stelow.board"
name = "Stelow Board"
version = "0.1.0"
min_herdr_version = "0.7.0"
description = "Persistent side panel showing workflow stages, projects, scopes, and tasks with click-to-drill navigation."
platforms = ["linux", "macos"]

[[build]]
command = ["cargo", "build", "--release"]

[[panes]]
id = "board"
title = "Workflow"
placement = "split"
command = ["./target/release/stelow-board"]

[[actions]]
id = "toggle"
title = "Toggle workflow board"
command = ["bash", "scripts/open-board.sh"]

[[keys.command]]
key = "prefix+w"
type = "plugin_action"
command = "stelow.board.toggle"
description = "toggle workflow board"
```

**`Cargo.toml`:**
```toml
[package]
name = "stelow-board"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "stelow-board"
path = "src/main.rs"

[dependencies]
ratatui = "0.29"
crossterm = "0.28"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
anyhow = "1"

[profile.release]
opt-level = 3
lto = "thin"
strip = true
```

### Task 2: Data layer (`src/data.rs`)

Reads `./.stelow/` (relative to context `workspace_cwd`) and parses:

```rust
pub struct Project { pub id: String, pub name: String, pub status: Status, pub scopes: Vec<Scope> }
pub struct Scope   { pub id: String, pub name: String, pub status: Status, pub tasks: Vec<Task> }
pub struct Task    { pub id: String, pub name: String, pub status: Status, pub detail: Option<String> }
pub enum Status   { Done, Active, Pending, Blocked }

pub fn load_workspace(cwd: &Path) -> Result<Vec<Project>> { ... }
```

**Data sources (priority order):**
1. `.stelow/session-knowledge/*.md` — parsed `## Project: <id>` sections
2. `.stelow/gap-implementation-plan.md` — gap list as tasks
3. `.stelow/{date}/` — session directories by date
4. Fallback: hardcoded workflow stages (Discovery, Shape Up, Tech Planning, Spec Product, Scope & Execute, Testing, Critique)

### Task 3: State machine (`src/app.rs`)

```rust
pub enum View {
    Overview,                                          // lista de projetos
    ProjectDetail { project_id: String },              // escopos do projeto
    ScopeDetail    { project_id: String, scope_id: String }, // tasks do escopo
}

pub struct App {
    pub view: View,
    pub projects: Vec<Project>,
    pub list_state: ListState,         // ratatui ListState
    pub detail_scroll: u16,
    pub should_quit: bool,
    pub ctx: PluginContext,
}

impl App {
    pub fn on_key(&mut self, key: KeyEvent) -> Result<()> { ... }
    pub fn on_mouse(&mut self, mouse: MouseEvent, areas: &LayoutAreas) -> Result<()> { ... }
    pub fn drill_in(&mut self) { ... }
    pub fn drill_out(&mut self) { ... }
    pub fn toggle_selected(&mut self) { ... }
}
```

**Keybinds:**
| Key | Action |
|---|---|
| `q` / `Esc` | quit (pane close) |
| `h` / `Left` | drill out (back) |
| `l` / `Right` / `Enter` | drill in |
| `j` / `Down` | next item |
| `k` / `Up` | prev item |
| `space` | toggle status (pending ↔ done) |
| `r` | refresh data |
| `e` | execute action on selected item (calls `herdr plugin action invoke ...`) |
| `?` | help overlay |

### Task 4: UI ratatui (`src/ui.rs`)

**3 views** + **hit-test math** returning `LayoutAreas { overview, detail, hint, footer }`:

```rust
pub struct LayoutAreas {
    pub header: Rect,
    pub list:   Rect,
    pub detail: Rect,
    pub hint:   Rect,
    pub footer: Rect,
}

pub fn render(f: &mut Frame, app: &mut App) -> LayoutAreas {
    let chunks = Layout::vertical([
        Constraint::Length(3),  // header
        Constraint::Min(8),     // list (Overview/Project/Scope)
        Constraint::Length(7),  // detail card
        Constraint::Length(3),  // hint
        Constraint::Length(3),  // footer (ctx)
    ]).split(f.area());

    render_header(f, chunks[0], app);
    render_list(f, chunks[1], app);     // stateful List/Table
    render_detail(f, chunks[2], app);
    render_hint(f, chunks[3], app);
    render_footer(f, chunks[4], app);

    LayoutAreas { header: chunks[0], list: chunks[1], detail: chunks[2], hint: chunks[3], footer: chunks[4] }
}

pub fn hit_test_list(area: Rect, mouse: MouseEvent) -> Option<usize> {
    if !rect_contains(area, mouse.column, mouse.row) { return None; }
    let offset = (mouse.row - area.y) as usize;
    Some(offset)  // cada item = 1 row no List widget
}
```

**Clickable glyphs** (rendered as part of item text, hit-test distinguishes by column):
- `▸` (column 1) → drill in
- `●`/`✓`/`·` (column 2) → toggle status
- The rest of the line → select

### Task 5: Idempotent action wrapper (`scripts/open-board.sh`)

```bash
#!/usr/bin/env bash
# Idempotent: OPEN / FOCUS / CLOSE based on current pane state.
# Pattern from herdr-file-viewer/scripts/open-file-viewer.sh.
set -uo pipefail

herdr_bin="${HERDR_BIN_PATH:-herdr}"

panes_json="$("$herdr_bin" pane list 2>/dev/null || true)"

# extract focused_pane_id
focused_id=$(printf '%s' "$panes_json" \
  | grep -oE '"focused_pane_id":"[^"]+"' | head -1 | cut -d'"' -f4)

# extract pane id of pane with label "Workflow"
board_id=$(printf '%s' "$panes_json" \
  | python3 -c '
import sys, json
data = json.load(sys.stdin)
for p in data.get("panes", []):
    if p.get("label") == "Workflow":
        print(p["pane_id"]); break
' 2>/dev/null || true)

if [ -n "$board_id" ] && [ "$focused_id" = "$board_id" ]; then
  # already focused → close
  exec "$herdr_bin" pane close "$board_id"
elif [ -n "$board_id" ]; then
  # exists, focus it
  exec "$herdr_bin" pane zoom "$board_id" --on
else
  # not open → open
  exec "$herdr_bin" plugin pane open \
    --plugin stelow-board \
    --entrypoint board \
    --placement split \
    --direction right \
    --focus
fi
```

### Task 6: Keybinding

Already declared in the manifest (Task 1). User adds in `~/.config/herdr/config.toml` if they prefer a local binding.

### Task 7: README

- Install via `herdr plugin install stelow-board` (after publishing)
- Local dev: `git clone ... && cd ... && cargo build --release && herdr plugin link .`
- Keybinds table
- ASCII screenshots (3 views already documented in the research)
- License + contributing

### Task 8: Publish

- Public repo `github.com/calionauta/stelow-board` (or preferred owner)
- Topic `herdr-plugin`
- Index updates every 30 min → appears on herdr.dev/plugins/

---

## 🔌 System contracts

### Input (env vars do herdr)

| Var | Usage |
|---|---|---|
| `HERDR_BIN_PATH` | path to herdr binary for portable CLI invocation |
| `HERDR_PLUGIN_ID` | must be `stelow.board` |
| `HERDR_PLUGIN_ROOT` | plugin path (process default cwd) |
| `HERDR_PLUGIN_CONFIG_DIR` | user persistent config (not used) |
| `HERDR_PLUGIN_STATE_DIR` | plugin persistent state (last-fetch cache) |
| `HERDR_PLUGIN_CONTEXT_JSON` | parsed to `workspace_cwd` → base path of `.stelow/` |
| `HERDR_WORKSPACE_ID` | display in header |
| `HERDR_TAB_ID` | (not used) |
| `HERDR_PANE_ID` | (not used) |

### Output (callbacks via herdr CLI)

| Action | Command |
|---|---|
| Open pane | `herdr plugin pane open --plugin stelow.board --entrypoint board --placement split --direction right --focus` |
| Focus pane | `herdr pane zoom <id> --on` |
| Close pane | `herdr pane close <id>` |
| List panes | `herdr pane list` (JSON) |
| Invoke action | `herdr plugin action invoke <action_id>` |
| Notification | `herdr notification show "title" --body "..."` |

### Socket API (raw, se preferir)

- Unix socket at `HERDR_SOCKET_PATH` (Unix) or named pipe (Windows)
- Use `HERDR_BIN_PATH` for portability — CLI wrappers are cross-OS

---

## 📊 Data states

| State | Display |
|---|---|---|
| `.stelow/` missing | shows hardcoded stages + warning "no workspace data found" |
| `.stelow/` empty | shows hardcoded stages |
| `.stelow/` parse error | shows stages + error log in detail card |
| `.stelow/` valid | parses and renders tree |
| No mouse support | keybinds continue working; hint adapts |

## 🎯 Interaction states

| State | Visual |
|---|---|---|
| Item selected | inverted (background color) |
| Item hovered (mouse) | border or underline |
| Status Done | `✓` green |
| Status Active | `▶` yellow + bold |
| Status Pending | `·` gray |
| Status Blocked | `!` red + bold |
| Drill-in available | clickable glyph `▸` |

---

## ⚖️ Feasibility

| Aspect | Assessment |
|---|---|---|
| Stack | ✅ Rust + ratatui (same language as herdr; de facto standard in `herdr-file-viewer`) |
| Mouse support | ✅ confirmed in `src/app/input/mouse.rs` — herdr forwards to pane via ANSI protocol |
| Build/install | ✅ `cargo build --release` (3-5min cold, <10s warm with cache) |
| Runtime | ✅ single binary, zero external deps |
| Distribution | ✅ GitHub topic `herdr-plugin` → auto-index on herdr.dev/plugins/ |
| Risk: herdr API changes | 🟡 mitigate with `min_herdr_version = "0.7.0"` + use only documented API |
| Risk: ratatui version churn | 🟡 pin major version in Cargo.toml |
| Risk: terminal mode conflicts | 🟢 each pane has its own isolated PTY |

---

## 🧪 Testing strategy

### Unit tests (`cargo test`)

- `data.rs`: parse of `.stelow/` with fixtures (valid, empty, malformed, missing)
- `app.rs`: state machine transitions (Overview → ProjectDetail → ScopeDetail → back)
- `ui.rs`: hit-test math (row → item index) with known bounds

### Integration test

- Manual: `herdr plugin link .` + `prefix+w` in real workspace
- Validate: OPEN on first, FOCUS on second, CLOSE on third
- Validate: clicking glyph `▸` performs drill-in
- Validate: clicking status `·` toggles to `✓`
- Validate: refresh `[r]` re-reads `.stelow/`

### Visual regression

- ASCII screenshots in 3 states (already documented in research) become test fixtures

---

## 📅 Execution order (dependency-aware)

```
Task 1: Scaffold + manifest + Cargo.toml
  ├── Task 2: Data layer
  ├── Task 3: State machine (depends on 2)
  ├── Task 4: UI ratatui (depends on 3)
  ├── Task 5: Action wrapper shell (independent)
  └── Task 6: Keybinding (part of Task 1, no separate step)
        │
        └── Task 7: README with screenshots
              │
              └── Task 8: Publish to GitHub with topic herdr-plugin
```

---

## 🚫 Out of scope (explicitly)

- Webview UI (not supported in herdr plugin v1)
- Runtime action registration (not part of v1)
- Native non-terminal panel (not part of v1)
- Multi-workspace aggregation (1 pane = 1 workspace at a time)
- UI state persistence across sessions (state loads from `.stelow/` on each refresh)
- File watcher / live reload (user presses `r` to refresh)
- Advanced mouse hover effects (reverse-video + glyph suffices for v1)

---

## 🔗 References

- https://herdr.dev/plugins/ — marketplace live
- https://herdr.dev/docs/plugins/ — complete manifest schema
- https://herdr.dev/docs/socket-api/ — complete protocol, plugin namespace
- https://github.com/ogulcancelik/herdr — host source (Rust)
- https://github.com/ogulcancelik/herdr-plugin-examples — examples: `agent-telegram-notify`, `dev-layout-bootstrap`, `github-link-preview`, `rust-release-check`
- https://github.com/smarzban/herdr-file-viewer — reference Rust+ratatui in split pane
- https://github.com/muxy-app/muxy — mental model (not directly compatible)
- Full research: `.stelow/session-knowledge/2026-06-23-herdr-plugin-research.md` (to be created)

---

## ❓ Open questions (for the user to decide before executing)

1. **GitHub repo owner:** `calionauta/stelow-board` or other owner?
2. **Binary naming:** `stelow-board` (long) or `cwb` (short)?
3. **Data source:** prioritize raw `.stelow/` or create custom schema `.stelow/board.json`?
4. **Scope/task detail:** show `detail` field if it exists, or just `name` + `status`?
5. **Auto-refresh:** file watcher on `.stelow/` or just manual `[r]`?
6. **Notifications:** use `herdr notification show` when stage becomes `Blocked`?
7. **Multiple panels:** support more than 1 "Workflow" pane (1 per workspace) or global singleton?

---

## 📍 Current state (post-v0.36.1)

This plan was written on 2026-06-23 as a design document. The plugin has
since been implemented and ships as part of the `stelow` monorepo (no
separate repo). The divergences below exist between the original plan
and the current implementation — read this section before making any
decision based on the plan above.

### Decisions applied (vs. the plan)

| # | Original question | Current decision |
|---|---|---|
| 1 | Repo owner | **No separate repo.** Plugin lives at `integrations/herdr/stelow-board/` inside the `stelow` monorepo. Distributed via npm (`@calionauta/stelow` package, `files[]` includes the plugin). |
| 2 | Binary name | **`stelow-board`** (original option 1). |
| 3 | Data source | **`stelow.json` (root) + `.stelow/<date>/<dirHash>/index.json` per workflow.** No custom schema. The plan envisioned a separate `data.rs`; the implementation keeps everything in `main.rs` (815 lines) because it was simpler. |
| 4 | Scope/task detail | **Shows status, type, and iteration counter from `Scope` in `index.json`.** No `detail` field in the current schema. |
| 5 | Auto-refresh | **2s polling based on mtime+size signature** of `stelow.json` and all `index.json` files. KISS — no `notify` crate. Manual `[r]` forces reload. |
| 6 | Notifications | **Not implemented.** |
| 7 | Multiple panels | **Singleton per workspace.** No conflict from pressing `prefix+w` repeatedly — the `open-board.sh` action handles toggle. |

### Final architecture (vs. the plan)

The plan envisioned 5 Rust files (`main.rs`, `app.rs`, `data.rs`, `ui.rs`,
`action.rs`). The current implementation has **1 file `main.rs` (815 lines)**.
Conscious decision: scope shrank compared to the plan (no drill-in/out
state machine, no notifications), so modularization lost value.

### Final layout (vs. the plan)

The plan envisioned 3 views (Overview → ProjectDetail → ScopeDetail). The
current implementation has **2 side-by-side panels** (workflows on the
left, detail card + scopes on the right). No drill-in/out — all info fits
on a single screen.

### Final keybinds (vs. the plan)

| Original plan | Current |
|---|---|
| `j`/`Down` next item, `k`/`Up` prev item | `Tab`/`j`/`Down` next workflow, `Shift+Tab`/`k`/`Up` previous workflow |
| `h`/`Left` drill out, `l`/`Right`/`Enter` drill in | **removed** (no drill-in/out) |
| `space` toggle status | **removed** (read-only by convention — mutations happen in the shell) |
| `r` refresh | `r` manual refresh + auto 2s polling |
| `?` help | `?` help |
| `q`/`Esc` quit | `q`/`Esc` quit |

### Workflow filter (additional decision)

The current implementation filters workflows by worktree (mirror of
muxy's `isWorkflowCwdCompatible`). Workflows whose `cwd` in `stelow.json`
is empty are treated as compatible (same muxy convention) — this covers
older workflows where the extension didn't write `cwd`.

### Source of truth for project cwd

Reads `HERDR_PLUGIN_CONTEXT_JSON.workspace_cwd` (JSON blob injected by
herdr runtime on each plugin spawn). Fallback chain:
`focused_pane_cwd` → `workspace_cwd` → `HERDR_PLUGIN_ROOT`.

### Scopes convention

Reads scopes from `index.json` (`scopes[]` array), not from `spec-tech.md`.
Each scope has `id`, `name`, `type`, `status`, `iteration`, `maxIterations`.
Status is rendered with glyphs: `·` pending, `▶` in-progress,
`✓` completed, `⚠` escalated, `✗` failed.

### Test coverage

`tests/unit/herdr-cwd-matches.test.ts` (10 anti-regression tests for
the worktree filter — empty cwd, exact match, sub-path, etc.).
No Rust test framework; testing is indirect via TypeScript.

---

**Next step:** user approval → start Task 1 (scaffold).
