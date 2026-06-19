/**
 * Unit tests: scanWorkflowDirs function
 * 
 * Tests the disk-scanning logic that powers:
 * - reconcileTracking (auto-imports orphan workflows from disk)
 * - archiveWorkflowOnDisk (marks workflows as archived)
 * 
 * This function reads .stelow/<date>/<dirHash>/index.json
 * and extracts metadata for workflow management.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync 
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanWorkflowDirs } from '../../extensions/stelow/state';

describe('scanWorkflowDirs', () => {
  let tempDir: string;
  let workflowDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'sw-scan-'));
    workflowDir = join(tempDir, '.stelow');
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ── Helper: create workflow index.json ─────────────────────────────

  /**
   * Create a workflow directory with index.json.
   * Fields not specified get the value undefined (not present in JSON).
   */
  function createWorkflow(date: string, dirHash: string, data: Record<string, unknown>): void {
    const dir = join(workflowDir, date, dirHash);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.json'), JSON.stringify(data));
  }

  /**
   * Create a workflow with all required fields (for override testing).
   */
  function createFullWorkflow(date: string, dirHash: string, overrides: Record<string, unknown> = {}): void {
    const data = {
      name: 'default-name',
      workflow_status: 'in-progress',
      current_phase_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
    createWorkflow(date, dirHash, data);
  }

  // ── Basic functionality ────────────────────────────────────────────

  it('returns empty array when workflow directory does not exist', () => {
    const result = scanWorkflowDirs(tempDir);
    expect(result).toEqual([]);
  });

  it('returns empty array when workflow directory is empty', () => {
    mkdirSync(workflowDir, { recursive: true });
    const result = scanWorkflowDirs(tempDir);
    expect(result).toEqual([]);
  });

  it('scans and returns workflows from date-stamped directories', () => {
    createFullWorkflow('2026-05-20', 'sw-test-abc1', { name: 'workflow-one' });
    createFullWorkflow('2026-05-20', 'sw-test-abc2', { name: 'workflow-two' });

    const result = scanWorkflowDirs(tempDir);

    expect(result).toHaveLength(2);
    expect(result.map(w => w.name).sort()).toEqual(['workflow-one', 'workflow-two']);
  });

  it('extracts name from index.json', () => {
    createFullWorkflow('2026-05-20', 'sw-test-abc1', { name: 'my-workflow' });
    
    const result = scanWorkflowDirs(tempDir);
    
    expect(result[0].name).toBe('my-workflow');
    expect(result[0].dirHash).toBe('sw-test-abc1');
    expect(result[0].dateStamp).toBe('2026-05-20');
  });

  it('extracts name from legacy slug field', () => {
    // Only slug, no name - tests backward compatibility
    createWorkflow('2026-05-20', 'sw-test-legacy', { slug: 'legacy-workflow' });

    const result = scanWorkflowDirs(tempDir);

    expect(result[0].name).toBe('legacy-workflow');
  });

  it('falls back to dirHash when index has no name or slug', () => {
    // Minimal index with no name/slug fields
    createWorkflow('2026-05-20', 'sw-fallback-dir', {});

    const result = scanWorkflowDirs(tempDir);

    expect(result[0].name).toBe('sw-fallback-dir');
  });

  // ── Metadata extraction ─────────────────────────────────────────────

  it('extracts workflow_status', () => {
    createFullWorkflow('2026-05-20', 'sw-test-paused', { 
      name: 'paused-workflow',
      workflow_status: 'paused' 
    });

    const result = scanWorkflowDirs(tempDir);

    expect(result[0].status).toBe('paused');
  });

  it('defaults status to unknown when workflow_status is missing', () => {
    // Minimal index without workflow_status field
    createWorkflow('2026-05-20', 'sw-no-status', { name: 'no-status-workflow' });

    const result = scanWorkflowDirs(tempDir);

    expect(result[0].status).toBe('unknown');
  });

  it('extracts current_phase_index', () => {
    createFullWorkflow('2026-05-20', 'sw-phase-3', { 
      name: 'phase-workflow',
      current_phase_index: 3 
    });

    const result = scanWorkflowDirs(tempDir);

    expect(result[0].currentPhase).toBe(3);
  });

  it('defaults currentPhase to 0 when current_phase_index is missing', () => {
    // Minimal index without current_phase_index
    createWorkflow('2026-05-20', 'sw-no-phase', { name: 'no-phase-workflow' });

    const result = scanWorkflowDirs(tempDir);

    expect(result[0].currentPhase).toBe(0);
  });

  it('extracts draft content', () => {
    createFullWorkflow('2026-05-20', 'sw-draft-test', {
      name: 'draft-workflow',
      draft: '# My Draft Content\n\nSome text.'
    });

    const result = scanWorkflowDirs(tempDir);

    expect(result[0].draftContent).toBe('# My Draft Content\n\nSome text.');
  });

  it('extracts artifacts', () => {
    createFullWorkflow('2026-05-20', 'sw-artifacts-test', {
      name: 'artifacts-workflow',
      artifacts: { spec: '/path/to/spec.md', schema: '/path/to/schema.json' }
    });

    const result = scanWorkflowDirs(tempDir);

    expect(result[0].artifacts).toEqual({
      spec: '/path/to/spec.md',
      schema: '/path/to/schema.json',
    });
  });

  it('extracts created_at and updated_at timestamps', () => {
    const now = new Date().toISOString();
    createFullWorkflow('2026-05-20', 'sw-timestamps', {
      name: 'timestamp-workflow',
      created_at: now,
      updated_at: now,
    });

    const result = scanWorkflowDirs(tempDir);

    expect(result[0].created).toBe(now);
    expect(result[0].updated).toBe(now);
  });

  // ── Date directory handling ───────────────────────────────────────────

  it('scans across multiple date directories', () => {
    createFullWorkflow('2026-05-10', 'sw-old-001', { name: 'old-workflow' });
    createFullWorkflow('2026-05-20', 'sw-mid-002', { name: 'mid-workflow' });
    createFullWorkflow('2026-05-30', 'sw-new-003', { name: 'new-workflow' });

    const result = scanWorkflowDirs(tempDir);

    expect(result).toHaveLength(3);
    expect(result.map(w => w.name).sort()).toEqual(['mid-workflow', 'new-workflow', 'old-workflow']);
  });

  it('ignores non-date directories in workflow root', () => {
    createFullWorkflow('2026-05-20', 'sw-test-abc1', { name: 'valid-workflow' });
    mkdirSync(join(workflowDir, 'not-a-date'), { recursive: true });
    
    const result = scanWorkflowDirs(tempDir);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('valid-workflow');
  });

  it('ignores directories that do not match YYYY-MM-DD pattern', () => {
    createFullWorkflow('2026-05-20', 'sw-test-abc1', { name: 'valid' });
    mkdirSync(join(workflowDir, '2026-13-40'), { recursive: true });
    mkdirSync(join(workflowDir, 'May-2026'), { recursive: true });
    
    const result = scanWorkflowDirs(tempDir);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('valid');
  });

  // ── Error handling ──────────────────────────────────────────────────

  it('skips corrupt index.json files', () => {
    createFullWorkflow('2026-05-20', 'sw-valid-001', { name: 'valid-workflow' });
    
    const corruptDir = join(workflowDir, '2026-05-20', 'sw-corrupt-002');
    mkdirSync(corruptDir, { recursive: true });
    writeFileSync(join(corruptDir, 'index.json'), 'not valid json {{{');

    const result = scanWorkflowDirs(tempDir);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('valid-workflow');
  });

  it('skips directories without index.json', () => {
    createFullWorkflow('2026-05-20', 'sw-has-index', { name: 'has-index' });
    
    const noIndexDir = join(workflowDir, '2026-05-20', 'sw-no-index');
    mkdirSync(noIndexDir, { recursive: true });

    const result = scanWorkflowDirs(tempDir);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('has-index');
  });

  it('handles non-existent scan directory gracefully', () => {
    const result = scanWorkflowDirs('/nonexistent/path/that/does/not/exist');
    expect(result).toEqual([]);
  });

  // ── Integration with reconcileTracking ──────────────────────────────

  it('provides data format compatible with reconcileTracking', () => {
    createFullWorkflow('2026-05-20', 'sw-reconcile-001', { 
      name: 'orphan-workflow',
      workflow_status: 'in-progress',
      current_phase_index: 2,
    });

    const result = scanWorkflowDirs(tempDir);
    const wf = result[0];

    // reconcileTracking expects these fields
    expect(wf).toHaveProperty('name');
    expect(wf).toHaveProperty('status');
    expect(wf).toHaveProperty('currentPhase');
    expect(wf).toHaveProperty('dirHash');
    expect(wf).toHaveProperty('dateStamp');
    expect(wf).toHaveProperty('created');
    expect(wf).toHaveProperty('updated');
  });

  it('returns all workflow statuses (reconcileTracking filters them)', () => {
    createWorkflow('2026-05-20', 'sw-active', { 
      name: 'active-workflow',
      workflow_status: 'in-progress' 
    });
    createWorkflow('2026-05-20', 'sw-paused', { 
      name: 'paused-workflow',
      workflow_status: 'paused' 
    });
    createWorkflow('2026-05-20', 'sw-completed', { 
      name: 'completed-workflow',
      workflow_status: 'completed' 
    });
    createWorkflow('2026-05-20', 'sw-archived', { 
      name: 'archived-workflow',
      workflow_status: 'archived' 
    });

    const result = scanWorkflowDirs(tempDir);

    // All statuses are returned (reconcileTracking filters them)
    expect(result).toHaveLength(4);
    expect(result.map(w => w.status)).toContain('in-progress');
    expect(result.map(w => w.status)).toContain('paused');
    expect(result.map(w => w.status)).toContain('completed');
    expect(result.map(w => w.status)).toContain('archived');
  });
});