/**
 * Unit tests: REAL State Functions
 * 
 * Tests actual exported functions from state.ts:
 * - readTracking / writeTracking
 * - getActiveWorkflow / getAllActiveWorkflows
 * - renameWorkflow
 * - reconcileTracking
 * - archiveWorkflowOnDisk
 * - parseInputForWorkflow
 * 
 * These tests import and exercise REAL code, not mocks.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync 
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  readTracking,
  writeTracking,
  getActiveWorkflow,
  getAllActiveWorkflows,
  renameWorkflow,
  reconcileTracking,
  archiveWorkflowOnDisk,
  parseInputForWorkflow,
  generateDirHash,
  hashToWorkflowId,
  toSafeName,
  getDateStamp,
  suggestNameFromDraft,
  readSourceFile,
  truncateText,
} from '../../extensions/cali-product-workflow/state';
import type { Workflow, TrackingData } from '../../extensions/cali-product-workflow/types';

describe('REAL State Functions', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pw-real-state-'));
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ── Helper: minimal workflow factory ──────────────────────────────

  const workflow = (name: string, status: Workflow['status'] = 'in-progress', phase = 0): Workflow => ({
    name,
    description: '',
    status,
    currentPhase: phase,
    phases: [],
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    dirHash: `pw-${name.replace(/\s+/g, '-').toLowerCase().slice(0, 8)}`,
  });

  // ── readTracking / writeTracking ──────────────────────────────────────

  describe('readTracking / writeTracking', () => {
    it('readTracking returns null when tracking does not exist', () => {
      const result = readTracking(tempDir);
      expect(result).toBeNull();
    });

    it('readTracking reads what writeTracking wrote', () => {
      mkdirSync(join(tempDir, '.cali-product-workflow'), { recursive: true });
      
      const data: TrackingData = {
        $schema: 'https://example.com/schema',
        version: '1.0',
        created: '2026-05-19T00:00:00Z',
        updated: '2026-05-19T00:00:00Z',
        workflows: []
      };

      writeTracking(tempDir, data);
      const result = readTracking(tempDir);

      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.0');
      expect(result?.workflows).toEqual([]);
    });

    it('writeTracking persists data across calls', () => {
      mkdirSync(join(tempDir, '.cali-product-workflow'), { recursive: true });
      
      const data: TrackingData = {
        $schema: '',
        version: '1.0',
        created: '',
        updated: '',
        workflows: [workflow('test')]
      };

      writeTracking(tempDir, data);
      
      const read = readTracking(tempDir);
      expect(read?.workflows).toHaveLength(1);
      expect(read?.workflows[0].name).toBe('test');
    });

    it('handles empty workflows array', () => {
      mkdirSync(join(tempDir, '.cali-product-workflow'), { recursive: true });
      
      const data: TrackingData = {
        $schema: '',
        version: '1.0',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        workflows: []
      };

      writeTracking(tempDir, data);
      const result = readTracking(tempDir);

      expect(result?.workflows).toHaveLength(0);
    });
  });

  // ── getActiveWorkflow ───────────────────────────────────────────────

  describe('getActiveWorkflow', () => {
    it('returns null when no workflows', () => {
      mkdirSync(join(tempDir, '.cali-product-workflow'), { recursive: true });
      writeTracking(tempDir, {
        $schema: '', version: '1.0', created: '', updated: '', workflows: []
      } as TrackingData);

      const result = getActiveWorkflow(tempDir);
      expect(result).toBeNull();
    });

    it('returns the in-progress workflow', () => {
      mkdirSync(join(tempDir, '.cali-product-workflow'), { recursive: true });
      writeTracking(tempDir, {
        $schema: '',
        version: '1.0',
        created: '',
        updated: '',
        workflows: [
          workflow('active-workflow', 'in-progress', 3),
          workflow('paused-workflow', 'paused', 2),
        ]
      } as TrackingData);

      const result = getActiveWorkflow(tempDir);
      expect(result?.name).toBe('active-workflow');
    });

    it('returns null when no in-progress workflow', () => {
      mkdirSync(join(tempDir, '.cali-product-workflow'), { recursive: true });
      writeTracking(tempDir, {
        $schema: '',
        version: '1.0',
        created: '',
        updated: '',
        workflows: [
          workflow('completed-workflow', 'completed', 10),
          workflow('archived-workflow', 'archived', 10),
        ]
      } as TrackingData);

      const result = getActiveWorkflow(tempDir);
      expect(result).toBeNull();
    });

    it('returns first in-progress when multiple', () => {
      mkdirSync(join(tempDir, '.cali-product-workflow'), { recursive: true });
      writeTracking(tempDir, {
        $schema: '',
        version: '1.0',
        created: '',
        updated: '',
        workflows: [
          workflow('first', 'in-progress', 1),
          workflow('second', 'in-progress', 2),
        ]
      } as TrackingData);

      const result = getActiveWorkflow(tempDir);
      expect(result?.name).toBe('first');
    });
  });

  // ── getAllActiveWorkflows ─────────────────────────────────────────

  describe('getAllActiveWorkflows', () => {
    it('returns empty when no workflows', () => {
      mkdirSync(join(tempDir, '.cali-product-workflow'), { recursive: true });
      writeTracking(tempDir, {
        $schema: '', version: '1.0', created: '', updated: '', workflows: []
      } as TrackingData);

      const result = getAllActiveWorkflows(tempDir);
      expect(result).toEqual([]);
    });

    it('returns all in-progress workflows', () => {
      mkdirSync(join(tempDir, '.cali-product-workflow'), { recursive: true });
      writeTracking(tempDir, {
        $schema: '',
        version: '1.0',
        created: '',
        updated: '',
        workflows: [
          workflow('workflow-1', 'in-progress', 2),
          workflow('workflow-2', 'in-progress', 5),
          workflow('workflow-3', 'completed', 10),
        ]
      } as TrackingData);

      const result = getAllActiveWorkflows(tempDir);
      expect(result).toHaveLength(2);
    });
  });

  // ── renameWorkflow ─────────────────────────────────────────────────

  describe('renameWorkflow', () => {
    it('renames existing workflow', () => {
      mkdirSync(join(tempDir, '.cali-product-workflow'), { recursive: true });
      writeTracking(tempDir, {
        $schema: '',
        version: '1.0',
        created: '',
        updated: '',
        workflows: [workflow('old-name')]
      } as TrackingData);

      const result = renameWorkflow(tempDir, 'old-name', 'new-name');
      expect(result.ok).toBe(true);

      const tracking = readTracking(tempDir);
      expect(tracking?.workflows.find(w => w.name === 'new-name')).toBeDefined();
      expect(tracking?.workflows.find(w => w.name === 'old-name')).toBeUndefined();
    });

    it('fails when workflow not found', () => {
      mkdirSync(join(tempDir, '.cali-product-workflow'), { recursive: true });
      writeTracking(tempDir, {
        $schema: '',
        version: '1.0',
        created: '',
        updated: '',
        workflows: []
      } as TrackingData);

      const result = renameWorkflow(tempDir, 'nonexistent', 'new-name');
      expect(result.ok).toBe(false);
    });

    it('fails with short name', () => {
      mkdirSync(join(tempDir, '.cali-product-workflow'), { recursive: true });
      writeTracking(tempDir, {
        $schema: '',
        version: '1.0',
        created: '',
        updated: '',
        workflows: [workflow('test')]
      } as TrackingData);

      const result = renameWorkflow(tempDir, 'test', 'x');
      expect(result.ok).toBe(false);
      expect((result as { ok: false; error: string }).error).toContain('at least 2 characters');
    });
  });

  // ── reconcileTracking ──────────────────────────────────────────────

  describe('reconcileTracking', () => {
    it('detects workflows on disk not in tracking', () => {
      // Create workflow on disk
      const wfDir = join(tempDir, '.cali-product-workflow', '2026-05-19', 'pw-disk-workflow');
      mkdirSync(wfDir, { recursive: true });
      writeFileSync(join(wfDir, 'index.json'), JSON.stringify({
        name: 'disk-workflow',
        _dir: 'pw-disk-workflow',
        workflow_status: 'in-progress',
        current_phase_index: 2,
      }));

      // Tracking has no workflows
      writeTracking(tempDir, {
        $schema: '',
        version: '1.0',
        created: '',
        updated: '',
        workflows: []
      } as TrackingData);

      reconcileTracking(tempDir);

      const tracking = readTracking(tempDir);
      const diskWorkflow = tracking?.workflows.find(w => w.name === 'disk-workflow');
      expect(diskWorkflow).toBeDefined();
      expect(diskWorkflow?.currentPhase).toBe(2);
    });
  });

  // ── archiveWorkflowOnDisk ──────────────────────────────────────────

  describe('archiveWorkflowOnDisk', () => {
    it('archives workflow in index.json', () => {
      const wfDir = join(tempDir, '.cali-product-workflow', '2026-05-19', 'pw-archive-test');
      mkdirSync(wfDir, { recursive: true });
      writeFileSync(join(wfDir, 'index.json'), JSON.stringify({
        name: 'test-workflow',
        _dir: 'pw-archive-test',
        workflow_status: 'in-progress',
        current_phase_index: 5,
      }));

      const result = archiveWorkflowOnDisk(tempDir, 'test-workflow');
      expect(result).toBe(true);

      const index = JSON.parse(readFileSync(join(wfDir, 'index.json'), 'utf-8'));
      expect(index.workflow_status).toBe('archived');
      expect(index.updated_at).toBeDefined();
    });

    it('returns false when workflow not found', () => {
      const result = archiveWorkflowOnDisk(tempDir, 'nonexistent-workflow');
      expect(result).toBe(false);
    });

    it('returns false when no workflows directory exists', () => {
      mkdirSync(join(tempDir, '.cali-product-workflow'), { recursive: true });

      const result = archiveWorkflowOnDisk(tempDir, 'any-workflow');
      expect(result).toBe(false);
    });

    it('updates only target workflow in date directory', () => {
      const wf1 = join(tempDir, '.cali-product-workflow', '2026-05-19', 'pw-workflow-1');
      const wf2 = join(tempDir, '.cali-product-workflow', '2026-05-19', 'pw-workflow-2');
      mkdirSync(wf1, { recursive: true });
      mkdirSync(wf2, { recursive: true });
      
      writeFileSync(join(wf1, 'index.json'), JSON.stringify({
        name: 'workflow-1',
        _dir: 'pw-workflow-1',
        workflow_status: 'in-progress',
      }));
      writeFileSync(join(wf2, 'index.json'), JSON.stringify({
        name: 'workflow-2',
        _dir: 'pw-workflow-2',
        workflow_status: 'in-progress',
      }));

      const result = archiveWorkflowOnDisk(tempDir, 'workflow-1');
      expect(result).toBe(true);

      const index1 = JSON.parse(readFileSync(join(wf1, 'index.json'), 'utf-8'));
      expect(index1.workflow_status).toBe('archived');

      const index2 = JSON.parse(readFileSync(join(wf2, 'index.json'), 'utf-8'));
      expect(index2.workflow_status).toBe('in-progress');
    });
  });

  // ── parseInputForWorkflow ──────────────────────────────────────────

  describe('parseInputForWorkflow', () => {
    it('extracts file references', () => {
      const input = 'Build @src/main.ts and @lib/utils.ts for me';
      const result = parseInputForWorkflow(input);

      expect(result.sources).toContain('./src/main.ts');
      expect(result.sources).toContain('./lib/utils.ts');
    });

    it('extracts text without file references', () => {
      const input = 'Build a snake game in Go';
      const result = parseInputForWorkflow(input);

      expect(result.sources).toHaveLength(0);
      expect(result.draftText).toContain('snake game');
    });

    it('handles empty input', () => {
      const result = parseInputForWorkflow('');
      expect(result.sources).toHaveLength(0);
      expect(result.draftText).toBe('');
    });
  });

  // ── Utility Functions ──────────────────────────────────────────────

describe('Utility Functions', () => {
    it('generateDirHash creates pw- prefixed hash', () => {
      const hash1 = generateDirHash();
      const hash2 = generateDirHash();

      expect(hash1.startsWith('pw-')).toBe(true);
      expect(hash2.startsWith('pw-')).toBe(true);
      expect(hash1).not.toBe(hash2);
    });

    it('hashToWorkflowId extracts last segment of hash', () => {
      expect(hashToWorkflowId('pw-ollc-whkaxv')).toBe('wf-whkaxv');
      expect(hashToWorkflowId('pw-test-abc')).toBe('wf-abc');
    });

    it('toSafeName converts to lowercase with dashes', () => {
      expect(toSafeName('My Project!')).toBe('my-project');
      expect(toSafeName('API v2.0')).toBe('api-v2-0');
      expect(toSafeName('')).toBe('');
    });

    it('getDateStamp returns ISO date', () => {
      const stamp = getDateStamp();
      expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('suggestNameFromDraft extracts keywords', () => {
      const draft = 'Build a snake game in Go for terminal';
      const suggestion = suggestNameFromDraft(draft);

      expect(suggestion).toBeTruthy();
      expect(suggestion?.length).toBeGreaterThan(0);
    });
  });

  // ── Additional Utility Functions ─────────────────────────────────────

  describe('readSourceFile', () => {
    it('returns null for non-existent file', () => {
      const result = readSourceFile('./nonexistent-file-xyz.txt');
      expect(result).toBeNull();
    });

    it('returns directory info for directory', () => {
      const result = readSourceFile(tempDir);
      expect(result).toContain('Directory:');
    });

    it('reads file content for existing file', () => {
      writeFileSync(join(tempDir, 'test.txt'), 'Hello World');
      const result = readSourceFile(join(tempDir, 'test.txt'));
      expect(result).toBe('Hello World');
    });

    it('prepends ./ if missing', () => {
      writeFileSync(join(tempDir, 'test2.txt'), 'Test content');
      const result = readSourceFile(join(tempDir, 'test2.txt').replace('./', ''));
      expect(result).toBe('Test content');
    });

    it('truncates large files to 50000 chars', () => {
      const largeContent = 'x'.repeat(60000);
      writeFileSync(join(tempDir, 'large.txt'), largeContent);
      const result = readSourceFile(join(tempDir, 'large.txt'));
      expect(result?.length).toBeLessThanOrEqual(50000);
    });
  });

  describe('truncateText', () => {
    it('returns text unchanged if under maxLen', () => {
      const text = 'Short text';
      expect(truncateText(text, 100)).toBe(text);
    });

    it('truncates text over maxLen', () => {
      const text = 'x'.repeat(200);
      const result = truncateText(text, 100);
      expect(result).toContain('[... truncated ...]');
      expect(result.length).toBeLessThan(150);
    });

    it('leaves room for truncation marker', () => {
      const result = truncateText('Hello World', 5);
      expect(result).toMatch(/\.\.\. truncated \.\.\./);
    });
  });
});