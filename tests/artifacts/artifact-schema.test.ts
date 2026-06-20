/**
 * Artifact Schema Validation — against REAL fixture files
 *
 * Tests that workflow artifacts (spec-product.md, spec-tech.md, interfaces.md)
 * match the required schema by reading actual files from tests/fixtures/artifacts/.
 *
 * WHY: If artifacts are missing required fields, downstream phases break.
 * Previously this file tested against inline strings — now it reads real files.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');

const FIXTURES_DIR = join(PROJECT_ROOT, 'tests/fixtures/artifacts');

// ── Fixture Loaders ────────────────────────────────────────────────

const specProductContent = readFileSync(join(FIXTURES_DIR, 'spec-product_v1.md'), 'utf8');
const specTechContent = readFileSync(join(FIXTURES_DIR, 'spec-tech_v1.md'), 'utf8');
const interfacesContent = readFileSync(join(FIXTURES_DIR, 'interfaces_v1.md'), 'utf8');
const approvalContent = readFileSync(join(FIXTURES_DIR, 'spec-product_v1.approved.md'), 'utf8');
const indexJsonContent = readFileSync(join(FIXTURES_DIR, 'index.json'), 'utf8');

// ── SPEC-PRODUCT.MD ─────────────────────────────────────────────

describe('spec-product.md schema', () => {
  it('should have YAML frontmatter with approved field', () => {
    expect(specProductContent).toMatch(/^---[\s\S]*---/m);
    expect(specProductContent).toMatch(/approved:/);
  });

  it('should have Problem section', () => {
    expect(specProductContent).toMatch(/##\s*Problem/i);
  });

  it('should have Solution section', () => {
    expect(specProductContent).toMatch(/##\s*Solution/i);
  });

  it('should have Scope section', () => {
    expect(specProductContent).toMatch(/##\s*Scope/i);
  });

  it('should have IN subsection', () => {
    expect(specProductContent).toMatch(/###\s*IN/i);
  });

  it('should have OUT subsection', () => {
    expect(specProductContent).toMatch(/###\s*OUT/i);
  });

  it('should have Risks section (optional but recommended)', () => {
    expect(specProductContent).toMatch(/##\s*Risks/i);
  });
});

// ── SPEC-TECH.MD ──────────────────────────────────────────────

describe('spec-tech.md schema', () => {
  it('should have Scopes section', () => {
    expect(specTechContent).toMatch(/##\s*Scopes/i);
  });

  it('scopes should have TYPE annotation (feature/optimization/spike)', () => {
    expect(specTechContent).toMatch(/\[TYPE:\s*(feature|optimization|spike)\]/i);
  });

  it('scopes should have DoD (Done when)', () => {
    expect(specTechContent).toMatch(/\*\*DoD:\*\*/i);
  });

  it('scopes should have AC (Acceptance Criteria)', () => {
    expect(specTechContent).toMatch(/\*\*AC:\*\*/i);
  });

  it('scopes should have Objective or Description', () => {
    expect(specTechContent).toMatch(/\*\*Objective:\*\*|\*\*Description:\*\*/i);
  });
});

// ── INTERFACES.MD ─────────────────────────────────────────────

describe('interfaces.md schema', () => {
  it('should have 1-5 proposals (A-E)', () => {
    const proposals = interfacesContent.match(/##\s*Proposal\s*[A-E]/g) ?? [];
    expect(proposals.length).toBeGreaterThanOrEqual(1);
    expect(proposals.length).toBeLessThanOrEqual(5);
  });

  it('should have Hybrid Recommendation section', () => {
    expect(interfacesContent).toMatch(/##\s*Hybrid/i);
  });

  it('proposals should contain code blocks or previews', () => {
    expect(interfacesContent).toMatch(/```/);
  });
});

// ── APPROVAL RECEIPT ─────────────────────────────────────────

describe('approval receipt schema', () => {
  it('should have approved field with date', () => {
    expect(approvalContent).toMatch(/approved:/);
  });

  it('should have verdict field', () => {
    expect(approvalContent).toMatch(/verdict:/);
  });

  it('should have hash field', () => {
    expect(approvalContent).toMatch(/hash:/);
  });
});

// ── INDEX.JSON ────────────────────────────────────────────────

describe('index.json schema', () => {
  const parsed = JSON.parse(indexJsonContent);

  it('should have version field', () => {
    expect(parsed).toHaveProperty('version');
  });

  it('should have name field', () => {
    expect(parsed).toHaveProperty('name');
  });

  it('should have _dir field', () => {
    expect(parsed).toHaveProperty('_dir');
  });

  it('should have workflow_status field', () => {
    expect(parsed).toHaveProperty('workflow_status');
  });

  it('should have current_phase field', () => {
    expect(parsed).toHaveProperty('current_phase');
  });

  it('workflow_status should be valid', () => {
    const valid = ['in-progress', 'completed', 'archived', 'paused'];
    expect(valid).toContain(parsed.workflow_status);
  });
});

// ── FILE NAMING CONVENTIONS ────────────────────────────────────

describe('file naming conventions', () => {
  it('spec-product should use versioned naming', () => {
    expect(existsSync(join(FIXTURES_DIR, 'spec-product_v1.md'))).toBe(true);
  });

  it('spec-tech should use versioned naming', () => {
    expect(existsSync(join(FIXTURES_DIR, 'spec-tech_v1.md'))).toBe(true);
  });

  it('interfaces should use versioned naming', () => {
    expect(existsSync(join(FIXTURES_DIR, 'interfaces_v1.md'))).toBe(true);
  });

  it('approval receipt should follow naming convention', () => {
    expect(existsSync(join(FIXTURES_DIR, 'spec-product_v1.approved.md'))).toBe(true);
  });

  it('version field should be in YAML frontmatter', () => {
    expect(specProductContent).toMatch(/version:\s*\d+\.\d+/);
  });

  it('date fields should be ISO format', () => {
    expect(specProductContent).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
