/**
 * artifact-flow-contract.test.ts
 *
 * Regression guard for the artifact flow between stages.
 *
 * The stelow workflow is a producer/consumer chain:
 *   setup → context → shape-up → plan-critique → tech-planning → scope-execution → verification
 *
 * Each stage reads specific fields from `index.json` and `spec-product.md`
 * frontmatter. This test enforces that:
 *   1. Every field WRITTEN by setup.md is READ by at least one downstream stage.
 *   2. Every field READ by a downstream stage is WRITTEN by an upstream stage.
 *   3. The canonical-source contract holds: producers write to a single
 *      canonical artifact, consumers read from it (no scattered copies).
 *
 * If these tests fail, a human MUST investigate — silent breakage happens
 * when a producer renames a field but a consumer still reads the old name.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');

const SKILLS_DIR = join(PROJECT_ROOT, 'skills');

// ═════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════

function read(path: string): string {
  return readFileSync(path, 'utf-8');
}

function listSkillFiles(skillName: string): string[] {
  const dir = join(SKILLS_DIR, skillName);
  const files: string[] = [];
  function walk(d: string): void {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      const stat = statSync(p);
      if (stat.isDirectory()) walk(p);
      else if (entry.endsWith('.md')) files.push(p);
    }
  }
  try { walk(dir); } catch { /* skill may not exist */ }
  return files;
}

const SCAN_TARGETS = [
  'stelow-product-orchestrator',
  'stelow-product-shape-up',
  'stelow-product-interface-alternatives',
  'stelow-product-plan-critique',
  'stelow-product-tech-planning',
  'stelow-product-scope-executor',
  'stelow-product-testing-ai-code',
  'stelow-product-execution-critique',
  'stelow-product-codebase-critique',
  'stelow-product-discovery',
];

function corpus(): string {
  const all: string[] = [];
  for (const skill of SCAN_TARGETS) {
    for (const file of listSkillFiles(skill)) {
      all.push(read(file));
    }
  }
  return all.join('\n');
}

// ═════════════════════════════════════════════════════════════════════
// 1. APPETITE — PRODUCED + CONSUMED + CANONICAL SOURCE
// ═════════════════════════════════════════════════════════════════════

describe('appetite field flow', () => {
  const body = corpus();

  it('is WRITTEN to stelow.json by setup.md (canonical source as of v0.50.0)', () => {
    const setupMd = read(join(SKILLS_DIR, 'stelow-product-orchestrator/stages/setup.md'));
    expect(setupMd).toMatch(/appetite:\s*'\{chosen_appetite\}'/);
  });

  it('is WRITTEN to spec-product.md frontmatter by setup.md', () => {
    const setupMd = read(join(SKILLS_DIR, 'stelow-product-orchestrator/stages/setup.md'));
    expect(setupMd).toMatch(/^appetite:\s*\{chosen_appetite\}/m);
  });

  it('is READ by shape-up validation guard', () => {
    const shapeUp = read(join(SKILLS_DIR, 'stelow-product-shape-up/SKILL.md'));
    expect(shapeUp).toMatch(/grep -q "appetite:" "\$SPEC"/);
  });

  it('is READ by interface-alternatives step 0', () => {
    const ia = read(join(SKILLS_DIR, 'stelow-product-interface-alternatives/SKILL.md'));
    expect(ia).toMatch(/grep -oP.*\^appetite/);
  });

  it('is READ by verification stage', () => {
    const v = read(join(SKILLS_DIR, 'stelow-product-orchestrator/stages/verification.md'));
    expect(v).toMatch(/grep -oP.*\^appetite/);
  });

  it('is READ by execution stage', () => {
    const e = read(join(SKILLS_DIR, 'stelow-product-orchestrator/stages/execution.md'));
    expect(e).toMatch(/grep -oP.*\^appetite/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. REVIEW_MODE — PRODUCED + CONSUMED + CANONICAL SOURCE
// ═════════════════════════════════════════════════════════════════════

describe('review_mode field flow', () => {
  it('is WRITTEN to stelow.json by setup.md (canonical source as of v0.50.0)', () => {
    const setupMd = read(join(SKILLS_DIR, 'stelow-product-orchestrator/stages/setup.md'));
    expect(setupMd).toMatch(/review_mode:\s*'\{chosen_review_mode\}'/);
  });

  it('is WRITTEN to spec-product.md frontmatter by setup.md', () => {
    const setupMd = read(join(SKILLS_DIR, 'stelow-product-orchestrator/stages/setup.md'));
    expect(setupMd).toMatch(/^review_mode:\s*\{chosen_review_mode\}/m);
  });

  it('is READ by gate stage from stelow.json', () => {
    const gate = read(join(SKILLS_DIR, 'stelow-product-orchestrator/stages/gate.md'));
    expect(gate).toMatch(/review_mode/);
    expect(gate).toMatch(/stelow\.json/);
  });

  it('is READ by plan-critique from stelow.json', () => {
    const pc = read(join(SKILLS_DIR, 'stelow-product-plan-critique/SKILL.md'));
    expect(pc).toMatch(/review_mode/);
  });

  it('is READ by tech-planning from stelow.json', () => {
    const tp = read(join(SKILLS_DIR, 'stelow-product-tech-planning/SKILL.md'));
    expect(tp).toMatch(/review_mode/);
  });

  it('is READ by scope-executor (standalone awareness + Complete-appetite warning)', () => {
    const se = read(join(SKILLS_DIR, 'stelow-product-scope-executor/SKILL.md'));
    expect(se).toMatch(/review_mode/);
    // v0.52.0: only references canonical stelow.json (no legacy paths).
    expect(se).toMatch(/stelow\.json[\s\S]*workflows\[\]\.config\.review_mode/);
    expect(se).not.toMatch(/legacy/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. DOMAINS_DETECTED — PRODUCED + CONSUMED + CANONICAL SOURCE
// ═════════════════════════════════════════════════════════════════════

describe('domains_detected field flow', () => {
  it('is INITIALIZED in stelow.json by setup.md (as [])', () => {
    const setupMd = read(join(SKILLS_DIR, 'stelow-product-orchestrator/stages/setup.md'));
    expect(setupMd).toMatch(/domains_detected:\s*\[\]/);
  });

  it('is WRITTEN by context:20 (Domain Context Detection)', () => {
    const ctx = read(join(SKILLS_DIR, 'stelow-product-orchestrator/stages/context.md'));
    expect(ctx).toMatch(/Persist detected domains/);
    expect(ctx).toMatch(/domains_detected/);
  });

  it('is DOCUMENTED as canonical for subagent reads', () => {
    const subagentsMd = read(
      join(SKILLS_DIR, 'stelow-product-orchestrator/references/cli-tools/subagents.md'),
    );
    const hasDomainsDoc =
      /domains_detected[\s\S]{0,300}single source of truth/i.test(subagentsMd) ||
      /single source of truth[\s\S]{0,300}domains_detected/i.test(subagentsMd);
    expect(hasDomainsDoc).toBe(true);
  });

  it('is DOCUMENTED as expected input for Interface Alternatives and Strategic Context', () => {
    const subagentsMd = read(
      join(SKILLS_DIR, 'stelow-product-orchestrator/references/cli-tools/subagents.md'),
    );
    expect(subagentsMd).toMatch(/domains_detected/i);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. DETECTED_CLI — PRODUCED + CONSUMED
// ═════════════════════════════════════════════════════════════════════

describe('detected_cli field flow', () => {
  

  it('is READ by subagents.md dispatch table (per-CLI selection)', () => {
    const subagentsMd = read(
      join(SKILLS_DIR, 'stelow-product-orchestrator/references/cli-tools/subagents.md'),
    );
    // v0.53.0: detected_cli now lives in stelow.json, not index.json
    expect(subagentsMd).toMatch(/detected_cli.*from.*stelow\.json/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. NO ORPHANED FIELDS — PRODUCERS WITHOUT CONSUMERS
// ═════════════════════════════════════════════════════════════════════

describe('No orphaned producer-only fields', () => {
  it('every Workflow.config field written to stelow.json is read by at least one consumer', () => {
    const setupMd = read(join(SKILLS_DIR, 'stelow-product-orchestrator/stages/setup.md'));
    // v0.50.0: setup.md writes Workflow.config via a node -e script. Extract the
    // field names assigned to wf.config.* in that block (use a balanced-window
    // match because the object spans multiple lines).
    const configBlock = setupMd.match(/wf\.config\s*=\s*\{[\s\S]*?\n\};/);
    expect(configBlock).not.toBeNull();
    const fields = (configBlock![0].match(/(\w+):\s*['"[{]/g) ?? [])
      .map((s) => s.replace(/:\s*['"[{]/, '').trim());

    expect(fields).toContain('appetite');
    expect(fields).toContain('review_mode');
    expect(fields).toContain('domains_detected');

    // Every field must appear in at least one consumer file
    const consumerCorpus = [
      'stelow-product-orchestrator/stages/gate.md',
      'stelow-product-orchestrator/stages/verification.md',
      'stelow-product-orchestrator/stages/execution.md',
      'stelow-product-orchestrator/stages/context.md',
      'stelow-product-orchestrator/stages/ask-patterns.md',
      'stelow-product-shape-up/SKILL.md',
      'stelow-product-interface-alternatives/SKILL.md',
      'stelow-product-plan-critique/SKILL.md',
      'stelow-product-tech-planning/SKILL.md',
      'stelow-product-scope-executor/SKILL.md',
      'stelow-product-testing-ai-code/SKILL.md',
    ]
      .map((p) => read(join(SKILLS_DIR, p)))
      .join('\n');

    for (const field of fields) {
      expect(consumerCorpus, `field "${field}" written by setup.md but no consumer reads it`).toMatch(
        new RegExp(`\\b${field}\\b`),
      );
    }
  });
});