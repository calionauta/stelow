/**
 * Unit tests: Stages Guard — REAL module, NOT reimplementation
 * 
 * Tests the actual createStagesGuard function from stages-guard.ts
 * using the real stages.yaml as fixture.
 * 
 * WHY: If the guard logic changes, these tests catch regressions.
 * Previously this file reimplemented the guard inline — now it tests the real code.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYAML } from 'yaml';
import {
  createStagesGuard,
  loadStages,
  loadState,
  hasActiveWorkflow,
  getActiveWorkflowCwd,
  isAncestorOrSame,
  type StagesConfig,
  type StageState,
} from '../../extensions/cali-product-workflow/adapters/stages-guard';
import { WORKFLOW_COMMANDS } from '../../extensions/cali-product-workflow/adapters/commands/dispatcher';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');

// Load the REAL stages.yaml
const STAGES_YAML_PATH = join(PROJECT_ROOT, 'skills/cali-product-workflow/stages.yaml');
const stagesContent = readFileSync(STAGES_YAML_PATH, 'utf-8');
const stages: StagesConfig = parseYAML(stagesContent) as StagesConfig;

// Realistic StageState fixtures (mirror production)
const triageState: StageState = {
  current_stage: 'triage',
  previous_stage: null,
  transitioned_at: '2026-05-26T10:00:00Z',
  history: [{ stage: 'triage', entered_at: '2026-05-26T10:00:00Z', exited_at: null }],
  gates_passed: [],
  supervisor_active: false,
};

const executionState: StageState = {
  current_stage: 'execution',
  previous_stage: 'gate',
  transitioned_at: '2026-05-26T10:30:00Z',
  history: [
    { stage: 'triage', entered_at: '2026-05-26T10:00:00Z', exited_at: '2026-05-26T10:05:00Z' },
    { stage: 'execution', entered_at: '2026-05-26T10:30:00Z', exited_at: null },
  ],
  gates_passed: ['gate'],
  supervisor_active: true,
};

const gateState: StageState = {
  current_stage: 'gate',
  previous_stage: 'critique',
  transitioned_at: '2026-05-26T10:20:00Z',
  history: [
    { stage: 'critique', entered_at: '2026-05-26T10:15:00Z', exited_at: '2026-05-26T10:20:00Z' },
    { stage: 'gate', entered_at: '2026-05-26T10:20:00Z', exited_at: null },
  ],
  gates_passed: [],
  supervisor_active: false,
};

const setupState: StageState = {
  current_stage: 'setup',
  previous_stage: 'select',
  transitioned_at: '2026-05-26T10:10:00Z',
  history: [
    { stage: 'setup', entered_at: '2026-05-26T10:10:00Z', exited_at: null },
  ],
  gates_passed: [],
  supervisor_active: false,
};

describe('Stages Guard', () => {
  // ── Triage Stage ───────────────────────────────────────────────

  describe('Triage stage', () => {
    const guard = createStagesGuard(stages, triageState);

    it('blocks edit in triage', () => {
      expect(guard('edit').allowed).toBe(false);
    });

    it('blocks write in triage', () => {
      expect(guard('write').allowed).toBe(false);
    });

    it('blocks bash in triage', () => {
      expect(guard('bash').allowed).toBe(false);
    });

    it('blocks subagent in triage', () => {
      expect(guard('subagent').allowed).toBe(false);
    });

    it('blocks agent_browser in triage', () => {
      expect(guard('agent_browser').allowed).toBe(false);
    });

    it('allows ask in triage', () => {
      expect(guard('ask').allowed).toBe(true);
    });

    it('allows read in triage', () => {
      expect(guard('read').allowed).toBe(true);
    });

    it('allows grep in triage', () => {
      expect(guard('grep').allowed).toBe(true);
    });

    it('returns allowedTools in rejection reason', () => {
      const result = guard('bash');
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/Tool 'bash' is blocked in 'triage' stage/);
      expect(result.allowedTools).toEqual(['ask', 'read', 'grep', 'ls']);
    });
  });

  // ── Gate Stage ────────────────────────────────────────────────

  describe('Gate stage', () => {
    const guard = createStagesGuard(stages, gateState);

    it('blocks edit in gate', () => {
      expect(guard('edit').allowed).toBe(false);
    });

    it('blocks write in gate', () => {
      expect(guard('write').allowed).toBe(false);
    });

    it('blocks bash in gate', () => {
      expect(guard('bash').allowed).toBe(false);
    });

    it('allows read in gate', () => {
      expect(guard('read').allowed).toBe(true);
    });

    it('allows grep in gate', () => {
      expect(guard('grep').allowed).toBe(true);
    });

    it('allows ask in gate', () => {
      expect(guard('ask').allowed).toBe(true);
    });
  });

  // ── Execution Stage ────────────────────────────────────────────

  describe('Execution stage', () => {
    const guard = createStagesGuard(stages, executionState);

    it('allows all tools in execution', () => {
      expect(guard('edit').allowed).toBe(true);
      expect(guard('write').allowed).toBe(true);
      expect(guard('bash').allowed).toBe(true);
      expect(guard('read').allowed).toBe(true);
      expect(guard('grep').allowed).toBe(true);
      expect(guard('subagent').allowed).toBe(true);
      expect(guard('ask').allowed).toBe(true);
      expect(guard('agent_browser').allowed).toBe(true);
    });
  });

  // ── Setup Stage ────────────────────────────────────────────────

  describe('Setup stage', () => {
    const guard = createStagesGuard(stages, setupState);

    it('blocks bash in setup', () => {
      expect(guard('bash').allowed).toBe(false);
    });

    it('blocks agent_browser in setup', () => {
      expect(guard('agent_browser').allowed).toBe(false);
    });

    it('allows subagent in setup', () => {
      expect(guard('subagent').allowed).toBe(true);
    });

    it('allows read/grep/ask in setup', () => {
      expect(guard('read').allowed).toBe(true);
      expect(guard('grep').allowed).toBe(true);
      expect(guard('ask').allowed).toBe(true);
    });
  });

  // ── Fallback Behaviors ────────────────────────────────────────

  describe('Fallback behaviors', () => {
    it('returns allowed=true for unknown stage', () => {
      const unknownState: StageState = {
        current_stage: 'unknown',
        previous_stage: null,
        transitioned_at: '',
        history: [],
        gates_passed: [],
        supervisor_active: false,
      };
      const guard = createStagesGuard(stages, unknownState);
      expect(guard('bash').allowed).toBe(true);
    });

    it('returns allowed=true for empty stage name', () => {
      const emptyState: StageState = {
        current_stage: '',
        previous_stage: null,
        transitioned_at: '',
        history: [],
        gates_passed: [],
        supervisor_active: false,
      };
      const guard = createStagesGuard(stages, emptyState);
      expect(guard('bash').allowed).toBe(true);
    });
  });

  // ── onBlocked Callback ─────────────────────────────────────────

  describe('onBlocked callback', () => {
    it('calls onBlocked when tool is blocked', () => {
      let called = false;
      let captured: { tool: string; stage: string; allowed: string[] } | null = null;
      const guard = createStagesGuard(stages, triageState, (tool, stage, allowed) => {
        called = true;
        captured = { tool, stage, allowed };
      });
      guard('edit');
      expect(called).toBe(true);
      expect(captured?.tool).toBe('edit');
      expect(captured?.stage).toBe('triage');
      expect(captured?.allowed).toContain('ask');
    });

    it('does not call onBlocked when tool is allowed', () => {
      let called = false;
      const guard = createStagesGuard(stages, triageState, () => {
        called = true;
      });
      guard('read');
      expect(called).toBe(false);
    });
  });

  // ── loadStages & loadState ───────────────────────────────────────

  describe('loadStages and loadState', () => {
    it('loadStages parses real stages.yaml', () => {
      const loaded = loadStages(STAGES_YAML_PATH);
      expect(loaded.stages.length).toBeGreaterThanOrEqual(14);
      expect(loaded.stages[0].name).toBe('triage');
    });

    it('loadState returns fallback triage for nonexistent path', () => {
      const state = loadState('/nonexistent/path.json');
      expect(state.current_stage).toBe('triage');
    });

    it('loadStage throws on invalid path', () => {
      expect(() => loadStages('/nonexistent/stages.yaml')).toThrow();
    });
  });

  // ── hasActiveWorkflow (dogfooding guard) ───────────────────────

  describe('hasActiveWorkflow', () => {
    it('returns false for nonexistent path', () => {
      expect(hasActiveWorkflow('/nonexistent/tracking.json')).toBe(false);
    });

    it('returns false for empty tracking (no workflows array)', () => {
      const tmp = join(PROJECT_ROOT, '.tmp-tracking-empty.json');
      require('node:fs').writeFileSync(tmp, JSON.stringify({ version: "1.0", workflows: [] }));
      try {
        expect(hasActiveWorkflow(tmp)).toBe(false);
      } finally {
        require('node:fs').rmSync(tmp, { force: true });
      }
    });

    it('returns false when all workflows are archived (dogfooding bug fix)', () => {
      const tmp = join(PROJECT_ROOT, '.tmp-tracking-archived.json');
      require('node:fs').writeFileSync(tmp, JSON.stringify({
        version: "1.0",
        workflows: [
          { name: "old-wf", status: "archived", currentPhase: 0 },
          { name: "completed-wf", status: "completed", currentPhase: 12 },
        ],
      }));
      try {
        expect(hasActiveWorkflow(tmp)).toBe(false);
      } finally {
        require('node:fs').rmSync(tmp, { force: true });
      }
    });

    it('returns true when at least one workflow is in-progress', () => {
      const tmp = join(PROJECT_ROOT, '.tmp-tracking-active.json');
      require('node:fs').writeFileSync(tmp, JSON.stringify({
        version: "1.0",
        workflows: [
          { name: "old-wf", status: "archived", currentPhase: 0 },
          { name: "active-wf", status: "in-progress", currentPhase: 2 },
        ],
      }));
      try {
        expect(hasActiveWorkflow(tmp)).toBe(true);
      } finally {
        require('node:fs').rmSync(tmp, { force: true });
      }
    });

    it('returns false for corrupt JSON', () => {
      const tmp = join(PROJECT_ROOT, '.tmp-tracking-corrupt.json');
      require('node:fs').writeFileSync(tmp, "{not valid json");
      try {
        expect(hasActiveWorkflow(tmp)).toBe(false);
      } finally {
        require('node:fs').rmSync(tmp, { force: true });
      }
    });
  });

  // ── getActiveWorkflowCwd ───────────────────────────────────────

  describe('getActiveWorkflowCwd', () => {
    it('returns cwd of in-progress workflow', () => {
      const tmp = join(PROJECT_ROOT, '.tmp-cwd-active.json');
      require('node:fs').writeFileSync(tmp, JSON.stringify({
        version: "1.0",
        workflows: [
          { name: "old", status: "archived", cwd: "/old" },
          { name: "active", status: "in-progress", cwd: "/foo/bar" },
        ],
      }));
      try {
        expect(getActiveWorkflowCwd(tmp)).toBe("/foo/bar");
      } finally {
        require('node:fs').rmSync(tmp, { force: true });
      }
    });

    it('returns null when no in-progress workflow', () => {
      const tmp = join(PROJECT_ROOT, '.tmp-cwd-none.json');
      require('node:fs').writeFileSync(tmp, JSON.stringify({
        version: "1.0",
        workflows: [
          { name: "old", status: "archived", cwd: "/old" },
          { name: "done", status: "completed", cwd: "/done" },
        ],
      }));
      try {
        expect(getActiveWorkflowCwd(tmp)).toBe(null);
      } finally {
        require('node:fs').rmSync(tmp, { force: true });
      }
    });

    it('returns null when active workflow has no cwd field', () => {
      const tmp = join(PROJECT_ROOT, '.tmp-cwd-missing.json');
      require('node:fs').writeFileSync(tmp, JSON.stringify({
        version: "1.0",
        workflows: [{ name: "active", status: "in-progress" }],
      }));
      try {
        expect(getActiveWorkflowCwd(tmp)).toBe(null);
      } finally {
        require('node:fs').rmSync(tmp, { force: true });
      }
    });

    it('returns null for missing file', () => {
      expect(getActiveWorkflowCwd('/nonexistent/tracking.json')).toBe(null);
    });

    it('returns null for corrupt JSON', () => {
      const tmp = join(PROJECT_ROOT, '.tmp-cwd-corrupt.json');
      require('node:fs').writeFileSync(tmp, "{ bad");
      try {
        expect(getActiveWorkflowCwd(tmp)).toBe(null);
      } finally {
        require('node:fs').rmSync(tmp, { force: true });
      }
    });

    it('returns null for file without workflows array', () => {
      const tmp = join(PROJECT_ROOT, '.tmp-cwd-empty.json');
      require('node:fs').writeFileSync(tmp, JSON.stringify({ version: "1.0" }));
      try {
        expect(getActiveWorkflowCwd(tmp)).toBe(null);
      } finally {
        require('node:fs').rmSync(tmp, { force: true });
      }
    });

    it('returns first in-progress cwd when multiple in-progress exist', () => {
      const tmp = join(PROJECT_ROOT, '.tmp-cwd-multi.json');
      require('node:fs').writeFileSync(tmp, JSON.stringify({
        version: "1.0",
        workflows: [
          { name: "first", status: "in-progress", cwd: "/first" },
          { name: "second", status: "in-progress", cwd: "/second" },
        ],
      }));
      try {
        expect(getActiveWorkflowCwd(tmp)).toBe("/first");
      } finally {
        require('node:fs').rmSync(tmp, { force: true });
      }
    });

    it('returns null when workflows is null', () => {
      const tmp = join(PROJECT_ROOT, '.tmp-cwd-null.json');
      require('node:fs').writeFileSync(tmp, JSON.stringify({ version: "1.0", workflows: null }));
      try {
        expect(getActiveWorkflowCwd(tmp)).toBe(null);
      } finally {
        require('node:fs').rmSync(tmp, { force: true });
      }
    });
  });

  // ── isAncestorOrSame ────────────────────────────────────────────

  describe('isAncestorOrSame', () => {
    it('returns true for exact match', () => {
      expect(isAncestorOrSame('/a/b', '/a/b')).toBe(true);
    });

    it('returns true for descendant', () => {
      expect(isAncestorOrSame('/a', '/a/b/c')).toBe(true);
    });

    it('returns true for immediate child', () => {
      expect(isAncestorOrSame('/a/b', '/a/b/c')).toBe(true);
    });

    it('returns false for sibling', () => {
      expect(isAncestorOrSame('/a/b', '/a/c')).toBe(false);
    });

    it('returns false for parent (reversed direction)', () => {
      expect(isAncestorOrSame('/a/b/c', '/a/b')).toBe(false);
    });

    it('returns false for partial prefix that is not a path boundary', () => {
      // /a/bb is a sibling of /a/b, not a child
      expect(isAncestorOrSame('/a/b', '/a/bb/c')).toBe(false);
    });

    it('strips trailing slash from parent', () => {
      expect(isAncestorOrSame('/a/b/', '/a/b/c')).toBe(true);
    });

    it('strips trailing slash from child', () => {
      expect(isAncestorOrSame('/a/b', '/a/b/c/')).toBe(true);
    });

    it('handles root', () => {
      expect(isAncestorOrSame('/', '/anywhere')).toBe(true);
      expect(isAncestorOrSame('/', '/')).toBe(true);
    });

    it('resolves .. segments in parent', () => {
      expect(isAncestorOrSame('/a/b/../b/c', '/a/b/c/d')).toBe(true);
    });

    it('resolves .. segments in child', () => {
      expect(isAncestorOrSame('/a/b', '/a/b/../b/c')).toBe(true);
    });

    it('treats . as current dir', () => {
      expect(isAncestorOrSame('/a/b/./c', '/a/b/c/d')).toBe(true);
    });
  });

  // ── Dispatcher integration (regression) ─────────────────────────

  describe('WORKFLOW_COMMANDS dispatcher', () => {
    it('includes pw-unlock (so it gets registered with pi)', () => {
      const names = WORKFLOW_COMMANDS.map(c => c.name);
      expect(names).toContain("pw-unlock");
    });

    it('pw-unlock is marked piOnly', () => {
      const cmd = WORKFLOW_COMMANDS.find(c => c.name === "pw-unlock");
      expect(cmd?.piOnly).toBe(true);
    });
  });
});
