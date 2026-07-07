import { clear, h, cls } from '@/lib/dom';
import { icon } from '@/lib/icons';
import {
  MACRO_STAGES,
  PHASE_NAMES,
  loadTrackingData,
  loadInbox,
  saveInbox,
  loadProjectName,
  groupWorkflowsByMacroStage,
  getMacroStage,
  getPhaseName,
  getWorkflowProgress,
  getStatusBadge,
  getScopeProgress,
  getScopeBadge,
  getIntentBadge,
  getScopeStatusInfo,
  getScopeSummaryText,
  getActiveWorkflow,
  getWorkflowCommand,
  isWorkflowCommandEnabled,
  getWorkflowCommandLabel,
  getWorkflowCommandTitle,
  scanArtifactDirs,
  getArtifactCount,
  getArtifactsForPhase,
  getCurrentPhaseInfo,
  getNextPhaseInfo,
  runWorkflowCommand,
  readArtifactFile,
  loadExtraWorkflows,
  getActiveWorkspacePath,
  PHASE_TO_ARTIFACT_DIR,
  ARTIFACT_DIR_ICONS,
  ARTIFACT_DIR_LABELS,
  ARTIFACT_DIRS,
  getDateStamp,
  summarizeDisplayName,
  persistWorkflowMeta,
  renameWorkflowInFiles,
  flattenScopesForView,
  groupScopesByStatus,
  SCOPE_COLUMNS,
  loadProjectList,
} from './data';

export class PipelinePanel {
  constructor(root) {
    this.root = root;
    this.state = 'loading';
    this.workflows = [];
    this.inboxItems = [];
    this.projectName = null;
    this.selectedWf = null;
    this.artifactMap = new Map();
    this.inboxOpen = true;
    this.inboxEditIdx = -1;
    this.filterText = '';
    this.projectPath = null;  // set on first refresh; used to scope getActiveWorkflow
    this.pollTimer = null;
    this.refreshing = false;
    this.previewFile = null;
    this.previewContent = null;
    this.renameState = null;
    // v0.43.0: cross-workflow scope view tab. 'pipeline' = existing kanban,
    // 'scopes' = new flat scope cards across all workflows in this workspace.
    this.viewTab = 'pipeline';
    // Scope-tab filter strip state (independent of pipeline filterText).
    this.scopeFilterText = '';
    this.scopeStatusFilter = 'all';  // 'all' | scope.status id
  }

  start() {
    // Manual refresh via command (header button + palette)
    muxy.events.subscribe('command.refresh-pipeline', () => this.refresh(true));

    // Auto-refresh when user switches project or worktree (permissions declared in manifest)
    // Muxy fires project.switched and worktree.switched with projectID/worktreeID.
    // The panel reloads data from the new workspace when these fire.
    muxy.events.subscribe('project.switched', () => {
      console.log('[stelow] project switched — reloading');
      this.refresh(true);
    });
    muxy.events.subscribe('worktree.switched', () => {
      console.log('[stelow] worktree switched — reloading');
      this.refresh(true);
    });
    // Workflow commands — execute in selected Pi pane, then refresh soon after state changes.
    muxy.events.subscribe('command.sw-next-cmd',     () => this.runCommandToastAndRefresh('/sw-next'));
    muxy.events.subscribe('command.sw-abort-cmd',     () => this.runCommandToastAndRefresh('/sw-abort'));
    muxy.events.subscribe('command.sw-complete-cmd', () => this.runCommandToastAndRefresh('/sw-complete'));
    muxy.events.subscribe('command.sw-archive-cmd',  () => this.runCommandToastAndRefresh('/sw-archive'));
    // Switch events need small delay — Muxy doesn't scope muxy.files
    // to the new worktree until after the event handler returns.
    muxy.events.subscribe('project.switched', () => this.delayedRefresh());
    muxy.events.subscribe('worktree.switched', () => this.delayedRefresh());
    this.refresh(true);
    this.pollTimer = setInterval(() => this.refresh(false), 15000);
  }

  destroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  // ── Data ──────────────────────────────────────────────────────────

  delayedRefresh() {
    // Clear stale artifact cache and selection when switching projects
    this.artifactMap = new Map();
    this.selectedWf = null;
    this.state = 'pipeline';
    this.filterText = '';
    this.renameState = null;
    this.viewTab = 'pipeline';
    this.scopeFilterText = '';
    this.scopeStatusFilter = 'all';
    // Switch to pipeline view immediately, then async-refresh data
    this.render();
    setTimeout(() => this.refresh(true), 300);
  }

  async refresh(clearCache) {
    if (this.refreshing) return;
    this.refreshing = true;
    if (clearCache) this.artifactMap = new Map();
    try {
      const [tracking, inbox, projectName, extra, projectList] = await Promise.all([
        loadTrackingData(),
        loadInbox(),
        loadProjectName(),
        loadExtraWorkflows(),
        // v0.43.0: load full project list for cross-project picker UI.
        loadProjectList(),
      ]);
      // Cache the current projectPath so getActiveWorkflow can scope to it.
      // getActiveWorkspacePath() is the same source loadTrackingData uses,
      // so we get the exact same value (avoids drift between filter and lookup).
      this.projectPath = await getActiveWorkspacePath().catch(() => null);
      console.log('[stelow] workspace path:', this.projectPath);
      console.log('[stelow] stelow.json workflows:', tracking?.workflows?.length ?? 0);
      this.projectName = projectName;
      this.projectList = projectList ?? [];
      this.workflows = [...(tracking?.workflows ?? []), ...extra];
      this.syncSelectedWorkflowWithLatest();
      this.inboxItems = inbox ?? [];
      this.updateTopbar();
      // Scan artifacts only when cache cleared (workspace switch, manual refresh)
      if (!this.artifactMap.size) {
        scanArtifactDirs().then(m => { this.artifactMap = m; this.render(); }).catch(() => {});
      }
      this.render();
    } catch (err) {
      console.error('[Pipeline] refresh error:', err);
      this.render();
    } finally {
      this.refreshing = false;
    }
  }

  updateTopbar() {
    const active = this.workflows.filter(w => w.status === 'in-progress' && !w.staleCwd).length;
    try {
      muxy.topbar.set('pipeline', { badge: String(active) });
    } catch { /* not in Muxy */ }
  }

  // ── Render ────────────────────────────────────────────────────────

  render() {
    clear(this.root);

    if (this.state === 'artifact-preview' && this.previewFile) {
      this.root.appendChild(this.renderArtifactPreview());
      return;
    }

    if (this.state === 'detail' && this.selectedWf) {
      this.root.appendChild(this.renderDetail());
      return;
    }

    const hasData = this.workflows.length > 0 || this.inboxItems.length > 0;
    if (!hasData) {
      this.root.appendChild(this.renderEmpty());
      return;
    }

    // v0.43.0: view-tab routing. Pipeline is the existing kanban; Scopes
    // is the new cross-workflow flat scope view.
    if (this.viewTab === 'scopes') {
      this.root.appendChild(this.renderScopesTab());
      return;
    }
    this.root.appendChild(this.renderPipeline());
  }

  // ── Empty ─────────────────────────────────────────────────────────

  renderEmpty() {
    // Fetch debug info async — stored after refresh.
    const debugLines = [
      `workspace: ${this.projectPath || 'not set'}`,
      `project: ${this.projectName || 'unknown'}`,
      `workflows: ${this.workflows?.length ?? 0} in stelow.json`,
    ];
    return h('div', { class: 'empty-state' },
      icon('rectangle3group', 28, 'text-muted-foreground opacity-40'),
      h('div', { class: 'empty-state-title' }, 'No workflow data'),
      h('div', { class: 'empty-state-desc' },
        'Open a project that uses stelow.\n' +
        'This panel shows workflows and their progress\n' +
        'through Shape → Build → Verify → Done pipeline.'
      ),
      h('div', { style: 'margin-top:16px;padding:8px;font-size:11px;font-family:monospace;opacity:0.5;text-align:left;line-height:1.5;border-top:1px solid var(--muxy-border, #ddd)' },
        debugLines.map(line => h('div', {}, line)),
      ),
    );
  }

  // ── Pipeline ──────────────────────────────────────────────────────

  /**
   * v0.43.0: top tab strip that toggles between pipeline kanban and
   * the cross-workflow scope view.
   */
  renderViewTabs() {
    const tabs = [
      { id: 'pipeline', label: 'Workflows', icon: 'rectangleStack' },
      { id: 'scopes', label: 'Scopes', icon: 'listBullet' },
    ];
    return h('div', { class: 'view-tabs', style: 'display:flex;gap:6px;padding:8px 10px 0 10px;border-bottom:1px solid var(--muxy-border,#2222);align-items:center' },
      ...tabs.map(t => {
        const active = this.viewTab === t.id;
        return h('button', {
          class: cls('view-tab', active && 'view-tab-active'),
          onclick: () => {
            if (this.viewTab === t.id) return;
            this.viewTab = t.id;
            this.render();
          },
          title: t.label,
          style: [
            'display:flex;align-items:center;gap:5px;padding:6px 10px;border:none;background:transparent',
            'cursor:pointer;color:inherit;font-size:12px;border-radius:6px 6px 0 0',
            active ? 'background:var(--muxy-secondary,#333);font-weight:600' : 'opacity:0.7',
          ].join(';'),
        }, icon(t.icon, 11), h('span', {}, t.label));
      }),
    );
  }

  /**
   * v0.43.0: cross-workflow scope view. Reads the same `stelow.json` as
   * the pipeline view (sandboxed to active worktree), but flattens
   * `wf.scopes[]` into cards grouped by status (hill-chart columns).
   *
   * Within-worktree only (muxy.files is sandboxed; see data.js docs).
   * Filter strip lets the user narrow by free text or status.
   */
  renderScopesTab() {
    const flat = flattenScopesForView({ workflows: this.workflows });
    const filtered = flat.filter(entry => {
      if (this.scopeStatusFilter !== 'all' && entry.scope.status !== this.scopeStatusFilter) {
        return false;
      }
      if (this.scopeFilterText) {
        const q = this.scopeFilterText.toLowerCase();
        const hay = [
          entry.scope.id ?? '',
          entry.scope.name ?? '',
          entry.scope.type ?? '',
          entry.workflow?.name ?? '',
          entry.project ?? '',
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const buckets = groupScopesByStatus(filtered);

    return h('div', { class: 'scopes-view' },
      this.renderViewTabs(),
      this.renderScopeFilterStrip(),
      this.renderProjectPicker(),
      h('div', { class: 'scope-columns', style: 'display:grid;grid-auto-flow:column;grid-auto-columns:minmax(180px,1fr);gap:12px;padding:12px;overflow-x:auto' },
        ...SCOPE_COLUMNS.map(col => this.renderScopeColumn(col, buckets[col.id] ?? [])),
      ),
    );
  }

  /**
   * v0.43.0: cross-project affordance. Muxy's `muxy.files.read` is
   * sandboxed to the active worktree (see Muxy docs), so we cannot
   * magically read every project's `stelow.json`. Instead, list all
   * known projects with their cached metadata (name, path, scope
   * count) and provide a Switch button that calls
   * `muxy.worktrees.switchTo()` to navigate. The panel auto-reloads
   * via the existing `worktree.switched` event subscription.
   *
   * Tradeoff: this is "navigation across projects" not "aggregation
   * across projects". The honest answer to "show all my in-progress
   * scopes at once" without `exec:allow` permission is "switch and
   * look". Future when Muxy exposes `projects.read.files`, we can
   * actually aggregate.
   */
  renderProjectPicker() {
    const projects = this.projectList ?? [];
    if (projects.length === 0) return null;
    return h('div', {
      class: 'scope-project-picker',
      style: 'padding:8px 12px;border-bottom:1px solid var(--muxy-border,#2222);display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11px',
    },
      h('span', { style: 'opacity:0.6;margin-right:4px' }, 'Project:'),
      ...projects.map(p => {
        const isActive = p.isActive;
        return h('button', {
          class: cls('project-chip', isActive && 'project-chip-active'),
          title: p.path,
          onclick: async () => {
            if (isActive) return;
            try {
              await muxy.worktrees.switchTo(p.id);
              // The worktree.switched event handler in start() will
              // call delayedRefresh() which re-renders.
            } catch (err) {
              console.error('[stelow] worktree switch failed:', err);
            }
          },
          style: [
            'padding:3px 8px;border:1px solid var(--muxy-border,#444);border-radius:10px;background:transparent;color:inherit;cursor:pointer',
            isActive ? 'background:var(--muxy-accent,#3a8);color:var(--muxy-background,#fff);font-weight:600' : '',
          ].join(';'),
        }, p.name ?? p.path?.split('/').pop() ?? '?');
      }),
      h('span', { style: 'opacity:0.4;margin-left:8px' }, '(click to switch — Muxy files are sandboxed per worktree)'),
    );
  }

  renderScopeFilterStrip() {
    const statusOptions = [
      { id: 'all', label: 'All' },
      ...SCOPE_COLUMNS,
    ];
    return h('div', {
      class: 'scope-filter-strip',
      style: 'display:flex;gap:8px;padding:8px 10px;align-items:center;border-bottom:1px solid var(--muxy-border,#2222);font-size:11px',
    },
      ...statusOptions.map(opt => {
        const active = this.scopeStatusFilter === opt.id;
        return h('button', {
          class: cls('scope-chip', active && 'scope-chip-active'),
          onclick: () => { this.scopeStatusFilter = opt.id; this.render(); },
          style: [
            'padding:3px 8px;border:1px solid var(--muxy-border,#444);border-radius:10px;background:transparent;color:inherit;cursor:pointer',
            active ? 'background:var(--muxy-secondary,#333);font-weight:600' : '',
          ].join(';'),
        }, opt.label);
      }),
      h('input', {
        class: 'scope-filter-input',
        placeholder: 'Find scope, wf, project...',
        value: this.scopeFilterText,
        oninput: (e) => { this.scopeFilterText = e.target.value; this.render(); },
        style: 'flex:1;padding:3px 8px;border:1px solid var(--muxy-border,#444);border-radius:6px;background:transparent;color:inherit;font-size:11px',
      }),
    );
  }

  renderScopeColumn(col, entries) {
    return h('div', {
      class: `scope-column scope-column-${col.id}`,
      style: 'display:flex;flex-direction:column;gap:8px;min-width:0;padding:6px;background:var(--muxy-tertiary,#1118);border-radius:6px',
    },
      h('div', {
        class: 'scope-column-header',
        style: 'display:flex;justify-content:space-between;align-items:center;font-size:11px;opacity:0.8;text-transform:uppercase;letter-spacing:0.5px;padding:2px 4px',
      },
        h('span', {}, col.label),
        h('span', { class: 'scope-column-count' }, String(entries.length)),
      ),
      ...entries.map(entry => this.renderScopeCard(entry)),
    );
  }

  renderScopeCard(entry) {
    const { scope, workflow, project } = entry;
    const projectLabel = project ? project.split('/').filter(Boolean).slice(-2).join('/') : '?';
    const rec = scope.record;
    return h('div', {
      class: 'scope-card',
      style: 'padding:8px;border:1px solid var(--muxy-border,#333);border-radius:6px;background:var(--muxy-background,#000a);display:flex;flex-direction:column;gap:4px',
    },
      h('div', { class: 'scope-card-id', style: 'font-family:monospace;font-size:10px;opacity:0.6' }, scope.id ?? '?'),
      h('div', { class: 'scope-card-name', style: 'font-weight:600;font-size:13px' }, scope.name ?? '(unnamed)'),
      h('div', { class: 'scope-card-meta', style: 'font-size:10px;opacity:0.7;display:flex;flex-wrap:wrap;gap:4px' },
        h('span', { class: 'scope-card-workflow', title: workflow?.name ?? '' }, workflow?.name ?? '?'),
        scope.type ? h('span', { style: 'opacity:0.6' }, ` \u00b7 ${scope.type}`) : null,
      ),
      h('div', { class: 'scope-card-project', style: 'font-size:9px;font-family:monospace;opacity:0.5', title: project ?? '' }, projectLabel),
      scope.iteration !== undefined
        ? h('div', { class: 'scope-card-iter', style: 'font-size:9px;opacity:0.6' }, `iter ${scope.iteration}/${scope.maxIterations ?? '?'}`)
        : null,
      rec
        ? h('div', {
            class: 'scope-card-record',
            title: `verified=${rec.verified}, files=${rec.files_count}, cmds=${rec.commands_count}`,
            style: `font-size:9px;opacity:${rec.verified ? '0.95' : '0.55'}`,
          }, rec.verified ? '\u2705 verified' : '\u25cb unverified')
        : null,
      // Task count line (when tasks are populated). Surfaces Shape Up
      // hill-chart collapse inside each scope card.
      Array.isArray(scope.tasks) && scope.tasks.length > 0
        ? h('div', {
            class: 'scope-card-tasks',
            title: `planned=${scope.tasks.filter(t => t.source === 'planned').length}, discovered=${scope.discovered_tasks_count ?? scope.tasks.filter(t => t.source === 'discovered').length}`,
            style: 'font-size:9px;opacity:0.6',
          }, `tasks: ${scope.tasks.filter(t => t.status === 'done').length}/${scope.tasks.length}`)
        : null,
    );
  }

  renderPipeline() {
    // Apply filter
    let wfs = this.workflows;
    if (this.filterText) {
      const q = this.filterText.toLowerCase();
      wfs = wfs.filter(w => w.name.toLowerCase().includes(q));
    }
    const buckets = groupWorkflowsByMacroStage(wfs);

    return h('div', { class: 'pipeline' },
      this.renderViewTabs(),
      this.renderFilter(),
      this.renderCommandBar(this.selectedWf),
      this.renderInbox(),
      h('div', { class: 'pipeline-scroll' },
        ...buckets.map(b => this.renderColumn(b)),
      ),
      this.renderDock(),
    );
  }

  renderFilter() {
    return h('div', { class: 'filter-bar' },
      icon('search', 11, 'text-muted-foreground'),
      h('input', {
        class: 'filter-input',
        placeholder: 'Filter workflows...',
        value: this.filterText,
        oninput: (e) => { this.filterText = e.target.value; this.render(); },
        onkeydown: (e) => {
          if (e.key === 'Escape') { this.filterText = ''; this.render(); }
        },
      }),
      this.filterText
        ? h('button', {
            class: 'inbox-item-btn',
            onclick: () => { this.filterText = ''; this.render(); },
            title: 'Clear filter',
          }, icon('x', 10))
        : null,
      h('button', {
        class: 'inbox-item-btn',
        onclick: () => this.refresh(true),
        title: 'Refresh workflow data',
      }, icon('refresh', 10)),
    );
  }

  renderCommandBar(selectedWorkflow = null) {
    return h('div', { class: 'command-bar' },
      ...this.renderWorkflowCommandButtons(selectedWorkflow, 'command-btn'),
    );
  }

  syncSelectedWorkflowWithLatest() {
    if (!this.selectedWf) return;
    const previous = this.selectedWf;
    const matches = this.workflows.filter(wf => this.isSameWorkflow(wf, previous));
    if (matches.length !== 1) return;
    const latest = matches[0];
    if (latest === previous) return;

    latest._scopesOpen ??= previous._scopesOpen;
    latest._draftOpen ??= previous._draftOpen;
    latest._fullDraft ??= previous._fullDraft;
    this.selectedWf = latest;
  }

  isSameWorkflow(candidate, selected) {
    if (!candidate || !selected) return false;
    if (candidate.dirHash && selected.dirHash && candidate.dirHash === selected.dirHash) return true;
    return Boolean(
      candidate.name && selected.name && candidate.name === selected.name &&
      candidate.created && selected.created && candidate.created === selected.created,
    );
  }

  formatWorkflowUpdated(wf) {
    if (!wf.updated) return '—';
    const date = new Date(wf.updated);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  renderScopeMiniProgress(wf) {
    const progress = getScopeProgress(wf);
    if (!progress || progress.total === 0) return null;
    const pct = Math.round((progress.completed / progress.total) * 100);
    const color = progress.completed === progress.total
      ? 'var(--muxy-diff-add)'
      : progress.failed > 0
        ? 'var(--muxy-diff-remove)'
        : 'var(--muxy-accent)';

    // Compose tooltip — include declared-paths count when scope-execution
    // prevention protocol is active (any scope declared target_files).
    const summary = getScopeSummaryText(wf);
    const declared = progress.declaredFilesCount;
    const tooltip = declared > 0
      ? `${progress.completed}/${progress.total} scopes completed. ${summary}. Using file-reservation lock protocol for parallel scope prevention.`
      : `${progress.completed}/${progress.total} scopes completed. ${summary}.`;

    return h('div', {
      class: 'card-scope-progress',
      title: tooltip,
      style: 'height:3px;background:var(--muxy-secondary);border-radius:999px;overflow:hidden;margin-top:6px;',
    },
      h('div', { class: 'card-scope-progress-fill', style: `height:100%;display:block;width:${pct}%;background:${color};` }),
    );
  }

  renderScopePlaceholder(wf) {
    const current = wf.currentPhase ?? 0;
    if (current < 11 || wf.status === 'completed' || wf.status === 'archived') return null;

    return h('div', { class: 'draft-section' },
      h('div', { class: 'draft-section-header' },
        icon('rectangle3group', 11),
        h('span', null, 'Scopes'),
      ),
      h('div', { class: 'draft-preview' },
        'No scopes generated yet. Run Planning/Execution scope tracking to populate this card.',
      ),
    );
  }

  renderWorkflowCommandButtons(selectedWorkflow = null, buttonClass = 'command-btn') {
    const activeWorkflow = getActiveWorkflow(this.workflows, this.projectPath);
    const icons = {
      '/sw-next': 'refresh',
      '/sw-abort': 'x',
      '/sw-complete': 'check',
      '/sw-archive': 'archive',
    };

    return ['/sw-next', '/sw-abort', '/sw-complete', '/sw-archive'].map(command => {
      const actualCommand = getWorkflowCommand(command, selectedWorkflow, activeWorkflow);
      const enabled = actualCommand !== null && isWorkflowCommandEnabled(command, selectedWorkflow);
      const label = getWorkflowCommandLabel(command, selectedWorkflow, activeWorkflow);
      const title = getWorkflowCommandTitle(command, selectedWorkflow, activeWorkflow);

      return h('button', {
        class: buttonClass,
        disabled: !enabled,
        onclick: () => this.runCommandToastAndRefresh(actualCommand),
        title,
      }, icon(icons[command], 10), label);
    });
  }

  renderColumn(bucket) {
    const wfs = bucket.workflows;
    return h('div', { class: 'column' },
      h('div', { class: 'column-header' },
        h('span', null, bucket.name),
        h('span', { class: 'column-count' }, String(wfs.length)),
      ),
      h('div', { class: 'column-body' },
        ...(wfs.length === 0
          ? [h('div', {
              style: 'color:var(--muxy-foreground-muted);font-size:10px;padding:12px 4px;text-align:center;',
            }, '—')]
          : wfs.map(wf => this.renderCard(wf))
        ),
      ),
    );
  }

  renderCard(wf) {
    const phaseName = getPhaseName(wf);
    const badge = getStatusBadge(wf);
    const intentBadge = getIntentBadge(wf);
    const scopeBadge = getScopeBadge(wf);
    const progress = getWorkflowProgress(wf);
    const pct = Math.round(progress * 100);
    const staleNote = wf.staleCwd
      ? h('div', { class: 'card-stale-note', style: 'color:var(--muxy-diff-hunk,#b8860b);font-size:10px;margin-top:6px;' }, `cwd outside project: ${wf.cwd}`)
      : wf.worktreeName
        ? h('div', { class: 'card-worktree', style: 'color:var(--muxy-foreground-muted);font-size:9px;margin-top:2px;' }, `🌿 ${wf.worktreeName}`)
        : null;

    let dotColor;
    if (wf.status === 'paused') dotColor = 'var(--muxy-diff-hunk, #b8860b)';
    else if (wf.status === 'in-progress') dotColor = 'var(--muxy-accent)';
    else if (wf.status === 'completed') dotColor = 'var(--muxy-diff-add)';
    else dotColor = 'var(--muxy-foreground-muted)';

    let barColor;
    if (wf.status === 'paused') barColor = 'var(--muxy-diff-hunk, #b8860b)';
    else if (wf.status === 'in-progress') barColor = 'var(--muxy-accent)';
    else if (wf.status === 'completed') barColor = 'var(--muxy-diff-add)';
    else barColor = 'var(--muxy-foreground-muted)';

    return h('div', {
        class: 'card',
        onclick: () => this.openDetail(wf),
        title: `Click to see details for "${wf.name}"`,
      },
      h('div', { class: 'card-title' }, wf.displayName || wf.name),
      h('div', { class: 'card-phase' },
        h('span', { style: `color:${dotColor}` }, '●'),
        ` ${phaseName}`,
        h('span', { style: 'color:var(--muxy-foreground-muted);margin-left:auto;font-size:9px' }, `${pct}%`),
      ),
      // Progress bar
      h('div', { class: 'card-progress' },
        h('div', { class: 'card-progress-fill', style: `width:${pct}%;background:${barColor};` }),
      ),
      this.renderScopeMiniProgress(wf),
      h('div', { class: 'card-badges' },
        intentBadge ? h('span', { class: cls('badge', intentBadge.class) }, `${intentBadge.icon} ${intentBadge.label}`) : null,
        h('span', { class: cls('badge', badge.class) }, badge.label),
        scopeBadge ? h('span', { class: cls('badge', scopeBadge.class) }, scopeBadge.label) : null,
        this.renderArtifactBadge(wf.name),
      ),
      staleNote,
      wf.staleAt && !wf.staleCwd
        ? h('div', { style: 'color:var(--muxy-diff-hunk,#b8860b);font-size:10px;margin-top:2px;' }, '⚠ Stale (>24h without update)')
        : null,
    );
  }

  // ── Detail ────────────────────────────────────────────────────────

  async openDetail(wf) {
    this.selectedWf = wf;
    this.state = 'detail';
    this.renameState = null;

    // Auto-generate display name from draft if missing
    if (!wf.displayName && wf.draftContent) {
      const summary = summarizeDisplayName(wf.draftContent);
      if (summary) {
        wf.displayName = summary;
        persistWorkflowMeta(wf, { displayName: summary }).catch(() => {});
      }
    }

    this.render();

    // Load full draft from index.json (larger limit) — async enhancement
    if (wf.dirHash && wf.created && !wf._fullDraft) {
      try {
        const ds = getDateStamp(new Date(wf.created));
        const idxPath = `.stelow/${ds}/${wf.dirHash}/index.json`;
        const idxRes = await muxy.files.read(idxPath);
        if (idxRes?.content) {
          const idx = JSON.parse(idxRes.content);
          if (idx.draft) {
            wf._fullDraft = idx.draft;
            // Re-render if still on the same card
            if (this.selectedWf === wf && this.state === 'detail') {
              this.render();
            }
          }
        }
      } catch { /* fall back to wf.draftContent */ }
    }
  }

  closeDetail() {
    this.selectedWf = null;
    this.state = 'pipeline';
    this.renameState = null;
    this.render();
  }

  // ── Rename ─────────────────────────────────────────────────────────

  startRename() {
    const wf = this.selectedWf;
    if (!wf) return;
    this.renameState = { name: wf.displayName || wf.name };
    this.render();
  }

  async saveRename() {
    const wf = this.selectedWf;
    if (!wf || !this.renameState?.name?.trim()) return;
    const newName = this.renameState.name.trim();
    const oldName = wf.name;
    this.renameState = null;

    if (newName === (wf.displayName || wf.name)) {
      this.render();
      return;
    }

    const safeName = await renameWorkflowInFiles(oldName, newName, wf);
    if (safeName) {
      // Update workflow in the active workflows array (survives background refresh)
      const existing = this.workflows.find(w => w === wf || w.name === oldName);
      if (existing) {
        existing.name = safeName;
        existing.displayName = newName;
      }
      this.selectedWf = existing || this.selectedWf;
    }
    this.render();
  }

  cancelRename() {
    this.renameState = null;
    this.render();
  }

  // ── Draft Section ─────────────────────────────────────────────────

  // ── Scopes ────────────────────────────────────────────────────────

  renderScopes(wf) {
    const scopes = wf.scopes;
    if (!scopes || scopes.length === 0) return null;
    const progress = getScopeProgress(wf);

    const statusIcon = (status) => {
      switch (status) {
        case 'completed': return icon('circleCheck', 12, 'text-success');
        case 'in-progress': return icon('circleDot', 12, 'text-primary');
        case 'escalated':
        case 'failed': return icon('alertCircle', 12, 'text-error');
        default: return icon('circleEllipsis', 12, 'text-muted-foreground');
      }
    };

    const typeLabel = (type) => {
      const labels = { feature: 'F', optimization: 'O', spike: 'S', 'test-unit': 'TU', 'test-integration': 'TI', 'test-security': 'TS', 'test-behavior': 'TB' };
      return labels[type] || type?.slice(0, 2) || '?';
    };

    return h('div', { class: 'draft-section' },
      h('div', { class: 'draft-section-header',
        onclick: () => { wf._scopesOpen = !wf._scopesOpen; this.render(); },
      },
        icon('rectangle3group', 11),
        h('span', null, `Scopes (${progress.completed}/${progress.total})`),
        h('span', { style: 'margin-left:auto;font-size:9px;color:var(--muxy-foreground-muted);display:flex;' },
          h('span', { style: `display:flex;transform:rotate(${wf._scopesOpen ? -90 : 90}deg);transition:transform 0.15s;` }, icon('chevronLeft', 9)),
        ),
      ),
      wf._scopesOpen
        ? h('div', { class: 'draft-content', style: 'padding:4px 8px;' },
            ...scopes.map(s => {
              const statusInfo = getScopeStatusInfo(s.status);
              const statusStyle = {
                success: ['var(--muxy-diff-add)', 'rgba(34,197,94,0.10)'],
                primary: ['var(--muxy-accent)', 'rgba(59,130,246,0.12)'],
                danger: ['var(--muxy-diff-remove)', 'rgba(239,68,68,0.10)'],
                muted: ['var(--muxy-foreground-muted)', 'var(--muxy-secondary)'],
              }[statusInfo.tone] ?? ['var(--muxy-foreground-muted)', 'var(--muxy-secondary)'];

              return h('div', { style: 'display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px;' },
                statusIcon(s.status),
                h('span', { style: 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' }, s.name),
                h('span', { style: 'font-size:9px;color:var(--muxy-foreground-muted);background:var(--muxy-secondary);padding:1px 4px;border-radius:3px;' }, typeLabel(s.type)),
                h('span', { style: `font-size:9px;color:${statusStyle[0]};background:${statusStyle[1]};padding:1px 5px;border-radius:999px;` }, statusInfo.label),
                s.source ? h('span', { title: `Source: ${s.source}`, style: 'font-size:9px;color:var(--muxy-foreground-muted);background:var(--muxy-secondary);padding:1px 4px;border-radius:3px;' }, s.source) : null,
              );
            }),
          )
        : h('div', { class: 'draft-preview' }, getScopeSummaryText(wf)),
    );
  }

  renderDraftSection(wf) {
    const content = wf._fullDraft || wf.draftContent;
    if (!content) return null;
    const firstLine = summarizeDisplayName(content) || 'Brief';
    return h('div', { class: 'draft-section' },
      h('div', { class: 'draft-section-header',
        onclick: () => { wf._draftOpen = !wf._draftOpen; this.render(); },
      },
        icon('fileText', 11),
        h('span', null, 'Brief'),
        h('span', { style: 'margin-left:auto;font-size:9px;color:var(--muxy-foreground-muted);display:flex;' },
          h('span', { style: `display:flex;transform:rotate(${wf._draftOpen ? -90 : 90}deg);transition:transform 0.15s;` }, icon('chevronLeft', 9)),
        ),
      ),
      wf._draftOpen
        ? h('pre', { class: 'draft-content' }, content)
        : h('div', { class: 'draft-preview' }, firstLine),
    );
  }

  renderDetail() {
    const wf = this.selectedWf;
    if (!wf) return this.renderPipeline();

    const phaseName = getPhaseName(wf);
    const badge = getStatusBadge(wf);
    const progress = getWorkflowProgress(wf);
    const pct = Math.round(progress * 100);

    const macroInfo = getMacroStage(wf);

    return h('div', { class: 'detail' },
      h('div', { class: 'detail-header' },
        h('button', {
          class: 'detail-back',
          onclick: () => this.closeDetail(),
          title: 'Back to pipeline',
        }, icon('chevronLeft', 14)),
        this.renameState
          ? h('div', { style: 'flex:1;display:flex;gap:4px;align-items:center;' },
              h('input', {
                class: 'rename-input',
                value: this.renameState.name,
                oninput: (e) => { this.renameState.name = e.target.value; },
                onkeydown: (e) => {
                  if (e.key === 'Enter') this.saveRename();
                  if (e.key === 'Escape') this.cancelRename();
                },
                onmount: (el) => el.focus(),
                style: 'flex:1;',
              }),
              h('button', {
                class: 'inbox-item-btn',
                onclick: () => this.saveRename(),
                title: 'Save name',
              }, icon('check', 12)),
              h('button', {
                class: 'inbox-item-btn',
                onclick: () => this.cancelRename(),
                title: 'Cancel',
              }, icon('x', 12)),
            )
          : h('span', {
              style: 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;',
              title: 'Click to rename',
              onclick: () => this.startRename(),
            }, wf.displayName || wf.name),
        h('span', { class: cls('badge', badge.class) }, badge.label),
      ),
      h('div', { class: 'detail-body' },
        h('div', { class: 'detail-info' },
          h('div', { class: 'detail-row' },
            h('span', { class: 'detail-label' }, 'Phase'),
            h('span', { class: 'detail-value' }, `${phaseName} (${pct}%)`),
          ),
          h('div', { class: 'detail-row' },
            h('span', { class: 'detail-label' }, 'Macro'),
            h('span', { class: 'detail-value' }, macroInfo?.name || '—'),
          ),
          h('div', { class: 'detail-row' },
            h('span', { class: 'detail-label' }, 'Status'),
            h('span', { class: 'detail-value' }, wf.status),
          ),
          wf.staleCwd ? h('div', { class: 'detail-row', style: 'color:var(--muxy-diff-hunk,#b8860b)' },
            h('span', { class: 'detail-label' }, 'Cwd'),
            h('span', { class: 'detail-value' }, `${wf.cwd} (outside project)`),
          ) : null,
          wf.staleAt ? h('div', { class: 'detail-row', style: 'color:var(--muxy-diff-hunk,#b8860b)' },
            h('span', { class: 'detail-label' }, 'Stale'),
            h('span', { class: 'detail-value' }, '>24h without update'),
          ) : null,
          h('div', { class: 'detail-row' },
            h('span', { class: 'detail-label' }, 'Intent'),
            h('span', { class: 'detail-value' }, getIntentBadge(wf)
              ? `${getIntentBadge(wf).icon} ${getIntentBadge(wf).label}`
              : wf.intent || '—'
            ),
          ),
          h('div', { class: 'detail-row' },
            h('span', { class: 'detail-label' }, 'Created'),
            h('span', { class: 'detail-value' },
              wf.created ? new Date(wf.created).toLocaleDateString() : '—'
            ),
          ),
          h('div', { class: 'detail-row' },
            h('span', { class: 'detail-label' }, 'Updated'),
            h('span', { class: 'detail-value' }, this.formatWorkflowUpdated(wf)),
          ),
        ),
        h('div', { style: 'font-size:11px;font-weight:600;margin-bottom:4px;' }, 'Progress'),
        h('div', { class: 'phase-list' },
          ...(() => {
            // Group phases by macro-stage
            const groups = [];
            for (const ms of MACRO_STAGES) {
              const stagePhases = (wf.phases || []).slice(ms.phaseRange[0], ms.phaseRange[1] + 1);
              if (stagePhases.length === 0) continue;
              const stageDone = stagePhases.every(p => p.status === 'completed');
              const stageActive = stagePhases.some(p => p.status === 'in-progress');
              groups.push({ macro: ms, phases: stagePhases, stageDone, stageActive });
            }
            return groups.flatMap(g => [
              // Macro-stage header
              h('div', {
                class: 'phase-macro-header',
                style: `font-size:10px;font-weight:600;text-transform:uppercase;`
                  + `letter-spacing:0.5px;padding:6px 6px 2px;`
                  + `color:${g.stageDone ? 'var(--muxy-foreground-muted)' : g.stageActive ? 'var(--muxy-accent)' : 'var(--muxy-foreground-muted)'};`
                  + `opacity:${g.stageDone ? '0.5' : '1'}`,
              }, `${g.macro.name} (${g.phases.filter(p => p.status === 'completed').length}/${g.phases.length})`),
              // Individual phases
              ...g.phases.map((ph, j) => {
                const absIdx = g.macro.phaseRange[0] + j;
                let itemClass = 'phase-item';
                if (ph.status === 'completed') itemClass += ' phase-item-completed';
                else if (ph.status === 'in-progress') itemClass += ' phase-item-active';
                else itemClass += ' phase-item-pending';

                let phIcon;
                if (ph.status === 'completed') phIcon = icon('circleCheck', 12, 'text-success');
                else if (ph.status === 'in-progress') phIcon = icon('circleDot', 12, 'text-primary');
                else phIcon = icon('circleEllipsis', 12, 'text-muted-foreground');

                return h('div', { class: itemClass, style: 'padding-left:16px;' },
                  phIcon,
                  h('span', null, ph.name || `Phase ${absIdx}`),
                );
              }),
            ]);
          })(),
        ),
        // Scopes section
        this.renderScopePlaceholder(wf),
        this.renderScopes(wf),
        // Draft / Brief section
        this.renderDraftSection(wf),
        // Handoff Station
        this.renderHandoff(wf),
        // Artifacts section
        this.renderArtifactDetail(wf.name),
      ),
    );
  }

  // ── Inbox ─────────────────────────────────────────────────────────

  renderInbox() {
    const items = this.inboxItems;
    return h('div', { class: 'inbox' },
      h('div', {
        class: 'inbox-header',
        onclick: () => { this.inboxOpen = !this.inboxOpen; this.render(); },
      },
        h('div', { style: 'display:flex;align-items:center;gap:4px;' },
          icon('inbox', 13),
          h('span', null, 'Inbox — items for the next cycle (/sw-start)'),
        ),
        h('div', { style: 'display:flex;align-items:center;gap:4px;' },
          h('span', { class: 'column-count' }, String(items.length)),
          this.inboxOpen
            ? h('span', { style: 'display:flex;transform:rotate(90deg);' }, icon('chevronLeft', 10))
            : icon('chevronLeft', 10),
        ),
      ),
      this.inboxOpen
        ? h('div', { class: 'inbox-body' },
            ...items.length === 0
              ? [h('div', { style: 'color:var(--muxy-foreground-muted);font-size:10px;padding:4px 0;' }, 'Empty')]
              : items.map((item, i) => this.renderInboxItem(item, i)),
          )
        : null,
      this.inboxOpen ? this.renderInboxAdd() : null,
    );
  }

  renderInboxItem(item, idx) {
    const isEditing = this.inboxEditIdx === idx;

    if (isEditing) {
      return h('div', { class: 'inbox-item', style: 'gap:4px;' },
        h('input', {
          class: 'inbox-add-input',
          id: 'inbox-edit-input-' + idx,
          style: 'flex:1;',
          value: item,
          onkeydown: (e) => {
            if (e.key === 'Enter') this.saveInboxEdit(idx, e.target.value);
            if (e.key === 'Escape') { this.inboxEditIdx = -1; this.render(); }
          },
          onmount: (el) => el.focus(),
        }),
        h('button', {
          class: 'inbox-item-btn',
          onclick: () => this.saveInboxEdit(
            idx,
            document.getElementById('inbox-edit-input-' + idx)?.value || item
          ),
          title: 'Save',
        }, icon('check', 12)),
        h('button', {
          class: 'inbox-item-btn',
          onclick: () => { this.inboxEditIdx = -1; this.render(); },
          title: 'Cancel',
        }, icon('x', 12)),
      );
    }

    return h('div', { class: 'inbox-item' },
      h('span', { class: 'inbox-item-text', title: item }, item),
      h('button', {
        class: 'inbox-item-btn',
        onclick: () => { this.inboxEditIdx = idx; this.render(); },
        title: 'Edit',
      }, icon('pencil', 10)),
      h('button', {
        class: 'inbox-item-btn',
        onclick: () => this.removeInboxItem(idx),
        title: 'Remove',
      }, icon('x', 10)),
    );
  }

  renderInboxAdd() {
    return h('div', { class: 'inbox-add' },
      h('input', {
        class: 'inbox-add-input',
        placeholder: 'Add task...',
        onkeydown: (e) => {
          if (e.key === 'Enter') this.addInboxItem(e.target.value, e.target);
        },
        onmount: (el) => el.focus(),
      }),
      h('button', {
        class: 'inbox-add-btn',
        onclick: () => this.addInboxItem(
          document.querySelector('.inbox-add-input')?.value || '',
        ),
        title: 'Add',
      }, icon('plus', 12)),
    );
  }

  addInboxItem(text, inputEl) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Optimistic — add to local array immediately
    this.inboxItems.push(trimmed);
    this.render();

    // Save async — fire & forget
    saveInbox(this.inboxItems).catch(e =>
      console.error('[Pipeline] inbox save failed:', e)
    );

    // Keep focus on the add input after re-render
    setTimeout(() => {
      const el = document.querySelector('.inbox-add-input');
      if (el) el.focus();
    }, 0);
  }

  removeInboxItem(idx) {
    this.inboxItems.splice(idx, 1);
    if (this.inboxEditIdx === idx) this.inboxEditIdx = -1;
    this.render();

    saveInbox(this.inboxItems).catch(e =>
      console.error('[Pipeline] inbox save failed:', e)
    );
  }

  saveInboxEdit(idx, newText) {
    const trimmed = newText.trim();
    if (!trimmed) {
      this.removeInboxItem(idx);
      return;
    }
    this.inboxItems[idx] = trimmed;
    this.inboxEditIdx = -1;
    this.render();

    saveInbox(this.inboxItems).catch(e =>
      console.error('[Pipeline] inbox save failed:', e)
    );
  }

  // ── Handoff Station ───────────────────────────────────────────────

  renderHandoff(wf) {
    const current = getCurrentPhaseInfo(wf);
    const next = getNextPhaseInfo(wf);
    const artifactData = this.artifactMap.get(wf.name);
    if (!next) return null; // workflow complete or archived

    // Artifacts produced by completed phases relevant to current phase
    const currentArtifacts = getArtifactsForPhase(artifactData, current.name);
    const totalArtifacts = getArtifactCount(artifactData);

    const isCurrentActive = current.status === 'in-progress';
    const isCurrentDone = current.status === 'completed';
    const completionEmoji = isCurrentDone ? '✅' : isCurrentActive ? '🔄' : '⏳';

    return h('div', { class: 'handoff' },
      h('div', { class: 'handoff-header' },
        icon('circleCheck', 12),
        isCurrentDone
          ? `${current.name} completed`
          : isCurrentActive
            ? `${current.name} in progress`
            : `${current.name} pending`,
      ),
      h('div', { class: 'handoff-body' },
        // Next phase arrow
        h('div', { class: 'handoff-row' },
          h('span', { class: 'handoff-row-label' }, 'Next'),
          h('span', { class: 'handoff-arrow' }, `${current.name} → ${next.name}`),
        ),
        // Artifacts produced
        totalArtifacts > 0
          ? h('div', { class: 'handoff-row' },
              h('span', { class: 'handoff-row-label' }, 'Docs'),
              h('div', { class: 'handoff-artifact-list' },
                ...(currentArtifacts.length > 0
                  ? currentArtifacts.slice(0, 4).map(f => {
                      const phDir = PHASE_TO_ARTIFACT_DIR[current.name];
                      return h('div', {
                        class: 'handoff-artifact',
                        onclick: (e) => { e.stopPropagation(); this.openFilePreview(artifactData, phDir, f); },
                      },
                        icon('fileText', 9, 'text-muted-foreground'),
                        f,
                      );
                    })
                  : [h('div', { class: 'handoff-artifact', style: 'color:var(--muxy-foreground-muted)' },
                      `${totalArtifacts} total in workflow`,
                    )]
                ),
              ),
            )
          : null,
        // Next phase needs
        h('div', { class: 'handoff-row' },
          h('span', { class: 'handoff-row-label' }, 'Needs'),
          h('span', { style: 'color:var(--muxy-foreground-muted)' },
            next.status === 'pending'
              ? `Ready to start ${next.name}`
              : `${next.name} already in progress`,
          ),
        ),
        // Actions: execute workflow commands in the selected Pi pane
        h('div', { class: 'handoff-action' },
          ...this.renderWorkflowCommandButtons(this.selectedWf, 'handoff-btn'),
        ),
      ),
    );
  }

  async runCommandToastAndRefresh(command) {
    await this.runCommandToast(command);
    setTimeout(() => this.refresh(false), 1200);
  }

  async runCommandToast(command) {
    if (!command) return;

    const result = await runWorkflowCommand(command);
    const toast = document.createElement('div');
    toast.className = 'handoff-toast';

    if (result.ok) {
      toast.textContent = `Sent: ${command} to ${result.paneTitle}. Verify pane ran it.`;
    } else if (result.reason === 'cancelled') {
      toast.textContent = `Cancelled: ${command}`;
      toast.style.background = 'var(--muxy-foreground-muted)';
    } else if (result.copied) {
      toast.textContent = `Run failed: ${result.reason}. Copied: ${command}`;
      toast.style.background = 'var(--muxy-diff-remove)';
    } else {
      toast.textContent = result.reason || `Failed to run: ${command}`;
      toast.style.background = 'var(--muxy-diff-remove)';
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  // ── Artifacts ─────────────────────────────────────────────────────

  renderArtifactBadge(wfName) {
    const data = this.artifactMap.get(wfName);
    const count = getArtifactCount(data);
    if (count === 0) return null;
    return h('span', { class: 'badge badge-artifact' },
      icon('fileText', 8),
      String(count),
    );
  }

  renderArtifactDetail(wfName) {
    const data = this.artifactMap.get(wfName);
    if (!data) return null;
    const { artifacts } = data;
    const total = getArtifactCount(data);
    if (total === 0) return null;

    return h('div', { class: 'artifact-section' },
      h('div', { class: 'artifact-section-title' },
        `Artifacts (${total})`,
      ),
      ...ARTIFACT_DIRS
        .filter(dir => artifacts[dir]?.length > 0)
        .map(dir => h('div', { class: 'artifact-group' },
          h('div', { class: 'artifact-group-header' },
            icon(ARTIFACT_DIR_ICONS[dir] || 'fileText', 10),
            ARTIFACT_DIR_LABELS[dir] || dir,
          ),
          ...artifacts[dir].map(file =>
            h('div', {
              class: 'artifact-file',
              title: `${dir}/${file}`,
              onclick: (e) => { e.stopPropagation(); this.openFilePreview(data, dir, file); },
            },
              icon('fileText', 9, 'text-muted-foreground'),
              file,
            ),
          ),
        )),
    );
  }

  // ── Artifact Preview ──────────────────────────────────────────────

  openFilePreview(artifactData, dir, filename) {
    this.previewFile = { artifactData, dir, filename };
    this.previewContent = null; // null = loading
    this.state = 'artifact-preview';
    this.render(); // render with loading state
    // Read async — will re-render when done
    readArtifactFile(artifactData, dir, filename).then(content => {
      this.previewContent = content || '(empty or unreadable)';
      this.render();
    });
  }

  closeFilePreview() {
    this.previewFile = null;
    this.previewContent = null;
    this.state = 'pipeline';
    this.render();
  }

  renderArtifactPreview() {
    const pf = this.previewFile;
    if (!pf) return h('div', null, 'No file');
    const { dir, filename } = pf;
    const label = `${dir}/${filename}`;

    return h('div', { class: 'detail' },
      h('div', { class: 'detail-header' },
        h('button', {
          class: 'detail-back',
          onclick: () => this.closeFilePreview(),
        }, icon('chevronLeft', 14)),
        h('span', { style: 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, label),
      ),
      h('div', { class: 'preview-body' },
        this.previewContent === null
          ? h('div', { style: 'display:flex;align-items:center;justify-content:center;height:100%;font-size:11px;color:var(--muxy-foreground-muted)' },
              'Loading...',
            )
          : h('pre', { class: 'preview-content' }, this.previewContent),
      ),
    );
  }

  // ── Dock ──────────────────────────────────────────────────────────

  renderDock() {
    const visibleWfs = groupWorkflowsByMacroStage(this.workflows);
    const visibleCount = visibleWfs.reduce((sum, b) => sum + b.workflows.length, 0);

    return h('div', { class: 'dock' },
      h('div', { class: 'dock-projects' },
        this.projectName
          ? [icon('rectangle3group', 10), h('span', null, this.projectName)]
          : [icon('search', 10), h('span', null, 'No project detected')],
      ),
      h('div', { style: 'display:flex;align-items:center;gap:4px;' },
        h('span', null, visibleCount === 0 ? 'No active workflows' : `${visibleCount} active`),
      ),
    );
  }
}
