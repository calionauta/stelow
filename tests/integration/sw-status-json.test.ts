/**
 * Integration tests: /sw-status --json flag (G5A from stelow-reliability plan)
 *
 * Verifies the data contract that the /sw-status --json snapshot
 * depends on. The serializer in cmdStatus reads TrackingData fields
 * (workflow.currentPhase, workflow.phases[], workflow.scopes[],
 * workflow.dirHash, workflow.name) and emits a structured snapshot.
 *
 * If the TrackingData shape changes, this test catches the regression
 * before agents silently consume malformed JSON.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeTracking } from '../../extensions/stelow/state';
import type { TrackingData } from '../../extensions/stelow/types';

let workDir: string;

const baseTracking = (name: string): TrackingData => ({
  $schema: 'https://example.com/stelow.schema.json',
  version: '1.0',
  created: '2026-07-14T00:00:00.000Z',
  updated: '2026-07-14T00:00:00.000Z',
  workflows: [
    {
      name,
      status: 'active',
      currentPhase: 0,
      cwd: '', // filled by writeTracking? no — must be set
      dirHash: 'abc123',
      created: '2026-07-14T00:00:00.000Z',
      updated: '2026-07-14T00:00:00.000Z',
      draftContent: '',
      phases: [
        { id: 'shape', name: 'shape', status: 'in-progress' },
        { id: 'critique', name: 'critique', status: 'pending' },
        { id: 'plan', name: 'plan', status: 'pending' },
      ],
      scopes: [],
    },
  ],
});

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'stelow-status-'));
  mkdirSync(join(workDir, '.stelow'), { recursive: true });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('/sw-status --json data contract', () => {
  it('preserves the fields the --json serializer depends on', () => {
    const data = baseTracking('wf-test');
    data.workflows[0].cwd = workDir;
    writeTracking(workDir, data);

    const target = join(workDir, 'stelow.json');
    const out = JSON.parse(readFileSync(target, 'utf-8'));
    expect(out.workflows).toHaveLength(1);

    const wf = out.workflows[0];
    expect(wf.name).toBe('wf-test');
    expect(wf.dirHash).toBe('abc123');
    expect(wf.currentPhase).toBe(0);
    expect(wf.phases).toHaveLength(3);
    expect(wf.scopes).toEqual([]);
  });

  it('preserves scope progress for execution-phase snapshot', () => {
    const data = baseTracking('wf-scopes');
    data.workflows[0].cwd = workDir;
    data.workflows[0].currentPhase = 6;
    data.workflows[0].scopes = [
      {
        id: 's1',
        name: 'scope-one',
        type: 'feature',
        status: 'completed',
        record: {
          completed_at: '2026-07-14T00:00:00.000Z',
          files_count: 1,
          commands_count: 0,
          verified: true,
          suggested_commit: 'feat: scope one',
        },
        tasks: [],
        discovered_tasks_count: 0,
      },
      {
        id: 's2',
        name: 'scope-two',
        type: 'feature',
        status: 'pending',
        record: {
          completed_at: '',
          files_count: 0,
          commands_count: 0,
          verified: false,
          suggested_commit: '',
        },
        tasks: [],
        discovered_tasks_count: 0,
      },
    ];
    writeTracking(workDir, data);

    const target = join(workDir, 'stelow.json');
    const out = JSON.parse(readFileSync(target, 'utf-8'));
    expect(out.workflows[0].scopes).toHaveLength(2);
    expect(out.workflows[0].scopes[0].status).toBe('completed');
    expect(out.workflows[0].scopes[1].status).toBe('pending');

    // Atomic-write collateral: no .tmp leftovers in working dir.
    const files = readdirSync(workDir);
    expect(files.filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });

  it('does not write a stray .tmp when round-tripping JSON', () => {
    const data = baseTracking('wf-clean');
    data.workflows[0].cwd = workDir;
    writeTracking(workDir, data);

    const files = readdirSync(workDir);
    const tmp = files.filter((f) => f.endsWith('.tmp'));
    expect(tmp).toEqual([]);
  });
});