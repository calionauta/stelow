/**
 * config-symmetry.test.ts
 *
 * Verifies that the Workflow.config.{appetite,review_mode,domains_detected}
 * fields are treated symmetrically across:
 *   1. TS extension: state.ts read-through + write-through
 *   2. Bash helper: read-config.sh filters by in-progress + fallback
 *   3. Index.json mirror: seeded by cmdStart + mirrored by updateWorkflowIndexJson
 *
 * Why this matters: appetite and review_mode are both user-set config fields
 * that flow through the same code paths. If one is treated differently (e.g.,
 * one is mirrored to index.json but the other isn't), downstream consumers
 * (TUI, gates, doctor, pulse) get inconsistent data.
 *
 * If these tests fail, the config contract is broken — investigate BEFORE
 * shipping any change to updateWorkflowIndexJson or the bash helper.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  writeTracking,
} from '../../extensions/stelow/state';
import type { TrackingData, Workflow } from '../../extensions/stelow/types';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');
const HELPER_PATH = join(
  PROJECT_ROOT,
  'skills/stelow-product-orchestrator/references/cli-tools/read-config.sh',
);

describe('Workflow.config symmetry: TS state.ts + bash helper + index.json mirror', () => {
  let tempDir: string;
  // Use today's date stamp (UTC) so the path matches new Date().toISOString().slice(0,10)
  const todayDir = new Date().toISOString().slice(0, 10);

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'stelow-sym-'));
    mkdirSync(join(tempDir, '.stelow', todayDir, 'abc123'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
    return {
      name: 'test-wf',
      description: '',
      status: 'in-progress',
      currentPhase: 2,
      phases: [],
      stage: {
        current_stage: 'setup', previous_stage: null,
        transitioned_at: new Date().toISOString(),
        history: [], supervisor_active: false,
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      cwd: tempDir,
      dirHash: 'abc123',
      detectedCLI: 'pi',
      intent: 'unknown',
      config: {
        appetite: undefined,
        review_mode: undefined,
        domains_detected: [],
      },
      ...overrides,
    } as Workflow;
  }

  function makeTracking(wf: Workflow): TrackingData {
    return {
      $schema: 'test', version: '1.0',
      created: new Date().toISOString(), updated: new Date().toISOString(),
      workflows: [wf],
    };
  }

  function readIndexJson(): Record<string, unknown> {
    const idxPath = join(tempDir, '.stelow', todayDir, 'abc123/index.json');
    if (!existsSync(idxPath)) return {};
    return JSON.parse(readFileSync(idxPath, 'utf-8'));
  }

  // ═════════════════════════════════════════════════════════════════════
  // 1. TS WRITE-THROUGH SYMMETRY (state.ts updateWorkflowIndexJson)
  // ═════════════════════════════════════════════════════════════════════

  describe('TS write-through: updateWorkflowIndexJson mirrors appetite AND review_mode identically', () => {
    it('writes appetite to index.json#config.appetite', () => {
      const wf = makeWorkflow({ config: { appetite: 'Complete', review_mode: undefined, domains_detected: [] } });
      writeTracking(tempDir, makeTracking(wf));
      expect(readIndexJson().config).toMatchObject({ appetite: 'Complete' });
    });

    it('writes review_mode to index.json#config.review_mode', () => {
      const wf = makeWorkflow({ config: { appetite: undefined, review_mode: 'Auto', domains_detected: [] } });
      writeTracking(tempDir, makeTracking(wf));
      expect(readIndexJson().config).toMatchObject({ review_mode: 'Auto' });
    });

    it('writes both appetite AND review_mode to index.json (no asymmetry)', () => {
      const wf = makeWorkflow({
        config: { appetite: 'Lean', review_mode: 'Product Spec + Interface + Tech Review', domains_detected: ['pricing'] },
      });
      writeTracking(tempDir, makeTracking(wf));
      const idx = readIndexJson().config as Record<string, unknown>;
      expect(idx.appetite).toBe('Lean');
      expect(idx.review_mode).toBe('Product Spec + Interface + Tech Review');
      expect(idx.domains_detected).toEqual(['pricing']);
    });

    it('handles undefined config values symmetrically (does NOT mirror them)', () => {
      const wf = makeWorkflow({ config: { appetite: undefined, review_mode: 'Auto', domains_detected: [] } });
      writeTracking(tempDir, makeTracking(wf));
      const idx = readIndexJson().config as Record<string, unknown>;
      // appetite was never set in wf.config — should NOT appear in index.json#config
      // (only values that ARE defined get mirrored)
      expect('appetite' in idx).toBe(false);
      expect(idx.review_mode).toBe('Auto');
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 2. BASH HELPER SYMMETRY (read-config.sh)
  // ═════════════════════════════════════════════════════════════════════

  describe('Bash helper: stelow_read_appetite and stelow_read_review_mode are symmetric', () => {
    function runHelper(func: string): string {
      return execSync(
        `cd "${tempDir}" && bash -c 'source "${HELPER_PATH}" && ${func}'`,
        { encoding: 'utf-8', shell: '/bin/bash' },
      ).trim();
    }

    function writeStelow(workflows: unknown[]): void {
      writeFileSync(join(tempDir, 'stelow.json'), JSON.stringify({
        $schema: 'test', version: '1.0',
        created: new Date().toISOString(), updated: new Date().toISOString(),
        workflows,
      }, null, 2));
    }

    it('returns identical in-progress filtering for both appetite and review_mode', () => {
      writeStelow([
        { name: 'old', status: 'archived', config: { appetite: 'Lean', review_mode: 'Auto' } },
        { name: 'active', status: 'in-progress', config: { appetite: 'Complete', review_mode: 'Product Spec + Interface + Scopes' } },
      ]);
      expect(runHelper('echo "$(stelow_read_appetite)"')).toBe('Complete');
      expect(runHelper('echo "$(stelow_read_review_mode)"')).toBe('Product Spec + Interface + Scopes');
    });

    it('returns identical defaults when stelow.json is absent', () => {
      expect(runHelper('echo "$(stelow_read_appetite)"')).toBe('Core');
      expect(runHelper('echo "$(stelow_read_review_mode)"')).toBe('Product Spec + Interface + Scopes');
    });

    it('returns identical fallback when no in-progress workflow exists', () => {
      writeStelow([
        { name: 'old', status: 'archived', config: { appetite: 'Lean', review_mode: 'Auto' } },
      ]);
      // No in-progress → both return defaults (not the archived values)
      expect(runHelper('echo "$(stelow_read_appetite)"')).toBe('Core');
      expect(runHelper('echo "$(stelow_read_review_mode)"')).toBe('Product Spec + Interface + Scopes');
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 3. END-TO-END: TS write → bash read sees same value
  // ═════════════════════════════════════════════════════════════════════

  describe('End-to-end: TS write-through is visible to bash helper immediately', () => {
    it('after writeTracking(), bash helper sees the mirrored value', () => {
      const wf = makeWorkflow({
        config: { appetite: 'Complete', review_mode: 'Auto', domains_detected: ['pricing'] },
      });
      writeTracking(tempDir, makeTracking(wf));
      // Now invoke bash helper to verify it sees the same values
      const out = execSync(
        `cd "${tempDir}" && bash -c 'source "${HELPER_PATH}" && echo "$(stelow_read_appetite)|$(stelow_read_review_mode)|$(stelow_read_domains)"'`,
        { encoding: 'utf-8', shell: '/bin/bash' },
      ).trim();
      expect(out).toBe('Complete|Auto|["pricing"]');
    });
  });
});