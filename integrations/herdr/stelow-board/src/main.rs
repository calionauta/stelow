use anyhow::Result;
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyEvent, MouseButton, MouseEvent, MouseEventKind},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use ratatui::{
    Frame, Terminal,
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph, Wrap},
};
use serde::Deserialize;
use std::{
    env, fs, io,
    path::{Path, PathBuf},
    time::{Duration, Instant},
};

/// HERDR_PLUGIN_CONTEXT_JSON — injected by herdr runtime.
#[derive(Debug, Deserialize, Clone)]
struct PluginContext {
    workspace_id: Option<String>,
    workspace_cwd: Option<String>,
    #[allow(dead_code)]
    focused_pane_id: Option<String>,
    focused_pane_cwd: Option<String>,
}

/// ── Single source of truth: extensions/stelow/types.ts ──
/// Keep in sync. Convention over configuration: no config file.
const PHASE_NAMES: &[&str] = &[
    "Triage", "ItemSelect", "Setup", "Context", "Shape", "Critique",
    "Gate", "Scope", "Interface", "Int.Gate", "Selection", "Planning",
    "Execution", "Verification", "Audit",
];

// ── Scope shape (mirrors extensions/stelow/types.ts Scope interface) ──

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ScopeStatus { Pending, InProgress, Completed, Escalated, Failed }

impl ScopeStatus {
    fn from_str(s: &str) -> Self {
        match s {
            "in-progress" => Self::InProgress,
            "completed" => Self::Completed,
            "escalated" => Self::Escalated,
            "failed" => Self::Failed,
            _ => Self::Pending,
        }
    }
    fn glyph(self) -> (&'static str, Color) {
        match self {
            Self::Pending    => ("· ", Color::DarkGray),
            Self::InProgress => ("▶ ", Color::Yellow),
            Self::Completed  => ("✓ ", Color::Green),
            Self::Escalated  => ("⚠ ", Color::Magenta),
            Self::Failed     => ("✗ ", Color::Red),
        }
    }
}

#[derive(Debug, Clone)]
struct Scope {
    id: String,
    name: String,
    scope_type: String,
    status: ScopeStatus,
    iteration: Option<i32>,
    max_iterations: Option<i32>,
}

// ── Stage shape removed (YAGNI) ──
// Stages used to be computed here from PHASE_NAMES + phases[] but never
// rendered in the UI. The status of the *current* stage is enough for the
// detail card; future "show stages" view can derive it on demand.

// ── Workflow shape ──

#[derive(Debug, Clone)]
struct Workflow {
    name: String,
    status: String,        // in-progress | paused | completed | archived
    current_phase: i32,   // index into PHASE_NAMES
    draft: String,        // user prompt
    scopes: Vec<Scope>,
}

impl Workflow {
    fn current_stage_name(&self) -> &'static str {
        PHASE_NAMES
            .get(self.current_phase as usize)
            .copied()
            .unwrap_or("?")
    }

    fn current_scope(&self) -> Option<&Scope> {
        self.scopes.iter().find(|s| s.status == ScopeStatus::InProgress)
    }
}

// ── Tracking file shapes (modeled only what we use) ──

#[derive(Debug, Deserialize)]
struct WorkflowEntry {
    name: String,
    #[serde(default)]
    status: String,
    #[serde(default)]
    cwd: String,
    #[serde(default, rename = "currentPhase")]
    current_phase: i32,
    #[serde(default, rename = "dirHash")]
    dir_hash: String,
}

#[derive(Debug, Deserialize)]
struct TrackingFile {
    #[serde(default)]
    workflows: Vec<WorkflowEntry>,
}

// ── index.json shape (per-workflow: draft + scopes) ──

#[derive(Debug, Deserialize)]
struct ScopeEntry {
    id: String,
    name: String,
    #[serde(default, rename = "type")]
    scope_type: String,
    #[serde(default)]
    status: String,
    #[serde(default)]
    iteration: Option<i32>,
    #[serde(default, rename = "maxIterations")]
    max_iterations: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct IndexFile {
    #[serde(default)]
    draft: String,
    #[serde(default, rename = "current_phase_index")]
    current_phase_index: i32,
    #[serde(default)]
    scopes: Vec<ScopeEntry>,
}

// ── Path normalization (mirrors muxy isWorkflowCwdCompatible) ──

fn normalize_path(p: &str) -> String {
    p.replace(std::path::MAIN_SEPARATOR, "/")
        .replace("//", "/")
        .trim_end_matches('/')
        .to_string()
}

// ── Mirrors muxy isWorkflowCwdCompatible EXACTLY (no early return).
// Empty `workflow_cwd` means the extension never wrote cwd to stelow.json
// (common for workflows created before cwd was a tracked field). In that
// case we fall through to the equality/sub-path check: both empty strings
// trivially satisfy `w == p`, so an empty-cwd workflow is treated as
// compatible with whatever project_path is. The same convention applies in
// muxy; we deliberately do not invent new logic here.
fn cwd_matches(workflow_cwd: &str, project_path: &str) -> bool {
    let w = normalize_path(workflow_cwd);
    let p = normalize_path(project_path);
    w == p || w.starts_with(&format!("{}/", p)) || p.starts_with(&format!("{}/", w))
}

// ── Loading ──────────────────────────────────────────────────────────

fn load_index_json(cwd: &str, dir_hash: &str) -> Option<IndexFile> {
    // Convention: .stelow/<date>/<dirHash>/index.json (latest if multiple dates).
    let stelow_dir = PathBuf::from(cwd).join(".stelow");
    if !stelow_dir.is_dir() { return None; }
    let date_dirs = fs::read_dir(&stelow_dir).ok()?;
    let mut candidates: Vec<PathBuf> = Vec::new();
    for date_entry in date_dirs.flatten() {
        let date_path = date_entry.path();
        if !date_path.is_dir() { continue; }
        // Must match YYYY-MM-DD
        if let Some(name) = date_path.file_name().and_then(|n| n.to_str()) {
            if !name.starts_with("20") || name.len() < 10 { continue; }
        }
        let idx = date_path.join(dir_hash).join("index.json");
        if idx.is_file() {
            candidates.push(idx);
        }
    }
    // Sort by date (lexicographic works for ISO YYYY-MM-DD), pick latest.
    candidates.sort();
    let latest = candidates.last()?;
    let text = fs::read_to_string(latest).ok()?;
    serde_json::from_str(&text).ok()
}

fn entry_to_workflow(e: WorkflowEntry, project_path: &str) -> Option<Workflow> {
    // Convention over configuration: filter out archived workflows from list.
    // (Muxy does the same — isHiddenWorkflowStatus.)
    if matches!(e.status.as_str(), "archived" | "aborted" | "stopped" | "cancelled" | "canceled") {
        return None;
    }
    // Filter: cwd must be inside the project worktree (muxy semantics).
    if !cwd_matches(&e.cwd, project_path) {
        return None;
    }
    // Load draft + scopes from index.json (if dir_hash present).
    let (draft, scopes, current_phase_index) = if !e.dir_hash.is_empty() {
        if let Some(idx) = load_index_json(&e.cwd, &e.dir_hash) {
            let scopes = idx.scopes.into_iter().map(|s| Scope {
                id: s.id,
                name: s.name,
                scope_type: s.scope_type,
                status: ScopeStatus::from_str(&s.status),
                iteration: s.iteration,
                max_iterations: s.max_iterations,
            }).collect();
            (idx.draft, scopes, idx.current_phase_index)
        } else {
            (String::new(), Vec::new(), e.current_phase)
        }
    } else {
        (String::new(), Vec::new(), e.current_phase)
    };

    Some(Workflow {
        name: e.name,
        status: if e.status.is_empty() { "unknown".into() } else { e.status },
        current_phase: current_phase_index,
        draft,
        scopes,
    })
}

fn load_project_workflows(project_path: &str) -> Vec<Workflow> {
    // Project-local stelow.json — primary source (same worktree).
    let mut entries: Vec<WorkflowEntry> = Vec::new();
    let project_path_buf = PathBuf::from(project_path);
    let project_stelow = project_path_buf.join("stelow.json");
    if let Ok(text) = fs::read_to_string(&project_stelow) {
        if let Ok(t) = serde_json::from_str::<TrackingFile>(&text) {
            entries.extend(t.workflows);
        }
    }

    // Filter at the source: only workflows whose cwd is inside this worktree.
    entries
        .into_iter()
        .filter_map(|e| entry_to_workflow(e, project_path))
        .collect()
}

// ── Change detection (cheap signature) ──

fn signature(root: &Path) -> String {
    let mut s = String::new();
    // stelow.json
    if let Ok(meta) = fs::metadata(root.join("stelow.json")) {
        s.push_str(&format!(
            "{}:{}:{}|",
            "stelow.json",
            meta.len(),
            meta.modified().ok().and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map(|d| d.as_secs()).unwrap_or(0),
        ));
    }
    // Each .stelow/<date>/<dirHash>/index.json — recursive walk
    let stelow = root.join(".stelow");
    if let Ok(rd) = fs::read_dir(&stelow) {
        for date_entry in rd.flatten() {
            let dp = date_entry.path();
            if !dp.is_dir() { continue; }
            if let Ok(rd2) = fs::read_dir(&dp) {
                for wf_entry in rd2.flatten() {
                    let wp = wf_entry.path();
                    if !wp.is_dir() { continue; }
                    let idx = wp.join("index.json");
                    if let Ok(meta) = fs::metadata(&idx) {
                        s.push_str(&format!(
                            "{}:{}:{}|",
                            idx.display(),
                            meta.len(),
                            meta.modified().ok().and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map(|d| d.as_secs()).unwrap_or(0),
                        ));
                    }
                }
            }
        }
    }
    s
}

// ── project_root resolution ──
// Convention (matches muxy + herdr runtime):
//   1. focused_pane_cwd (the pane the user is looking at — their project)
//   2. workspace_cwd (the tab's working directory)
//   3. HERDR_PLUGIN_ROOT (last-resort fallback — the plugin source dir
//      is never the right answer for "what workflow am I showing", but
//      it's a sane default when nothing else is available)
// The context is loaded once from HERDR_PLUGIN_CONTEXT_JSON (herdr runtime
// passes this env var on every plugin spawn); passing `ctx` rather than
// re-reading env keeps the function pure and avoids a second source of truth.
fn project_root(ctx: &PluginContext) -> PathBuf {
    if let Some(c) = &ctx.focused_pane_cwd {
        if !c.is_empty() { return PathBuf::from(c); }
    }
    if let Some(c) = &ctx.workspace_cwd {
        if !c.is_empty() { return PathBuf::from(c); }
    }
    env::var("HERDR_PLUGIN_ROOT").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("."))
}

// ── project_workflow_root: MIRROR of extensions/stelow/workflow-root.ts ──
//
// Finds the project root that owns the workflow state for `cwd`. Used to
// validate that herdr's `workspace_cwd` is the actual project root, not a
// subdir that should be resolved.
//
// Algorithm (must match the TS implementation):
//   1. cwd has its own tracking (`.stelow/` or `stelow.json`) → it IS the project.
//   2. Walk up to git toplevel of cwd — if a parent has tracking, use it.
//   3. cwd as fallback.
//
// Why step 2 needs git: the previous logic climbed up to ANY parent that had
// tracking, falsely attributing a sibling project's workflow state to the
// current cwd. The git-toplevel check ensures we only climb when the parent
// is the git ancestor of cwd (the original intent: "user is in src/ of a
// repo, tracking at repo root").
//
// Today this is unused (project_root returns ctx.workspace_cwd directly,
// which is what herdr runtime hands us). Kept for parity with the extension
// and as documentation of the contract.
//
// If you change this function, also update extensions/stelow/workflow-root.ts.
#[allow(dead_code)] // Reserved for parity with the TS implementation; not yet wired into project_root().
fn project_workflow_root(cwd: &Path) -> PathBuf {
    if has_tracking(cwd) {
        return cwd.to_path_buf();
    }
    if let Some(git_root) = git_toplevel(cwd) {
        if git_root != cwd && has_tracking(&git_root) {
            return git_root;
        }
    }
    cwd.to_path_buf()
}

/// Does `dir` contain workflow tracking files?
#[allow(dead_code)]
fn has_tracking(dir: &Path) -> bool {
    dir.join(".stelow").is_dir() || dir.join("stelow.json").is_file()
}

/// Run `git rev-parse --show-toplevel` to find the git repo root.
/// Returns None if cwd is not inside a git repo or git isn't available.
#[allow(dead_code)]
fn git_toplevel(cwd: &Path) -> Option<PathBuf> {
    use std::process::Command;
    let output = Command::new("git")
        .arg("rev-parse")
        .arg("--show-toplevel")
        .current_dir(cwd)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let s = String::from_utf8(output.stdout).ok()?;
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(PathBuf::from(trimmed))
}

// ── App ─────────────────────────────────────────────────────────────

struct App {
    workflows: Vec<Workflow>,
    wf_state: ListState,
    ctx: PluginContext,
    last_load: Instant,
    last_signature: String,
    should_quit: bool,
    show_help: bool,
    flash: Option<(String, Instant)>,
}

impl App {
    fn new(ctx: PluginContext) -> Self {
        let root = project_root(&ctx);
        let cwd_str = root.to_string_lossy().to_string();
        let workflows = load_project_workflows(&cwd_str);
        let mut wf_state = ListState::default();
        if !workflows.is_empty() {
            wf_state.select(Some(0));
        }
        Self {
            workflows,
            wf_state,
            ctx,
            last_load: Instant::now(),
            last_signature: signature(&root),
            should_quit: false,
            show_help: false,
            flash: None,
        }
    }

    fn selected_workflow(&self) -> Option<&Workflow> {
        self.wf_state.selected().and_then(|i| self.workflows.get(i))
    }

    fn refresh_if_stale(&mut self, force: bool) {
        let root = project_root(&self.ctx);
        let sig = signature(&root);
        if !force && sig == self.last_signature {
            return;
        }
        self.last_signature = sig.clone();
        let cwd_str = root.to_string_lossy().to_string();
        let prev_name = self.wf_state.selected()
            .and_then(|i| self.workflows.get(i).map(|w| w.name.clone()));
        let new_wfs = load_project_workflows(&cwd_str);
        self.workflows = new_wfs;
        if let Some(name) = prev_name {
            if let Some(i) = self.workflows.iter().position(|w| w.name == name) {
                self.wf_state.select(Some(i));
            }
        } else if !self.workflows.is_empty() {
            self.wf_state.select(Some(0));
        }
        self.last_load = Instant::now();
        self.flash = Some((
            if force { "Refreshed (manual)".into() } else { "Refreshed (auto)".into() },
            Instant::now(),
        ));
    }

    fn move_workflow(&mut self, delta: i32) {
        if self.workflows.is_empty() { return; }
        let len = self.workflows.len() as i32;
        let cur = self.wf_state.selected().unwrap_or(0) as i32;
        let next = (cur + delta).rem_euclid(len) as usize;
        self.wf_state.select(Some(next));
    }

    fn on_key(&mut self, key: KeyEvent) {
        if self.show_help {
            self.show_help = false;
            return;
        }
        match key.code {
            KeyCode::Char('q') | KeyCode::Esc => self.should_quit = true,
            KeyCode::Char('?') => self.show_help = !self.show_help,
            // Workflow navigation
            KeyCode::Tab | KeyCode::Char('w') => self.move_workflow(1),
            KeyCode::BackTab => self.move_workflow(-1),
            KeyCode::Char('J') | KeyCode::Char(']') => self.move_workflow(1),
            KeyCode::Char('K') | KeyCode::Char('[') => self.move_workflow(-1),
            KeyCode::Down | KeyCode::Char('j') => self.move_workflow(1),
            KeyCode::Up | KeyCode::Char('k') => self.move_workflow(-1),
            KeyCode::Char('r') => self.refresh_if_stale(true),
            _ => {}
        }
    }

    fn on_mouse(&mut self, mouse: MouseEvent, areas: MouseAreas) {
        if !matches!(mouse.kind, MouseEventKind::Down(MouseButton::Left)) {
            return;
        }
        if rect_contains(areas.workflows, mouse.column, mouse.row) {
            let row = mouse.row.saturating_sub(areas.workflows.y + 1) as usize;
            if row < self.workflows.len() {
                self.wf_state.select(Some(row));
            }
        }
    }
}

struct MouseAreas {
    workflows: Rect,
}

fn rect_contains(rect: Rect, col: u16, row: u16) -> bool {
    col >= rect.x && col < rect.x + rect.width && row >= rect.y && row < rect.y + rect.height
}

// ── UI ──────────────────────────────────────────────────────────────

fn ui(f: &mut Frame, app: &mut App) -> MouseAreas {
    if app.show_help {
        ui_help(f);
        return MouseAreas { workflows: Rect::default() };
    }
    let area = f.area();
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),  // header
            Constraint::Min(10),    // main 2-column body
            Constraint::Length(3),  // commands
            Constraint::Length(3),  // footer
        ])
        .split(area);

    // ── Header ──
    let project = project_root(&app.ctx);
    let project_name = project.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "?".into());
    let header = Paragraph::new(Line::from(vec![
        Span::styled("Stelow Board", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)),
        Span::raw("  "),
        Span::styled(env!("CARGO_PKG_VERSION"), Style::default().fg(Color::DarkGray)),
        Span::raw("   "),
        Span::styled(
            format!("{} · {} workflow(s)", project_name, app.workflows.len()),
            Style::default().fg(Color::DarkGray),
        ),
    ]))
    .block(Block::default().borders(Borders::ALL).title(" Stelow "));
    f.render_widget(header, chunks[0]);

    // ── Body: 2 columns ──
    let body = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(40), Constraint::Percentage(60)])
        .split(chunks[1]);

    let workflows_area = render_workflows(f, app, body[0]);
    render_detail(f, app, body[1]);

    // ── Commands ──
    let mut cmd_spans = vec![
        Span::styled("[Tab/j/k]", Style::default().fg(Color::Cyan)),
        Span::raw(" workflow  "),
        Span::styled("[r]", Style::default().fg(Color::Cyan)),
        Span::raw(" refresh  "),
        Span::styled("[?]", Style::default().fg(Color::Cyan)),
        Span::raw(" help  "),
        Span::styled("[q]", Style::default().fg(Color::Cyan)),
        Span::raw(" quit"),
    ];
    if let Some((ref msg, ref when)) = app.flash {
        if when.elapsed() < Duration::from_secs(3) {
            cmd_spans.push(Span::raw("   "));
            cmd_spans.push(Span::styled(msg.clone(), Style::default().fg(Color::Green)));
        }
    }
    let cmds = Paragraph::new(Line::from(cmd_spans))
        .block(Block::default().borders(Borders::ALL).title(" Commands "));
    f.render_widget(cmds, chunks[2]);

    // ── Footer ──
    let cwd = app.ctx.focused_pane_cwd.as_deref()
        .or(app.ctx.workspace_cwd.as_deref())
        .unwrap_or("?");
    let cwd_display = if cwd.len() > 60 {
        format!("...{}", &cwd[cwd.len()-57..])
    } else {
        cwd.to_string()
    };
    let ws = app.ctx.workspace_id.as_deref().unwrap_or("?");
    let footer = Paragraph::new(format!(
        "ws={}  cwd={}  auto-refresh 2s",
        ws, cwd_display
    ))
    .block(Block::default().borders(Borders::ALL).title(" Context "))
    .style(Style::default().fg(Color::DarkGray));
    f.render_widget(footer, chunks[3]);

    MouseAreas { workflows: workflows_area }
}

// ── Left column: Workflows list ──────────────────────────────────────

fn render_workflows(f: &mut Frame, app: &mut App, area: Rect) -> Rect {
    let items: Vec<ListItem> = if app.workflows.is_empty() {
        vec![ListItem::new(Line::from(vec![
            Span::raw("  "),
            Span::styled("No workflows in this worktree.", Style::default().fg(Color::DarkGray)),
        ]))]
    } else {
        app.workflows.iter().map(|w| {
            let (glyph, color) = match w.status.as_str() {
                "in-progress" => ("▶ ", Color::Yellow),
                "paused"      => ("⏸ ", Color::Magenta),
                "completed"   => ("✓ ", Color::Green),
                _             => ("· ", Color::DarkGray),
            };
            let scope_count = w.scopes.len();
            let done = w.scopes.iter().filter(|s| s.status == ScopeStatus::Completed).count();
            let suffix = if scope_count > 0 {
                format!("  ({}/{} sc)", done, scope_count)
            } else {
                String::new()
            };
            ListItem::new(Line::from(vec![
                Span::styled(glyph, Style::default().fg(color).add_modifier(Modifier::BOLD)),
                Span::styled(truncate(&w.name, 36), Style::default().fg(color)),
                Span::styled(suffix, Style::default().fg(Color::DarkGray)),
            ]))
        }).collect()
    };
    let title = if app.workflows.is_empty() {
        " Workflows (this worktree) ".to_string()
    } else {
        format!(" Workflows ({}) ", app.workflows.len())
    };
    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title(title))
        .highlight_style(Style::default().add_modifier(Modifier::REVERSED))
        .highlight_symbol("▶ ");
    f.render_stateful_widget(list, area, &mut app.wf_state);
    area
}

// ── Right column: detail card + scopes list ─────────────────────────

fn render_detail(f: &mut Frame, app: &mut App, area: Rect) {
    let right = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            // Detail card: ~30% of available height, min 6 lines, max 12.
            Constraint::Length(8),
            Constraint::Min(5),
        ])
        .split(area);

    render_detail_card(f, app, right[0]);
    render_scopes(f, app, right[1]);
}

fn render_detail_card(f: &mut Frame, app: &mut App, area: Rect) {
    let wf = match app.selected_workflow() {
        Some(w) => w,
        None => {
            let p = Paragraph::new(Line::from(Span::styled(
                "  Select a workflow on the left to see its details.",
                Style::default().fg(Color::DarkGray),
            )))
            .block(Block::default().borders(Borders::ALL).title(" Detail "));
            f.render_widget(p, area);
            return;
        }
    };

    // ── Top line: name + status badge ──
    let (status_glyph, status_color) = match wf.status.as_str() {
        "in-progress" => ("▶ IN PROGRESS", Color::Yellow),
        "paused"      => ("⏸ PAUSED", Color::Magenta),
        "completed"   => ("✓ COMPLETED", Color::Green),
        _             => ("· UNKNOWN", Color::DarkGray),
    };
    let stage_label = wf.current_stage_name();
    let current_scope_label = wf.current_scope()
        .map(|s| truncate(&format!("{}: {}", s.id, s.name), 36))
        .unwrap_or_else(|| "—".into());

    // ── Prompt (truncated to ~200 chars) ──
    let prompt = if wf.draft.is_empty() {
        "  (no prompt recorded)".to_string()
    } else {
        let first = wf.draft.lines().next().unwrap_or("").trim();
        if first.len() > 200 {
            format!("  {}…", &first[..200])
        } else {
            format!("  {}", first)
        }
    };

    let lines = vec![
        Line::from(vec![
            Span::styled("● ", Style::default().fg(status_color).add_modifier(Modifier::BOLD)),
            Span::styled(truncate(&wf.name, 36), Style::default().fg(Color::White).add_modifier(Modifier::BOLD)),
            Span::raw("  "),
            Span::styled(status_glyph, Style::default().fg(status_color)),
        ]),
        Line::from(vec![
            Span::styled("Prompt: ", Style::default().fg(Color::Cyan)),
            Span::styled(prompt, Style::default().fg(Color::White)),
        ]),
        Line::from(vec![
            Span::styled("Stage:  ", Style::default().fg(Color::Cyan)),
            Span::styled(stage_label, Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::raw("    "),
            Span::styled("Scope: ", Style::default().fg(Color::Cyan)),
            Span::styled(current_scope_label, Style::default().fg(Color::White)),
        ]),
    ];
    let block = Block::default().borders(Borders::ALL)
        .title(format!(" {} ", truncate(&wf.name, 28)));
    let p = Paragraph::new(lines).block(block).wrap(Wrap { trim: true });
    f.render_widget(p, area);
}

fn render_scopes(f: &mut Frame, app: &mut App, area: Rect) {
    let wf = match app.selected_workflow() {
        Some(w) => w,
        None => {
            let p = Paragraph::new(Line::from(Span::styled(
                "  No workflow selected.",
                Style::default().fg(Color::DarkGray),
            )))
            .block(Block::default().borders(Borders::ALL).title(" Scopes "));
            f.render_widget(p, area);
            return;
        }
    };

    if wf.scopes.is_empty() {
        let msg = if wf.current_phase < 12 {
            format!("  Workflow is in '{}' — scopes appear in Execution.", wf.current_stage_name())
        } else {
            "  No scopes found in index.json.".to_string()
        };
        let p = Paragraph::new(Line::from(Span::styled(
            msg,
            Style::default().fg(Color::DarkGray),
        )))
        .block(Block::default().borders(Borders::ALL).title(" Scopes "))
        .wrap(Wrap { trim: true });
        f.render_widget(p, area);
        return;
    }

    let items: Vec<ListItem> = wf.scopes.iter().map(|s| {
        let (glyph, color) = s.status.glyph();
        let type_str = if s.scope_type.is_empty() {
            String::new()
        } else {
            format!("  [{}]", s.scope_type)
        };
        let iter_str = match (s.iteration, s.max_iterations) {
            (Some(i), Some(m)) => format!("  (iter {}/{})", i, m),
            (Some(i), None)    => format!("  (iter {})", i),
            _ => String::new(),
        };
        ListItem::new(Line::from(vec![
            Span::styled(glyph, Style::default().fg(color).add_modifier(Modifier::BOLD)),
            Span::styled(format!("{:<10}", s.id), Style::default().fg(Color::DarkGray)),
            Span::styled(truncate(&s.name, 50), Style::default().fg(color)),
            Span::styled(type_str, Style::default().fg(Color::Magenta)),
            Span::styled(iter_str, Style::default().fg(Color::DarkGray)),
        ]))
    }).collect();

    let done = wf.scopes.iter().filter(|s| s.status == ScopeStatus::Completed).count();
    let total = wf.scopes.len();
    let title = format!(" Scopes ({}/{}) ", done, total);
    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title(title));
    f.render_widget(list, area);
}

// ── Help ────────────────────────────────────────────────────────────

fn ui_help(f: &mut Frame) {
    let block = Block::default()
        .borders(Borders::ALL)
        .title(" Stelow Board — Help (press any key to dismiss) ");
    let area = centered_rect(80, 75, f.area());
    let text = vec![
        Line::from(Span::styled("Source of truth", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))),
        Line::from("  Reads:  stelow.json (root) — filtered by worktree cwd"),
        Line::from("          .stelow/<date>/<dirHash>/index.json — draft + scopes"),
        Line::from("  Auto-refresh: 2s polling (mtime+size of tracking files)"),
        Line::from(""),
        Line::from(Span::styled("Worktree filter (mirrors muxy)", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))),
        Line::from("  A workflow is shown only if its cwd matches the project cwd"),
        Line::from("  exactly, or one is a sub-path of the other."),
        Line::from(""),
        Line::from(Span::styled("Keybindings", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))),
        Line::from("  Tab / w / j / ↓      Next workflow"),
        Line::from("  Shift+Tab / k / ↑   Previous workflow"),
        Line::from("  J / ]                Next workflow"),
        Line::from("  K / [                Previous workflow"),
        Line::from("  r                    Manual refresh"),
        Line::from("  ?                    Toggle this help overlay"),
        Line::from("  q / Esc              Quit (close pane)"),
        Line::from(""),
        Line::from(Span::styled("Mouse", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))),
        Line::from("  Click a workflow row → select it"),
        Line::from(""),
        Line::from(Span::styled("Stages (PHASE_NAMES from stelow/types.ts)", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))),
        Line::from(format!("  {}", PHASE_NAMES.join(" → "))),
        Line::from(""),
        Line::from(Span::styled("Scope status glyphs", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))),
        Line::from("  ·   pending     ▶  in-progress     ✓  completed"),
        Line::from("  ⚠   escalated   ✗  failed"),
    ];
    let p = Paragraph::new(text).block(block).wrap(Wrap { trim: true });
    f.render_widget(p, area);
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);
    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        let mut out: String = s.chars().take(max.saturating_sub(1)).collect();
        out.push('…');
        out
    }
}

// ── Main ───────────────────────────────────────────────────────────

fn main() -> Result<()> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let ctx = read_context();
    let mut app = App::new(ctx);

    let auto_refresh_interval = Duration::from_secs(2);
    let input_poll = Duration::from_millis(500);

    loop {
        let mut areas = MouseAreas { workflows: Rect::default() };
        terminal.draw(|f| { areas = ui(f, &mut app); })?;

        if event::poll(input_poll)? {
            match event::read()? {
                Event::Key(key) => app.on_key(key),
                Event::Mouse(mouse) => {
                    if matches!(mouse.kind, MouseEventKind::Down(MouseButton::Left)) {
                        app.on_mouse(mouse, areas);
                    }
                }
                Event::Resize(_, _) => {}
                _ => {}
            }
        } else if app.last_load.elapsed() >= auto_refresh_interval {
            app.refresh_if_stale(false);
        }

        if app.should_quit { break; }
    }

    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen, DisableMouseCapture)?;
    Ok(())
}

fn read_context() -> PluginContext {
    let raw = env::var("HERDR_PLUGIN_CONTEXT_JSON").unwrap_or_default();
    serde_json::from_str(&raw).unwrap_or(PluginContext {
        workspace_id: None,
        workspace_cwd: None,
        focused_pane_id: None,
        focused_pane_cwd: None,
    })
}