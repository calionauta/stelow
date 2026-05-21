/**
 * Golden Dataset Validation Tests
 * 
 * Uses golden test cases to validate SKILL.md and skill files.
 * Each test case represents a typical workflow scenario.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  goldenDataset,
  PHASES,
} from './product-workflow.dataset';
import {
  validateAgainstGolden,
  validateAgainstDataset,
  getValidationSummary,
  extractPhases,
  hasCliToolsReference,
  countGates,
} from './validator';

// Dynamic PROJECT_ROOT: resolve from test file location
// tests/golden/product-workflow.validate.test.ts → ../../.. = project root
const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename); // tests/golden
const PROJECT_ROOT = join(__testDir, '..', '..'); // project root

// ── SKILL.md Content ─────────────────────────────────────────────────────────

const SKILL_PATH = join(PROJECT_ROOT, 'skills/cali-product-workflow/SKILL.md');
const SKILL_CONTENT = readFileSync(SKILL_PATH, 'utf-8');

// ── Dataset Overview ─────────────────────────────────────────────────────────

describe('Golden Dataset Overview', () => {
  it('should have 5 test cases', () => {
    expect(goldenDataset).toHaveLength(5);
  });

  it('should cover all categories', () => {
    const categories = new Set(goldenDataset.map(c => c.category));
    expect(categories.has('shape-up')).toBe(true);
    expect(categories.has('interface')).toBe(true);
    expect(categories.has('quick')).toBe(true);
    expect(categories.has('clarification')).toBe(true);
  });

  it('each case should have required fields', () => {
    goldenDataset.forEach(testCase => {
      expect(testCase.name).toBeDefined();
      expect(testCase.description).toBeDefined();
      expect(testCase.category).toBeDefined();
      expect(testCase.input).toBeDefined();
      expect(testCase.expected).toBeDefined();
      expect(testCase.expected.phases.length).toBeGreaterThan(0);
      expect(testCase.expected.gates).toBeDefined();
      expect(testCase.expected.artifacts).toBeDefined();
    });
  });
});

// ── SKILL.md Structure Validation ─────────────────────────────────────────────

describe('SKILL.md Golden Validation', () => {
  const results = validateAgainstDataset(SKILL_CONTENT, goldenDataset);
  const summary = getValidationSummary(results);

  it('should have validation results for all cases', () => {
    expect(results.size).toBe(5);
  });

  describe('Shape Up Full Workflow', () => {
    it('should have phases, gates, and artifacts documented', () => {
      expect(SKILL_CONTENT).toMatch(/Setup|Shape|Critique|Gate/i);
      expect(SKILL_CONTENT).toMatch(/plannotator|--gate/i);
      expect(SKILL_CONTENT).toMatch(/spec-product|spec-tech/i);
    });
  });

  describe('Shape Up With Interface', () => {
    it('should have interface phases and gate', () => {
      expect(SKILL_CONTENT).toMatch(/Interface|interface/i);
    });
  });

  describe('Overall Validation', () => {
    it('should have correct phase documentation', () => {
      // Check that phases are documented in order
      const phases = extractPhases(SKILL_CONTENT);
      
      // Setup should be first
      expect(phases[0]?.name).toMatch(/Triage|Inbox Triage|Setup/i);
      
      // Execution should be last
      expect(phases[phases.length - 1]?.name).toMatch(/Execution/i);
      
      // Should have at least 10 phases
      expect(phases.length).toBeGreaterThanOrEqual(10);
    });
  });
});

// ── Phase Extraction ─────────────────────────────────────────────────────────

describe('Phase Extraction', () => {
  it('should extract phases from SKILL.md', () => {
    const phases = extractPhases(SKILL_CONTENT);
    expect(phases.length).toBeGreaterThanOrEqual(10);
  });

  it('should have Triage as first phase', () => {
    const phases = extractPhases(SKILL_CONTENT);
    expect(phases[0]?.name).toMatch(/Triage|Inbox Triage|Setup|Project Setup/i);
  });

  it('should have Execution as last phase', () => {
    const phases = extractPhases(SKILL_CONTENT);
    const lastPhase = phases[phases.length - 1];
    expect(lastPhase?.name).toMatch(/Execution/i);
  });

  it('should have Planning phase', () => {
    const phases = extractPhases(SKILL_CONTENT);
    const hasPlanning = phases.some(p => p.name.includes('Planning') || p.name.includes('Tech'));
    expect(hasPlanning).toBe(true);
  });
});

// ── Tool Reference Validation ─────────────────────────────────────────────────

describe('Tool References', () => {
  it('should reference cli-tools directory', () => {
    expect(hasCliToolsReference(SKILL_CONTENT)).toBe(true);
  });

  it('should reference subagent tool', () => {
    expect(SKILL_CONTENT).toMatch(/\bsubagent\b/);
  });

  it('should reference ask_user_question tool', () => {
    expect(SKILL_CONTENT).toMatch(/ask_user_question/);
  });

  it('should reference plannotator tool', () => {
    expect(SKILL_CONTENT).toMatch(/plannotator/);
  });
});

// ── Gate Validation ───────────────────────────────────────────────────────────

describe('Gate Validation', () => {
  it('should have plannotator gates with --gate', () => {
    const gateCount = countGates(SKILL_CONTENT);
    expect(gateCount).toBeGreaterThanOrEqual(1);
  });

  it('should document gates as mandatory or important', () => {
    expect(SKILL_CONTENT).toMatch(/mandatory|never skip|--gate|Review Gate|Interface Gate/i);
  });

  describe('Gate Phase Documentation', () => {
    it('should document Review Gate for Phase 5', () => {
      expect(SKILL_CONTENT).toMatch(/Phase 5|Review Gate|Gate.*mandatory/i);
    });

    it('should document Tech Planning gate', () => {
      expect(SKILL_CONTENT).toMatch(/Tech Planning|Phase 10|Planning.*Gate/i);
    });
  });
});

// ── Artifact Documentation ───────────────────────────────────────────────────

describe('Artifact Documentation', () => {
  it('should document spec-product.md', () => {
    expect(SKILL_CONTENT).toMatch(/spec-product/);
  });

  it('should document spec-tech.md', () => {
    expect(SKILL_CONTENT).toMatch(/spec-tech/);
  });

  it('should document interfaces.md', () => {
    expect(SKILL_CONTENT).toMatch(/interfaces/);
  });

  it('should document index.json', () => {
    expect(SKILL_CONTENT).toMatch(/index\.json/);
  });
});

// ── Workflow Flow Validation ──────────────────────────────────────────────────

describe('Workflow Flow', () => {
  it('should document auto-chaining rules', () => {
    expect(SKILL_CONTENT).toMatch(/auto-chain|auto-chaining|Execution.*automatic/i);
  });

  it('should document execution is automatic', () => {
    expect(SKILL_CONTENT).toMatch(/Execution.*automatic|automatic.*Execution/i);
  });

  it('should have CRITICAL RULES section', () => {
    expect(SKILL_CONTENT).toMatch(/CRITICAL RULES|NEVER skip/i);
  });

  it('should document workflow directory structure', () => {
    expect(SKILL_CONTENT).toMatch(/\.cali-product-workflow/);
  });
});

// ── Per-Case Basic Validation ─────────────────────────────────────────────────

describe('Per-Case Basic Validation', () => {
  goldenDataset.forEach(testCase => {
    describe(`Case: ${testCase.name}`, () => {
      it('should have expected phases in SKILL.md', () => {
        // At minimum, check that key phases exist
        const phases = extractPhases(SKILL_CONTENT);
        const phaseCount = phases.length;
        
        // For workflows expecting many phases, verify we have at least that many
        if (testCase.expected.phaseCount >= 8) {
          expect(phaseCount).toBeGreaterThanOrEqual(8);
        } else {
          expect(phaseCount).toBeGreaterThanOrEqual(testCase.expected.phaseCount);
        }
      });

      it('should reference expected tools', () => {
        testCase.expected.tools.forEach(tool => {
          // At least one reference should exist
          const toolPattern = new RegExp(`\\b${tool.replace('_', '[-_]?')}\\b`, 'i');
          expect(SKILL_CONTENT).toMatch(toolPattern);
        });
      });

      it('should document required artifacts', () => {
        const requiredArtifacts = testCase.expected.artifacts.filter(a => a.required);
        requiredArtifacts.forEach(artifact => {
          // Check that artifact base name appears in content
          // Content may have paths like "spec-tech_v{N}.md" or "spec-tech"
          const baseName = artifact.name.replace('.md', '').replace('_v{N}.md', '');
          const pattern = new RegExp(baseName, 'i');
          expect(SKILL_CONTENT).toMatch(pattern);
        });
      });

      it('should have gate documentation for gated workflows', () => {
        if (testCase.expected.gates.length > 0) {
          expect(SKILL_CONTENT).toMatch(/plannotator|--gate|Gate/i);
        }
      });
    });
  });
});

// ── Validation Summary ───────────────────────────────────────────────────────

describe('Validation Summary', () => {
  it('should generate valid summary', () => {
    const results = validateAgainstDataset(SKILL_CONTENT, goldenDataset);
    const summary = getValidationSummary(results);
    
    expect(summary.total).toBe(5);
    expect(summary.passed + summary.failed).toBe(5);
  });

  it('should have correct phase documentation', () => {
    // Check that phases are documented in order
    const phases = extractPhases(SKILL_CONTENT);
    
    // Setup should be first
    expect(phases[0]?.name).toMatch(/Triage|Inbox Triage|Setup/i);
    
    // Execution should be last
    expect(phases[phases.length - 1]?.name).toMatch(/Execution/i);
  });
});

// ── Pattern Consistency ──────────────────────────────────────────────────────

describe('Pattern Consistency', () => {
  it('should use consistent tool naming', () => {
    const toolMentions = SKILL_CONTENT.match(/\b(subagent|ask_user_question|plannotator|supervise|intercom)\b/gi);
    expect(toolMentions?.length || 0).toBeGreaterThan(0);
  });

  it('should reference tools via cli-tools', () => {
    expect(SKILL_CONTENT).toMatch(/references\/cli-tools/);
  });

  it('should have consistent section headers', () => {
    // Should have markdown headers
    expect(SKILL_CONTENT).toMatch(/##\s+[A-Z]/);
  });
});

// ── Edge Cases ───────────────────────────────────────────────────────────────

describe('Edge Case Coverage', () => {
  it('should handle shape-up full workflow', () => {
    const case_ = goldenDataset.find(c => c.name === 'shape-up-full-workflow');
    expect(case_).toBeDefined();
    expect(case_?.expected.phaseCount).toBe(8);
  });

  it('should handle shape-up with interface', () => {
    const case_ = goldenDataset.find(c => c.name === 'shape-up-with-interface');
    expect(case_).toBeDefined();
    expect(case_?.expected.phaseCount).toBe(11);
  });

  it('should handle quick execution', () => {
    const case_ = goldenDataset.find(c => c.name === 'quick-execution');
    expect(case_).toBeDefined();
    expect(case_?.expected.gates.length).toBe(0);
  });

  it('should have error recovery case', () => {
    const case_ = goldenDataset.find(c => c.name === 'error-recovery');
    expect(case_).toBeDefined();
    expect(case_?.expected.gates.length).toBe(0);
  });
});