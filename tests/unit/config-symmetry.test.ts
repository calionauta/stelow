/**
 * config-symmetry.test.ts
 *
 * Verifies that the Workflow.config.{appetite,review_mode,domains_detected}
 * fields are treated symmetrically across:
 *   1. Bash helper: read-config.sh filters by in-progress
 *   2. The single canonical source (stelow.json)
 *
 * Why this matters: appetite and review_mode are both user-set config fields
 * that flow through the same code paths. If one is treated differently,
 * downstream consumers get inconsistent data.
 *
 * If these tests fail, the config contract is broken — investigate BEFORE
 * shipping any change to the bash helper or Workflow.config type.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync, rmSync, writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');
const HELPER_PATH = join(
  PROJECT_ROOT,
  'skills/stelow-product-orchestrator/references/cli-tools/read-config.sh',
);

describe('Workflow.config: bash helper reads from stelow.json (canonical source)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'stelow-sym-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writeStelow(workflows: unknown[]): void {
    writeFileSync(join(tempDir, 'stelow.json'), JSON.stringify({
      $schema: 'test', version: '1.0',
      created: new Date().toISOString(), updated: new Date().toISOString(),
      workflows,
    }, null, 2));
  }

  function runHelper(func: string): string {
    return execSync(
      `cd "${tempDir}" && bash -c 'source "${HELPER_PATH}" && ${func}'`,
      { encoding: 'utf-8', shell: '/bin/bash' },
    ).trim();
  }

  it('reads appetite from in-progress workflow (filters out archived)', () => {
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

  it('returns identical defaults when no in-progress workflow exists', () => {
    writeStelow([
      { name: 'old', status: 'archived', config: { appetite: 'Lean', review_mode: 'Auto' } },
    ]);
    // No in-progress → both return defaults (not the archived values)
    expect(runHelper('echo "$(stelow_read_appetite)"')).toBe('Core');
    expect(runHelper('echo "$(stelow_read_review_mode)"')).toBe('Product Spec + Interface + Scopes');
  });

  it('returns [] for domains_detected when not configured', () => {
    writeStelow([{ name: 'active', status: 'in-progress', config: {} }]);
    expect(runHelper('echo "$(stelow_read_domains)"')).toBe('[]');
  });

  it('returns domains_detected array as JSON', () => {
    writeStelow([{
      name: 'active', status: 'in-progress',
      config: { domains_detected: ['pricing', 'marketplace'] },
    }]);
    expect(runHelper('echo "$(stelow_read_domains)"')).toBe(
      JSON.stringify(['pricing', 'marketplace']),
    );
  });

  it('E2 (multi-workflow grep fix): does not return archived workflow config', () => {
    writeStelow([
      { name: 'archived-1', status: 'archived', config: { appetite: 'Lean' } },
      { name: 'active-1', status: 'in-progress', config: { appetite: 'Complete' } },
      { name: 'archived-2', status: 'completed', config: { appetite: 'Lean' } },
    ]);
    expect(runHelper('echo "$(stelow_read_appetite)"')).toBe('Complete');
  });
});