/**
 * Layer C: Skill Implementation Validation
 * 
 * Tests that each skill (cali-product-shape-up, cali-product-tech-planning, etc.)
 * is correctly implemented with:
 * - Tool reference header
 * - Process section
 * - Gate presence (--gate flag)
 * 
 * WHY: If a skill is missing a gate or tool reference, LLM doesn't know
 * how to properly execute that skill.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Dynamic PROJECT_ROOT: resolve from test file location
// tests/skills/skill-implementation.test.ts → ../../.. = project root
const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename); // tests/skills
const PROJECT_ROOT = join(__testDir, '..', '..'); // project root

// ── Skill Definitions ───────────────────────────────────────────────

interface SkillDefinition {
  name: string;
  path: string;
  requiresGate: boolean;
  requiresToolRef: boolean;
}

const skills: SkillDefinition[] = [
  {
    name: 'cali-product-shape-up',
    path: 'cali-product-shape-up/SKILL.md',
    requiresGate: false, // Gate is in main SKILL.md
    requiresToolRef: true,
  },
  {
    name: 'cali-product-tech-planning',
    path: 'cali-product-tech-planning/SKILL.md',
    requiresGate: true,
    requiresToolRef: true,
  },
  {
    name: 'cali-product-interface-brainstorm',
    path: 'cali-product-interface-brainstorm/SKILL.md',
    requiresGate: true,
    requiresToolRef: true,
  },
  {
    name: 'cali-product-plan-critique',
    path: 'cali-product-plan-critique/SKILL.md',
    requiresGate: false,
    requiresToolRef: true,
  },
];

// ── Read Skill Helper ────────────────────────────────────────────────

function readSkill(skill: SkillDefinition): string {
  const path = join(PROJECT_ROOT, 'skills/cali-product-workflow', skill.path);
  return readFileSync(path, 'utf8');
}

// ── Tests ──────────────────────────────────────────────────────────

describe('Skill Implementation Validation', () => {

  skills.forEach(skill => {
    describe(skill.name, () => {
      const content = readSkill(skill);

      // ── Basic Structure ──────────────────────────────────────

      describe('Basic Structure', () => {
        it('should have skill name in description', () => {
          expect(content).toMatch(new RegExp(`name: ${skill.name}`));
        });

        it('should have description', () => {
          expect(content).toMatch(/description:/);
        });

        it('should have overview or process section', () => {
          expect(content).toMatch(/## (Overview|Process)/i);
        });
      });

      // ── Tool References ────────────────────────────────────

      describe('Tool References', () => {
        it('should reference cli-tools directory', () => {
          expect(content).toMatch(/references\/cli-tools/);
        });

        it('should have tools header (if using subagent)', () => {
          if (content.includes('subagent')) {
            expect(content).toMatch(/Tools|references\/cli-tools\//i);
          }
        });
      });

      // ── Process Section ─────────────────────────────────

      describe('Process Section', () => {
        it('should have numbered steps or process description', () => {
          // Either numbered steps like "Step 1:" or markdown headers
          expect(content).toMatch(/Step \d:|## \d[a-z]\.|## [A-Z][a-z]+/);
        });

        it('should document what it produces (output)', () => {
          expect(content).toMatch(/output|produces|saved to|generates/i);
        });
      });

      // ── Gate Validation ───────────────────────────────────

      if (skill.requiresGate) {
        describe('Gate Validation', () => {
          it('should mention plannotator', () => {
            expect(content).toMatch(/plannotator/i);
          });

          it('should reference gate command (plannotator.md or --gate)', () => {
            // Gate can be via reference to plannotator.md OR literal --gate flag
            expect(content).toMatch(/plannotator\.md|--gate|plannotator annotate/i);
          });

          it('should document gate workflow', () => {
            // Should reference gate flow somehow
            expect(content).toMatch(/gate|plannotator.*review|review.*plannotator/i);
          });
        });
      } else {
        describe('Gate Validation (Not Required)', () => {
          it('may or may not mention plannotator', () => {
            // No assertion - gate may be in main SKILL.md
          });
        });
      }

      // ── Output Validation ────────────────────────────────

      describe('Output Documentation', () => {
        it('should specify output file path', () => {
          expect(content).toMatch(/\.cali-product-workflow/);
        });

        it('should document output format', () => {
          expect(content).toMatch(/spec-product|spec-tech|interfaces|output/i);
        });
      });

      // ── File Existence ──────────────────────────────────

      describe('File Existence', () => {
        it('skill file should exist at expected path', () => {
          const fullPath = join(PROJECT_ROOT, 'skills/cali-product-workflow', skill.path);
          expect(existsSync(fullPath)).toBe(true);
        });
      });
    });
  });

  // ── Main SKILL.md Gate Tests ─────────────────────────────────

  describe('Main SKILL.md Gates', () => {
    const mainPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/SKILL.md');
    const mainContent = readFileSync(mainPath, 'utf8');

    describe('Phase 5 Gate (spec-product.md)', () => {
      it('should document Review Gate for Phase 5', () => {
        expect(mainContent).toMatch(/Review Gate|Phase 5.*Gate/i);
      });

      it('should reference plannotator for gate', () => {
        expect(mainContent).toMatch(/plannotator.*Gate|Gate.*plannotator/i);
      });
    });

    describe('Phase 8 Gate (interfaces)', () => {
      it('should document Interface Gate for Phase 8', () => {
        expect(mainContent).toMatch(/Interface Gate|Phase 8.*Gate/i);
      });
    });

    describe('Tech Planning Gate', () => {
      it('cali-product-tech-planning should have its own gate', () => {
        const techContent = readSkill(skills.find(s => s.name === 'cali-product-tech-planning')!);
        // Accept either direct --gate or reference to plannotator.md
        expect(techContent).toMatch(/plannotator.*--gate|--gate|plannotator\.md/i);
      });
    });
  });

  // ── Phase Gate Files ────────────────────────────────────────

  describe('Phase Gate Files', () => {
    const gatePath = join(PROJECT_ROOT, 'skills/cali-product-workflow/phases/gate.md');

    it('gate.md should exist', () => {
      expect(existsSync(gatePath)).toBe(true);
    });

    it('gate.md should document plannotator usage', () => {
      const content = readFileSync(gatePath, 'utf8');
      expect(content).toMatch(/plannotator/i);
    });

    it('gate.md should reference cli-tools/plannotator.md', () => {
      const content = readFileSync(gatePath, 'utf8');
      expect(content).toMatch(/plannotator\.md|--gate|references\/cli-tools/);
    });
  });

  // ── Ask Patterns Reference ─────────────────────────────────

  describe('Ask Patterns', () => {
    const askPatternsPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/phases/ask-patterns.md');

    it('ask-patterns.md should exist', () => {
      expect(existsSync(askPatternsPath)).toBe(true);
    });

    it('ask-patterns.md should document ask_user_question usage', () => {
      const content = readFileSync(askPatternsPath, 'utf8');
      expect(content).toMatch(/ask_user_question/);
    });

    it('should have multiple patterns', () => {
      const content = readFileSync(askPatternsPath, 'utf8');
      // Should have Pattern 1, 2, 3, etc.
      const patternMatches = content.match(/Pattern \d+:/g);
      expect(patternMatches?.length || 0).toBeGreaterThanOrEqual(3);
    });
  });

  // ── References Directory ───────────────────────────────────

  describe('References Directory', () => {
    const refsDir = join(PROJECT_ROOT, 'skills/cali-product-workflow/references');

    it('references directory should exist', () => {
      expect(existsSync(refsDir)).toBe(true);
    });

    it('should have strategic-exploration.md', () => {
      expect(existsSync(join(refsDir, 'strategic-exploration.md'))).toBe(true);
    });

    it('should have output-expectations.md', () => {
      expect(existsSync(join(refsDir, 'output-expectations.md'))).toBe(true);
    });
  });

  // ── Execution Phase ──────────────────────────────────────

  describe('Execution Phase', () => {
    const execPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/phases/execution.md');

    it('execution.md should exist', () => {
      expect(existsSync(execPath)).toBe(true);
    });

    it('should document scope executor routing', () => {
      const content = readFileSync(execPath, 'utf8');
      expect(content).toMatch(/scope.*executor|sisyphus|autoresearch/i);
    });

    it('should document worktree decision', () => {
      const content = readFileSync(execPath, 'utf8');
      expect(content).toMatch(/worktree|branch/i);
    });
  });
});