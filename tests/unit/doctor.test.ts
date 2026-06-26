import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { diagnoseWorkflowProject, formatDoctorReport } from '../../extensions/stelow/doctor';
import { WORKFLOW_COMMANDS } from '../../extensions/stelow/adapters/commands/dispatcher';
import { writeTracking, writeGlobalTracking } from '../../extensions/stelow/state';
import type { TrackingData, Workflow } from '../../extensions/stelow/types';

const wf = (name: string, status = 'in-progress', phase = 2, extra: Partial<Workflow> = {}): Workflow => ({
  name,
  description: '',
  draftContent: '',
  status,
  currentPhase: phase,
  phases: [],
  created: '2026-06-11T00:00:00.000Z',
  updated: '2026-06-11T00:00:00.000Z',
  dirHash: `sw-${name}`,
  stage: {
    current_stage: 'shape',
    previous_stage: null,
    transitioned_at: '2026-06-11T00:00:00.000Z',
    history: [],
    gates_passed: [],
    supervisor_active: false,
  },
  ...extra,
});

describe('sw-doctor diagnostics', () => {
  const oldHome = process.env.HOME;
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'sw-doctor-'));
    process.env.HOME = projectDir;
  });

  afterEach(() => {
    if (oldHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = oldHome;
    }
    rmSync(projectDir, { force: true, recursive: true });
  });

  it('detects local stale cwd against global', () => {
    const staleCwd = join(tmpdir(), 'old-project');
    const tracking: TrackingData = {
      $schema: '',
      version: '1.0',
      created: '',
      updated: '',
      workflows: [wf('migrar-sqlite', 'in-progress', 2, { cwd: staleCwd })],
    };
    const global: TrackingData = {
      $schema: '',
      version: '1.0',
      created: '',
      updated: '',
      workflows: [wf('migrar-sqlite', 'archived', 2, { cwd: staleCwd })],
    };
    writeTracking(projectDir, tracking);
    writeGlobalTracking(global);

    const report = diagnoseWorkflowProject(projectDir);

    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'local-stale-cwd' }),
    ]));
  });

  it('detects duplicate global keys', () => {
    const sameCwd = join(projectDir, 'auth');
    const global: TrackingData = {
      $schema: '',
      version: '1.0',
      created: '',
      updated: '',
      workflows: [
        wf('duplicate', 'in-progress', 1, { cwd: sameCwd }),
        wf('duplicate', 'paused', 1, { cwd: sameCwd, updated: 'older' }),
      ],
    };
    writeGlobalTracking(global);

    const report = diagnoseWorkflowProject(projectDir);

    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'global-duplicate-key' }),
    ]));
  });

  it('detects missing index and global mismatch', () => {
    const local = wf('missing-index', 'in-progress', 2);
    const global = wf('missing-index', 'paused', 1, { cwd: projectDir });
    // Write stelow.json directly (bypassing writeTracking) so index.json is NOT created.
    writeFileSync(join(projectDir, 'stelow.json'), JSON.stringify({
      $schema: '',
      version: '1.0',
      created: '',
      updated: '',
      workflows: [local],
    }, null, 2));
    const globalData: TrackingData = {
      $schema: '',
      version: '1.0',
      created: '',
      updated: '',
      workflows: [global],
    };
    writeGlobalTracking(globalData);

    const report = diagnoseWorkflowProject(projectDir);

    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'index-missing' }),
    ]));
  });

  it('is registered as a workflow command', () => {
    expect(WORKFLOW_COMMANDS.some(cmd => cmd.name === 'sw-doctor')).toBe(true);
  });

  it('formats a useful report with summary first', () => {
    const report = diagnoseWorkflowProject(projectDir);
    const formatted = formatDoctorReport(report);

    expect(formatted).toContain('🩺 Product Workflow Doctor');
    expect(formatted).toContain('Summary:');
    expect(formatted).toContain('tracking-missing');
  });
});
