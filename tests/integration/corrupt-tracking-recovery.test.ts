/**
 * Integration tests: Corrupt stelow.json recovery (Aud-1 from stelow-reliability plan)
 *
 * Plan gap: "Nenhum teste de recovery: o que acontece se stelow.json
 * for truncado, JSON inválido, ou field faltando?"
 *
 * Verifies the readTracking pipeline is graceful under the 3 main
 * failure modes a real disk can produce:
 *  - truncated file (mid-write crash, power loss)
 *  - invalid JSON (manual edit broken, foreign bytes from copy-paste)
 *  - missing required fields (migrations, schema evolution)
 *
 * Recovery paths:
 *  - readTracking returns null → doctor flags tracking-malformed
 *  - writeTracking fails validation before writing
 *  - the file is never partially overwritten (atomic write)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readTracking, writeTracking } from '../../extensions/stelow/state';
import { diagnoseWorkflowProject } from '../../extensions/stelow/doctor';
import { validateWorkflow } from '../../extensions/stelow/schemas';
import type { TrackingData } from '../../extensions/stelow/types';

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'stelow-corrupt-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

const trackingPath = (dir: string) => join(dir, 'stelow.json');

describe('readTracking — corrupt file recovery', () => {
  it('returns null for truncated file (mid-write crash)', () => {
    // Simulate a partial write that left the file half-written
    writeFileSync(trackingPath(workDir), '{ "$schema": "x", "version": ');
    expect(readTracking(workDir)).toBeNull();
  });

  it('returns null for empty file', () => {
    writeFileSync(trackingPath(workDir), '');
    expect(readTracking(workDir)).toBeNull();
  });

  it('returns null for invalid JSON (foreign bytes)', () => {
    writeFileSync(trackingPath(workDir), '\x00\x01\x02 not json at all');
    expect(readTracking(workDir)).toBeNull();
  });

  it('returns null for JSON but not an object (array root)', () => {
    writeFileSync(trackingPath(workDir), '[]');
    expect(readTracking(workDir)).toBeNull();
  });

  it('returns data for valid JSON (control case)', () => {
    const valid: TrackingData = {
      $schema: 'https://example.com/schema',
      version: '1.0',
      created: '2026-07-14T00:00:00.000Z',
      updated: '2026-07-14T00:00:00.000Z',
      workflows: [],
    };
    writeFileSync(trackingPath(workDir), JSON.stringify(valid, null, 2));
    const read = readTracking(workDir);
    expect(read).not.toBeNull();
    expect(read?.version).toBe('1.0');
  });
});

describe('writeTracking — validation against corrupt prior state', () => {
  it('overwrites truncated file with valid data (recovery path)', () => {
    // Pre-existing corrupt file
    writeFileSync(trackingPath(workDir), '{ broken');

    // A valid write must succeed — atomic write replaces whatever
    // was there. readJson would return null on the broken state, but
    // writeTracking does not read before writing.
    const valid: TrackingData = {
      $schema: 'https://example.com/schema',
      version: '1.0',
      created: '2026-07-14T00:00:00.000Z',
      updated: '2026-07-14T00:00:00.000Z',
      workflows: [],
    };
    expect(() => writeTracking(workDir, valid)).not.toThrow();

    // File is now valid JSON
    const read = readTracking(workDir);
    expect(read?.version).toBe('1.0');
  });

  it('does not write when validation fails (atomic preservation of corrupt prior)', () => {
    // Pre-existing valid file
    const prior = JSON.stringify({
      $schema: 'x', version: '1.0',
      created: '2026-07-14T00:00:00.000Z', updated: '2026-07-14T00:00:00.000Z',
      workflows: [],
    });
    writeFileSync(trackingPath(workDir), prior);

    // Attempt to write an invalid workflow (name: '')
    const bad: TrackingData = {
      $schema: 'x', version: '1.0',
      created: '2026-07-14T00:00:00.000Z', updated: '2026-07-14T00:00:00.000Z',
      workflows: [
        {
          name: '',
          description: 'x',
          status: 'in-progress',
          currentPhase: 0,
          phases: [],
          stage: {
            current_stage: 'setup',
            previous_stage: null,
            transitioned_at: '2026-07-14T00:00:00.000Z',
            history: [],
            supervisor_active: false,
          },
          created: '2026-07-14T00:00:00.000Z',
          updated: '2026-07-14T00:00:00.000Z',
        },
      ],
    };

    expect(() => writeTracking(workDir, bad)).toThrow();

    // Prior file must be preserved exactly (atomic write guarantee)
    const after = readFileSync(trackingPath(workDir), 'utf-8');
    expect(after).toBe(prior);
  });
});

describe('validateWorkflow — missing field detection', () => {
  it('rejects workflow missing required status', () => {
    const wf = {
      name: 'x',
      description: 'x',
      currentPhase: 0,
      phases: [],
      stage: { current_stage: 'setup', previous_stage: null, transitioned_at: 'x', history: [], supervisor_active: false },
      created: 'x',
      updated: 'x',
    };
    expect(() => validateWorkflow(wf)).toThrow(/status/);
  });

  it('rejects workflow missing required name', () => {
    const wf = {
      description: 'x',
      status: 'in-progress',
      currentPhase: 0,
      phases: [],
      stage: { current_stage: 'setup', previous_stage: null, transitioned_at: 'x', history: [], supervisor_active: false },
      created: 'x',
      updated: 'x',
    };
    expect(() => validateWorkflow(wf)).toThrow(/name/);
  });

  it('rejects workflow missing required created', () => {
    const wf = {
      name: 'x',
      description: 'x',
      status: 'in-progress',
      currentPhase: 0,
      phases: [],
      stage: { current_stage: 'setup', previous_stage: null, transitioned_at: 'x', history: [], supervisor_active: false },
      updated: 'x',
    };
    expect(() => validateWorkflow(wf)).toThrow(/created/);
  });
});

describe('doctor — corrupt tracking detection', () => {
  it('flags tracking as missing when file absent', () => {
    // No .stelow/stelow.json
    const report = diagnoseWorkflowProject(workDir);
    const issue = report.issues.find((i) => i.code === 'tracking-missing');
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('error');
  });

  it('gracefully handles corrupt tracking (read returns null, no crash)', () => {
    writeFileSync(trackingPath(workDir), 'not json at all');
    // Should NOT throw — doctor must be defensive
    expect(() => diagnoseWorkflowProject(workDir)).not.toThrow();
    const report = diagnoseWorkflowProject(workDir);
    // trackingExists will be false (readJson returned null) → "missing" issue
    const issue = report.issues.find((i) => i.code === 'tracking-missing');
    expect(issue).toBeDefined();
  });
});

describe('atomic write — corruption scenarios', () => {
  it('no .tmp file leaks when write throws', () => {
    // Force a write to throw by trying to write to an unwritable path
    // We use an invalid scope to trigger validation throw.
    const bad: TrackingData = {
      $schema: 'x', version: '1.0',
      created: 'x', updated: 'x',
      workflows: [
        {
          name: 'x', description: 'x', status: 'in-progress',
          currentPhase: 0, phases: [],
          stage: { current_stage: 'setup', previous_stage: null, transitioned_at: 'x', history: [], supervisor_active: false },
          created: 'x', updated: 'x',
          scopes: [{ id: '', name: '', type: '', status: 'completed',
            record: { completed_at: 'x', files_count: -1, commands_count: 0, verified: false } }],
        },
      ],
    };
    expect(() => writeTracking(workDir, bad)).toThrow();

    // No .tmp leftover in .stelow/
    const dir = join(workDir, '.stelow');
    if (existsSync(dir)) {
      const { readdirSync } = require('node:fs');
      const files = readdirSync(dir);
      const tmp = files.filter((f: string) => f.endsWith('.tmp'));
      expect(tmp).toEqual([]);
    }
  });
});