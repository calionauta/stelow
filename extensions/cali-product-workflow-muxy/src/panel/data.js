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
    return JSON.parse(res.content);
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
  try {
    // Try reading package.json for project name
    const res = await muxy.files.read('package.json');
    if (res && res.content) {
      const pkg = JSON.parse(res.content);
      return pkg.name || pkg.displayName || null;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Group workflows into macro-stage buckets.
 * Returns [{ stage, workflows: [...] }, ...]
 */
export function groupWorkflowsByMacroStage(workflows) {
  const buckets = MACRO_STAGES.map(s => ({ ...s, workflows: [] }));

  for (const wf of workflows) {
    // Skip archived workflows for the main view
    if (wf.status === 'archived') continue;

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

  return buckets;
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
  const total = PHASE_NAMES.length;
  const current = workflow.currentPhase ?? 0;
  return Math.min(current / (total - 1), 1);
}

/**
 * Get status badge info for a workflow.
 */
export function getStatusBadge(workflow) {
  switch (workflow.status) {
    case 'in-progress': return { label: 'Active', class: 'badge-in-progress' };
    case 'paused': return { label: 'Paused', class: 'badge-paused' };
    case 'completed': return { label: 'Done', class: 'badge-completed' };
    case 'archived': return { label: 'Archived', class: 'badge-archived' };
    default: return { label: workflow.status, class: 'badge-in-progress' };
  }
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
  '/pw-next': 'This will send `/pw-next` to the selected Pi terminal pane and press Enter.',
  '/pw-abort': 'This will send `/pw-abort` to the selected Pi terminal pane and press Enter. This aborts the active workflow.',
  '/pw-complete': 'This will send `/pw-complete` to the selected Pi terminal pane and press Enter. This marks the active workflow complete.',
  '/pw-archive': 'This will send `/pw-archive` to the selected Pi terminal pane and press Enter. This archives the active workflow.',
};

export async function runWorkflowCommand(command) {
  const title = WORKFLOW_COMMAND_LABELS[command] ?? `Run ${command}?`;
  const baseMessage = WORKFLOW_COMMAND_MESSAGES[command]
    ?? `This will send \`${command}\` to a Pi terminal pane and press Enter.`;

  try {
    const focusedPane = await getFocusedPane().catch(() => null);
    const message = focusedPane
      ? `${baseMessage} Target: ${formatPaneForDialog(focusedPane)}.`
      : `${baseMessage} If multiple panes are open, you will pick the target pane.`;

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

    const pane = await selectTerminalPane(focusedPane);
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

async function getFocusedPane() {
  const panes = await muxy.panes.list();
  return panes?.find(p => p.isFocused) ?? null;
}

function formatPaneForDialog(pane) {
  const title = pane.title || 'Untitled pane';
  const cwd = pane.workingDirectory ? ` (${pane.workingDirectory})` : '';
  return `${title}${cwd}`;
}

async function selectTerminalPane(focusedPane) {
  const panes = await muxy.panes.list();
  if (!panes || panes.length === 0) {
    return null;
  }

  if (focusedPane) {
    return panes.find(p => p.id === focusedPane.id) ?? focusedPane;
  }

  if (panes.length === 1) {
    return panes[0];
  }

  const workspacePath = await getActiveWorkspacePath().catch(() => null);
  const workspacePanes = workspacePath
    ? panes.filter(pane => pane.workingDirectory && pathIsInside(pane.workingDirectory, workspacePath))
    : panes;

  if (workspacePanes.length === 1) {
    return workspacePanes[0];
  }

  const focused = panes.find(p => p.isFocused);
  const candidates = workspacePanes.length > 0 ? workspacePanes : panes;
  const preferred = pickBestPane(candidates, focused);
  if (preferred) {
    return preferred;
  }

  const items = paneItems(candidates);
  const choice = await muxy.modal.open({
    placeholder: 'Select Pi pane',
    emptyLabel: 'No terminal panes',
    noMatchLabel: 'No matching panes',
    items: focused && candidates.some(p => p.id === focused.id)
      ? [paneToItem(focused), ...items.filter(item => item.id !== focused.id)]
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

function pickBestPane(candidates, focusedPane) {
  const focused = candidates.find(p => focusedPane && p.id === focusedPane.id);
  if (focused) return focused;

  const titleMatch = candidates.find(p => /(^|\s)pi(\s|$)/i.test(p.title ?? ''));
  if (titleMatch) return titleMatch;

  const cwdMatch = candidates.find(p => /(^|\s)pi(\s|$)/i.test(p.workingDirectory ?? ''));
  if (cwdMatch) return cwdMatch;

  return null;
}

function pathIsInside(candidatePath, parentPath) {
  const normalizedCandidate = normalizePath(candidatePath);
  const normalizedParent = normalizePath(parentPath);
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
      pane.isFocused ? 'focused' : null,
    ].filter(Boolean).join(' · '),
  };
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
