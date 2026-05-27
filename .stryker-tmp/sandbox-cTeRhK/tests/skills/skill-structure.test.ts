/**
 * Layer B: SKILL.md Structure Validation
 * 
 * Tests that the main SKILL.md is correctly structured.
 * These tests validate DOCUMENTATION structure, not LLM behavior.
 */
// @ts-nocheck

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Dynamic PROJECT_ROOT: resolve from test file location
// tests/skills/skill-structure.test.ts → ../../.. = project root
const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename); // tests/skills
const PROJECT_ROOT = join(__testDir, '..', '..'); // project root

// ── Helpers ──────────────────────────────────────────────────────────

function readSkill(name: string): string {
  const path = join(PROJECT_ROOT, 'skills/cali-product-workflow', name);
  return readFileSync(path, 'utf8');
}

function readStage(name: string): string {
  const path = join(PROJECT_ROOT, 'skills/cali-product-workflow/stages', name);
  return readFileSync(path, 'utf8');
}

// ── SKILL.md Main Structure Tests ─────────────────────────────────────

describe('SKILL.md Structure Validation', () => {
  const skillPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/SKILL.md');
  const content = readFileSync(skillPath, 'utf8');

  // ── Stage Index ──────────────────────────────────────────────

  describe('Stage Index', () => {
    it('should have Stage Index section', () => {
      expect(content).toContain('## 📋 Stage Index');
    });

    it('should have stages in table (minimum 10)', () => {
      const stageMatches = content.match(/\|\s*\d+\s*\|/g);
      expect(stageMatches?.length || 0).toBeGreaterThanOrEqual(10);
    });

    it('should list Execution as a stage', () => {
      expect(content).toMatch(/\*\*Execution\*\*/);
    });

    it('should list Setup or Project Setup as first stage', () => {
      expect(content).toMatch(/\*\*Project Setup\*\*|\*\*Setup\*\*/);
    });

    it('should list Tech Planning as a stage', () => {
      expect(content).toMatch(/\*\*Tech Planning\*\*/);
    });
  });

  // ── Safety Rules ─────────────────────────────────────────────

  describe('Safety Rules', () => {
    it('should have Safety Rules section', () => {
      expect(content).toMatch(/Safety Rules|CRITICAL RULES/i);
    });

    it('plannotator --gate should be documented', () => {
      expect(content).toMatch(/plannotator.*--gate|--gate.*plannotator/i);
    });

    it('should mention --gate flag is mandatory', () => {
      expect(content).toMatch(/mandatory|never skip|obligatory/i);
    });

    it('supervisor should NOT activate during stages 3-11', () => {
      expect(content).toMatch(/never activate during Stages (3-11|3-10)/i);
    });

    it('should warn about re-submitting Plannotator', () => {
      expect(content).toMatch(/re-submit|supervisor.*plannotator/i);
    });
  });

  // ── Tool References ─────────────────────────────────────────

  describe('Tool References', () => {
    it('should have Tools & Packages section', () => {
      expect(content).toMatch(/Tools.*Packages|🔧 Tools/i);
    });

    it('should reference cli-tools/ directory', () => {
      expect(content).toMatch(/references\/cli-tools/);
    });

    it('subagent should reference subagents.md', () => {
      if (content.includes('subagent')) {
        expect(content).toMatch(/subagents\.md/);
      }
    });

    it('ask_user_question should reference ask.md', () => {
      if (content.includes('ask_user_question')) {
        expect(content).toMatch(/ask\.md/);
      }
    });

    it('plannotator should reference plannotator.md', () => {
      if (content.includes('plannotator')) {
        expect(content).toMatch(/plannotator\.md/);
      }
    });

    it('/sisyphus should reference goals.md', () => {
      if (content.includes('sisyphus')) {
        expect(content).toMatch(/goals\.md/);
      }
    });
  });

  // ── Auto-chaining Rules ───────────────────────────────────

  describe('Auto-chaining Rules', () => {
    it('should have Auto-chaining section', () => {
      expect(content).toMatch(/Auto-chain/i);
    });

    it('should document phase sequence', () => {
      expect(content).toMatch(/Shape.*Critique|Gate.*Execution/i);
    });

    it('should mention Tech Planning', () => {
      expect(content).toMatch(/Tech Planning/i);
    });

    it('should mention Execution', () => {
      expect(content).toMatch(/Execution/i);
    });

    it('should have Flow Diagram', () => {
      expect(content).toMatch(/Flow Diagram/i);
    });
  });

  // ── Directory Structure ──────────────────────────────────

  describe('Directory Structure', () => {
    it('should document workflow directory', () => {
      expect(content).toContain('.cali-product-workflow');
    });

    it('should document artifacts paths', () => {
      expect(content).toMatch(/specs.*spec-product/);
      expect(content).toMatch(/interfaces/);
      expect(content).toMatch(/plans/);
    });
  });

  // ── Critical Rules ────────────────────────────────────────

  describe('Critical Rules', () => {
    it('should have CRITICAL RULES', () => {
      expect(content).toMatch(/CRITICAL RULES|NEVER skip/i);
    });

    it('Review Gate should be mandatory', () => {
      expect(content).toMatch(/Gate.*mandatory|mandatory.*Gate/i);
    });
  });
});

// ── Stage Files Structure Tests ───────────────────────────────────────

describe('Stage Files Structure', () => {
  const stages = ['setup.md', 'context.md', 'gate.md', 'execution.md'];

  stages.forEach(stage => {
    describe(stage, () => {
      const path = join(PROJECT_ROOT, 'skills/cali-product-workflow/stages', stage);

      it('should exist', () => {
        expect(existsSync(path)).toBe(true);
      });

      it('should reference SKILL.md', () => {
        const content = readFileSync(path, 'utf8');
        expect(content).toMatch(/SKILL\.md/i);
      });
    });
  });

  describe('Critical Stages', () => {
    it('gate.md should mention plannotator', () => {
      const content = readStage('gate.md');
      expect(content).toMatch(/plannotator/i);
    });

    it('execution.md should document execution', () => {
      const content = readStage('execution.md');
      expect(content).toMatch(/Execution|Sisyphus|autoresearch/i);
    });
  });
});

// ── cli-tools References Tests ────────────────────────────────────────

describe('cli-tools References', () => {
  const cliToolsDir = join(PROJECT_ROOT, 'skills/cali-product-workflow/references/cli-tools');

  it('cli-tools directory should exist', () => {
    expect(existsSync(cliToolsDir)).toBe(true);
  });

  it('plannotator.md should exist if referenced', () => {
    const skillContent = readFileSync(
      join(PROJECT_ROOT, 'skills/cali-product-workflow/SKILL.md'),
      'utf8'
    );
    if (skillContent.includes('plannotator.md')) {
      expect(existsSync(join(cliToolsDir, 'plannotator.md'))).toBe(true);
    }
  });

  it('subagents.md should exist if referenced', () => {
    const skillContent = readFileSync(
      join(PROJECT_ROOT, 'skills/cali-product-workflow/SKILL.md'),
      'utf8'
    );
    if (skillContent.includes('subagents.md')) {
      expect(existsSync(join(cliToolsDir, 'subagents.md'))).toBe(true);
    }
  });

  it('goals.md should exist if referenced', () => {
    const skillContent = readFileSync(
      join(PROJECT_ROOT, 'skills/cali-product-workflow/SKILL.md'),
      'utf8'
    );
    if (skillContent.includes('goals.md')) {
      expect(existsSync(join(cliToolsDir, 'goals.md'))).toBe(true);
    }
  });
});