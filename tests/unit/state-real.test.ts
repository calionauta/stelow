/**
 * Unit tests: REAL State Functions
 * 
 * Tests actual exported functions from state.ts:
 * - readTracking / writeTracking
 * - getActiveWorkflow / getAllActiveWorkflows
 * - renameWorkflow
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
  parseInputForWorkflow,
  generateDirHash,
  hashToWorkflowId,
  toSafeName,
  getDateStamp,
  suggestNameFromDraft,
  readSourceFile,
  truncateText,
  readGlobalTracking,
  writeGlobalTracking,
  addToGlobalIndex,
  removeGlobalIndexEntry,
  updateGlobalIndexName,
} from '../../extensions/stelow/state';
import type { Workflow, TrackingData } from '../../extensions/stelow/types';

describe('REAL State Functions', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'sw-real-state-'));
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
    dirHash: `sw-${name.replace(/\s+/g, '-').toLowerCase().slice(0, 8)}`,
  });

  // ── readTracking / writeTracking ──────────────────────────────────────

  describe('readTracking / writeTracking', () => {
    it('readTracking returns null when tracking does not exist', () => {
      const result = readTracking(tempDir);
      expect(result).toBeNull();
    });

    it('readTracking reads what writeTracking wrote', () => {
      mkdirSync(join(tempDir, '.stelow'), { recursive: true });
      
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
      mkdirSync(join(tempDir, '.stelow'), { recursive: true });
      
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
      mkdirSync(join(tempDir, '.stelow'), { recursive: true });
      
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
      mkdirSync(join(tempDir, '.stelow'), { recursive: true });
      writeTracking(tempDir, {
        $schema: '', version: '1.0', created: '', updated: '', workflows: []
      } as TrackingData);

      const result = getActiveWorkflow(tempDir);
      expect(result).toBeNull();
    });

    it('returns the in-progress workflow', () => {
      mkdirSync(join(tempDir, '.stelow'), { recursive: true });
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
      mkdirSync(join(tempDir, '.stelow'), { recursive: true });
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
      mkdirSync(join(tempDir, '.stelow'), { recursive: true });
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
      mkdirSync(join(tempDir, '.stelow'), { recursive: true });
      writeTracking(tempDir, {
        $schema: '', version: '1.0', created: '', updated: '', workflows: []
      } as TrackingData);

      const result = getAllActiveWorkflows(tempDir);
      expect(result).toEqual([]);
    });

    it('returns all in-progress workflows', () => {
      mkdirSync(join(tempDir, '.stelow'), { recursive: true });
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
      mkdirSync(join(tempDir, '.stelow'), { recursive: true });
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
      mkdirSync(join(tempDir, '.stelow'), { recursive: true });
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
      mkdirSync(join(tempDir, '.stelow'), { recursive: true });
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
    it('generateDirHash creates sw- prefixed hash', () => {
      const hash1 = generateDirHash();
      const hash2 = generateDirHash();

      expect(hash1.startsWith('sw-')).toBe(true);
      expect(hash2.startsWith('sw-')).toBe(true);
      expect(hash1).not.toBe(hash2);
    });

    it('hashToWorkflowId extracts last segment of hash', () => {
      expect(hashToWorkflowId('sw-ollc-whkaxv')).toBe('wf-whkaxv');
      expect(hashToWorkflowId('sw-test-abc')).toBe('wf-abc');
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

  describe('global index', () => {
    const oldHome = process.env.HOME;

    beforeEach(() => {
      process.env.HOME = tempDir;
    });

    afterEach(() => {
      if (oldHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = oldHome;
      }
    });

    it('adds and removes entries', () => {
      const wf = { ...workflow('test', 'in-progress', 1), cwd: tempDir } as Workflow;
      addToGlobalIndex(wf);
      let g = readGlobalTracking();
      expect(g?.workflows).toHaveLength(1);
      expect(g?.workflows[0]).not.toHaveProperty('status');

      removeGlobalIndexEntry(tempDir, 'test');
      g = readGlobalTracking();
      expect(g?.workflows).toHaveLength(0);
    });

    it('renames entry in global index', () => {
      const wf = { ...workflow('old', 'in-progress', 1), cwd: tempDir } as Workflow;
      addToGlobalIndex(wf);
      updateGlobalIndexName('old', 'new', tempDir);
      const g = readGlobalTracking();
      expect(g?.workflows[0].name).toBe('new');
    });
  });
});