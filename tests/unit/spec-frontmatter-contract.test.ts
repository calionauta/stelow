/**
 * spec-frontmatter-contract.test.ts
 *
 * Regression guard for the spec-product.md frontmatter contract.
 *
 * spec-product.md is the SINGLE SOURCE OF TRUTH for product-level config
 * (`appetite`, `review_mode`, `domains_detected`, `product_type`,
 * `appetite_fit`, `interface`). Every downstream subagent reads these
 * via `reads: [spec-product.md]` instead of inheriting from parent history.
 *
 * This test enforces:
 *   1. The shape-up validator script rejects files missing required fields.
 *   2. The proposal-structure template documents all required fields.
 *   3. setup.md writes the required fields to both index.json AND spec
 *      frontmatter.
 *
 * If these tests fail, a human MUST investigate — it means the
 * frontmatter contract has drifted.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');

const SHAPE_UP_SKILL = join(PROJECT_ROOT, 'skills/stelow-product-shape-up/SKILL.md');
const PROPOSAL_STRUCTURE = join(
  PROJECT_ROOT,
  'skills/stelow-product-shape-up/references/proposal-structure.md',
);
const SETUP_MD = join(PROJECT_ROOT, 'skills/stelow-product-orchestrator/stages/setup.md');
const ASK_PATTERNS = join(PROJECT_ROOT, 'skills/stelow-product-orchestrator/stages/ask-patterns.md');

function read(path: string): string {
  return readFileSync(path, 'utf-8');
}

// ═════════════════════════════════════════════════════════════════════
// 1. SHAPE-UP VALIDATION GUARD REJECTS MISSING REQUIRED FIELDS
// ═════════════════════════════════════════════════════════════════════

describe('shape-up validation guard', () => {
  const shapeUp = read(SHAPE_UP_SKILL);

  it('checks for `appetite:` field', () => {
    expect(shapeUp).toMatch(/grep -q "appetite:" "\$SPEC"/);
  });

  it('checks for `review_mode:` field', () => {
    expect(shapeUp).toMatch(/grep -q "review_mode:" "\$SPEC"/);
  });

  it('checks for `appetite_fit:` field', () => {
    expect(shapeUp).toMatch(/grep -q "appetite_fit:" "\$SPEC"/);
  });

  it('rejects files missing review_mode with VALIDATION_FAILED message', () => {
    expect(shapeUp).toMatch(/VALIDATION_FAILED: missing review_mode field/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. PROPOSAL-STRUCTURE TEMPLATE INCLUDES REQUIRED FRONTMATTER FIELDS
// ═════════════════════════════════════════════════════════════════════

describe('proposal-structure.md frontmatter template', () => {
  const template = read(PROPOSAL_STRUCTURE);

  it('includes `product_type` in the frontmatter template', () => {
    expect(template).toMatch(/product_type:\s*\{/);
  });

  it('includes `appetite` in the frontmatter template', () => {
    expect(template).toMatch(/appetite:\s*\{/);
  });

  it('includes `appetite_fit` in the frontmatter template', () => {
    expect(template).toMatch(/appetite_fit:\s*\{/);
  });

  it('includes `appetite_source` in the frontmatter template', () => {
    expect(template).toMatch(/appetite_source:/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. SETUP.md WRITES REQUIRED FIELDS TO stelow.json (canonical) + spec-product.md (as of v0.50.0)
//    index.json remains a mirrored copy via the TS extension write-through hook.
// ═════════════════════════════════════════════════════════════════════

describe('setup.md frontmatter injection', () => {
  const setup = read(SETUP_MD);

  it('writes appetite to stelow.json#workflows[].config.appetite (canonical)', () => {
    expect(setup).toMatch(/appetite:\s*'\{chosen_appetite\}'/);
  });

  it('writes review_mode to stelow.json#workflows[].config.review_mode (canonical)', () => {
    expect(setup).toMatch(/review_mode:\s*'\{chosen_review_mode\}'/);
  });

  it('initializes domains_detected to [] in stelow.json#workflows[].config', () => {
    expect(setup).toMatch(/domains_detected:\s*\[\]/);
  });

  it('instructs spec-product.md frontmatter to include appetite', () => {
    expect(setup).toMatch(/appetite:\s*\{chosen_appetite\}/);
  });

  it('instructs spec-product.md frontmatter to include review_mode', () => {
    expect(setup).toMatch(/review_mode:\s*\{chosen_review_mode\}/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. ASK-PATTERNS.md DOCUMENTS THE STORAGE CONTRACT
// ═════════════════════════════════════════════════════════════════════

describe('ask-patterns.md storage contract', () => {
  const patterns = read(ASK_PATTERNS);

  it('documents storage of appetite in stelow.json (canonical) AND spec frontmatter', () => {
    expect(patterns).toMatch(/workflows\[\]\.config\.appetite|stelow\.json.*config\.appetite/);
    expect(patterns).toMatch(/spec-product\.md.*frontmatter/);
  });

  it('documents storage of review_mode alongside appetite (same pattern)', () => {
    expect(patterns).toMatch(/workflows\[\]\.config\.review_mode|stelow\.json.*config\.review_mode/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. EXISTING FIXTURE HAS THE REQUIRED FRONTMATTER (OR IS UPDATED)
// ═════════════════════════════════════════════════════════════════════

describe('tests/fixtures/artifacts/spec-product_v1.md', () => {
  const fixturePath = join(PROJECT_ROOT, 'tests/fixtures/artifacts/spec-product_v1.md');
  const fixture = read(fixturePath);

  it('has YAML frontmatter', () => {
    expect(fixture).toMatch(/^---[\s\S]*?---/m);
  });

  it('has the `approved` field (required by validation guard)', () => {
    expect(fixture).toMatch(/^approved:/m);
  });

  it('has the `version` field', () => {
    expect(fixture).toMatch(/^version:/m);
  });
});