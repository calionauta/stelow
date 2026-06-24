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
use std::{env, fs, io, path::PathBuf, time::Duration};

/// Context injected by herdr via HERDR_PLUGIN_CONTEXT_JSON.
#[derive(Debug, Deserialize)]
struct PluginContext {
    workspace_id: Option<String>,
    workspace_cwd: Option<String>,
    #[allow(dead_code)]
    focused_pane_id: Option<String>,
    focused_pane_cwd: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Status { Done, Active, Pending, Blocked }

#[derive(Debug, Clone)]
struct Stage {
    id: String,
    label: String,
    status: Status,
}

impl Stage {
    fn new(id: &str, label: &str, status: Status) -> Self {
        Self { id: id.to_string(), label: label.to_string(), status }
    }
}



struct App {
    stages: Vec<Stage>,
    list_state: ListState,
    ctx: PluginContext,
    should_quit: bool,
    show_help: bool,
    #[allow(dead_code)]
    status_message: Option<(String, std::time::Instant)>,
}

impl App {
    fn new(ctx: PluginContext) -> Self {
        let mut list_state = ListState::default();
        list_state.select(Some(0));
        let stages = load_stages(ctx.workspace_cwd.as_deref())
            .unwrap_or_else(default_stages);
        Self {
            stages,
            list_state,
            ctx,
            should_quit: false,
            show_help: false,
            status_message: None,
        }
    }

    fn on_key(&mut self, key: KeyEvent) {
        if self.show_help {
            self.show_help = false;
            return;
        }

        match key.code {
            KeyCode::Char('q') => self.should_quit = true,
            KeyCode::Esc => self.should_quit = true,  // Esc = quit at top level
            KeyCode::Char('?') => self.show_help = true,
            KeyCode::Char('j') | KeyCode::Down => self.move_selection(1),
            KeyCode::Char('k') | KeyCode::Up => self.move_selection(-1),
            KeyCode::Char('r') => {
                self.stages = load_stages(self.ctx.workspace_cwd.as_deref())
                    .unwrap_or_else(default_stages);
                self.flash("Refreshed");
            }
            KeyCode::Char(' ') => {
                self.toggle_selected();
                self.flash("Status toggled");
            }
            _ => {}
        }
    }

    fn on_mouse(&mut self, mouse: MouseEvent, list_area: Rect) {
        if !matches!(mouse.kind, MouseEventKind::Down(MouseButton::Left)) {
            return;
        }
        if !rect_contains(list_area, mouse.column, mouse.row) {
            return;
        }
        let row = mouse.row.saturating_sub(list_area.y + 1) as usize;  // +1 for border
        if row < self.stages.len() {
            self.list_state.select(Some(row));
        }
    }

    fn move_selection(&mut self, delta: i32) {
        let len = self.stages.len() as i32;
        if len == 0 { return; }
        let current = self.list_state.selected().unwrap_or(0) as i32;
        let next = (current + delta).rem_euclid(len) as usize;
        self.list_state.select(Some(next));
    }

    fn toggle_selected(&mut self) {
        if let Some(idx) = self.list_state.selected() {
            if let Some(stage) = self.stages.get_mut(idx) {
                stage.status = match stage.status {
                    Status::Done | Status::Active => Status::Pending,
                    Status::Pending | Status::Blocked => Status::Done,
                };
            }
        }
    }

    fn flash(&mut self, msg: &str) {
        self.status_message = Some((msg.to_string(), std::time::Instant::now()));
    }
}

fn rect_contains(rect: Rect, col: u16, row: u16) -> bool {
    col >= rect.x && col < rect.x + rect.width && row >= rect.y && row < rect.y + rect.height
}

fn main() -> Result<()> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let ctx = read_context();
    let mut app = App::new(ctx);

    loop {
        let mut list_area = Rect::default();
        terminal.draw(|f| { list_area = ui(f, &mut app); })?;

        if event::poll(Duration::from_millis(250))? {
            match event::read()? {
                Event::Key(key) => app.on_key(key),
                Event::Mouse(mouse) => {
                    if matches!(mouse.kind, MouseEventKind::Down(MouseButton::Left)) {
                        app.on_mouse(mouse, list_area);
                    }
                }
                Event::Resize(_, _) => {}  // ratatui handles on next draw
                _ => {}
            }
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
        workspace_id: None, workspace_cwd: None,
        focused_pane_id: None, focused_pane_cwd: None,
    })
}

/// Attempt to load workflow stages from `.stelow/` in the workspace cwd.
/// Falls back to default stages if no `.stelow/` directory is found.
fn load_stages(cwd: Option<&str>) -> Option<Vec<Stage>> {
    let cwd = cwd?;
    let stelow_dir = PathBuf::from(cwd).join(".stelow");
    if !stelow_dir.is_dir() {
        return None;
    }

    // Try to read current-stage.json for the active stage
    let current_stage = fs::read_to_string(stelow_dir.join("state/current-stage.json"))
        .ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| v.get("stage")?.as_str().map(String::from));

    Some(default_stages().into_iter().map(|mut s| {
        if Some(&s.id) == current_stage.as_ref() {
            s.status = Status::Active;
        }
        s
    }).collect())
}

fn default_stages() -> Vec<Stage> {
    vec![
        Stage::new("discovery",      "Discovery",       Status::Done),
        Stage::new("shape-up",       "Shape Up",        Status::Done),
        Stage::new("tech-planning",  "Tech Planning",   Status::Active),
        Stage::new("spec-product",   "Spec Product",    Status::Pending),
        Stage::new("scope-execute",  "Scope & Execute", Status::Pending),
        Stage::new("testing",        "Testing",         Status::Pending),
        Stage::new("critique",       "Critique",        Status::Pending),
    ]
}

fn ui(f: &mut Frame, app: &mut App) -> Rect {
    if app.show_help {
        ui_help(f, app);
        return f.area();
    }

    let area = f.area();
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Length(7),
            Constraint::Min(6),
            Constraint::Length(3),
            Constraint::Length(3),
        ])
        .split(area);

    // header
    let header = Paragraph::new(Line::from(vec![
        Span::styled("Stelow Board", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)),
        Span::raw("  "),
        Span::styled(env!("CARGO_PKG_VERSION"), Style::default().fg(Color::DarkGray)),
    ]))
    .block(Block::default().borders(Borders::ALL).title(" Panel "));
    f.render_widget(header, chunks[0]);

    // current stage card
    let current = app.stages.iter().find(|s| s.status == Status::Active).cloned();
    let card = match current {
        Some(s) => Paragraph::new(vec![
            Line::from(vec![
                Span::styled("Now: ", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
                Span::styled(s.label, Style::default().fg(Color::White).add_modifier(Modifier::BOLD)),
            ]),
            Line::from(format!("Stage id: {}", s.id)),
        ])
        .block(Block::default().borders(Borders::ALL).title(" Current "))
        .wrap(Wrap { trim: true }),
        None => Paragraph::new("No active stage detected.")
            .block(Block::default().borders(Borders::ALL).title(" Current ")),
    };
    f.render_widget(card, chunks[1]);

    // stages list
    let items: Vec<ListItem> = app.stages.iter().map(|s| {
        let (glyph, color) = match s.status {
            Status::Done    => ("✓ ", Color::Green),
            Status::Active  => ("▶ ", Color::Yellow),
            Status::Pending => ("· ", Color::DarkGray),
            Status::Blocked => ("! ", Color::Red),
        };
        ListItem::new(Line::from(vec![
            Span::styled(glyph, Style::default().fg(color).add_modifier(Modifier::BOLD)),
            Span::styled(&s.label, Style::default().fg(color)),
        ]))
    }).collect();
    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title(" Stages "))
        .highlight_style(Style::default().add_modifier(Modifier::REVERSED));
    f.render_stateful_widget(list, chunks[2], &mut app.list_state);

    // commands
    let cmds_text = if let Some((msg, _)) = &app.status_message {
        vec![
            Span::styled(msg, Style::default().fg(Color::Green)),
            Span::raw("    "),
            Span::styled("[j/k]", Style::default().fg(Color::Cyan)), Span::raw(" move  "),
            Span::styled("[space]", Style::default().fg(Color::Cyan)), Span::raw(" toggle  "),
            Span::styled("[r]", Style::default().fg(Color::Cyan)), Span::raw(" refresh  "),
            Span::styled("[?]", Style::default().fg(Color::Cyan)), Span::raw(" help  "),
            Span::styled("[q]", Style::default().fg(Color::Cyan)), Span::raw(" quit"),
        ]
    } else {
        vec![
            Span::styled("[j/k]", Style::default().fg(Color::Cyan)), Span::raw(" move  "),
            Span::styled("[space]", Style::default().fg(Color::Cyan)), Span::raw(" toggle  "),
            Span::styled("[r]", Style::default().fg(Color::Cyan)), Span::raw(" refresh  "),
            Span::styled("[?]", Style::default().fg(Color::Cyan)), Span::raw(" help  "),
            Span::styled("[q]", Style::default().fg(Color::Cyan)), Span::raw(" quit"),
        ]
    };
    let cmds = Paragraph::new(Line::from(cmds_text))
        .block(Block::default().borders(Borders::ALL).title(" Commands "));
    f.render_widget(cmds, chunks[3]);

    // footer
    let cwd = app.ctx.focused_pane_cwd.as_deref()
        .or(app.ctx.workspace_cwd.as_deref())
        .unwrap_or("?");
    let cwd_display = if cwd.len() > 60 {
        format!("...{}", &cwd[cwd.len()-57..])
    } else {
        cwd.to_string()
    };
    let ws = app.ctx.workspace_id.as_deref().unwrap_or("?");
    let footer = Paragraph::new(format!("ws={}  cwd={}", ws, cwd_display))
        .block(Block::default().borders(Borders::ALL).title(" Context "))
        .style(Style::default().fg(Color::DarkGray));
    f.render_widget(footer, chunks[4]);

    chunks[2]
}

fn ui_help(f: &mut Frame, app: &App) {
    let block = Block::default()
        .borders(Borders::ALL)
        .title(" Stelow Board — Help (press any key to dismiss) ");
    let area = centered_rect(80, 70, f.area());
    let text = vec![
        Line::from(Span::styled("Keybindings", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))),
        Line::from(""),
        Line::from("  j / ↓          Next stage"),
        Line::from("  k / ↑          Previous stage"),
        Line::from("  Space          Toggle status (Done ↔ Pending)"),
        Line::from("  r              Refresh from .stelow/ state"),
        Line::from("  ?              Toggle this help overlay"),
        Line::from("  q / Esc        Quit (close the pane)"),
        Line::from(""),
        Line::from(Span::styled("Mouse", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))),
        Line::from(""),
        Line::from("  Click row      Select that stage"),
        Line::from(""),
        Line::from(Span::styled("Status glyphs", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))),
        Line::from(""),
        Line::from("  ✓   Done"),
        Line::from("  ▶   Active (current)"),
        Line::from("  ·   Pending"),
        Line::from("  !   Blocked (human review needed)"),
        Line::from(""),
        Line::from(Span::styled("About", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))),
        Line::from(""),
        Line::from(format!("  Version:   {}", env!("CARGO_PKG_VERSION"))),
        Line::from(format!("  Stages:    {} loaded", app.stages.len())),
        Line::from("  Source:    integrations/herdr/stelow-board/"),
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