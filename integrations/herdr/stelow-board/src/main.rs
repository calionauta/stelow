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
use std::{env, io, process::Command, time::Duration};

/// Context injected by herdr via HERDR_PLUGIN_CONTEXT_JSON.
#[derive(Debug, Deserialize)]
struct PluginContext {
    workspace_id: Option<String>,
    workspace_cwd: Option<String>,
    focused_pane_id: Option<String>,
    focused_pane_cwd: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Status { Done, Active, Pending, Blocked }

#[derive(Debug)]
struct Stage {
    id: &'static str,
    label: &'static str,
    status: Status,
}

enum View {
    Overview,
    ProjectDetail { project_id: String },
    ScopeDetail { project_id: String, scope_id: String },
}

struct App {
    view: View,
    stages: Vec<Stage>,
    list_state: ListState,
    ctx: PluginContext,
    should_quit: bool,
}

impl App {
    fn new(ctx: PluginContext) -> Self {
        let mut list_state = ListState::default();
        list_state.select(Some(0));
        Self {
            view: View::Overview,
            stages: default_stages(),
            list_state,
            ctx,
            should_quit: false,
        }
    }

    fn on_key(&mut self, key: KeyEvent) {
        match key.code {
            KeyCode::Char('q') | KeyCode::Esc => self.should_quit = true,
            KeyCode::Char('j') | KeyCode::Down => self.move_selection(1),
            KeyCode::Char('k') | KeyCode::Up => self.move_selection(-1),
            KeyCode::Char('r') => self.stages = default_stages(),
            _ => {}
        }
    }

    fn on_mouse(&mut self, _mouse: MouseEvent, _list_area: Rect) {
        // Hit-test math here in the real implementation.
        // MouseEventKind::Down(Left) + (col, row) inside list_area →
        //   compute row index, call drill_in / toggle.
    }

    fn move_selection(&mut self, delta: i32) {
        let len = self.stages.len() as i32;
        if len == 0 { return; }
        let current = self.list_state.selected().unwrap_or(0) as i32;
        let next = (current + delta).rem_euclid(len) as usize;
        self.list_state.select(Some(next));
    }
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
        let list_area = terminal.draw(|f| ui(f, &mut app))?;

        if event::poll(Duration::from_millis(250))? {
            match event::read()? {
                Event::Key(key) => app.on_key(key),
                Event::Mouse(mouse) => {
                    if matches!(mouse.kind, MouseEventKind::Down(MouseButton::Left)) {
                        app.on_mouse(mouse, list_area);
                    }
                }
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

fn default_stages() -> Vec<Stage> {
    vec![
        Stage { id: "discovery",      label: "Discovery",       status: Status::Done },
        Stage { id: "shape-up",       label: "Shape Up",        status: Status::Done },
        Stage { id: "tech-planning",  label: "Tech Planning",   status: Status::Active },
        Stage { id: "spec-product",   label: "Spec Product",    status: Status::Pending },
        Stage { id: "scope-execute",  label: "Scope & Execute", status: Status::Pending },
        Stage { id: "testing",        label: "Testing",         status: Status::Pending },
        Stage { id: "critique",       label: "Critique",        status: Status::Pending },
    ]
}

fn ui(f: &mut Frame, app: &mut App) -> Rect {
    let area = f.area();
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Length(7),
            Constraint::Min(8),
            Constraint::Length(3),
            Constraint::Length(3),
        ])
        .split(area);

    // header
    let header = Paragraph::new(Line::from(vec![
        Span::styled("Stelow Board", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)),
        Span::raw("  "),
        Span::styled("v0.1.0", Style::default().fg(Color::DarkGray)),
    ]))
    .block(Block::default().borders(Borders::ALL).title(" Panel "));
    f.render_widget(header, chunks[0]);

    // current stage card
    let current = app.stages.iter().find(|s| matches!(s.status, Status::Active)).copied();
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
        None => Paragraph::new("No active stage.")
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
            Span::styled(s.label, Style::default().fg(color)),
        ]))
    }).collect();
    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title(" Stages "))
        .highlight_style(Style::default().add_modifier(Modifier::REVERSED));
    f.render_stateful_widget(list, chunks[2], &mut app.list_state);

    // commands
    let cmds = Paragraph::new(Line::from(vec![
        Span::styled("[j/k]", Style::default().fg(Color::Cyan)), Span::raw(" move  "),
        Span::styled("[Enter]", Style::default().fg(Color::Cyan)), Span::raw(" drill  "),
        Span::styled("[space]", Style::default().fg(Color::Cyan)), Span::raw(" toggle  "),
        Span::styled("[r]", Style::default().fg(Color::Cyan)), Span::raw(" refresh  "),
        Span::styled("[q]", Style::default().fg(Color::Cyan)), Span::raw(" quit"),
    ]))
    .block(Block::default().borders(Borders::ALL).title(" Commands "));
    f.render_widget(cmds, chunks[3]);

    // footer
    let cwd = app.ctx.focused_pane_cwd.as_deref()
        .or(app.ctx.workspace_cwd.as_deref()).unwrap_or("?");
    let footer = Paragraph::new(format!("ws={} cwd={}", app.ctx.workspace_id.as_deref().unwrap_or("?"), cwd))
        .block(Block::default().borders(Borders::ALL).title(" Context "))
        .style(Style::default().fg(Color::DarkGray));
    f.render_widget(footer, chunks[4]);

    chunks[2]  // return list area for hit-test
}