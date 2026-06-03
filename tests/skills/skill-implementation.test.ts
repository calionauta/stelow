/**
 * SKILL.md Structure & Implementation Validation
 *
 * Merged from:
 * - skill-implementation.test.ts (Layer C: per-skill validation)
 * - skill-structure.test.ts (Layer B: main SKILL.md structure)
 * - (removed in cleanup)
 *
 * WHY: If a skill is missing a gate or tool reference, LLM doesn't know
 * how to properly execute that skill. If the main SKILL.md drifts from
 * required structure, the workflow breaks.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');

// ── Path Helpers ───────────────────────────────────────────────────

function readMainSkill(): string {
  return readFileSync(join(PROJECT_ROOT, 'skills/cali-product-workflow/SKILL.md'), 'utf8');
}

function readSkillByPath(name: string): string {
  return readFileSync(join(PROJECT_ROOT, 'skills', name, 'SKILL.md'), 'utf8');
}

function readStageFile(name: string): string {
  return readFileSync(join(PROJECT_ROOT, 'skills/cali-product-workflow/stages', name), 'utf8');
}

// ═════════════════════════════════════════════════════════════════════
// SECTION A: Main SKILL.md Structure
// ═════════════════════════════════════════════════════════════════════

describe('Main SKILL.md Structure', () => {
  const content = readMainSkill();

  // ── Stage Index ──────────────────────────────────────────────

  describe('Stage Index', () => {
    it('should have Stage Index section', () => {
      expect(content).toContain('## 📋 Stage Index');
    });

    it('should have at least 10 stages in table', () => {
      const stageMatches = content.match(/\| `[a-z-]+` \|/g);
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
    it('should have Safety/CRITICAL RULES section', () => {
      expect(content).toMatch(/Safety Rules|CRITICAL RULES/i);
    });

    it('plannotator --gate should be documented', () => {
      expect(content).toMatch(/plannotator.*--gate|--gate.*plannotator/i);
    });

    it('--gate flag should be mandatory', () => {
      expect(content).toMatch(/mandatory|never skip|obligatory/i);
    });

    it('supervisor should not activate before Execution', () => {
      expect(content).toMatch(/never activate during stages before Execution/i);
    });

    it('should warn about re-submitting Plannotator via supervisor', () => {
      expect(content).toMatch(/re-submit|supervisor.*plannotator/i);
    });
  });

  // ── Tool References ─────────────────────────────────────────

  describe('Tool References', () => {
    it('should have Tools & Packages section', () => {
      expect(content).toMatch(/Tools.*Packages|🔧 Tools/i);
    });

    it('should reference cli-tools directory', () => {
      expect(content).toMatch(/references\/cli-tools/);
    });

    it('subagent should reference subagents.md', () => {
      if (content.includes('subagent')) {
        expect(content).toMatch(/subagents\.md/);
      }
    });

    it('structured question should reference structured-question.md', () => {
      if (content.includes('ask_user_question') || content.includes('structured question')) {
        expect(content).toMatch(/structured-question\.md/);
      }
    });

    it('plannotator should reference plannotator.md', () => {
      if (content.includes('plannotator')) {
        expect(content).toMatch(/plannotator\.md/);
      }
    });
  });

  // ── Auto-chaining ──────────────────────────────────────────

  describe('Auto-chaining', () => {
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

  // ── Directory Structure ────────────────────────────────────

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

  // ── Artifact Documentation ───────────────────────────────

  describe('Artifact Documentation', () => {
    it('should document spec-product.md', () => {
      expect(content).toMatch(/spec-product/);
    });

    it('should document spec-tech.md', () => {
      expect(content).toMatch(/spec-tech/);
    });

    it('should document interfaces.md', () => {
      expect(content).toMatch(/interfaces/);
    });

    it('should document index.json', () => {
      expect(content).toMatch(/index\.json/);
    });
  });

  // ── Gates ────────────────────────────────────────────────

  describe('Gates', () => {
    it('should have at least 1 plannotator gate with --gate', () => {
      const gateMatches = content.match(/plannotator annotate.*--gate/g);
      expect(gateMatches?.length || 0).toBeGreaterThanOrEqual(1);
    });

    it('should document Review Gate for Phase 5', () => {
      expect(content).toMatch(/Review Gate|Phase 5.*Gate/i);
    });

    it('should document Interface Gate for Phase 8', () => {
      expect(content).toMatch(/Interface Gate|Phase 8.*Gate/i);
    });

    it('should document Tech Planning gate', () => {
      expect(content).toMatch(/Tech Planning.*Gate/i);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════
// SECTION B: Per-Skill Implementation Validation
// ═════════════════════════════════════════════════════════════════════

interface SkillDefinition {
  name: string;
  path: string;
  requiresGate: boolean;
  requiresToolRef: boolean;
}

const skills: SkillDefinition[] = [
  { name: 'cali-product-shape-up', path: 'cali-product-shape-up/SKILL.md', requiresGate: false, requiresToolRef: true },
  { name: 'cali-product-tech-planning', path: 'cali-product-tech-planning/SKILL.md', requiresGate: true, requiresToolRef: true },
  { name: 'cali-product-interface-alternatives', path: 'cali-product-interface-alternatives/SKILL.md', requiresGate: true, requiresToolRef: true },
  { name: 'cali-product-plan-critique', path: 'cali-product-plan-critique/SKILL.md', requiresGate: false, requiresToolRef: true },
  { name: 'cali-product-codebase-critique', path: 'cali-product-codebase-critique/SKILL.md', requiresGate: false, requiresToolRef: true },
  { name: 'cali-product-ux-critique', path: 'cali-product-ux-critique/SKILL.md', requiresGate: false, requiresToolRef: true },
  { name: 'cali-product-scope-executor', path: 'cali-product-scope-executor/SKILL.md', requiresGate: false, requiresToolRef: true },
  { name: 'cali-product-execution-critique', path: 'cali-product-execution-critique/SKILL.md', requiresGate: false, requiresToolRef: true },
];

describe('Per-Skill Implementation', () => {
  skills.forEach(skill => {
    describe(skill.name, () => {
      const path = join(PROJECT_ROOT, 'skills', skill.path);

      it('SKILL.md should exist', () => {
        expect(existsSync(path)).toBe(true);
      });

      const content = readFileSync(path, 'utf8');

      it('should have frontmatter with name', () => {
        expect(content).toMatch(new RegExp(`name: ${skill.name}`));
      });

      it('should have description in frontmatter', () => {
        expect(content).toMatch(/description:/);
      });

      if (skill.requiresToolRef) {
        it('should reference cli-tools directory', () => {
          expect(content).toMatch(/references\/cli-tools/);
        });
      }

      // ── Scope-executor specific: iteration loop ──────────────
      if (skill.name === 'cali-product-scope-executor') {
        it('should have auto-iteration loop in Step 3', () => {
          expect(content).toMatch(/iteration loop/i);
          expect(content).toMatch(/MAX_ITERATIONS/);
          expect(content).toMatch(/feedback_log/);
          expect(content).toMatch(/plateau_counter/);
        });

        it('should persist state to iteration-state file', () => {
          expect(content).toMatch(/iteration-state-/);
          expect(content).toMatch(/Persist state to file/);
        });

        it('should handle resume after compaction', () => {
          expect(content).toMatch(/resume|rehydrate/i);
        });

        it('should escalate to human after max_iterations', () => {
          expect(content).toMatch(/ESCALATE/);
        });
      }

      it('should have overview, process, or workflow section', () => {
        expect(content).toMatch(/## (Overview|Process|Workflow|Input)/i);
      });

      it('should document what it produces', () => {
        expect(content).toMatch(/output|produces|saved to|generates/i);
      });

      if (skill.requiresGate) {
        it('should mention plannotator', () => {
          expect(content).toMatch(/plannotator/i);
        });

        it('should reference gate command (plannotator.md or --gate)', () => {
          expect(content).toMatch(/plannotator\.md|--gate|plannotator annotate/i);
        });
      }
    });
  });

  // Tech Planning has its own gate
  describe('Tech Planning gate', () => {
    const techContent = readFileSync(
      join(PROJECT_ROOT, 'skills', 'cali-product-tech-planning', 'SKILL.md'),
      'utf8'
    );
    it('should have plannotator --gate or plannotator.md reference', () => {
      expect(techContent).toMatch(/plannotator.*--gate|--gate|plannotator\.md/i);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════
// SECTION C: Stage Files & References
// ═════════════════════════════════════════════════════════════════════

describe('Iteration Loop Consistency', () => {
  it('scopes-and-sequencing.md should document [MAX_ITERATIONS]', () => {
    const path = join(PROJECT_ROOT, 'skills/cali-product-tech-planning/references/scopes-and-sequencing.md');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/MAX_ITERATIONS/);
  });

  it('execution.md routing table should show iteration loop for features', () => {
    const execContent = readFileSync(
      join(PROJECT_ROOT, 'skills/cali-product-workflow/stages/execution.md'), 'utf8'
    );
    expect(execContent).toMatch(/iteration loop/);
  });

  it('core goals.md files should reference iteration loop for feature type', () => {
    const goalsFiles = [
      join(PROJECT_ROOT, 'skills/cali-product-workflow/references/cli-tools/goals.md'),
      join(PROJECT_ROOT, 'skills/cali-product-scope-executor/references/cli-tools/goals.md'),
      join(PROJECT_ROOT, 'skills/cali-product-tech-planning/references/cli-tools/goals.md'),
      join(PROJECT_ROOT, 'skills/cali-product-testing-ai-code/references/cli-tools/goals.md'),
    ];
    goalsFiles.forEach(f => {
      const content = readFileSync(f, 'utf8');
      expect(content).toMatch(/iteration loop/);
    });
  });

  it('no goals.md file should reference subagent + acceptance for features', () => {
    const skillsDir = join(PROJECT_ROOT, 'skills');
    const entries = readdirSync(skillsDir, { withFileTypes: true });
    entries.forEach(entry => {
      if (!entry.isDirectory()) return;
      const goalsPath = join(skillsDir, entry.name, 'references/cli-tools/goals.md');
      if (!existsSync(goalsPath)) return;
      const content = readFileSync(goalsPath, 'utf8');
      const escaped = content.includes('\\`feature\\`');
      const pattern = escaped ? /^\| \\`feature\\` .*$/gm : /^\| `feature` .*$/gm;
      const featureRows = content.match(pattern) || [];
      featureRows.forEach(row => {
        expect(row).not.toMatch(/subagent \+ acceptance/);
      });
    });
  });
});

describe('Stage Files', () => {
  const stageFiles = ['setup.md', 'context.md', 'gate.md', 'execution.md'];

  stageFiles.forEach(stage => {
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

  describe('Critical stages', () => {
    it('gate.md should mention plannotator', () => {
      expect(readStageFile('gate.md')).toMatch(/plannotator/i);
    });

    it('execution.md should document execution workflow', () => {
      expect(readStageFile('execution.md')).toMatch(/Execution|subagent|acceptance|optimization.*goal/i);
    });
  });
});

describe('cli-tools References', () => {
  const cliToolsDir = join(PROJECT_ROOT, 'skills/cali-product-workflow/references/cli-tools');

  it('cli-tools directory should exist', () => {
    expect(existsSync(cliToolsDir)).toBe(true);
  });

  // Map of SKILL.md reference -> actual cli-tools file
  const toolFileMap: Record<string, string> = {
    'plannotator': 'plannotator.md',
    'subagents': 'subagents.md',
    'goals': 'goals.md',
    'ask': 'structured-question.md',
    'todo': 'todo.md',
    'stage-status': 'stage-status.md',
    'subagent': 'subagents.md',
    'plannotator.md': 'plannotator.md',
    'subagents.md': 'subagents.md',
    'goals.md': 'goals.md',
    'todo.md': 'todo.md',
  };

  Object.entries(toolFileMap).forEach(([ref, actualFile]) => {
    it(`${actualFile} should exist if '${ref}' is referenced in SKILL.md`, () => {
      const skillContent = readMainSkill();
      if (skillContent.includes(ref)) {
        expect(existsSync(join(cliToolsDir, actualFile))).toBe(true);
      }
    });
  });
});

describe('Ask Patterns', () => {
  const askPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/stages/ask-patterns.md');

  it('ask-patterns.md should exist', () => {
    expect(existsSync(askPath)).toBe(true);
  });

  it('should document ask_user_question usage', () => {
    expect(readFileSync(askPath, 'utf8')).toMatch(/ask_user_question/);
  });

  it('should have at least 3 patterns', () => {
    const matches = readFileSync(askPath, 'utf8').match(/Pattern \d+:/g);
    expect(matches?.length || 0).toBeGreaterThanOrEqual(3);
  });
});

describe('References Directory', () => {
  const refsDir = join(PROJECT_ROOT, 'skills/cali-product-workflow/references');

  it('should exist', () => {
    expect(existsSync(refsDir)).toBe(true);
  });

  ['strategic-exploration.md', 'output-expectations.md'].forEach(ref => {
    it(`${ref} should exist`, () => {
      expect(existsSync(join(refsDir, ref))).toBe(true);
    });
  });
});

describe('Execution Phase', () => {
  const execPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/stages/execution.md');

  it('execution.md should exist', () => {
    expect(existsSync(execPath)).toBe(true);
  });

  it('should document scope executor or goals (subagent + acceptance)', () => {
    expect(readFileSync(execPath, 'utf8')).toMatch(/scope.*executor|goal|subagent.*acceptance/i);
  });

  it('should document worktree decision', () => {
    expect(readFileSync(execPath, 'utf8')).toMatch(/worktree|branch/i);
  });
});
