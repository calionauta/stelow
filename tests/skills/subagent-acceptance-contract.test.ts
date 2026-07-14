/**
 * Skills contract test: Subagent acceptance + retry pattern (G8 from stelow-reliability plan)
 *
 * The plan called for "unit test of acceptance contract — validate
 * that acceptance = retry happens". There is no orchestrator code
 * yet for subagent dispatch (the scope-executor skill is the planned
 * home). What we CAN test now is the contract documented in
 * skills/stelow-product-orchestrator/references/cli-tools/subagents.md
 * (lines 213-238). This test asserts the docs describe:
 *
 *  1. The retry pattern: launch → success→continue; fail→retry once
 *     → success→continue (flagged recovered); fail twice→skip + log
 *  2. Subagent failures do NOT block parallel siblings
 *  3. scope-contract.json contains `acceptance_criteria` and
 *     `verify_commands` fields
 *
 * If the docs change, this test fails — forcing review of the
 * contract before merge. When scope-executor lands, replace this
 * docs-test with a behavioral test that mocks the subagent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DOCS_PATH = resolve(
  __dirname, '..', '..', 'skills', 'stelow-product-orchestrator',
  'references', 'cli-tools', 'subagents.md',
);

describe('subagent acceptance contract (G8 — docs contract)', () => {
  it('docs exist at the expected path', () => {
    expect(() => readFileSync(DOCS_PATH, 'utf-8')).not.toThrow();
  });

  it('describes the retry pattern (launch → fail → retry once → skip on second fail)', () => {
    const src = readFileSync(DOCS_PATH, 'utf-8');
    expect(src).toMatch(/Retry Pattern/);
    expect(src).toMatch(/Retry ONCE/);
    expect(src).toMatch(/Mark scope\/task as SKIPPED/);
  });

  it('forbids blocking parallel siblings on one subagent failure', () => {
    const src = readFileSync(DOCS_PATH, 'utf-8');
    expect(src).toMatch(/Do NOT block/);
  });

  it('mandates logging for all subagent failures (no silent failures)', () => {
    const src = readFileSync(DOCS_PATH, 'utf-8');
    expect(src).toMatch(/Always log/);
    expect(src).toMatch(/silent failures are worse/);
  });

  it('documents scope-contract.json with acceptance_criteria + verify_commands', () => {
    const src = readFileSync(DOCS_PATH, 'utf-8');
    expect(src).toMatch(/scope-contract\.json/);
    expect(src).toMatch(/acceptance_criteria/);
    expect(src).toMatch(/verify_commands/);
  });

  it('lists the CLI dispatch table (deterministic per detected_cli)', () => {
    const src = readFileSync(DOCS_PATH, 'utf-8');
    expect(src).toMatch(/Deterministic CLI dispatch/);
    // Each CLI row must be present
    for (const cli of ['tintinweb', 'nicobailon', 'built-in', 'generic']) {
      expect(src, `expected to mention CLI variant: ${cli}`).toContain(cli);
    }
  });

  it('states that context: "fresh" is mandatory for nicobailon subagents', () => {
    const src = readFileSync(DOCS_PATH, 'utf-8');
    expect(src).toMatch(/context:\s*"fresh".*mandatory/);
  });

  it('explains the TINTINWEB vs NICOBAILON vs BUILTIN_ONLY detection', () => {
    const src = readFileSync(DOCS_PATH, 'utf-8');
    expect(src).toMatch(/TINTINWEB/);
    expect(src).toMatch(/NICOBAILON/);
    expect(src).toMatch(/BUILTIN_ONLY/);
  });
});