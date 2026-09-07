/**
 * Skills contract test: Subagent acceptance + retry pattern (G8 from stelow-reliability plan)
 *
 * The plan called for "unit test of acceptance contract — validate
 * that acceptance = retry happens". There is no orchestrator code
 * yet for subagent dispatch (the scope-executor skill is the planned
 * home). What we CAN test now is the contract documented in
 * skills/stelow-workflow-orchestrator/references/cli-tools/subagents.md
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
  __dirname, '..', '..', 'skills', 'stelow-workflow-orchestrator',
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

  it('lists the dispatch table (deterministic per capability tier)', () => {
    const src = readFileSync(DOCS_PATH, 'utf-8');
    expect(src).toMatch(/Deterministic dispatch/);
    // Each capability tier must be present
    for (const tier of ['acceptance-native', 'isolated', 'headless', 'generic']) {
      expect(src, `expected to mention capability tier: ${tier}`).toContain(tier);
    }
  });

  it('states that fresh context is mandatory for every subagent call', () => {
    const src = readFileSync(DOCS_PATH, 'utf-8');
    expect(src).toMatch(/FRESH/);
    expect(src).toMatch(/Fresh is non-negotiable/);
  });

  it('probes harness capabilities instead of installed packages', () => {
    const src = readFileSync(DOCS_PATH, 'utf-8');
    expect(src).toMatch(/How to detect the tier|probe/i);
    expect(src).not.toMatch(/TINTINWEB/);
    expect(src).not.toMatch(/NICOBAILON/);
    expect(src).not.toMatch(/BUILTIN_ONLY/);
  });
});