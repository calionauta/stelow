// ── Macro-stage definitions ──────────────────────────────────────────

export const MACRO_STAGES = [
  {
    id: 'shape',
    name: 'Shape',
    phaseRange: [0, 7],
    phases: ['Triage','ItemSelect','Setup','Context','Shape','Critique','Gate','Scope'],
  },
  {
    id: 'build',
    name: 'Build',
    phaseRange: [8, 12],
    phases: ['Interface','Int.Gate','Selection','Planning','Execution'],
  },
  {
    id: 'verify',
    name: 'Verify',
    phaseRange: [13, 14],
    phases: ['Verification','Audit'],
  },
];

export const PHASE_NAMES = [
  'Triage','ItemSelect','Setup','Context','Shape','Critique','Gate','Scope',
  'Interface','Int.Gate','Selection','Planning','Execution',
  'Verification','Audit',
];

// ── Data fetching ────────────────────────────────────────────────────

/**
 * Try to read cali-product-workflow.json from the active worktree.
 * Returns null if the file doesn't exist or can't be parsed.
 */
export async function loadTrackingData() {
  try {
    const res = await muxy.files.read('cali-product-workflow.json');
    if (!res || !res.content) return null;
    const tracking = JSON.parse(res.content);
    const projectPath = await getActiveWorkspacePath().catch(() => null);
    return normalizeTrackingDataForProject(tracking, projectPath);
  } catch {
    return null;
  }
}

/**
 * Try to read inbox items from .cali-product-workflow/inbox/items.md.
 * Returns an array of item strings (empty array if none).
 */
export async function loadInbox() {
  try {
    const res = await muxy.files.read('.cali-product-workflow/inbox/items.md');
    if (!res || !res.content) return [];
    return res.content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#'));
  } catch {
    return [];
  }
}

/**
 * Write inbox items back to .cali-product-workflow/inbox/items.md.
 */
export async function saveInbox(items) {
  const header = '# Inbox\n\n';
  const body = items.length > 0 ? items.join('\n') + '\n' : '\n';
  await muxy.files.write('.cali-product-workflow/inbox/items.md', header + body);
}

/**
 * Try to load phase-todos for a workflow by scanning session dirs.
 * Returns null if none found.
 * Also returns the project name (dir name) for display.
 */
export async function loadProjectName() {
  // Try package.json first (Node/npm projects)
  try {
    const res = await muxy.files.read('package.json');
    if (res && res.content) {
      const pkg = JSON.parse(res.content);
      return pkg.name || pkg.displayName || null;
    }
  } catch { /* ignore */ }
  // Try go.mod (Go projects)
  try {
    const res = await muxy.files.read('go.mod');
    if (res && res.content) {
      const match = res.content.match(/^module\s+(.+)$/m);
      if (match) return match[1].trim();
    }
  } catch { /* ignore */ }
  // Fallback: workspace directory name
  try {
    const projects = await muxy.projects.list();
    const active = projects.find(p => p.isActive);
    if (active?.path) {
      return active.path.split('/').filter(Boolean).pop() || null;
    }
  } catch { /* ignore */ }
  return null;
}

function isHiddenWorkflowStatus(status) {
  return ['archived', 'aborted', 'stopped', 'cancelled', 'canceled'].includes(status);
}

export function normalizeTrackingDataForProject(tracking, projectPath) {
  if (!tracking) return null;
  if (!projectPath) return tracking;
  return {
    ...tracking,
    workflows: (tracking.workflows || []).map(wf => ({
      ...wf,
      staleCwd: Boolean(wf.cwd && !isWorkflowCwdCompatible(wf.cwd, projectPath)),
      staleAt: wf.status === 'in-progress' && wf.updated
        ? (Date.now() - new Date(wf.updated).getTime() > 24 * 60 * 60 * 1000)
        : false,
    })),
  };
}

function isWorkflowCwdCompatible(workflowCwd, projectPath) {
  const normalizedWorkflowCwd = normalizePath(workflowCwd);
  const normalizedProjectPath = normalizePath(projectPath);
  return normalizedWorkflowCwd === normalizedProjectPath
    || normalizedWorkflowCwd.startsWith(`${normalizedProjectPath}/`)
    || normalizedProjectPath.startsWith(`${normalizedWorkflowCwd}/`);
}

/**
 * Group workflows into macro-stage buckets.
 * Returns [{ stage, workflows: [...] }, ...]
 */
export function groupWorkflowsByMacroStage(workflows) {
  const buckets = MACRO_STAGES.map(s => ({ ...s, workflows: [] }));
  const doneBucket = {
    id: 'done',
    name: 'Done',
    phaseRange: [0, PHASE_NAMES.length - 1],
    workflows: [],
  };

  for (const wf of workflows) {
    // Skip archived/aborted/stopped workflows and workflows whose cwd points
    // outside the active project. Stale cwd data usually means a copied or
    // orphaned tracking file, and showing it as active creates false progress.
    if (isHiddenWorkflowStatus(wf.status) || wf.staleCwd) continue;

    if (wf.status === 'completed') {
      doneBucket.workflows.push(wf);
      continue;
    }

    const phaseIdx = wf.currentPhase ?? 0;
    const bucket = buckets.find(
      b => phaseIdx >= b.phaseRange[0] && phaseIdx <= b.phaseRange[1]
    );
    if (bucket) {
      bucket.workflows.push(wf);
    } else {
      // Unknown phase → put in Shape bucket
      buckets[0].workflows.push(wf);
    }
  }

  return [...buckets, doneBucket];
}

export function getMacroStage(workflow) {
  if (workflow.status === 'completed') {
    return {
      id: 'done',
      name: 'Done',
      phaseRange: [0, PHASE_NAMES.length - 1],
    };
  }
  const phaseIdx = workflow.currentPhase ?? 0;
  return MACRO_STAGES.find(
    m => phaseIdx >= m.phaseRange[0] && phaseIdx <= m.phaseRange[1]
  ) ?? null;
}

/**
 * Get the precise phase name for a workflow.
 */
export function getPhaseName(workflow) {
  const idx = workflow.currentPhase ?? 0;
  return PHASE_NAMES[idx] || `Phase ${idx}`;
}

/**
 * Get overall progress of a workflow (0-1).
 */
export function getWorkflowProgress(workflow) {
  if (workflow.status === 'completed') return 1;
  const total = PHASE_NAMES.length;
  const current = workflow.currentPhase ?? 0;
  return Math.min(current / (total - 1), 1);
}

/**
 * Get status badge info for a workflow.
 */
export function getStatusBadge(workflow) {
  if (workflow.staleCwd) return { label: 'Stale cwd', class: 'badge-archived' };
  switch (workflow.status) {
    case 'in-progress': return { label: 'Active', class: 'badge-in-progress' };
    case 'paused': return { label: 'Paused', class: 'badge-paused' };
    case 'completed': return { label: 'Done', class: 'badge-completed' };
    case 'archived': return { label: 'Archived', class: 'badge-archived' };
    default: return { label: workflow.status, class: 'badge-in-progress' };
  }
}

// ── Scope helpers ─────────────────────────────────────────────────────

/**
 * Get scope progress summary for a workflow.
 * Returns null if no scopes exist.
 */
export function getScopeProgress(workflow) {
  const scopes = workflow.scopes;
  if (!scopes || scopes.length === 0) return null;
  const total = scopes.length;
  const completed = scopes.filter(s => s.status === 'completed').length;
  const inProgress = scopes.filter(s => s.status === 'in-progress').length;
  const failed = scopes.filter(s => s.status === 'escalated' || s.status === 'failed').length;
  return { total, completed, inProgress, failed };
}

/**
 * Get scope badge info for display on kanban card.
 * Returns null if no scopes exist.
 */
export function getScopeBadge(workflow) {
  const progress = getScopeProgress(workflow);
  if (!progress) return null;
  const { total, completed, failed } = progress;
  if (total === 0) return null;
  let cls = 'badge-scope';
  if (completed === total) cls = 'badge-scope-done';
  else if (failed > 0) cls = 'badge-scope-failed';
  return { label: `${completed}/${total}`, class: cls };
}

/**
 * Return the active workflow for a project. Used by Muxy to avoid showing
 * workflow-scoped actions as if they applied to the clicked card when they
 * actually advance/complete the active workflow.
 */
export function getActiveWorkflow(workflows) {
  return (workflows || []).find(wf => wf.status === 'in-progress' && !wf.staleCwd) ?? null;
}

function quoteWorkflowName(name) {
  return `"${String(name ?? '').replace(/"/g, '\\"')}"`;
}

export function getWorkflowCommand(command, selectedWorkflow, activeWorkflow) {
  if (command === '/pw-abort') {
    return selectedWorkflow ? `/pw-abort ${quoteWorkflowName(selectedWorkflow.name)}` : '/pw-abort';
  }

  if (command === '/pw-archive') {
    return selectedWorkflow ? `/pw-archive name=${quoteWorkflowName(selectedWorkflow.name)}` : '/pw-archive';
  }

  if (selectedWorkflow && activeWorkflow?.name !== selectedWorkflow.name) {
    return null;
  }

  return command;
}

export function isWorkflowCommandEnabled(command, selectedWorkflow) {
  if (!selectedWorkflow) return true;
  if (selectedWorkflow.staleCwd) return false;
  if (selectedWorkflow?.status === 'completed' && command !== '/pw-archive') return false;
  if (command === '/pw-abort') {
    return selectedWorkflow.status === 'in-progress' || selectedWorkflow.status === 'paused';
  }
  if (command === '/pw-archive') {
    return selectedWorkflow.status !== 'archived';
  }
  return true;
}

export function getWorkflowCommandLabel(command, selectedWorkflow, activeWorkflow) {
  if (command === '/pw-next' && selectedWorkflow && activeWorkflow?.name !== selectedWorkflow.name) return 'Next active';
  if (command === '/pw-complete' && selectedWorkflow?.status === 'completed') return 'Done';
  if (command === '/pw-next' && selectedWorkflow?.status === 'completed') return 'Done';
  if (command === '/pw-abort' && selectedWorkflow?.status === 'completed') return 'Done';
  if (command === '/pw-abort' && selectedWorkflow?.staleCwd) return 'Stale cwd';
  if (command === '/pw-abort' && selectedWorkflow) return 'Abort selected';
  if (command === '/pw-archive' && selectedWorkflow) return 'Archive selected';
  return {
    '/pw-next': 'Next',
    '/pw-abort': 'Abort',
    '/pw-complete': 'Complete',
    '/pw-archive': 'Archive',
  }[command] ?? command;
}

export function getWorkflowCommandTitle(command, selectedWorkflow, activeWorkflow) {
  if (command === '/pw-next' && selectedWorkflow && activeWorkflow?.name !== selectedWorkflow.name) {
    return 'Only the active workflow can advance. Click the active workflow or run /pw-next in its project.';
  }
  if (command === '/pw-complete' && selectedWorkflow?.status === 'completed') {
    return 'Completed workflows belong in Done. Archive to hide/remove from the board.';
  }
  if (command === '/pw-next' && selectedWorkflow?.status === 'completed') {
    return 'Completed workflows belong in Done. Use /pw-unarchive if this was archived by mistake.';
  }
  if (command === '/pw-abort' && selectedWorkflow?.status === 'completed') {
    return 'Completed workflows do not need abort. Archive if you want to hide them.';
  }
  if (command === '/pw-complete' && selectedWorkflow && activeWorkflow?.name !== selectedWorkflow.name) {
    return 'Only the active workflow can be completed. Click the active workflow or run /pw-complete in its project.';
  }
  if (command === '/pw-abort' && selectedWorkflow?.staleCwd) {
    return 'Workflow cwd points outside the active project. Run a sync/repair before executing commands.';
  }
  if (command === '/pw-abort' && selectedWorkflow) {
    return `Execute /pw-abort for "${selectedWorkflow.name}" in the selected Pi pane.`;
  }
  if (command === '/pw-archive' && selectedWorkflow) {
    return `Execute /pw-archive for "${selectedWorkflow.name}" in the selected Pi pane.`;
  }
  return {
    '/pw-next': 'Execute /pw-next for the active workflow in the selected Pi pane.',
    '/pw-abort': 'Execute /pw-abort for the active workflow in the selected Pi pane.',
    '/pw-complete': 'Execute /pw-complete for the active workflow in the selected Pi pane.',
    '/pw-archive': 'Execute /pw-archive for the active workflow in the selected Pi pane.',
  }[command] ?? '';
}

// ── Artifact scanning ────────────────────────────────────────────────

const ARTIFACT_DIRS = ['specs', 'interfaces', 'plans', 'critiques', 'approvals'];
const ARTIFACT_DIR_ICONS = {
  specs: 'fileText',
  interfaces: 'columnShape',
  plans: 'fileText',
  critiques: 'alertCircle',
  approvals: 'circleCheck',
};
const ARTIFACT_DIR_LABELS = {
  specs: 'Specs',
  interfaces: 'Interfaces',
  plans: 'Plans',
  critiques: 'Critiques',
  approvals: 'Approvals',
};

export { ARTIFACT_DIRS, ARTIFACT_DIR_ICONS, ARTIFACT_DIR_LABELS };

/**
 * Scan session directories and build a map of workflow name → artifacts.
 * Returns Map<wfName, { artifacts: { specs: [], ... }, path: string }>
 */
export async function scanArtifactDirs() {
  const result = new Map();
  try {
    const dateDirs = await muxy.files.list('.cali-product-workflow/');
    const dateDirPromises = dateDirs
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .map(async dateDir => {
        try {
          const sessionDirs = await muxy.files.list(`.cali-product-workflow/${dateDir}/`);
          const sessionPromises = sessionDirs.map(async sessionDir => {
            try {
              const idxRes = await muxy.files.read(
                `.cali-product-workflow/${dateDir}/${sessionDir}/index.json`
              );
              if (!idxRes?.content) return;
              const data = JSON.parse(idxRes.content);
              if (!data.name) return;
              const base = `.cali-product-workflow/${dateDir}/${sessionDir}`;
              const artifacts = {};
              for (const dir of ARTIFACT_DIRS) {
                try {
                  const files = await muxy.files.list(`${base}/${dir}/`);
                  artifacts[dir] = files.filter(f => f.endsWith('.md'));
                } catch {
                  artifacts[dir] = [];
                }
              }
              // Only store if this name hasn't been seen, or this is newer
              if (!result.has(data.name)) {
                result.set(data.name, { artifacts, path: base, date: dateDir });
              }
            } catch { /* skip corrupt session */ }
          });
          await Promise.all(sessionPromises);
        } catch { /* skip unreadable date dir */ }
      });
    await Promise.all(dateDirPromises);
  } catch { /* no .cali-product-workflow dir */ }
  return result;
}

/**
 * Get total artifact count for display on a card badge.
 */
export function getArtifactCount(artifactData) {
  if (!artifactData) return 0;
  return Object.values(artifactData.artifacts).reduce(
    (sum, files) => sum + files.length, 0
  );
}

// ── Phase ↔ artifact mapping ──────────────────────────────────────────

/** Rough mapping: which artifact dir a phase produces */
const PHASE_TO_ARTIFACT_DIR = {
  Shape: 'specs',
  Scope: 'specs',
  Critique: 'critiques',
  Gate: 'approvals',
  'Int.Gate': 'approvals',
  Interface: 'interfaces',
  Planning: 'plans',
  Execution: 'specs',
};
export { PHASE_TO_ARTIFACT_DIR };

/**
 * Get artifacts relevant to a specific phase.
 */
export function getArtifactsForPhase(artifactData, phaseName) {
  if (!artifactData) return [];
  const dir = PHASE_TO_ARTIFACT_DIR[phaseName];
  if (!dir) return [];
  return artifactData.artifacts[dir] || [];
}

/**
 * Get the next pending or upcoming phase after current.
 * Returns { name, index, status } or null if workflow is complete.
 */
export function getNextPhaseInfo(workflow) {
  const phases = workflow.phases || [];
  const current = workflow.currentPhase ?? 0;
  // Look for first non-completed phase at or after current
  for (let i = current; i < phases.length; i++) {
    if (phases[i]?.status !== 'completed') {
      return { name: phases[i]?.name || PHASE_NAMES[i], index: i, status: phases[i]?.status || 'pending' };
    }
  }
  return null;
}

/**
 * Get the active/in-progress phase name.
 * Returns { name, index } or null.
 */
export function getCurrentPhaseInfo(workflow) {
  const phases = workflow.phases || [];
  const current = workflow.currentPhase ?? 0;
  const phase = phases[current];
  return phase
    ? { name: phase.name, index: current, status: phase.status }
    : { name: PHASE_NAMES[current] || 'Unknown', index: current, status: 'in-progress' };
}

/**
 * Read the content of an artifact file.
 * artifactData — from artifactMap.get(wfName)
 * dir — 'specs' | 'interfaces' | 'plans' | 'critiques' | 'approvals'
 * filename — e.g. 'spec-auth-passkeys.md'
 */
export async function readArtifactFile(artifactData, dir, filename) {
  if (!artifactData) return null;
  try {
    const fullPath = `${artifactData.path}/${dir}/${filename}`;
    const res = await muxy.files.read(fullPath);
    return res?.content || null;
  } catch {
    return null;
  }
}

/**
 * Workflow commands are Pi TUI input. Execute them by typing into a Muxy
 * terminal pane and pressing Enter.
 */
const WORKFLOW_COMMAND_LABELS = {
  '/pw-next': 'Run /pw-next?',
  '/pw-abort': 'Run /pw-abort?',
  '/pw-complete': 'Run /pw-complete?',
  '/pw-archive': 'Run /pw-archive?',
};

const WORKFLOW_COMMAND_MESSAGES = {
  '/pw-next': 'This will send `/pw-next` to the selected Pi terminal pane and press Enter. This advances the active workflow.',
  '/pw-abort': 'This will send `/pw-abort` to the selected Pi terminal pane and press Enter. With a workflow name, it stops that workflow; otherwise it stops the active workflow.',
  '/pw-complete': 'This will send `/pw-complete` to the selected Pi terminal pane and press Enter. This marks the active workflow complete.',
  '/pw-archive': 'This will send `/pw-archive` to the selected Pi terminal pane and press Enter. With a workflow name, it archives that workflow; otherwise it archives the active workflow.',
};

export async function runWorkflowCommand(command) {
  const title = WORKFLOW_COMMAND_LABELS[command] ?? `Run ${command}?`;
  const baseMessage = WORKFLOW_COMMAND_MESSAGES[command]
    ?? `This will send \`${command}\` to a Pi terminal pane and press Enter.`;

  try {
    const panes = await muxy.panes.list();
    const resolution = await resolvePreferredPane(panes);
    const message = buildConfirmMessage(baseMessage, resolution);

    const choice = await muxy.dialog.confirm({
      title,
      message,
      buttons: ['Run', 'Cancel'],
      default: 'Cancel',
      cancel: 'Cancel',
      style: 'warning',
    });

    if (choice !== 'Run') {
      return { ok: false, reason: 'cancelled', copied: false };
    }

    const pane = resolution.pane ?? await selectTerminalPane(panes);
    if (!pane) {
      return { ok: false, reason: 'No terminal panes open', copied: false };
    }

    await muxy.panes.send(pane.id, command);
    await muxy.panes.sendKeys(pane.id, 'Enter');
    return { ok: true, paneTitle: pane.title || pane.id, copied: false };
  } catch (error) {
    const copied = await copyToClipboard(command).catch(() => false);
    return {
      ok: false,
      reason: error?.message ?? String(error),
      copied,
    };
  }
}

async function resolvePreferredPane(panes) {
  if (!panes || panes.length === 0) {
    return { pane: null, workspacePath: null, workspacePanes: [], focusedOutsideWorkspace: false };
  }

  const workspacePath = await getActiveWorkspacePath().catch(() => null);
  const workspacePanes = workspacePath
    ? panes.filter(pane => pane.workingDirectory && pathIsInside(pane.workingDirectory, workspacePath))
    : panes;
  const focused = panes.find(isFocusedPane);
  const focusedInWorkspace = workspacePanes.find(p => focused && p.id === focused.id);
  const projectName = workspacePath ? pathBasename(workspacePath) : null;
  const focusedMatchesProject = focused && projectName && paneMatchesProjectName(focused, projectName);
  const candidates = workspacePanes.length > 0 ? workspacePanes : panes;

  if (workspacePath && workspacePanes.length === 0 && focusedMatchesProject) {
    return { pane: focused, workspacePath, workspacePanes, focusedOutsideWorkspace: false };
  }

  if (workspacePath && workspacePanes.length === 0) {
    return { pane: null, workspacePath, workspacePanes, focusedOutsideWorkspace: true };
  }

  if (workspacePanes.length === 1) {
    return { pane: workspacePanes[0], workspacePath, workspacePanes, focusedOutsideWorkspace: false };
  }

  if (focusedInWorkspace) {
    return { pane: focusedInWorkspace, workspacePath, workspacePanes, focusedOutsideWorkspace: false };
  }

  const titleMatch = candidates.find(p => /(^|\s)pi(\s|$)/i.test(p.title ?? ''));
  if (titleMatch) {
    return { pane: titleMatch, workspacePath, workspacePanes, focusedOutsideWorkspace: Boolean(focused && !focusedInWorkspace) };
  }

  const cwdMatch = candidates.find(p => /(^|\s)pi(\s|$)/i.test(p.workingDirectory ?? ''));
  if (cwdMatch) {
    return { pane: cwdMatch, workspacePath, workspacePanes, focusedOutsideWorkspace: Boolean(focused && !focusedInWorkspace) };
  }

  return { pane: null, workspacePath, workspacePanes, focusedOutsideWorkspace: Boolean(focused && !focusedInWorkspace) };
}

function buildConfirmMessage(baseMessage, resolution) {
  if (resolution.pane) {
    return `${baseMessage} Target: ${formatPaneForDialog(resolution.pane)}. Active workspace: ${resolution.workspacePath ?? 'unknown'}.`;
  }

  if (resolution.focusedOutsideWorkspace) {
    return `${baseMessage} Focused pane is outside the active workspace/project. You will pick a pane from the active workspace/project.`;
  }

  if (resolution.workspacePanes.length > 1) {
    return `${baseMessage} Multiple terminal panes are open in the active workspace/project. You will pick the target pane.`;
  }

  return `${baseMessage} If multiple panes are open, you will pick the target pane.`;
}

function formatPaneForDialog(pane) {
  const title = pane.title || 'Untitled pane';
  const cwd = pane.workingDirectory ? ` (${pane.workingDirectory})` : '';
  return `${title}${cwd}`;
}

async function selectTerminalPane(panes) {
  if (!panes || panes.length === 0) {
    return null;
  }

  if (panes.length === 1) {
    return panes[0];
  }

  const workspacePath = await getActiveWorkspacePath().catch(() => null);
  const workspacePanes = workspacePath
    ? panes.filter(pane => pane.workingDirectory && pathIsInside(pane.workingDirectory, workspacePath))
    : panes;
  if (workspacePath && workspacePanes.length === 0) {
    const focused = panes.find(isFocusedPane);
    const projectName = pathBasename(workspacePath);
    if (focused && paneMatchesProjectName(focused, projectName)) {
      return focused;
    }
  }
  const candidates = workspacePanes.length > 0 ? workspacePanes : panes;
  const focused = panes.find(isFocusedPane);
  const focusedInCandidates = candidates.find(p => focused && p.id === focused.id);

  if (focusedInCandidates) {
    return focusedInCandidates;
  }

  const items = paneItems(candidates);
  const choice = await muxy.modal.open({
    placeholder: 'Select Pi pane',
    emptyLabel: 'No terminal panes',
    noMatchLabel: 'No matching panes',
    items: focusedInCandidates
      ? [paneToItem(focusedInCandidates), ...items.filter(item => item.id !== focusedInCandidates.id)]
      : items,
  });

  if (!choice) return null;
  return panes.find(p => p.id === choice.id) ?? null;
}

async function getActiveWorkspacePath() {
  const projects = await muxy.projects.list();
  const activeProject = projects.find(project => project.isActive);
  if (!activeProject) return null;

  const worktrees = await muxy.worktrees.list(activeProject.id).catch(() => []);
  const activeWorktree = worktrees.find(worktree => worktree.isActive);
  return activeWorktree?.path ?? activeProject.path;
}

function paneMatchesProjectName(pane, projectName) {
  if (!projectName) return false;
  const haystack = `${pane.title ?? ''} ${pane.workingDirectory ?? ''}`.toLowerCase();
  return haystack.includes(projectName.toLowerCase());
}

function pathBasename(path) {
  return normalizePath(path).split('/').filter(Boolean).pop() ?? '';
}

function isFocusedPane(pane) {
  return Boolean(pane?.isFocused || pane?.focused);
}

function pathIsInside(candidatePath, parentPath) {
  const normalizedCandidate = normalizePath(candidatePath).toLowerCase();
  const normalizedParent = normalizePath(parentPath).toLowerCase();
  return normalizedCandidate === normalizedParent
    || normalizedCandidate.startsWith(`${normalizedParent}/`);
}

function normalizePath(path) {
  return path.replace(/\/+/g, '/').replace(/\/$/, '');
}

function paneItems(panes) {
  return panes.map(paneToItem);
}

function paneToItem(pane) {
  return {
    id: pane.id,
    title: pane.title || 'Untitled pane',
    subtitle: [
      pane.workingDirectory || 'No working directory',
      isFocusedPane(pane) ? 'focused' : null,
    ].filter(Boolean).join(' · '),
  };
}

/**
 * Load workflows from global tracking that belong to other worktrees.
 * This gives a multi-worktree view of all workflows in the project.
 * Muxy may not support absolute paths; if it fails, returns empty.
 */
export async function loadExtraWorkflows() {
  try {
    const home = typeof process !== 'undefined' && process.env?.HOME ? process.env.HOME : '';
    if (!home) return [];
    const globalPath = `${home}/.cali-pw-global.json`;
    const res = await muxy.files.read(globalPath);
    if (!res || !res.content) return [];
    const global = JSON.parse(res.content);
    const projectPath = await getActiveWorkspacePath().catch(() => null);
    if (!projectPath) return [];

    // Scope to same git repository (not same project directory).
    // This avoids showing unrelated workflows from other repos
    // while still showing worktrees and sibling branches.
    const repoRoot = await getGitRoot(projectPath).catch(() => null);
    if (!repoRoot) return [];

    return (await Promise.all(global.workflows
      .filter(w => w.cwd
        && normalizePath(w.cwd).startsWith(`${normalizePath(repoRoot)}/`)
        && !isWorkflowCwdCompatible(w.cwd, projectPath)
      )
      .map(async w => {
        // Fetch real status from the project's local tracking file
        try {
          const localPath = `${normalizePath(w.cwd)}/cali-product-workflow.json`;
          const localRes = await muxy.files.read(localPath);
          if (!localRes || !localRes.content) return null;
          const local = JSON.parse(localRes.content);
          const live = local.workflows?.find(lw => lw.name === w.name);
          if (!live || isHiddenWorkflowStatus(live.status)) return null;
          return {
            ...live,
            cwd: w.cwd,
            dirHash: w.dirHash,
            staleCwd: false,
            worktreeName: guessWorktreeName(w.cwd, projectPath),
            fromGlobal: true,
          };
        } catch {
          return null;
        }
      }))).filter(Boolean);
  } catch {
    return [];
  }
}

function guessWorktreeName(workflowCwd, projectPath) {
  const normalized = normalizePath(workflowCwd);
  const parts = normalized.split('/');
  const wtIdx = parts.findIndex(p => p === 'worktree-checkouts');
  if (wtIdx !== -1 && wtIdx + 2 < parts.length) return parts[wtIdx + 2];
  return parts[parts.length - 1] || pathBasename(workflowCwd);
}

/**
 * Find the git repository root for a given directory.
 * Walks up until it finds .git or HEAD marker.
 * Returns null if not determined.
 */
async function getGitRoot(startDir) {
  let dir = normalizePath(startDir);
  while (dir) {
    try {
      const entries = await muxy.files.list(dir);
      if (entries.some(e => e === '.git' || e === 'HEAD')) return dir;
    } catch {
      // Permission denied or not a directory
    }
    const parent = dir.split('/').slice(0, -1).join('/');
    if (!parent || parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Copy text to clipboard using muxy.exec + pbcopy.
 * Uses base64 to avoid shell quoting issues with special chars.
 */
export async function copyToClipboard(text) {
  try {
    const b64 = btoa(text);
    await muxy.exec({ shell: `echo ${b64} | base64 -d | pbcopy` });
    return true;
  } catch {
    return false;
  }
}

// ── Name & Display helpers ────────────────────────────────────────────

/**
 * Generate a safe kebab-case name from text.
 */
export function toSafeName(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

/**
 * Get a YYYY-MM-DD date stamp.
 */
export function getDateStamp(date) {
  return (date || new Date()).toISOString().slice(0, 10);
}

/**
 * Derive a representative display name from draft content.
 * Extracts the first meaningful sentence or phrase.
 */
export function summarizeDisplayName(draftContent) {
  if (!draftContent) return null;
  let clean = draftContent
    .replace(/```[\s\S]*?```/g, '')
    .replace(/=== FILE:.*?===/g, '')
    .replace(/### Initial Draft\n\n/, '')
    .trim();
  // First non-empty line under 80 chars
  const firstLine = clean.split('\n')[0]?.trim();
  if (firstLine && firstLine.length > 3 && firstLine.length < 80) {
    return firstLine;
  }
  // First 5 significant words
  const words = clean.split(/\s+/).filter(w => w.length > 2).slice(0, 5);
  if (words.length >= 2) return words.join(' ');
  return null;
}

/**
 * Persist workflow metadata fields to both tracking file and index.json.
 * wf: workflow object (needs name for lookup, dirHash + created for index.json path)
 * updates: partial fields to merge (e.g. { displayName: '...' })
 */
export async function persistWorkflowMeta(wf, updates) {
  const res = await muxy.files.read('cali-product-workflow.json');
  if (!res?.content) return false;
  const tracking = JSON.parse(res.content);
  const entry = tracking.workflows.find(w => w.name === wf.name);
  if (!entry) return false;
  Object.assign(entry, updates, { updated: new Date().toISOString() });
  await muxy.files.write('cali-product-workflow.json', JSON.stringify(tracking, null, 2));

  // Also persist to index.json
  if (wf.dirHash && wf.created) {
    const ds = getDateStamp(new Date(wf.created));
    const idxPath = `.cali-product-workflow/${ds}/${wf.dirHash}/index.json`;
    try {
      const idxRes = await muxy.files.read(idxPath);
      if (idxRes?.content) {
        const idx = JSON.parse(idxRes.content);
        Object.assign(idx, updates, { updated_at: new Date().toISOString() });
        await muxy.files.write(idxPath, JSON.stringify(idx, null, 2));
      }
    } catch { /* skip unreadable index */ }
  }

  return true;
}

/**
 * Rename a workflow: set a new display name and kebab-safe name.
 * oldName: current name for lookup in the tracking file
 * newDisplayName: new human-readable name
 * Returns the new safe name, or null on failure.
 */
export async function renameWorkflowInFiles(oldName, newDisplayName, wf) {
  const safeName = toSafeName(newDisplayName);
  if (!safeName || safeName.length < 2) return null;

  const res = await muxy.files.read('cali-product-workflow.json');
  if (!res?.content) return null;
  const tracking = JSON.parse(res.content);
  const entry = tracking.workflows.find(w => w.name === oldName);
  if (!entry) return null;
  entry.name = safeName;
  entry.displayName = newDisplayName;
  entry.updated = new Date().toISOString();
  await muxy.files.write('cali-product-workflow.json', JSON.stringify(tracking, null, 2));

  // Update index.json
  if (wf.dirHash && wf.created) {
    const ds = getDateStamp(new Date(wf.created));
    const idxPath = `.cali-product-workflow/${ds}/${wf.dirHash}/index.json`;
    try {
      const idxRes = await muxy.files.read(idxPath);
      if (idxRes?.content) {
        const idx = JSON.parse(idxRes.content);
        idx.name = safeName;
        idx.displayName = newDisplayName;
        idx.updated_at = new Date().toISOString();
        await muxy.files.write(idxPath, JSON.stringify(idx, null, 2));
      }
    } catch { /* skip unreadable index */ }
  }

  return safeName;
}
