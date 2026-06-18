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
  PHASE_TO_ARTIFACT_DIR,
  ARTIFACT_DIR_ICONS,
  ARTIFACT_DIR_LABELS,
  ARTIFACT_DIRS,
  getDateStamp,
  summarizeDisplayName,
  persistWorkflowMeta,
  renameWorkflowInFiles,
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
    this.pollTimer = null;
    this.refreshing = false;
    this.previewFile = null;
    this.previewContent = null;
    this.renameState = null;
  }

  start() {
    muxy.events.subscribe('command.refresh-pipeline', () => this.refresh(true));
    // Workflow commands — execute in selected Pi pane
    muxy.events.subscribe('command.pw-next-cmd',     () => this.runCommandToast('/pw-next'));
    muxy.events.subscribe('command.pw-abort-cmd',     () => this.runCommandToast('/pw-abort'));
    muxy.events.subscribe('command.pw-complete-cmd', () => this.runCommandToast('/pw-complete'));
    muxy.events.subscribe('command.pw-archive-cmd',  () => this.runCommandToast('/pw-archive'));
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
    // Switch to pipeline view immediately, then async-refresh data
    this.render();
    setTimeout(() => this.refresh(true), 300);
  }

  async refresh(clearCache) {
    if (this.refreshing) return;
    this.refreshing = true;
    if (clearCache) this.artifactMap = new Map();
    try {
      const [tracking, inbox, projectName, extra] = await Promise.all([
        loadTrackingData(),
        loadInbox(),
        loadProjectName(),
        loadExtraWorkflows(),
      ]);
      this.projectName = projectName;
      this.workflows = [...(tracking?.workflows ?? []), ...extra];
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

    this.root.appendChild(this.renderPipeline());
  }

  // ── Empty ─────────────────────────────────────────────────────────

  renderEmpty() {
    return h('div', { class: 'empty-state' },
      icon('rectangle3group', 28, 'text-muted-foreground opacity-40'),
      h('div', { class: 'empty-state-title' }, 'No workflow data'),
      h('div', { class: 'empty-state-desc' },
        'Open a project that uses cali-product-workflow.\n' +
        'This panel shows workflows and their progress\n' +
        'through Shape → Build → Verify → Done pipeline.'
      ),
    );
  }

  // ── Pipeline ──────────────────────────────────────────────────────

  renderPipeline() {
    // Apply filter
    let wfs = this.workflows;
    if (this.filterText) {
      const q = this.filterText.toLowerCase();
      wfs = wfs.filter(w => w.name.toLowerCase().includes(q));
    }
    const buckets = groupWorkflowsByMacroStage(wfs);

    return h('div', { class: 'pipeline' },
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
    );
  }

  renderCommandBar(selectedWorkflow = null) {
    return h('div', { class: 'command-bar' },
      ...this.renderWorkflowCommandButtons(selectedWorkflow, 'command-btn'),
    );
  }

  renderWorkflowCommandButtons(selectedWorkflow = null, buttonClass = 'command-btn') {
    const activeWorkflow = getActiveWorkflow(this.workflows);
    const icons = {
      '/pw-next': 'refresh',
      '/pw-abort': 'x',
      '/pw-complete': 'check',
      '/pw-archive': 'archive',
    };

    return ['/pw-next', '/pw-abort', '/pw-complete', '/pw-archive'].map(command => {
      const actualCommand = getWorkflowCommand(command, selectedWorkflow, activeWorkflow);
      const enabled = actualCommand !== null && isWorkflowCommandEnabled(command, selectedWorkflow);
      const label = getWorkflowCommandLabel(command, selectedWorkflow, activeWorkflow);
      const title = getWorkflowCommandTitle(command, selectedWorkflow, activeWorkflow);

      return h('button', {
        class: buttonClass,
        disabled: !enabled,
        onclick: () => this.runCommandToast(actualCommand),
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
      h('div', { class: 'card-badges' },
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
        const idxPath = `.cali-product-workflow/${ds}/${wf.dirHash}/index.json`;
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
            ...scopes.map(s =>
              h('div', { style: 'display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px;' },
                statusIcon(s.status),
                h('span', { style: 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' }, s.name),
                h('span', { style: 'font-size:9px;color:var(--muxy-foreground-muted);background:var(--muxy-secondary);padding:1px 4px;border-radius:3px;' }, typeLabel(s.type)),
              ),
            ),
          )
        : h('div', { class: 'draft-preview' },
            `${progress.completed} done, ${progress.inProgress} active, ${progress.total - progress.completed - progress.inProgress - progress.failed} pending` +
            (progress.failed > 0 ? `, ${progress.failed} failed` : ''),
          ),
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
            h('span', { class: 'detail-label' }, 'Created'),
            h('span', { class: 'detail-value' },
              wf.created ? new Date(wf.created).toLocaleDateString() : '—'
            ),
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
          h('span', null, 'Inbox — items for the next cycle (/pw-start)'),
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
