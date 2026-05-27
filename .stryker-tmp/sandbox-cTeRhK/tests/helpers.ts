/**
 * Test utilities for cali-product-workflow tests
 */
// @ts-nocheck

import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ── Temp Directory Helper ─────────────────────────────────────────────

export function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pw-test-'));
  return dir;
}

export function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── Mock ExtensionAPI ───────────────────────────────────────────────

export function createMockExtensionAPI() {
  return {
    sendUserMessage: vi.fn(),
    notify: vi.fn(),
    custom: vi.fn().mockResolvedValue(null),
    setStatus: vi.fn(),
    getCurrentAgent: vi.fn().mockReturnValue({ id: 'test-agent' }),
  };
}

// ── Mock ExtensionContext ──────────────────────────────────────────────

export function createMockExtensionContext(cwd: string) {
  return {
    cwd,
    sessionId: 'test-session',
    ui: {
      notify: vi.fn(),
      setStatus: vi.fn(),
      custom: vi.fn().mockResolvedValue(null),
      theme: {
        fg: (color: string, text: string) => text,
        bold: (text: string) => text,
        muted: (text: string) => text,
        warning: (text: string) => text,
        success: (text: string) => text,
        accent: (text: string) => text,
      },
    },
  };
}

// ── Workflow Fixtures ───────────────────────────────────────────────

export const minimalWorkflowIndex = {
  version: "1.0",
  created_at: "2026-05-19T00:00:00.000Z",
  updated_at: "2026-05-19T00:00:00.000Z",
  name: "test-workflow",
  _dir: "pw-test-abc123",
  workflow_status: "in-progress",
  current_phase: "setup",
  current_phase_index: 0,
  artifacts: {},
  approved: false,
  approved_at: null,
};

export function createMinimalWorkflow(cwd: string, name = 'test-workflow') {
  const workflowDir = join(cwd, '.cali-product-workflow', '2026-05-19', 'pw-test-abc123');
  mkdirSync(join(workflowDir, 'specs'), { recursive: true });
  mkdirSync(join(workflowDir, 'interfaces'), { recursive: true });
  mkdirSync(join(workflowDir, 'plans/scopes'), { recursive: true });
  mkdirSync(join(workflowDir, 'critiques'), { recursive: true });
  mkdirSync(join(workflowDir, 'approvals'), { recursive: true });
  mkdirSync(join(workflowDir, 'sessions'), { recursive: true });

  writeFileSync(
    join(workflowDir, 'index.json'),
    JSON.stringify({ ...minimalWorkflowIndex, name }, null, 2)
  );

  return workflowDir;
}

// ── Tracking File Helper ────────────────────────────────────────────

export const mockTrackingData = {
  $schema: "https://raw.githubusercontent.com/renatocaliari/cali-product-workflow/main/cali-product-workflow.schema.json",
  version: "1.0",
  created: "2026-05-19T00:00:00.000Z",
  updated: "2026-05-19T00:00:00.000Z",
  workflows: [
    {
      name: "test-workflow",
      description: "Test workflow",
      status: "in-progress",
      currentPhase: 0,
      phases: [
        { id: "0-setup", name: "Setup", status: "in-progress" },
        { id: "1-context", name: "Context", status: "pending" },
        { id: "2-shape", name: "Shape", status: "pending" },
        { id: "3-interface", name: "Interface", status: "pending" },
        { id: "4-critique", name: "Critique", status: "pending" },
        { id: "5-gate", name: "Gate", status: "pending" },
        { id: "6-planning", name: "Planning", status: "pending" },
        { id: "7-execution", name: "Execution", status: "pending" },
      ],
      created: "2026-05-19T00:00:00.000Z",
      updated: "2026-05-19T00:00:00.000Z",
      cwd: "/tmp/test",
      dirHash: "pw-test-abc123",
    }
  ]
};

// ── Assertion Helpers ───────────────────────────────────────────────

export function assertWorkflowExists(dir: string, name: string) {
  const workflowDir = join(dir, '.cali-product-workflow');
  expect(existsSync(workflowDir)).toBe(true);
}

export function assertTrackingFile(dir: string) {
  const trackingPath = join(dir, '.cali-product-workflow', 'cali-product-workflow.json');
  expect(existsSync(trackingPath)).toBe(true);
}

export function readTrackingFile(dir: string) {
  const path = join(dir, '.cali-product-workflow', 'cali-product-workflow.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}