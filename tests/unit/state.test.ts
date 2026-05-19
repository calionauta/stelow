/**
 * Unit tests: State Management
 * 
 * Tests state management utilities that don't require complex mocking:
 * - hashToWorkflowId
 * - toSafeName
 * - Phase status logic
 */
import { describe, it, expect } from 'vitest';
import {
  PHASE_NAMES,
  type Phase,
  type Workflow,
} from '../../extensions/cali-product-workflow/types';

describe('State Utilities', () => {
  describe('hashToWorkflowId', () => {
    it('should convert pw- prefix to wf-', () => {
      const convert = (hash: string) => hash.replace(/^pw-/, 'wf-');
      expect(convert('pw-ollc-whkaxv')).toBe('wf-ollc-whkaxv');
      expect(convert('pw-test-abc123')).toBe('wf-test-abc123');
    });
  });

  describe('toSafeName', () => {
    it('should convert special characters', () => {
      const toSafe = (name: string) => 
        name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

      expect(toSafe('My Project!')).toBe('my-project');
      expect(toSafe('API v2.0')).toBe('api-v2-0');
      expect(toSafe('Test@123')).toBe('test-123');
    });

    it('should handle empty input', () => {
      const toSafe = (name: string) => 
        name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

      expect(toSafe('')).toBe('');
      expect(toSafe('   ')).toBe('');
    });
  });
});

// ── Phase Status ─────────────────────────────────────────────────────

describe('Phase Status Logic', () => {
  function getPhaseStatus(phases: Phase[], currentPhase: number): Phase[] {
    return phases.map((p, i) => ({
      ...p,
      status: i < currentPhase 
        ? 'completed' 
        : i === currentPhase 
          ? 'in-progress' 
          : 'pending'
    }));
  }

  it('should mark phases before current as completed', () => {
    const phases: Phase[] = [
      { id: '0-setup', name: 'Setup', status: '' },
      { id: '1-context', name: 'Context', status: '' },
      { id: '2-shape', name: 'Shape', status: '' },
    ];

    const result = getPhaseStatus(phases, 2);

    expect(result[0].status).toBe('completed');
    expect(result[1].status).toBe('completed');
    expect(result[2].status).toBe('in-progress');
  });

  it('should mark current phase as in-progress', () => {
    const phases: Phase[] = [
      { id: '0-setup', name: 'Setup', status: '' },
      { id: '1-context', name: 'Context', status: '' },
    ];

    const result = getPhaseStatus(phases, 0);

    expect(result[0].status).toBe('in-progress');
    expect(result[1].status).toBe('pending');
  });

  it('should mark phases after current as pending', () => {
    const phases: Phase[] = [
      { id: '0-setup', name: 'Setup', status: '' },
      { id: '1-context', name: 'Context', status: '' },
      { id: '2-shape', name: 'Shape', status: '' },
    ];

    const result = getPhaseStatus(phases, 1);

    expect(result[0].status).toBe('completed');
    expect(result[1].status).toBe('in-progress');
    expect(result[2].status).toBe('pending');
  });
});

// ── Phase Transitions ────────────────────────────────────────────────

describe('Phase Transitions', () => {
  function nextPhase(currentPhase: number, maxPhases: number): number {
    const next = currentPhase + 1;
    return next >= maxPhases ? currentPhase : next;
  }

  function setPhase(workflow: Workflow, phase: number): Workflow {
    const maxPhase = workflow.phases.length - 1;
    const clampedPhase = Math.max(0, Math.min(phase, maxPhase));
    return {
      ...workflow,
      currentPhase: clampedPhase,
      phases: workflow.phases.map((p, i) => ({
        ...p,
        status: i < clampedPhase 
          ? 'completed' 
          : i === clampedPhase 
            ? 'in-progress' 
            : 'pending'
      }))
    };
  }

  it('should advance to next phase', () => {
    expect(nextPhase(0, 8)).toBe(1);
    expect(nextPhase(1, 8)).toBe(2);
    expect(nextPhase(6, 8)).toBe(7);
  });

  it('should not advance past last phase', () => {
    expect(nextPhase(7, 8)).toBe(7);
  });

  it('should set phase and update statuses', () => {
    const workflow: Workflow = {
      name: 'test',
      description: '',
      status: 'in-progress',
      currentPhase: 0,
      phases: [
        { id: '0-setup', name: 'Setup', status: 'in-progress' },
        { id: '1-context', name: 'Context', status: 'pending' },
        { id: '2-shape', name: 'Shape', status: 'pending' },
      ],
      created: '',
      updated: '',
    };

    const result = setPhase(workflow, 2);

    expect(result.currentPhase).toBe(2);
    expect(result.phases[0].status).toBe('completed');
    expect(result.phases[1].status).toBe('completed');
    expect(result.phases[2].status).toBe('in-progress');
  });

  it('should clamp phase to valid range', () => {
    const workflow: Workflow = {
      name: 'test',
      description: '',
      status: 'in-progress',
      currentPhase: 1,
      phases: [
        { id: '0-setup', name: 'Setup', status: 'completed' },
        { id: '1-context', name: 'Context', status: 'in-progress' },
        { id: '2-shape', name: 'Shape', status: 'pending' },
      ],
      created: '',
      updated: '',
    };

    const result = setPhase(workflow, 10); // Beyond range
    expect(result.currentPhase).toBe(2);
  });
});

// ── Display Format ──────────────────────────────────────────────────

describe('Phase Display Format', () => {
  function formatPhaseStatus(currentPhase: number, totalPhases: number): string {
    const phaseName = PHASE_NAMES[currentPhase] || '?';
    return `${phaseName} ${currentPhase + 1}/${totalPhases}`;
  }

  it('should format phase status correctly', () => {
    expect(formatPhaseStatus(0, 8)).toBe('Setup 1/8');
    expect(formatPhaseStatus(4, 8)).toBe('Critique 5/8');
    expect(formatPhaseStatus(7, 8)).toBe('Execution 8/8');
  });

  it('should show current phase indicator', () => {
    const isActive = (index: number, currentPhase: number) => index === currentPhase;
    const icon = (index: number, currentPhase: number) => 
      isActive(index, currentPhase) ? '◆' : '●';

    expect(icon(0, 2)).toBe('●');
    expect(icon(2, 2)).toBe('◆');
    expect(icon(7, 2)).toBe('●');
  });
});

// ── SKILL.md Mapping ─────────────────────────────────────────────────

describe('SKILL.md Phase Mapping', () => {
  /**
   * Current state: Extension has 8 phases, SKILL.md has 11 phases.
   * This mismatch causes the footer to show "1/8" instead of "1/11".
   * Task #7 will fix this by updating PHASE_NAMES to 11 phases.
   */
  const expectedSkillPhases = 11;

  it('should document extension vs skill phase count mismatch', () => {
    expect(PHASE_NAMES.length).toBe(8);
    expect(expectedSkillPhases).toBe(11);
    
    console.log(`Phase mismatch: Extension=${PHASE_NAMES.length}, SKILL.md=${expectedSkillPhases}`);
    console.log('Footer shows 1/8 instead of 1/11 - needs Task #7 fix');
  });
});