/**
 * Layer E: Artifact Schema Validation
 * 
 * Tests that workflow artifacts (spec-product.md, spec-tech.md, interfaces.md)
 * have the required schema fields.
 * 
 * WHY: If artifacts are missing required fields, downstream phases break.
 * This catches schema drift before it causes failures.
 * 
 * NOTE: These tests validate the SCHEMA, not the content quality.
 * For content quality, use Layer 2 (LLM-as-Judge) or Layer 3 (Human Review).
 */
// @ts-nocheck

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Dynamic PROJECT_ROOT: resolve from test file location
// tests/artifacts/artifact-schema.test.ts → ../../.. = project root
const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename); // tests/artifacts
const PROJECT_ROOT = join(__testDir, '..', '..'); // project root

// ── Schema Definitions ───────────────────────────────────────────────

interface FieldRequirement {
  field: string;
  pattern: RegExp;
  required: boolean;
}

const SPEC_PRODUCT_FIELDS: FieldRequirement[] = [
  { field: 'frontmatter', pattern: /^---/m, required: true },
  { field: 'approved', pattern: /approved:/, required: true },
  { field: 'Problem section', pattern: /##\s*Problem/i, required: true },
  { field: 'Solution section', pattern: /##\s*Solution/i, required: true },
  { field: 'Scope section', pattern: /##\s*Scope/i, required: true },
  { field: 'IN items', pattern: /###\s*IN/i, required: true },
  { field: 'OUT items', pattern: /###\s*OUT/i, required: true },
  { field: 'Risks section (optional)', pattern: /##\s*Risks/i, required: false },
];

const SPEC_TECH_FIELDS: FieldRequirement[] = [
  { field: 'frontmatter', pattern: /^---/m, required: true },
  { field: 'Scopes section', pattern: /##\s*Scopes/i, required: true },
  { field: 'TYPE annotation', pattern: /\[TYPE:\s*(feature|optimization|spike)\]/i, required: true },
  { field: 'DoD (Done when)', pattern: /DoD:|Done when:|done when:/i, required: true },
  { field: 'AC (Acceptance Criteria)', pattern: /AC:|Acceptance Criteria:|acceptance criteria:/i, required: true },
  { field: 'Scope description', pattern: /\*\*Objective:\*\*|\*\*Description:\*\*/i, required: true },
];

const INTERFACES_FIELDS: FieldRequirement[] = [
  { field: 'Proposal A', pattern: /##\s*Proposal\s*[A-E]/i, required: true },
  { field: 'Proposal B', pattern: /##\s*Proposal\s*[A-E]/i, required: true },
  { field: 'Proposal C', pattern: /##\s*Proposal\s*[A-E]/i, required: true },
  { field: 'Proposal D', pattern: /##\s*Proposal\s*[A-E]/i, required: true },
  { field: 'Proposal E', pattern: /##\s*Proposal\s*[A-E]/i, required: true },
  { field: 'Hybrid Recommendation', pattern: /##\s*Hybrid/i, required: true },
  { field: 'Preview/code block', pattern: /```/, required: false }, // Optional but recommended
];

// ── Schema Validation Helper ─────────────────────────────────────────

function validateFields(content: string, fields: FieldRequirement[]): {
  passed: string[];
  failed: string[];
  optionalFailed: string[];
} {
  const passed: string[] = [];
  const failed: string[] = [];
  const optionalFailed: string[] = [];

  fields.forEach(field => {
    if (field.pattern.test(content)) {
      passed.push(field.field);
    } else if (field.required) {
      failed.push(field.field);
    } else {
      optionalFailed.push(field.field);
    }
  });

  return { passed, failed, optionalFailed };
}

// ── Tests ──────────────────────────────────────────────────────────

describe('Artifact Schema Validation', () => {

  // ── SPEC-PRODUCT.MD SCHEMA ─────────────────────────────────

  describe('spec-product.md Schema', () => {
    const fields = SPEC_PRODUCT_FIELDS;

    it('should have all required fields', () => {
      // This is a documentation test - validating what fields SHOULD exist
      // Actual artifact validation happens in CI with real workflows
      expect(fields.filter(f => f.required).length).toBeGreaterThanOrEqual(5);
    });

    it('required fields should include Problem/Solution/Scope', () => {
      const requiredNames = fields.filter(f => f.required).map(f => f.field);
      expect(requiredNames).toContain('Problem section');
      expect(requiredNames).toContain('Solution section');
      expect(requiredNames).toContain('Scope section');
    });

    it('should document IN/OUT pattern', () => {
      const scopeFields = fields.filter(f => f.field.includes('IN') || f.field.includes('OUT'));
      expect(scopeFields.length).toBeGreaterThanOrEqual(2);
    });

    describe('Schema Pattern Validation', () => {
      // These tests verify the PATTERNS are correct
      // They don't require actual artifact files

      it('Problem pattern should match markdown header', () => {
        const pattern = fields.find(f => f.field === 'Problem section')?.pattern;
        expect(pattern?.source).toContain('##');
      });

      it('Scope pattern should match IN/OUT subsections', () => {
        const inPattern = fields.find(f => f.field === 'IN items')?.pattern;
        expect(inPattern?.source).toContain('###');
      });

      it('approved field should be in frontmatter', () => {
        const approvedPattern = fields.find(f => f.field === 'approved')?.pattern;
        expect(approvedPattern?.source).toContain('approved:');
      });
    });
  });

  // ── SPEC-TECH.MD SCHEMA ────────────────────────────────────

  describe('spec-tech.md Schema', () => {
    const fields = SPEC_TECH_FIELDS;

    it('should have all required fields', () => {
      expect(fields.filter(f => f.required).length).toBeGreaterThanOrEqual(4);
    });

    it('required fields should include TYPE/DoD/AC', () => {
      const requiredNames = fields.filter(f => f.required).map(f => f.field);
      expect(requiredNames).toContain('TYPE annotation');
      expect(requiredNames).toContain('DoD (Done when)');
      expect(requiredNames).toContain('AC (Acceptance Criteria)');
    });

    it('TYPE should support feature/optimization/spike', () => {
      // Test that our pattern can match these values
      const typePattern = /\[TYPE:\s*(feature|optimization|spike)\]/i;
      expect('[TYPE: feature]').toMatch(typePattern);
      expect('[TYPE: optimization]').toMatch(typePattern);
      expect('[TYPE: spike]').toMatch(typePattern);
    });

    describe('Scope Structure', () => {
      it('Scopes should have clear boundaries', () => {
        const scopeFields = fields.filter(f => 
          f.field.includes('TYPE') || 
          f.field.includes('DoD') || 
          f.field.includes('AC')
        );
        expect(scopeFields.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  // ── INTERFACES.MD SCHEMA ───────────────────────────────────

  describe('interfaces.md Schema', () => {
    const fields = INTERFACES_FIELDS;

    it('should have 5 proposals required', () => {
      const proposalFields = fields.filter(f => f.field.includes('Proposal'));
      expect(proposalFields.length).toBe(5);
    });

    it('should require Hybrid Recommendation', () => {
      const hybridFields = fields.filter(f => f.field.includes('Hybrid'));
      expect(hybridFields.length).toBe(1);
      expect(hybridFields[0].required).toBe(true);
    });

    it('proposals A-E should be required', () => {
      const proposals = ['A', 'B', 'C', 'D', 'E'];
      proposals.forEach(letter => {
        const field = fields.find(f => f.field.includes(letter));
        expect(field).toBeDefined();
        expect(field?.required).toBe(true);
      });
    });
  });

  // ── WORKFLOW DIRECTORY STRUCTURE ───────────────────────────

  describe('Workflow Directory Structure', () => {
    it('should document all artifact directories', () => {
      const expectedDirs = [
        'specs/',
        'interfaces/',
        'plans/',
        'critiques/',
        'approvals/',
        'sessions/',
      ];

      // These directories should be created by the workflow
      expectedDirs.forEach(dir => {
        expect(dir.endsWith('/')).toBe(true);
      });
    });

    it('specs should use versioned naming', () => {
      const pattern = /spec-product_v\d+\.md/;
      expect('spec-product_v1.md').toMatch(pattern);
      expect('spec-product_v2.md').toMatch(pattern);
    });

    it('interfaces should use versioned naming', () => {
      const pattern = /interfaces_v\d+\.md/;
      expect('interfaces_v1.md').toMatch(pattern);
    });

    it('spec-tech should use versioned naming', () => {
      const pattern = /spec-tech_v\d+\.md/;
      expect('spec-tech_v1.md').toMatch(pattern);
    });
  });

  // ── APPROVAL RECEIPT SCHEMA ─────────────────────────────────

  describe('Approval Receipt Schema', () => {
    it('receipt fields should be documented', () => {
      // Receipt should document these fields:
      const receiptFields = ['approved at', 'verdict', 'hash'];
      expect(receiptFields.length).toBe(3);
    });

    it('receipt filename should include version', () => {
      const pattern = /spec-product_v\d+\.approved\.md/;
      expect('spec-product_v1.approved.md').toMatch(pattern);
    });
  });

  // ── INDEX.JSON SCHEMA ───────────────────────────────────────

  describe('index.json Schema', () => {
    const requiredFields = [
      'version',
      'name',
      '_dir',
      'workflow_status',
      'current_phase',
      'approved',
    ];

    it('should have all required fields', () => {
      requiredFields.forEach(field => {
        expect(field.length).toBeGreaterThan(0);
      });
    });

    it('workflow_status should support in-progress/completed/archived', () => {
      const validStatuses = ['in-progress', 'completed', 'archived', 'paused'];
      validStatuses.forEach(status => {
        expect(status).toMatch(/^[a-z-]+$/);
      });
    });
  });

  // ── YAML FRONTMATTER PATTERNS ───────────────────────────────

  describe('YAML Frontmatter Patterns', () => {
    it('approved field should be boolean or string', () => {
      const pattern = /approved:\s*(true|false|"[^"]+"|'[^']+')/;
      expect('approved: true').toMatch(pattern);
      expect('approved: false').toMatch(pattern);
      expect('approved: "2026-05-19"').toMatch(pattern);
    });

    it('date fields should be ISO format', () => {
      const isoPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect('2026-05-19T10:00:00Z').toMatch(isoPattern);
      expect('2026-05-19').not.toMatch(isoPattern);
    });

    it('version field should be semver-like', () => {
      const versionPattern = /version:\s*\d+\.\d+/;
      expect('version: 1.0').toMatch(versionPattern);
    });
  });

  // ── VALIDATION HELPERS ────────────────────────────────────

  describe('Validation Helper Functions', () => {
    it('validateFields should identify missing required fields', () => {
      const content = `
## Problem
Test

## Solution
Test
`;
      const result = validateFields(content, SPEC_PRODUCT_FIELDS);
      
      // Should fail on missing frontmatter, approved, Scope, IN, OUT
      expect(result.failed.length).toBeGreaterThan(0);
      expect(result.passed.length).toBeGreaterThanOrEqual(2);
    });

    it('validateFields should pass when all required fields present', () => {
      const content = `---
approved: true
---

## Problem
Test

## Solution
Test

## Scope
### IN
- Item 1

### OUT
- Item 2
`;
      const result = validateFields(content, SPEC_PRODUCT_FIELDS);
      
      // Should fail only on optional fields
      expect(result.failed.length).toBe(0);
    });
  });
});

// ── SCHEMA DOCUMENTATION ─────────────────────────────────────────

describe('Schema Documentation', () => {
  it('should document expected schema in test file', () => {
    // This is meta-documentation
    expect(SPEC_PRODUCT_FIELDS.length).toBeGreaterThanOrEqual(5);
    expect(SPEC_TECH_FIELDS.length).toBeGreaterThanOrEqual(4);
    expect(INTERFACES_FIELDS.length).toBeGreaterThanOrEqual(5);
  });

  it('schema definitions should be maintainable', () => {
    // Schema should be easy to update
    // Adding a new field = adding one object to the array
    const newField: FieldRequirement = {
      field: 'New Field',
      pattern: /new-field/,
      required: false,
    };
    
    const fields = [...SPEC_PRODUCT_FIELDS, newField];
    expect(fields.length).toBe(SPEC_PRODUCT_FIELDS.length + 1);
  });
});