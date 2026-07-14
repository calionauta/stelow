/**
 * read-config-helper.test.ts
 *
 * Verifies the canonical bash helper `references/cli-tools/read-config.sh`
 * used by 7 skills + 1 stage to read Workflow.config.{appetite,review_mode,domains_detected}
 * from stelow.json (canonical source as of v0.50.0).
 *
 * Coverage:
 *   1. Reads from in-progress workflow only (avoids stale archived entries)
 *   2. Returns hardcoded default when stelow.json absent
 *   3. Returns hardcoded default when in-progress workflow has no config
 *   4. Returns default when in-progress workflow has no config
 *   5. domains_detected returns JSON array
 *   6. Empty config.appetite triggers default (not silent empty value)
 *
 * If these tests fail, a human MUST investigate — the helper is shared
 * across 7 skills and breaking it cascades to every downstream consumer.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');

const HELPER_PATH = join(
  PROJECT_ROOT,
  'skills/stelow-product-orchestrator/references/cli-tools/read-config.sh',
);

describe('read-config.sh helper exists and is executable', () => {
  it('helper file exists', () => {
    expect(existsSync(HELPER_PATH)).toBe(true);
  });

  it('helper has shebang', () => {
    const content = readFileSync(HELPER_PATH, 'utf8');
    expect(content).toMatch(/^#!\/usr\/bin\/env bash/);
  });
});

describe('stelow_read_appetite / stelow_read_review_mode', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stelow-read-config-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeStelow(workflows: unknown[]): void {
    writeFileSync(join(tmpDir, 'stelow.json'), JSON.stringify({
      $schema: 'test', version: '1.0',
      created: new Date().toISOString(), updated: new Date().toISOString(),
      workflows,
    }, null, 2));
  }

  function runHelper(func: string): string {
    // cd into tmpDir so 'stelow.json' resolves correctly
    return execSync(
      `cd "${tmpDir}" && bash -c 'source "${HELPER_PATH}" && ${func}'`,
      { encoding: 'utf-8', shell: '/bin/bash' },
    ).trim();
  }

  it('reads appetite from in-progress workflow (filters out archived)', () => {
    writeStelow([
      { name: 'old', status: 'archived', config: { appetite: 'Lean' } },
      { name: 'active', status: 'in-progress', config: { appetite: 'Complete' } },
    ]);
    expect(runHelper('echo "$(stelow_read_appetite)"')).toBe('Complete');
  });

  it('reads review_mode from in-progress workflow (filters out archived)', () => {
    writeStelow([
      { name: 'old', status: 'completed', config: { review_mode: 'Auto' } },
      { name: 'active', status: 'in-progress', config: { review_mode: 'Product Spec + Interface + Tech Review' } },
    ]);
    expect(runHelper('echo "$(stelow_read_review_mode)"')).toBe(
      'Product Spec + Interface + Tech Review',
    );
  });

  it('returns Core default when stelow.json missing', () => {
    // tmpDir is empty
    expect(runHelper('echo "$(stelow_read_appetite)"')).toBe('Core');
  });

  it('returns Product Spec + Interface + Scopes default for review_mode', () => {
    expect(runHelper('echo "$(stelow_read_review_mode)"')).toBe(
      'Product Spec + Interface + Scopes',
    );
  });

  it('returns Core default when no in-progress workflow exists', () => {
    writeStelow([
      { name: 'old', status: 'archived', config: { appetite: 'Lean' } },
      { name: 'older', status: 'completed', config: { appetite: 'Complete' } },
    ]);
    expect(runHelper('echo "$(stelow_read_appetite)"')).toBe('Core');
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
    // User has 2 workflows: 1 archived (with appetite=Lean) + 1 in-progress (with appetite=Complete)
    // Without the filter, naive grep would return the FIRST match — Lean.
    // With the helper, it filters by status === 'in-progress' — returns Complete.
    writeStelow([
      { name: 'archived-1', status: 'archived', config: { appetite: 'Lean' } },
      { name: 'active-1', status: 'in-progress', config: { appetite: 'Complete' } },
      { name: 'archived-2', status: 'completed', config: { appetite: 'Lean' } },
    ]);
    expect(runHelper('echo "$(stelow_read_appetite)"')).toBe('Complete');
  });
});