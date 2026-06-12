import { describe, expect, it } from 'vitest';
import {
  groupWorkflowsByMacroStage,
  getMacroStage,
  getStatusBadge,
  getWorkflowProgress,
  getActiveWorkflow,
  getWorkflowCommandLabel,
  isWorkflowCommandEnabled,
  normalizeTrackingDataForProject,
} from '../../extensions/cali-product-workflow-muxy/src/panel/data';

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

    expect(isWorkflowCommandEnabled('/pw-next', done)).toBe(false);
    expect(isWorkflowCommandEnabled('/pw-complete', done)).toBe(false);
    expect(isWorkflowCommandEnabled('/pw-abort', done)).toBe(false);
    expect(isWorkflowCommandEnabled('/pw-archive', done)).toBe(true);
  });

  it('marks stale-cwd workflow as stale badge and disables commands', () => {
    const stale = { ...wf('stale', 2), staleCwd: true };

    expect(getStatusBadge(stale)).toEqual({ label: 'Stale cwd', class: 'badge-archived' });
    expect(isWorkflowCommandEnabled('/pw-abort', stale)).toBe(false);
    expect(getWorkflowCommandLabel('/pw-abort', stale, stale)).toBe('Stale cwd');
  });

  it('finds active workflow only when cwd is not stale', () => {
    expect(getActiveWorkflow([
      { ...wf('stale', 2), staleCwd: true },
      { ...wf('active', 2), staleCwd: false },
    ])?.name).toBe('active');
  });
});
