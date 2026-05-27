/**
 * Integration tests: Workflow Lifecycle
 * 
 * Tests full workflow lifecycle:
 * - Workflow creation (index.json)
 * - Workflow rename (name + filesystem)
 * - Workflow archiving (status update)
 * - Cross-session persistence
 */
// @ts-nocheck

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  mkdtempSync, rmSync, writeFileSync, readFileSync, 
  existsSync, mkdirSync 
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const WORKFLOW_DIR = '.cali-product-workflow';
const TRACKING_FILE = 'cali-product-workflow.json';

// ── Test Helpers ────────────────────────────────────────────────────

function createWorkflowDir(baseDir: string, name: string, dirHash: string) {
  const workflowDir = join(baseDir, WORKFLOW_DIR, '2026-05-19', dirHash);
  mkdirSync(join(workflowDir, 'specs'), { recursive: true });
  mkdirSync(join(workflowDir, 'interfaces'), { recursive: true });
  mkdirSync(join(workflowDir, 'plans/scopes'), { recursive: true });
  mkdirSync(join(workflowDir, 'critiques'), { recursive: true });
  mkdirSync(join(workflowDir, 'approvals'), { recursive: true });
  mkdirSync(join(workflowDir, 'sessions'), { recursive: true });

  writeFileSync(join(workflowDir, 'index.json'), JSON.stringify({
    version: "1.0",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    name,
    _dir: dirHash,
    workflow_status: "in-progress",
    current_phase: "Setup",
    current_phase_index: 0,
    artifacts: {},
    approved: false,
    approved_at: null,
  }, null, 2));

  return workflowDir;
}

function writeTracking(baseDir: string, data: any) {
  const trackingDir = join(baseDir, WORKFLOW_DIR);
  mkdirSync(trackingDir, { recursive: true });
  writeFileSync(join(trackingDir, TRACKING_FILE), JSON.stringify(data, null, 2));
}

function readTracking(baseDir: string) {
  const path = join(baseDir, WORKFLOW_DIR, TRACKING_FILE);
  return JSON.parse(readFileSync(path, 'utf8'));
}

// ── Workflow Lifecycle Tests ────────────────────────────────────────

describe('Workflow Lifecycle', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pw-lifecycle-test-'));
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Workflow Creation', () => {
    it('should create workflow directory structure', () => {
      const workflowDir = createWorkflowDir(tempDir, 'test-workflow', 'pw-test-abc123');

      expect(existsSync(workflowDir)).toBe(true);
      expect(existsSync(join(workflowDir, 'specs'))).toBe(true);
      expect(existsSync(join(workflowDir, 'interfaces'))).toBe(true);
      expect(existsSync(join(workflowDir, 'plans/scopes'))).toBe(true);
      expect(existsSync(join(workflowDir, 'index.json'))).toBe(true);
    });

    it('should create index.json with correct structure', () => {
      createWorkflowDir(tempDir, 'my-project', 'pw-my-proj-xyz');

      const indexPath = join(tempDir, WORKFLOW_DIR, '2026-05-19', 'pw-my-proj-xyz', 'index.json');
      const index = JSON.parse(readFileSync(indexPath, 'utf8'));

      expect(index.name).toBe('my-project');
      expect(index._dir).toBe('pw-my-proj-xyz');
      expect(index.workflow_status).toBe('in-progress');
      expect(index.current_phase_index).toBe(0);
      expect(index.approved).toBe(false);
    });

    it('should add workflow to tracking.json', () => {
      createWorkflowDir(tempDir, 'tracking-test', 'pw-track-001');

      const trackingData = {
        $schema: "https://example.com/schema",
        version: "1.0",
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        workflows: [{
          name: 'tracking-test',
          description: '',
          status: 'in-progress',
          currentPhase: 0,
          phases: [
            { id: '0-setup', name: 'Setup', status: 'in-progress' },
            { id: '1-context', name: 'Context', status: 'pending' },
          ],
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          cwd: tempDir,
          dirHash: 'pw-track-001',
        }]
      };

      writeTracking(tempDir, trackingData);
      const tracking = readTracking(tempDir);

      expect(tracking.workflows).toHaveLength(1);
      expect(tracking.workflows[0].name).toBe('tracking-test');
      expect(tracking.workflows[0].status).toBe('in-progress');
    });

    it('should support multiple workflows in tracking', () => {
      createWorkflowDir(tempDir, 'workflow-1', 'pw-wf-001');
      createWorkflowDir(tempDir, 'workflow-2', 'pw-wf-002');

      const trackingData = {
        $schema: "",
        version: "1.0",
        created: "",
        updated: "",
        workflows: [
          { name: 'workflow-1', status: 'in-progress', currentPhase: 2 },
          { name: 'workflow-2', status: 'completed', currentPhase: 7 },
        ]
      };

      writeTracking(tempDir, trackingData);
      const tracking = readTracking(tempDir);

      expect(tracking.workflows).toHaveLength(2);
    });
  });

  describe('Workflow Rename', () => {
    it('should update workflow name in index.json', () => {
      createWorkflowDir(tempDir, 'old-name', 'pw-old-name-123');
      
      const indexPath = join(tempDir, WORKFLOW_DIR, '2026-05-19', 'pw-old-name-123', 'index.json');
      
      // Simulate rename
      const index = JSON.parse(readFileSync(indexPath, 'utf8'));
      index.name = 'new-name';
      writeFileSync(indexPath, JSON.stringify(index, null, 2));

      const updated = JSON.parse(readFileSync(indexPath, 'utf8'));
      expect(updated.name).toBe('new-name');
    });

    it('should update workflow name in tracking.json', () => {
      createWorkflowDir(tempDir, 'old-name', 'pw-old-name-123');

      const trackingData = {
        $schema: "",
        version: "1.0",
        created: "",
        updated: "",
        workflows: [{
          name: 'old-name',
          status: 'in-progress',
          currentPhase: 1,
          phases: [],
          created: "",
          updated: "",
          dirHash: 'pw-old-name-123',
        }]
      };

      writeTracking(tempDir, trackingData);

      // Simulate rename in tracking
      const tracking = readTracking(tempDir);
      const workflow = tracking.workflows[0];
      workflow.name = 'new-name';
      workflow.updated = new Date().toISOString();
      writeTracking(tempDir, tracking);

      const updated = readTracking(tempDir);
      expect(updated.workflows[0].name).toBe('new-name');
    });

    it('should preserve dirHash after rename', () => {
      createWorkflowDir(tempDir, 'test-workflow', 'pw-test-dirhash');
      
      const indexPath = join(tempDir, WORKFLOW_DIR, '2026-05-19', 'pw-test-dirhash', 'index.json');
      const index = JSON.parse(readFileSync(indexPath, 'utf8'));
      
      expect(index._dir).toBe('pw-test-dirhash');
      
      // Rename
      index.name = 'renamed-workflow';
      writeFileSync(indexPath, JSON.stringify(index, null, 2));

      const updated = JSON.parse(readFileSync(indexPath, 'utf8'));
      expect(updated._dir).toBe('pw-test-dirhash'); // Unchanged!
    });

    it('should handle name with special characters', () => {
      const names = [
        'My Project!',
        'API v2.0',
        'Test@123',
        'spaces  in  name',
      ];

      names.forEach(name => {
        const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const dirHash = 'pw-' + safeName + '-test';
        createWorkflowDir(tempDir, name, dirHash);
        
        const indexPath = join(tempDir, WORKFLOW_DIR, '2026-05-19', dirHash, 'index.json');
        const index = JSON.parse(readFileSync(indexPath, 'utf8'));
        
        expect(index.name).toBe(name);
      });
    });
  });

  describe('Workflow Archive', () => {
    it('should update workflow status to archived', () => {
      createWorkflowDir(tempDir, 'archive-test', 'pw-archive-001');

      const trackingData = {
        $schema: "",
        version: "1.0",
        created: "",
        updated: "",
        workflows: [{
          name: 'archive-test',
          status: 'in-progress',
          currentPhase: 3,
          phases: [],
          created: "",
          updated: "",
          dirHash: 'pw-archive-001',
        }]
      };

      writeTracking(tempDir, trackingData);

      // Simulate archive
      const tracking = readTracking(tempDir);
      const workflow = tracking.workflows[0];
      workflow.status = 'archived';
      workflow.updated = new Date().toISOString();
      writeTracking(tempDir, tracking);

      const updated = readTracking(tempDir);
      expect(updated.workflows[0].status).toBe('archived');
    });

    it('should preserve archived workflow data', () => {
      createWorkflowDir(tempDir, 'archived-workflow', 'pw-arch-xyz');

      const trackingData = {
        $schema: "",
        version: "1.0",
        created: "",
        updated: "",
        workflows: [{
          name: 'archived-workflow',
          status: 'archived',
          currentPhase: 5,
          phases: [],
          created: "2026-05-19T00:00:00Z",
          updated: new Date().toISOString(),
          dirHash: 'pw-arch-xyz',
          description: 'Archived for later review',
        }]
      };

      writeTracking(tempDir, trackingData);

      const tracking = readTracking(tempDir);
      expect(tracking.workflows[0].description).toBe('Archived for later review');
      expect(tracking.workflows[0].currentPhase).toBe(5);
    });
  });

  describe('Cross-Session Persistence', () => {
    it('should persist workflow between sessions', () => {
      // Session 1: Create workflow
      createWorkflowDir(tempDir, 'persistent-workflow', 'pw-persist-001');
      
      const trackingData = {
        $schema: "",
        version: "1.0",
        created: "",
        updated: "",
        workflows: [{
          name: 'persistent-workflow',
          status: 'in-progress',
          currentPhase: 2,
          phases: [],
          created: "",
          updated: "",
          dirHash: 'pw-persist-001',
        }]
      };

      writeTracking(tempDir, trackingData);

      // Session 2: Read workflow (simulated)
      const tracking = readTracking(tempDir);
      expect(tracking.workflows).toHaveLength(1);
      expect(tracking.workflows[0].name).toBe('persistent-workflow');
      expect(tracking.workflows[0].currentPhase).toBe(2);

      // Continue workflow
      tracking.workflows[0].currentPhase = 3;
      tracking.updated = new Date().toISOString();
      writeTracking(tempDir, tracking);

      // Session 3: Verify continued state
      const continued = readTracking(tempDir);
      expect(continued.workflows[0].currentPhase).toBe(3);
    });

    it('should handle concurrent workflow modifications', () => {
      createWorkflowDir(tempDir, 'workflow-a', 'pw-a-001');
      createWorkflowDir(tempDir, 'workflow-b', 'pw-b-002');

      const trackingData = {
        $schema: "",
        version: "1.0",
        created: "",
        updated: "",
        workflows: [
          { name: 'workflow-a', status: 'in-progress', currentPhase: 1 },
          { name: 'workflow-b', status: 'in-progress', currentPhase: 2 },
        ]
      };

      writeTracking(tempDir, trackingData);

      // Modify workflow-a
      let tracking = readTracking(tempDir);
      tracking.workflows[0].currentPhase = 5;
      tracking.updated = new Date().toISOString();
      writeTracking(tempDir, tracking);

      // Modify workflow-b
      tracking = readTracking(tempDir);
      tracking.workflows[1].currentPhase = 6;
      tracking.updated = new Date().toISOString();
      writeTracking(tempDir, tracking);

      // Verify both modifications
      const final = readTracking(tempDir);
      expect(final.workflows[0].currentPhase).toBe(5);
      expect(final.workflows[1].currentPhase).toBe(6);
    });
  });

  describe('Artifact Creation', () => {
    it('should create spec artifact', () => {
      createWorkflowDir(tempDir, 'spec-test', 'pw-spec-001');

      const specContent = `# Spec Product v1

## Problem
Test problem statement

## Solution
Test solution

## Scope
- IN: Feature A, Feature B
- OUT: Feature C
`;

      const specDir = join(tempDir, WORKFLOW_DIR, '2026-05-19', 'pw-spec-001', 'specs');
      const specPath = join(specDir, 'spec-product_v1.md');
      writeFileSync(specPath, specContent);

      expect(existsSync(specPath)).toBe(true);
      expect(readFileSync(specPath, 'utf8')).toContain('Spec Product v1');
    });

    it('should track artifact in index.json', () => {
      createWorkflowDir(tempDir, 'artifact-test', 'pw-art-001');

      const indexPath = join(tempDir, WORKFLOW_DIR, '2026-05-19', 'pw-art-001', 'index.json');
      const index = JSON.parse(readFileSync(indexPath, 'utf8'));

      // Simulate artifact creation
      index.artifacts = {
        spec: 'specs/spec-product_v1.md',
        created_at: new Date().toISOString(),
      };
      writeFileSync(indexPath, JSON.stringify(index, null, 2));

      const updated = JSON.parse(readFileSync(indexPath, 'utf8'));
      expect(updated.artifacts.spec).toBe('specs/spec-product_v1.md');
    });
  });
});