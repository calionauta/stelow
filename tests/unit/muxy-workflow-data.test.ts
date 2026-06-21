import { describe, expect, it } from 'vitest';
import {
  groupWorkflowsByMacroStage,
  getMacroStage,
  getStatusBadge,
  getWorkflowProgress,
  getScopeProgress,
  getScopeBadge,
  getScopeStatusInfo,
  getScopeSummaryText,
  getActiveWorkflow,
  getWorkflowCommandLabel,
  isWorkflowCommandEnabled,
  normalizeTrackingDataForProject,
} from '../../extensions/stelow-muxy/src/panel/data';

const wf = (name: string, currentPhase = 2, status = 'in-progress') => ({
  name,
  status,
  currentPhase,
  cwd: `/tmp/${name}-project`,
  phases: [],
});

describe('Muxy workflow data normalization', () => {
  it('marks workflows whose cwd is outside the active project', () => {
    const normalized = normalizeTrackingDataForProject(
      { workflows: [wf('migrar-sqlite', 2)] },
      '/tmp/llm-separadas-terapeuta-cliente',
    );

    expect(normalized?.workflows[0].staleCwd).toBe(true);
  });

  it('keeps workflows whose cwd is inside the active project', () => {
    const normalized = normalizeTrackingDataForProject(
      { workflows: [{ ...wf('auth'), cwd: '/tmp/llm-separadas-terapeuta-cliente/authentication' }] },
      '/tmp/llm-separadas-terapeuta-cliente',
    );

    expect(normalized?.workflows[0].staleCwd).toBe(false);
  });

  it('hides stale-cwd workflows from macro-stage buckets', () => {
    const buckets = groupWorkflowsByMacroStage([
      { ...wf('stale', 2), staleCwd: true },
      wf('active', 2),
    ]);

    expect(buckets.find(b => b.id === 'shape')?.workflows.map(w => w.name)).toEqual(['active']);
  });

  it('puts completed workflows in a Done bucket', () => {
    const buckets = groupWorkflowsByMacroStage([
      wf('verify-active', 14, 'in-progress'),
      wf('done', 14, 'completed'),
    ]);

    expect(buckets.find(b => b.id === 'verify')?.workflows.map(w => w.name)).toEqual(['verify-active']);
    expect(buckets.find(b => b.id === 'done')?.workflows.map(w => w.name)).toEqual(['done']);
    expect(getMacroStage({ ...wf('done', 2, 'completed') })?.name).toBe('Done');
    expect(getWorkflowProgress({ ...wf('done', 2, 'completed') })).toBe(1);
  });

  it('disables active commands for completed workflows but keeps archive enabled', () => {
    const done = wf('done', 14, 'completed');

    expect(isWorkflowCommandEnabled('/sw-next', done)).toBe(false);
    expect(isWorkflowCommandEnabled('/sw-complete', done)).toBe(false);
    expect(isWorkflowCommandEnabled('/sw-abort', done)).toBe(false);
    expect(isWorkflowCommandEnabled('/sw-archive', done)).toBe(true);
  });

  it('marks stale-cwd workflow as stale badge and disables commands', () => {
    const stale = { ...wf('stale', 2), staleCwd: true };

    expect(getStatusBadge(stale)).toEqual({ label: 'Stale cwd', class: 'badge-archived' });
    expect(isWorkflowCommandEnabled('/sw-abort', stale)).toBe(false);
    expect(getWorkflowCommandLabel('/sw-abort', stale, stale)).toBe('Stale cwd');
  });

  it('finds active workflow only when cwd is not stale', () => {
    expect(getActiveWorkflow([
      { ...wf('stale', 2), staleCwd: true },
      { ...wf('active', 2), staleCwd: false },
    ])?.name).toBe('active');
  });
});

describe('Scope progress helpers', () => {
  const wfWithScopes = (scopes: Array<{ id: string; name: string; type: string; status: string }>) => ({
    name: 'test-wf',
    status: 'in-progress',
    currentPhase: 12,
    cwd: '/tmp/test',
    phases: [],
    scopes,
  });

  it('returns null when no scopes exist', () => {
    expect(getScopeProgress(wfWithScopes([]))).toBeNull();
    expect(getScopeProgress({ name: 'no-scopes', status: 'in-progress', currentPhase: 0, phases: [] })).toBeNull();
  });

  it('counts scope statuses correctly', () => {
    const progress = getScopeProgress(wfWithScopes([
      { id: 's1', name: 'Auth', type: 'feature', status: 'completed' },
      { id: 's2', name: 'Token', type: 'feature', status: 'in-progress' },
      { id: 's3', name: 'Cache', type: 'optimization', status: 'pending' },
    ]));
    expect(progress).toEqual({ total: 3, completed: 1, inProgress: 1, pending: 1, failed: 0 });
  });

  it('returns scope status labels for display', () => {
    expect(getScopeStatusInfo('pending')).toEqual({ label: 'Pending', tone: 'muted' });
    expect(getScopeStatusInfo('in-progress')).toEqual({ label: 'Active', tone: 'primary' });
    expect(getScopeStatusInfo('completed')).toEqual({ label: 'Done', tone: 'success' });
    expect(getScopeStatusInfo('escalated')).toEqual({ label: 'Escalated', tone: 'danger' });
  });

  it('builds readable scope summary text', () => {
    const summary = getScopeSummaryText(wfWithScopes([
      { id: 's1', name: 'A', type: 'feature', status: 'completed' },
      { id: 's2', name: 'B', type: 'feature', status: 'in-progress' },
      { id: 's3', name: 'C', type: 'spike', status: 'pending' },
      { id: 's4', name: 'D', type: 'test-unit', status: 'escalated' },
    ]));
    expect(summary).toBe('1 done, 1 active, 1 pending, 1 failed');
  });

  it('counts escalated as failed', () => {
    const progress = getScopeProgress(wfWithScopes([
      { id: 's1', name: 'A', type: 'feature', status: 'completed' },
      { id: 's2', name: 'B', type: 'feature', status: 'escalated' },
    ]));
    expect(progress?.failed).toBe(1);
  });

  it('returns null badge when no scopes', () => {
    expect(getScopeBadge(wfWithScopes([]))).toBeNull();
  });

  it('returns done badge when all scopes completed', () => {
    const badge = getScopeBadge(wfWithScopes([
      { id: 's1', name: 'A', type: 'feature', status: 'completed' },
      { id: 's2', name: 'B', type: 'spike', status: 'completed' },
    ]));
    expect(badge).toEqual({ label: '2/2', class: 'badge-scope-done' });
  });

  it('returns failed badge when any scope escalated', () => {
    const badge = getScopeBadge(wfWithScopes([
      { id: 's1', name: 'A', type: 'feature', status: 'completed' },
      { id: 's2', name: 'B', type: 'feature', status: 'escalated' },
    ]));
    expect(badge?.class).toBe('badge-scope-failed');
  });

  it('returns neutral badge when mix of pending/in-progress', () => {
    const badge = getScopeBadge(wfWithScopes([
      { id: 's1', name: 'A', type: 'feature', status: 'completed' },
      { id: 's2', name: 'B', type: 'feature', status: 'in-progress' },
      { id: 's3', name: 'C', type: 'spike', status: 'pending' },
    ]));
    expect(badge).toEqual({ label: '1/3', class: 'badge-scope' });
  });
});
