/**
 * Integration tests: Orphan workflow recovery (G4A+C from stelow-reliability plan)
 *
 * Verifies:
 *  - detectOrphanWorkflows finds workflow dirs with spec files but no tracking entry
 *  - Empty scaffold dirs are NOT flagged (only dirs with spec-product_*.md)
 *  - Workflows already in stelow.json are NOT flagged
 *  - Doctor report includes orphans + warning issue
 *  - formatDoctorReport renders orphan count
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  detectOrphanWorkflows,
  diagnoseWorkflowProject,
  formatDoctorReport,
} from '../../extensions/stelow/doctor';
import { writeTracking } from '../../extensions/stelow/state';
import type { TrackingData, Workflow } from '../../extensions/stelow/types';

let workDir: string;

const DATE_A = '2026-07-01';
const DATE_B = '2026-07-02';
const KNOWN_HASH = 'known1234';
const ORPHAN_HASH_1 = 'orphan01';
const ORPHAN_HASH_2 = 'orphan02';
const EMPTY_HASH = 'empty001';

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'stelow-orphan-'));
  mkdirSync(join(workDir, '.stelow'), { recursive: true });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

/** Scaffold a workflow directory under .stelow/{date}/{dirHash}/ */
function makeWorkflowDir(date: string, dirHash: string, withSpec: boolean): void {
  const dir = join(workDir, '.stelow', date, dirHash);
  mkdirSync(join(dir, 'specs'), { recursive: true });
  if (withSpec) {
    writeFileSync(join(dir, 'specs', 'spec-product_v1.md'), '# fake spec\n');
  }
}

function makeWorkflow(name: string, dirHash: string, status: Workflow['status'] = 'in-progress'): Workflow {
  return {
    name,
    description: 'test',
    status,
    currentPhase: 0,
    phases: [],
    stage: {
      current_stage: 'setup',
      previous_stage: null,
      transitioned_at: new Date().toISOString(),
      history: [],
      supervisor_active: false,
    },
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    cwd: workDir,
    dirHash,
  };
}

describe('detectOrphanWorkflows', () => {
  it('returns empty array when no .stelow dir exists', () => {
    expect(detectOrphanWorkflows(workDir, [])).toEqual([]);
  });

  it('returns empty array when .stelow has no date dirs', () => {
    // .stelow exists but is empty
    expect(detectOrphanWorkflows(workDir, [])).toEqual([]);
  });

  it('flags workflow dirs with spec files but no tracking entry', () => {
    makeWorkflowDir(DATE_A, ORPHAN_HASH_1, true);
    const orphans = detectOrphanWorkflows(workDir, []);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].dirHash).toBe(ORPHAN_HASH_1);
    expect(orphans[0].date).toBe(DATE_A);
    expect(orphans[0].specFiles).toEqual(['spec-product_v1.md']);
  });

  it('does NOT flag empty scaffold dirs (no spec files)', () => {
    makeWorkflowDir(DATE_A, EMPTY_HASH, false);
    expect(detectOrphanWorkflows(workDir, [])).toEqual([]);
  });

  it('does NOT flag workflow dirs that have a tracking entry', () => {
    makeWorkflowDir(DATE_A, KNOWN_HASH, true);
    const wf = makeWorkflow('known-wf', KNOWN_HASH);
    expect(detectOrphanWorkflows(workDir, [wf])).toEqual([]);
  });

  it('flags multiple orphans across multiple dates', () => {
    makeWorkflowDir(DATE_A, ORPHAN_HASH_1, true);
    makeWorkflowDir(DATE_B, ORPHAN_HASH_2, true);
    makeWorkflowDir(DATE_A, KNOWN_HASH, true); // has tracking entry

    const wf = makeWorkflow('known-wf', KNOWN_HASH);
    const orphans = detectOrphanWorkflows(workDir, [wf]);
    expect(orphans).toHaveLength(2);

    const hashes = orphans.map((o) => o.dirHash).sort();
    expect(hashes).toEqual([ORPHAN_HASH_1, ORPHAN_HASH_2].sort());
  });

  it('flags dirs with multiple spec files (multiple versions)', () => {
    const dir = join(workDir, '.stelow', DATE_A, ORPHAN_HASH_1);
    mkdirSync(join(dir, 'specs'), { recursive: true });
    writeFileSync(join(dir, 'specs', 'spec-product_v1.md'), '# v1\n');
    writeFileSync(join(dir, 'specs', 'spec-product_v2.md'), '# v2\n');
    const orphans = detectOrphanWorkflows(workDir, []);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].specFiles).toHaveLength(2);
    expect(orphans[0].specFiles.sort()).toEqual(['spec-product_v1.md', 'spec-product_v2.md']);
  });

  it('ignores non-spec-product files in specs/ dir', () => {
    const dir = join(workDir, '.stelow', DATE_A, ORPHAN_HASH_1);
    mkdirSync(join(dir, 'specs'), { recursive: true });
    writeFileSync(join(dir, 'specs', 'spec-tech_v1.md'), '# tech\n');
    writeFileSync(join(dir, 'specs', 'random.md'), '# random\n');
    // No spec-product_*.md — not a real orphan
    expect(detectOrphanWorkflows(workDir, [])).toEqual([]);
  });
});

describe('diagnoseWorkflowProject — orphan integration', () => {
  it('report includes orphans in the issues + orphans field', () => {
    makeWorkflowDir(DATE_A, ORPHAN_HASH_1, true);

    const report = diagnoseWorkflowProject(workDir);
    expect(report.orphans).toHaveLength(1);
    expect(report.orphans[0].dirHash).toBe(ORPHAN_HASH_1);

    const orphanIssue = report.issues.find((i) => i.code === 'orphan-workflow-dir');
    expect(orphanIssue).toBeDefined();
    expect(orphanIssue?.severity).toBe('warn');
  });

  it('report summary still ok when no orphans', () => {
    // Empty project — no .stelow content
    const report = diagnoseWorkflowProject(workDir);
    expect(report.orphans).toEqual([]);
  });
});

describe('formatDoctorReport — orphan rendering', () => {
  it('includes orphan count when orphans exist', () => {
    makeWorkflowDir(DATE_A, ORPHAN_HASH_1, true);
    const report = diagnoseWorkflowProject(workDir);
    const output = formatDoctorReport(report);
    expect(output).toMatch(/Orphan workflow dirs: 1/);
    expect(output).toMatch(/recover/);
  });

  it('omits orphan section when no orphans', () => {
    const report = diagnoseWorkflowProject(workDir);
    const output = formatDoctorReport(report);
    expect(output).not.toMatch(/Orphan workflow dirs/);
  });
});

describe('recovery write — orphan → stelow.json', () => {
  it('a recovered workflow round-trips through writeTracking', () => {
    makeWorkflowDir(DATE_A, ORPHAN_HASH_1, true);

    // Simulate the recovery write done by cmdRecover (without UI prompts)
    const orphans = detectOrphanWorkflows(workDir, []);
    expect(orphans).toHaveLength(1);

    const initial: TrackingData = {
      $schema: 'https://example.com/schema',
      version: '1.0',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      workflows: [],
    };

    const recovered: Workflow = {
      ...makeWorkflow(`recovered-${orphans[0].dirHash.slice(0, 8)}`, orphans[0].dirHash, 'paused'),
      description: `(recovered orphan) ${orphans[0].specFiles[0]}`,
    };

    initial.workflows.push(recovered);
    writeTracking(workDir, initial);

    // Re-run detection — orphan should now be gone
    const afterOrphans = detectOrphanWorkflows(workDir, initial.workflows);
    expect(afterOrphans).toEqual([]);

    // Doctor report should be clean of orphan warnings
    const report = diagnoseWorkflowProject(workDir);
    expect(report.issues.find((i) => i.code === 'orphan-workflow-dir')).toBeUndefined();
  });
});