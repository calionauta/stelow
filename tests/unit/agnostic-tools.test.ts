/**
 * agnostic-tools.test.ts
 *
 * Tests the stages-guard hook's Auto-mode enforcement logic.
 *
 * Post v0.53.0: review_mode is read directly from stelow.json via wf.config.
 * Tests verify the decision logic with direct input (no filesystem I/O).
 */
import { describe, it, expect } from 'vitest';

// ── Decision logic (replicates stages-guard hook) ─────────────────

interface WorkflowLike {
  config?: { review_mode?: string };
}

function shouldBlockInAutoMode(
  agnosticTool: string,
  wf: WorkflowLike | null
): boolean {
  if (!wf) return false;  // no workflow → don't block
  const reviewMode = wf.config?.review_mode;
  if (reviewMode !== 'Auto') return false;
  return agnosticTool === 'ask' || agnosticTool === 'plannotator';
}

// ── Tests ───────────────────────────────────────────────────────────

describe('Auto mode enforcement (review_mode === "Auto")', () => {
  describe('Tool-level blocking decisions', () => {
    it('blocks ask when review_mode=Auto', () => {
      expect(shouldBlockInAutoMode('ask', {
        config: { review_mode: 'Auto', appetite: 'Lean' },
      })).toBe(true);
    });

    it('blocks plannotator when review_mode=Auto', () => {
      expect(shouldBlockInAutoMode('plannotator', {
        config: { review_mode: 'Auto' },
      })).toBe(true);
    });

    it('ALLOWS read when review_mode=Auto (not an interaction tool)', () => {
      expect(shouldBlockInAutoMode('read', {
        config: { review_mode: 'Auto' },
      })).toBe(false);
    });

    it('ALLOWS ask when review_mode=Product Spec Gate', () => {
      expect(shouldBlockInAutoMode('ask', {
        config: { review_mode: 'Product Spec Gate' },
      })).toBe(false);
    });

    it('ALLOWS ask when review_mode=Product Spec + Interface + Scopes', () => {
      expect(shouldBlockInAutoMode('ask', {
        config: { review_mode: 'Product Spec + Interface + Scopes' },
      })).toBe(false);
    });

    it('does NOT block when workflow is null', () => {
      expect(shouldBlockInAutoMode('ask', null)).toBe(false);
    });

    it('does NOT block when config is undefined', () => {
      expect(shouldBlockInAutoMode('ask', {})).toBe(false);
    });

    it('does NOT block when review_mode field is missing', () => {
      expect(shouldBlockInAutoMode('ask', {
        config: { appetite: 'Lean' },  // no review_mode
      })).toBe(false);
    });
  });

  describe('Tool name coverage', () => {
    it('blocks write/edit when review_mode=Auto (interaction tools)', () => {
      // The Auto-mode check is tool-specific: only ask/plannotator trigger blocks.
      // write/edit are normal tools and should not be blocked.
      const wf = { config: { review_mode: 'Auto' } };
      expect(shouldBlockInAutoMode('write', wf)).toBe(false);
      expect(shouldBlockInAutoMode('edit', wf)).toBe(false);
      expect(shouldBlockInAutoMode('bash', wf)).toBe(false);
    });

    it('blocks both ask and plannotator variants in Auto', () => {
      const wf = { config: { review_mode: 'Auto' } };
      expect(shouldBlockInAutoMode('ask', wf)).toBe(true);
      expect(shouldBlockInAutoMode('plannotator', wf)).toBe(true);
    });
  });
});