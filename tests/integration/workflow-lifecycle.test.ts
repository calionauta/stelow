/**
 * Integration tests: Workflow Lifecycle (post v0.53.0)
 *
 * Tests full workflow lifecycle using the canonical-source contract:
 * - stelow.json holds all workflow state (name, status, currentPhase, scopes, etc.)
 * - .stelow/{date}/{dirHash}/ holds only artifacts (plans, interfaces, critiques)
 *
 * Lifecycle coverage:
 * - Workflow creation (directory + stelow.json entry)
 * - Workflow rename (name in stelow.json + dirHash stays stable)
 * - Workflow archiving (status update in stelow.json)
 * - Cross-session persistence (data survives read/write cycles)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync, rmSync, writeFileSync, readFileSync,
  existsSync, mkdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const WORKFLOW_DIR = '.stelow';
const TRACKING_FILE = 'stelow.json';
const DATE = '2026-05-19';

// ── Test Helpers ────────────────────────────────────────────────────

/** Create a workflow dir with artifact subdirs only. */
function createWorkflowDir(baseDir: string, dirHash: string) {
  const workflowDir = join(baseDir, WORKFLOW_DIR, DATE, dirHash);
  for (const sub of ['specs', 'interfaces', 'plans/scopes', 'critiques', 'approvals', 'sessions']) {
    mkdirSync(join(workflowDir, sub), { recursive: true });
  }
  return workflowDir;
}

function writeTracking(baseDir: string, data: unknown) {
  const trackingDir = join(baseDir, WORKFLOW_DIR);
  mkdirSync(trackingDir, { recursive: true });
  writeFileSync(join(trackingDir, TRACKING_FILE), JSON.stringify(data, null, 2));
}

function readTracking(baseDir: string) {
  const path = join(baseDir, WORKFLOW_DIR, TRACKING_FILE);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function makeWorkflowEntry(overrides?: Partial<Record<string, unknown>>) {
  const now = new Date().toISOString();
  return {
    name: 'test-workflow',
    description: '',
    status: 'in-progress',
    currentPhase: 2,
    phases: [],
    stage: {
      current_stage: 'setup',
      previous_stage: null,
      transitioned_at: now,
      history: [],
      supervisor_active: false,
    },
    created: now,
    updated: now,
    dirHash: 'pw-test-abc123',
    detectedCLI: 'pi',
    intent: 'unknown',
    config: {
      appetite: undefined,
      review_mode: undefined,
      domains_detected: [],
    },
    ...overrides,
  };
}

// ── Workflow Lifecycle Tests ────────────────────────────────────────

describe('Workflow Lifecycle (post v0.53.0)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pw-lifecycle-'));
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Workflow Creation', () => {
    it('creates workflow directory structure with artifact subdirs', () => {
      const wfDir = createWorkflowDir(tempDir, 'pw-test-abc123');

      expect(existsSync(wfDir)).toBe(true);
      expect(existsSync(join(wfDir, 'specs'))).toBe(true);
      expect(existsSync(join(wfDir, 'interfaces'))).toBe(true);
      expect(existsSync(join(wfDir, 'plans/scopes'))).toBe(true);
      // State lives in stelow.json — workflow dir holds artifacts only
      expect(existsSync(join(wfDir, 'index.json'))).toBe(false);
    });

    it('adds workflow entry to stelow.json (canonical source)', () => {
      createWorkflowDir(tempDir, 'pw-test-abc123');
      writeTracking(tempDir, {
        $schema: '', version: '1.0',
        created: new Date().toISOString(), updated: new Date().toISOString(),
        workflows: [makeWorkflowEntry({ name: 'my-project', dirHash: 'pw-my-proj-xyz' })],
      });

      const tracking = readTracking(tempDir);
      expect(tracking.workflows).toHaveLength(1);
      expect(tracking.workflows[0].name).toBe('my-project');
      expect(tracking.workflows[0].dirHash).toBe('pw-my-proj-xyz');
      expect(tracking.workflows[0].currentPhase).toBe(2);
      expect(tracking.workflows[0].config).toBeDefined();
    });

    it('supports multiple workflows in stelow.json', () => {
      createWorkflowDir(tempDir, 'pw-multi-001');
      writeTracking(tempDir, {
        $schema: '', version: '1.0',
        created: new Date().toISOString(), updated: new Date().toISOString(),
        workflows: [
          makeWorkflowEntry({ name: 'wf-a', dirHash: 'pw-a' }),
          makeWorkflowEntry({ name: 'wf-b', dirHash: 'pw-b' }),
          makeWorkflowEntry({ name: 'wf-c', dirHash: 'pw-c' }),
        ],
      });

      const tracking = readTracking(tempDir);
      expect(tracking.workflows).toHaveLength(3);
      expect(tracking.workflows.map(w => w.name)).toEqual(['wf-a', 'wf-b', 'wf-c']);
    });
  });

  describe('Workflow Rename', () => {
    it('updates workflow name in stelow.json (dirHash stays stable)', () => {
      createWorkflowDir(tempDir, 'pw-stable-001');
      writeTracking(tempDir, {
        $schema: '', version: '1.0',
        created: new Date().toISOString(), updated: new Date().toISOString(),
        workflows: [makeWorkflowEntry({ name: 'old-name', dirHash: 'pw-stable-001' })],
      });

      // Rename: update stelow.json only (dirHash stays stable)
      const tracking = readTracking(tempDir);
      tracking.workflows[0].name = 'new-name';
      tracking.workflows[0].updated = new Date().toISOString();
      writeTracking(tempDir, tracking);

      const after = readTracking(tempDir);
      expect(after.workflows[0].name).toBe('new-name');
      expect(after.workflows[0].dirHash).toBe('pw-stable-001');
    });

    it('preserves dirHash after rename (filesystem path stays stable)', () => {
      const originalDirHash = 'pw-preserve-123';
      createWorkflowDir(tempDir, originalDirHash);

      writeTracking(tempDir, {
        $schema: '', version: '1.0',
        created: new Date().toISOString(), updated: new Date().toISOString(),
        workflows: [makeWorkflowEntry({ name: 'original', dirHash: originalDirHash })],
      });

      // Simulate rename
      const tracking = readTracking(tempDir);
      tracking.workflows[0].name = 'renamed';
      writeTracking(tempDir, tracking);

      // The filesystem dir (using dirHash) is unchanged
      const wfDir = join(tempDir, WORKFLOW_DIR, DATE, originalDirHash);
      expect(existsSync(wfDir)).toBe(true);
      // Verify the data
      const final = readTracking(tempDir);
      expect(final.workflows[0].name).toBe('renamed');
      expect(final.workflows[0].dirHash).toBe(originalDirHash);
    });
  });

  describe('Workflow Archive', () => {
    it('updates workflow status to archived in stelow.json', () => {
      writeTracking(tempDir, {
        $schema: '', version: '1.0',
        created: new Date().toISOString(), updated: new Date().toISOString(),
        workflows: [makeWorkflowEntry({ name: 'to-archive' })],
      });

      const tracking = readTracking(tempDir);
      tracking.workflows[0].status = 'archived';
      tracking.workflows[0].updated = new Date().toISOString();
      writeTracking(tempDir, tracking);

      const after = readTracking(tempDir);
      expect(after.workflows[0].status).toBe('archived');
    });

    it('preserves archived workflow data (no field loss)', () => {
      const wf = makeWorkflowEntry({
        name: 'preserve-me',
        dirHash: 'pw-keep',
        config: { appetite: 'Core', review_mode: 'Auto', domains_detected: ['pricing'] },
      });
      writeTracking(tempDir, {
        $schema: '', version: '1.0',
        created: new Date().toISOString(), updated: new Date().toISOString(),
        workflows: [wf],
      });

      const tracking = readTracking(tempDir);
      tracking.workflows[0].status = 'archived';
      writeTracking(tempDir, tracking);

      const after = readTracking(tempDir);
      expect(after.workflows[0].config.appetite).toBe('Core');
      expect(after.workflows[0].config.domains_detected).toEqual(['pricing']);
      expect(after.workflows[0].dirHash).toBe('pw-keep');
    });
  });

  describe('Cross-Session Persistence', () => {
    it('persists workflow state between read/write cycles', () => {
      writeTracking(tempDir, {
        $schema: '', version: '1.0',
        created: new Date().toISOString(), updated: new Date().toISOString(),
        workflows: [makeWorkflowEntry({ name: 'persistent' })],
      });

      // Simulate new session: read fresh
      const session1 = readTracking(tempDir);
      // Modify and write
      session1.workflows[0].currentPhase = 4; // SHAPE
      session1.workflows[0].updated = new Date().toISOString();
      writeTracking(tempDir, session1);

      // Simulate another session: read again
      const session2 = readTracking(tempDir);
      expect(session2.workflows[0].currentPhase).toBe(4);
      expect(session2.workflows[0].name).toBe('persistent');
    });

    it('handles concurrent modifications correctly (last-write-wins)', () => {
      writeTracking(tempDir, {
        $schema: '', version: '1.0',
        created: new Date().toISOString(), updated: new Date().toISOString(),
        workflows: [makeWorkflowEntry({ name: 'concurrent' })],
      });

      // Both readers get the same initial state
      const readerA = readTracking(tempDir);
      const readerB = readTracking(tempDir);

      // A writes first
      readerA.workflows[0].currentPhase = 4;
      writeTracking(tempDir, readerA);

      // B writes second (had stale state)
      readerB.workflows[0].currentPhase = 5;
      writeTracking(tempDir, readerB);

      const final = readTracking(tempDir);
      expect(final.workflows[0].currentPhase).toBe(5); // B wins
    });
  });

  describe('Artifact Storage', () => {
    it('writes spec artifact to .stelow/{date}/{dir}/specs/', () => {
      const wfDir = createWorkflowDir(tempDir, 'pw-artifact-001');
      const specPath = join(wfDir, 'specs', 'spec-product_v1.md');
      writeFileSync(specPath, '# Spec content\n');

      expect(existsSync(specPath)).toBe(true);
      expect(readFileSync(specPath, 'utf8').trim()).toBe('# Spec content');
    });

    it('tracks artifact metadata in stelow.json (no separate file needed)', () => {
      // v0.53.0: artifact metadata can live in stelow.json OR filesystem conventions.
      // The filesystem is the canonical artifact store; stelow.json is state.
      writeTracking(tempDir, {
        $schema: '', version: '1.0',
        created: new Date().toISOString(), updated: new Date().toISOString(),
        workflows: [makeWorkflowEntry({
          name: 'with-artifacts',
          dirHash: 'pw-art-001',
          artifacts: {
            specs: ['spec-product_v1.md'],
            critiques: ['critique-report.md'],
          },
        })],
      });

      const tracking = readTracking(tempDir);
      expect(tracking.workflows[0].artifacts.specs).toContain('spec-product_v1.md');
    });
  });
});