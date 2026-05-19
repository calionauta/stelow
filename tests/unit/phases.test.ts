/**
 * Unit tests: Phases
 * 
 * Tests phase-related utilities and constants:
 * - PHASE_NAMES length and order
 * - Phase index mapping
 * - Phase transitions (next, set)
 * - Phase status updates
 */
import { describe, it, expect } from 'vitest';
import {
  PHASE_NAMES,
  PHASE_HINTS,
  type Phase,
  type Workflow,
} from '../../extensions/cali-product-workflow/types';

// ── Constants ───────────────────────────────────────────────────────

describe('PHASE_NAMES Constants', () => {
  it('should have 8 phases (extension current implementation)', () => {
    expect(PHASE_NAMES).toHaveLength(8);
  });

  it('should have phases in correct order', () => {
    expect(PHASE_NAMES[0]).toBe('Setup');
    expect(PHASE_NAMES[1]).toBe('Context');
    expect(PHASE_NAMES[2]).toBe('Shape');
    expect(PHASE_NAMES[3]).toBe('Interface');
    expect(PHASE_NAMES[4]).toBe('Critique');
    expect(PHASE_NAMES[5]).toBe('Gate');
    expect(PHASE_NAMES[6]).toBe('Planning');
    expect(PHASE_NAMES[7]).toBe('Execution');
  });

  it('should have hints for all phases', () => {
    PHASE_NAMES.forEach((_, index) => {
      expect(PHASE_HINTS[index]).toBeDefined();
    });
  });

  it('should have hints matching phase order', () => {
    expect(PHASE_HINTS[0]).toBe('setup');
    expect(PHASE_HINTS[1]).toBe('context');
    expect(PHASE_HINTS[2]).toBe('scopes');
    expect(PHASE_HINTS[3]).toBe('proposals');
    expect(PHASE_HINTS[4]).toBe('gaps');
    expect(PHASE_HINTS[5]).toBe('review');
    expect(PHASE_HINTS[6]).toBe('DoDs');
    expect(PHASE_HINTS[7]).toBe('done');
  });
});

// ── Phase Index Mapping ──────────────────────────────────────────────

describe('Phase Index Mapping', () => {
  it('should map phase index to correct PHASE_NAMES', () => {
    const mapping: Record<number, string> = {
      0: 'Setup',
      1: 'Context',
      2: 'Shape',
      3: 'Interface',
      4: 'Critique',
      5: 'Gate',
      6: 'Planning',
      7: 'Execution',
    };

    Object.entries(mapping).forEach(([index, name]) => {
      expect(PHASE_NAMES[parseInt(index)]).toBe(name);
    });
  });

  it('should handle last phase correctly', () => {
    const lastIndex = PHASE_NAMES.length - 1;
    expect(PHASE_NAMES[lastIndex]).toBe('Execution');
  });

  it('should not have duplicate phase names', () => {
    const unique = new Set(PHASE_NAMES);
    expect(unique.size).toBe(PHASE_NAMES.length);
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

  it('should handle all phases completed', () => {
    const phases: Phase[] = [
      { id: '0-setup', name: 'Setup', status: '' },
      { id: '1-context', name: 'Context', status: '' },
    ];

    const lastPhase = phases.length; // Use length as boundary
    const result = getPhaseStatus(phases, lastPhase);
    
    // When index equals length, all are completed (or clipped)
    expect(result[0].status).toBe('completed');
    expect(result[1].status).toBe('completed');
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
    expect(nextPhase(8, 8)).toBe(8);
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
    
    // Document the issue for Task #7
    console.log(`Phase mismatch: Extension=${PHASE_NAMES.length}, SKILL.md=${expectedSkillPhases}`);
    console.log('Footer shows 1/8 instead of 1/11 - needs Task #7 fix');
  });
});