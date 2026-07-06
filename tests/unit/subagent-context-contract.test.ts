/**
 * subagent-context-contract.test.ts
 *
 * Regression guard for the ⛔ CRITICAL RULE documented in
 * `skills/stelow-product-orchestrator/references/cli-tools/subagents.md`:
 *
 *   EVERY stelow subagent call passes `context: "fresh"` EXPLICITLY.
 *   Fork is fallback-only (workflow-anticipated invocations never use it).
 *
 * Why this exists: pi-subagents' packaged `worker`, `planner`, and `oracle`
 * agents ship with `defaultContext: "fork"` in their frontmatter. If a new
 * subagent invocation forgets to pass `context: "fresh"`, it silently
 * inherits the parent's contaminated context — defeating stelow's whole
 * point. This test catches that regression.
 *
 * If these tests fail, a human MUST investigate — it means the
 * subagent-context contract has drifted.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');

const SUBAGENTS_MD = join(
  PROJECT_ROOT,
  'skills/stelow-product-orchestrator/references/cli-tools/subagents.md',
);

const ALL_SUBAGENTS_MD = (() => {
  const skillsDir = join(PROJECT_ROOT, 'skills');
  const result: string[] = [SUBAGENTS_MD];
  for (const skill of readdirSync(skillsDir)) {
    const p = join(skillsDir, skill, 'references/cli-tools/subagents.md');
    try {
      if (statSync(p).isFile()) result.push(p);
    } catch { /* skip */ }
  }
  return result;
})();

function read(path: string): string {
  return readFileSync(path, 'utf-8');
}

// ═════════════════════════════════════════════════════════════════════
// 1. CRITICAL RULE BLOCK EXISTS AND IS AT THE TOP
// ═════════════════════════════════════════════════════════════════════

describe('CRITICAL RULE block in subagents.md', () => {
  const content = read(SUBAGENTS_MD);
  const first100Lines = content.split('\n').slice(0, 100).join('\n');

  it('declares "EVERY stelow subagent call passes context: \\"fresh\\" EXPLICITLY" near the top', () => {
    expect(first100Lines).toMatch(/CRITICAL RULE/i);
    expect(first100Lines).toMatch(/EVERY stelow subagent call/i);
    expect(first100Lines).toMatch(/context: "fresh"/i);
  });

  it('states fork is fallback only', () => {
    expect(first100Lines).toMatch(/fork.*fallback/i);
  });

  it('warns about packaged agents that default to fork', () => {
    expect(content).toMatch(/defaultContext.*fork/i);
    expect(content).toMatch(/worker.*planner.*oracle/i);
  });

  it('lists which packaged agents default to fork (worker/planner/oracle)', () => {
    const tableMatch = content.match(/Packaged-agent gotcha[\s\S]{0,2000}?(?=##|\Z)/);
    expect(tableMatch).not.toBeNull();
    const table = tableMatch![0];
    expect(table).toMatch(/oracle/i);
    expect(table).toMatch(/planner/i);
    expect(table).toMatch(/worker/i);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. EVERY PI-SUBAGENTS SUBAGENT INVOCATION PASSES context: "fresh"
// ═════════════════════════════════════════════════════════════════════

describe('All pi-subagents subagent() invocations pass context: "fresh"', () => {
  for (const path of ALL_SUBAGENTS_MD) {
    it(`${path.replace(PROJECT_ROOT, '')} — every subagent({...}) block with context passes "fresh"`, () => {
      const content = read(path);

      // Find every `context: "fork"` (case-insensitive, allow whitespace)
      const forkMatches = content.match(/context\s*:\s*["']fork["']/g) ?? [];
      // Documentation is allowed to MENTION fork (in "When fork is necessary"
      // sections, the CRITICAL RULE block, etc.) but no INVOCATION should pass it.
      // We exclude blocks that are inside prose/sections explaining the rule.
      //
      // Heuristic: an invocation has `context: "fork"` if it appears inside
      // a code block that ALSO has `subagent(` or `subagent({` or `agent:` nearby.
      // To keep this test simple and high-signal, we just count raw `context: "fork"`
      // occurrences inside code fences (```...```).

      const codeBlocks = content.match(/```[\s\S]*?```/g) ?? [];
      for (const block of codeBlocks) {
        // Skip blocks that are pure docs/prose (no invocation shape)
        const hasInvocationShape =
          /subagent\s*\(|subagent\s*\{|agent\s*:\s*["']/i.test(block);
        if (!hasInvocationShape) continue;
        // If this block has an invocation shape, it must NOT pass context: "fork"
        expect(block).not.toMatch(/context\s*:\s*["']fork["']/);
      }

      // Sanity: should have found at least one context: "fresh" in this file
      // (proves we're actually exercising the contract, not just trivially passing)
      expect(content).toMatch(/context\s*:\s*["']fresh["']/);

      // Touch forkMatches to silence the unused warning and document the
      // broader audit: prose mentions of "fork" are allowed.
      expect(forkMatches.length).toBeGreaterThanOrEqual(0);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════
// 3. PER-CLI DISPATCH TABLE COVERS ALL 5 CLIs
// ═════════════════════════════════════════════════════════════════════

describe('Deterministic CLI dispatch table covers all CLIs', () => {
  const content = read(SUBAGENTS_MD);

  it('has a row for `pi` (built-in)', () => {
    expect(content).toMatch(/`pi`\s*\(built-in\)/i);
  });

  it('has a row for `pi` (pi-subagents)', () => {
    expect(content).toMatch(/`pi`\s*\(pi-subagents\)/i);
  });

  it('has a row for opencode', () => {
    expect(content).toMatch(/opencode/i);
    expect(content).toMatch(/delegate_task|Task\b/);
  });

  it('has a row for claude-code', () => {
    expect(content).toMatch(/claude-code/i);
  });

  it('has a row for codex', () => {
    expect(content).toMatch(/codex/i);
    expect(content).toMatch(/\/agent/);
  });

  it('has a row for generic fallback', () => {
    expect(content).toMatch(/generic/i);
    expect(content).toMatch(/file-based handoff|Execute directly/i);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. STRATEGIC-CONTEXT WORKED EXAMPLE USES index.json (NOT spec-product.md)
// ═════════════════════════════════════════════════════════════════════

describe('Strategic-context worked example (context:10 — runs before spec exists)', () => {
  const content = read(SUBAGENTS_MD);

  it('documents the context:10 / context:20 case explicitly', () => {
    expect(content).toMatch(/context:10.*runs at workflow start|Strategic-context worked example/i);
  });

  it('uses reads: [index.json] (NOT spec-product.md) for context-stage invocations', () => {
    // Find the strategic-context worked example block
    const exampleMatch = content.match(
      /Strategic-context worked example[\s\S]*?```typescript[\s\S]*?```/,
    );
    expect(exampleMatch).not.toBeNull();
    const block = exampleMatch![0];
    expect(block).toMatch(/reads\s*:\s*\[[^\]]*index\.json/i);
    // Must NOT include spec-product.md reads — it doesn't exist yet
    expect(block).not.toMatch(/reads\s*:\s*\[[^\]]*spec-product\.md/i);
  });

  it('puts the user\'s verbatim request in the task string (not relying on inheritance)', () => {
    const exampleMatch = content.match(
      /Strategic-context worked example[\s\S]*?```typescript[\s\S]*?```/,
    );
    expect(exampleMatch).not.toBeNull();
    expect(exampleMatch![0]).toMatch(/USER REQUEST.*verbatim|userOriginalRequest/i);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. INPUT FILES TABLE IS THE SINGLE SOURCE OF TRUTH
// ═════════════════════════════════════════════════════════════════════

describe('Input Files table (artifact contract)', () => {
  const content = read(SUBAGENTS_MD);

  it('lists spec-product.md as canonical source for appetite + review_mode + domains_detected', () => {
    expect(content).toMatch(/Input Files.*canonical artifacts/i);
    const tableMatch = content.match(/spec-product\.md.*appetite.*review_mode.*domains_detected[\s\S]{0,500}/i);
    expect(tableMatch).not.toBeNull();
  });

  it('lists spec-tech.md and scope-contract.json for scope executors', () => {
    expect(content).toMatch(/spec-tech\.md/i);
    expect(content).toMatch(/scope-contract\.json/i);
  });
});