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
  type StagesConfig,
  type StageState,
} from '../../extensions/cali-product-workflow/adapters/stages-guard';

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
});
