# Plano de Implementação: Plugin `stelow-board` para Herdr

**Data:** 2026-06-23
**Status:** Pesquisa concluída — pronto pra execução após aprovação
**Propósito:** Construir plugin herdr (Rust + ratatui) que renderiza painel split persistente com lista clicável de projetos/escopos/tarefas do workflow **stelow**, replicando mentalidade Muxy panel dentro do modelo terminal-native do herdr.

---

## ⚠️ REGRA DE IDIOMA

> **This plan document is in Portuguese for discussion. ALL implementation artifacts**
> **(code, SKILL.md instructions, stage files, CLI commands, comments, README, plugin manifest)**
> **will be in ENGLISH.** Every instruction inside ` ``` ` blocks and every file created/modified
> will use English exclusively. Portuguese only in this document and in user-facing
> UI text rendered by the TUI itself (per project convention: UI text is exempt).

## ⚠️ REGRA DE PRECISÃO CIRÚRGICA

> **Every existing line in every file must be preserved untouched.** Only add new
> content at the specified insertion points. Never remove, rephrase, or restructure
> existing content. Each edit targets a specific location (before/after an anchor) and
> inserts only the new planned content.

---

## 📋 Escopo Geral

| # | Tarefa | Arquivos | Prioridade |
|---|--------|----------|------------|
| 1 | Criar repo `stelow-board` (plugin herdr) sob `integrations/herdr/stelow-board/` | `Cargo.toml`, `herdr-plugin.toml`, `src/main.rs`, `scripts/open-board.sh` | 🔴 Alta |
| 2 | Adicionar data layer que lê `.stelow/` do cwd do workspace | `src/data.rs` (novo módulo) | 🔴 Alta |
| 3 | Implementar state machine de views (Overview → ProjectDetail → ScopeDetail) | `src/app.rs` (novo módulo) | 🔴 Alta |
| 4 | UI ratatui com 3 estados + hit-test mouse | `src/ui.rs` (novo módulo) | 🔴 Alta |
| 5 | Action wrapper idempotente (open/focus/close) | `scripts/open-board.sh` | 🟡 Média |
| 6 | Keybinding opcional `prefix+w` | `herdr-plugin.toml` (decl `[[keys.command]]`) | 🟡 Média |
| 7 | README com install + keybinds + screenshots ASCII | `README.md` | 🟡 Média |
| 8 | Publicar no GitHub com topic `herdr-plugin` para auto-index no marketplace | repo público | 🟢 Baixa |

---

## 🏗️ Arquitetura

### Modelo de execução (resumo da pesquisa)

```
┌──────────────────────────────────────────────────────────────────┐
│ herdr (Rust multiplexer)                                         │
│ ┌────────────────────────────────────────┐  ┌────────────────┐  │
│ │ Pane 1 (split esquerdo)                │  │ Pane 2 (split) │  │
│ │ $ shell normal do usuário              │  │ plugin TUI     │  │
│ │                                        │  │ (stelow-       │  │
│ │                                        │  │  board)        │  │
│ └────────────────────────────────────────┘  └────────────────┘  │
│                                                                  │
│ mouse forward: herdr → pane PTY como protocolo ANSI              │
│   (X10 / PressRelease / ButtonMotion / AnyMotion)                │
└──────────────────────────────────────────────────────────────────┘
```

### Fluxo de interação

```
1. user: `prefix+w` ou `:plugin action invoke stelow.board.toggle`
2. herdr: executa `scripts/open-board.sh` (action) OU `[[panes]]` declaration
3. action script: detecta estado atual via `herdr pane list` JSON
   - no pane existe       → `herdr plugin pane open --placement split`
   - existe, não focado  → `herdr pane zoom <id> --on` (focus)
   - existe, já focado   → `herdr pane close <id>` (hide)
4. pane launched: `target/release/stelow-board`
5. TUI: lê `HERDR_PLUGIN_CONTEXT_JSON` → workspace_cwd → lê `.stelow/` → renderiza
6. user clica/tecla → action handler → se for action, invoca via `HERDR_BIN_PATH herdr ...`
```

---

## 🧩 Estrutura de arquivos (artefatos finais em inglês)

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

## 📐 Detalhamento por tarefa

### Tarefa 1: Scaffold + manifest

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

### Tarefa 2: Data layer (`src/data.rs`)

Lê `./.stelow/` (relativo ao `workspace_cwd` do context) e parseia:

```rust
pub struct Project { pub id: String, pub name: String, pub status: Status, pub scopes: Vec<Scope> }
pub struct Scope   { pub id: String, pub name: String, pub status: Status, pub tasks: Vec<Task> }
pub struct Task    { pub id: String, pub name: String, pub status: Status, pub detail: Option<String> }
pub enum Status   { Done, Active, Pending, Blocked }

pub fn load_workspace(cwd: &Path) -> Result<Vec<Project>> { ... }
```

**Data sources (ordem de prioridade):**
1. `.stelow/session-knowledge/*.md` — seções `## Project: <id>` parseadas
2. `.stelow/gap-implementation-plan.md` — lista de gaps como tasks
3. `.stelow/{date}/` — diretórios de sessão por data
4. Fallback: estágios hardcoded do workflow (Discovery, Shape Up, Tech Planning, Spec Product, Scope & Execute, Testing, Critique)

### Tarefa 3: State machine (`src/app.rs`)

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
| `e` | execute action no item selecionado (chama `herdr plugin action invoke ...`) |
| `?` | help overlay |

### Tarefa 4: UI ratatui (`src/ui.rs`)

**3 views** + **hit-test math** retornando `LayoutAreas { overview, detail, hint, footer }`:

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

**Glyphs clicáveis** (renderizados como parte do texto do item, hit-test distingue por column):
- `▸` (coluna 1) → drill in
- `●`/`✓`/`·` (coluna 2) → toggle status
- O resto da linha → select

### Tarefa 5: Action wrapper idempotente (`scripts/open-board.sh`)

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

### Tarefa 6: Keybinding

Já declarado no manifest (Tarefa 1). User adiciona em `~/.config/herdr/config.toml` se preferir binding local.

### Tarefa 7: README

- Install via `herdr plugin install stelow-board` (após publicar)
- Local dev: `git clone ... && cd ... && cargo build --release && herdr plugin link .`
- Keybinds table
- ASCII screenshots (3 views já documentadas na pesquisa)
- License + contributing

### Tarefa 8: Publish

- Repo público `github.com/renatocaliari/stelow-board` (ou owner preferido)
- Topic `herdr-plugin`
- Index atualiza a cada 30 min → aparece em herdr.dev/plugins/

---

## 🔌 System contracts

### Input (env vars do herdr)

| Var | Uso |
|---|---|
| `HERDR_BIN_PATH` | path do binário herdr pra invocar CLI portable |
| `HERDR_PLUGIN_ID` | deve ser `stelow.board` |
| `HERDR_PLUGIN_ROOT` | path do plugin (cwd default do processo) |
| `HERDR_PLUGIN_CONFIG_DIR` | config persistente do user (não usar) |
| `HERDR_PLUGIN_STATE_DIR` | state persistente do plugin (cache de last-fetch) |
| `HERDR_PLUGIN_CONTEXT_JSON` | parse pra `workspace_cwd` → base path do `.stelow/` |
| `HERDR_WORKSPACE_ID` | exibir no header |
| `HERDR_TAB_ID` | (não usado) |
| `HERDR_PANE_ID` | (não usado) |

### Output (callbacks via herdr CLI)

| Action | Comando |
|---|---|
| Open pane | `herdr plugin pane open --plugin stelow.board --entrypoint board --placement split --direction right --focus` |
| Focus pane | `herdr pane zoom <id> --on` |
| Close pane | `herdr pane close <id>` |
| List panes | `herdr pane list` (JSON) |
| Invoke action | `herdr plugin action invoke <action_id>` |
| Notification | `herdr notification show "title" --body "..."` |

### Socket API (raw, se preferir)

- Unix socket em `HERDR_SOCKET_PATH` (Unix) ou named pipe (Windows)
- Use `HERDR_BIN_PATH` por portabilidade — CLI wrappers são cross-OS

---

## 📊 Data states

| State | Display |
|---|---|
| `.stelow/` missing | mostra estágios hardcoded + warning "no workspace data found" |
| `.stelow/` empty | mostra estágios hardcoded |
| `.stelow/` parse error | mostra estágios + log de erro no detail card |
| `.stelow/` valid | parseia e renderiza árvore |
| No mouse support | keybinds continuam funcionando; hint adapta |

## 🎯 Interaction states

| State | Visual |
|---|---|
| Item selected | invertido (cor de fundo) |
| Item hovered (mouse) | borda ou underline |
| Status Done | `✓` verde |
| Status Active | `▶` amarelo + bold |
| Status Pending | `·` cinza |
| Status Blocked | `!` vermelho + bold |
| Drill-in available | glyph `▸` clicável |

---

## ⚖️ Feasibility

| Aspecto | Avaliação |
|---|---|
| Stack | ✅ Rust + ratatui (mesma linguagem do herdr; padrão de fato em `herdr-file-viewer`) |
| Mouse support | ✅ confirmado em `src/app/input/mouse.rs` — herdr forward para pane via protocolo ANSI |
| Build/install | ✅ `cargo build --release` (3-5min cold, <10s warm com cache) |
| Runtime | ✅ binário único, zero deps externas |
| Distribution | ✅ GitHub topic `herdr-plugin` → auto-index em herdr.dev/plugins/ |
| Risk: herdr API changes | 🟡 mitigar com `min_herdr_version = "0.7.0"` + usar só API documentada |
| Risk: ratatui version churn | 🟡 fixar major version no Cargo.toml |
| Risk: terminal mode conflicts | 🟢 cada pane tem seu PTY isolado |

---

## 🧪 Testing strategy

### Unit tests (`cargo test`)

- `data.rs`: parse de `.stelow/` com fixtures (válido, vazio, malformado, missing)
- `app.rs`: state machine transitions (Overview → ProjectDetail → ScopeDetail → back)
- `ui.rs`: hit-test math (row → item index) com bounds conhecidos

### Integration test

- Manual: `herdr plugin link .` + `prefix+w` em workspace real
- Validar: OPEN na primeira vez, FOCUS no segundo, CLOSE no terceiro
- Validar: click em glyph `▸` faz drill-in
- Validar: click em status `·` toggle pra `✓`
- Validar: refresh `[r]` re-lê `.stelow/`

### Visual regression

- Screenshots ASCII em 3 estados (já documentados na pesquisa) viram fixtures de teste

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

## 🚫 Out of scope (explicitamente)

- Webview UI (não suportado em herdr plugin v1)
- Runtime action registration (não parte de v1)
- Native non-terminal panel (não parte de v1)
- Multi-workspace aggregation (1 pane = 1 workspace por vez)
- Persistence de state UI entre sessões (state carrega do `.stelow/` a cada refresh)
- File watcher / live reload (user tecla `r` pra refresh)
- Mouse hover effects avançados (reverse-video + glyph basta pra v1)

---

## 🔗 References

- https://herdr.dev/plugins/ — marketplace live
- https://herdr.dev/docs/plugins/ — manifest schema completo
- https://herdr.dev/docs/socket-api/ — protocolo completo, plugin namespace
- https://github.com/ogulcancelik/herdr — host source (Rust)
- https://github.com/ogulcancelik/herdr-plugin-examples — exemplos: `agent-telegram-notify`, `dev-layout-bootstrap`, `github-link-preview`, `rust-release-check`
- https://github.com/smarzban/herdr-file-viewer — referência Rust+ratatui em split pane
- https://github.com/muxy-app/muxy — modelo mental (não diretamente compatível)
- Pesquisa completa: `.stelow/session-knowledge/2026-06-23-herdr-plugin-research.md` (a criar)

---

## ❓ Open questions (pro user decidir antes de executar)

1. **Owner do repo GitHub:** `renatocaliari/stelow-board` ou outro owner?
2. **Naming do binário:** `stelow-board` (longo) ou `cwb` (curto)?
3. **Source do data:** priorizar `.stelow/` raw ou criar schema próprio `.stelow/board.json`?
4. **Detalhe de scope/task:** mostrar campo `detail` se existir, ou só `name` + `status`?
5. **Auto-refresh:** file watcher em `.stelow/` ou só manual `[r]`?
6. **Notificações:** usar `herdr notification show` quando stage vira `Blocked`?
7. **Múltiplos painéis:** suportar mais de 1 pane "Workflow" (1 por workspace) ou singleton global?

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
| 1 | Repo owner | **No separate repo.** Plugin lives at `integrations/herdr/stelow-board/` inside the `stelow` monorepo. Distributed via npm (`@renatocaliari/stelow` package, `files[]` includes the plugin). |
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
