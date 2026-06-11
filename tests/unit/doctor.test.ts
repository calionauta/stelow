import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { diagnoseWorkflowProject, formatDoctorReport } from '../../extensions/cali-product-workflow/doctor';
import { WORKFLOW_COMMANDS } from '../../extensions/cali-product-workflow/adapters/commands/dispatcher';
import { writeTracking, writeGlobalTracking } from '../../extensions/cali-product-workflow/state';
import type { TrackingData, Workflow } from '../../extensions/cali-product-workflow/types';

const wf = (name: string, status = 'in-progress', phase = 2, extra: Partial<Workflow> = {}): Workflow => ({
  name,
  description: '',
  draftContent: '',
  status,
  currentPhase: phase,
  phases: [],
  created: '2026-06-11T00:00:00.000Z',
  updated: '2026-06-11T00:00:00.000Z',
  dirHash: `pw-${name}`,
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

describe('pw-doctor diagnostics', () => {
  const oldHome = process.env.HOME;
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'pw-doctor-'));
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
      expect.objectContaining({ code: 'global-status-mismatch' }),
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
    const tracking: TrackingData = {
      $schema: '',
      version: '1.0',
      created: '',
      updated: '',
      workflows: [local],
    };
    const globalData: TrackingData = {
      $schema: '',
      version: '1.0',
      created: '',
      updated: '',
      workflows: [global],
    };
    writeTracking(projectDir, tracking);
    writeGlobalTracking(globalData);

    const report = diagnoseWorkflowProject(projectDir);

    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'index-missing' }),
      expect.objectContaining({ code: 'global-status-mismatch' }),
      expect.objectContaining({ code: 'global-phase-mismatch' }),
    ]));
  });

  it('is registered as a workflow command', () => {
    expect(WORKFLOW_COMMANDS.some(cmd => cmd.name === 'pw-doctor')).toBe(true);
  });

  it('formats a useful report with summary first', () => {
    const report = diagnoseWorkflowProject(projectDir);
    const formatted = formatDoctorReport(report);

    expect(formatted).toContain('🩺 Product Workflow Doctor');
    expect(formatted).toContain('Summary:');
    expect(formatted).toContain('tracking-missing');
  });
});
