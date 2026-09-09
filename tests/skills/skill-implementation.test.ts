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
 *
 * Self-sufficiency strategy (SW-005):
 *   Shared tool references live ONLY in the orchestrator skill
 *   (`skills/stelow-workflow-orchestrator/references/cli-tools/`).
 *   Sub-skills link them via sibling-relative paths — no copies, no sync.
 *   Content-equality assertions target the canonical orchestrator
 *   source. No mocks of `fs` or `execSync`. Real
 *   `readFileSync` for content reads.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');

// ── cli-tools helpers ─────────────────────────────────────────────

// ── Path Helpers ───────────────────────────────────────────────────

function readMainSkill(): string {
  return readFileSync(join(PROJECT_ROOT, 'skills/stelow-workflow-orchestrator/SKILL.md'), 'utf8');
}

function readSkillByPath(name: string): string {
  return readFileSync(join(PROJECT_ROOT, 'skills', name, 'SKILL.md'), 'utf8');
}

function readStageFile(name: string): string {
  return readFileSync(join(PROJECT_ROOT, 'skills/stelow-workflow-orchestrator/stages', name), 'utf8');
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
      expect(content).toMatch(/visual_review.*--gate|--gate.*visual_review/i);
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

    it('structured question should reference ask.md', () => {
      if (content.includes('ask_user_question') || content.includes('ask tool')) {
        expect(content).toMatch(/ask\.md/);
      }
    });

    it('gate doc should be referenced as visual_review.md', () => {
      if (content.includes('visual_review')) {
        expect(content).toMatch(/visual_review\.md/);
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
      expect(content).toContain('.stelow');
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

    it('should document stelow.json (canonical source as of v0.50.0+)', () => {
      // v0.53.0: index.json removed. SKILL.md should reference stelow.json.
      expect(content).toMatch(/stelow\.json/);
    });
  });

  // ── Gates ────────────────────────────────────────────────

  describe('Gates', () => {
    it('should have at least 1 visual_review gate with --gate', () => {
      const gateMatches = content.match(/visual_review annotate.*--gate/g);
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
  { name: 'stelow-workflow-shape-up', path: 'stelow-workflow-shape-up/SKILL.md', requiresGate: false, requiresToolRef: true },
  { name: 'stelow-workflow-tech-planning', path: 'stelow-workflow-tech-planning/SKILL.md', requiresGate: true, requiresToolRef: true },
  { name: 'stelow-workflow-interface-alternatives', path: 'stelow-workflow-interface-alternatives/SKILL.md', requiresGate: true, requiresToolRef: true },
  { name: 'stelow-workflow-plan-critique', path: 'stelow-workflow-plan-critique/SKILL.md', requiresGate: false, requiresToolRef: true },
  { name: 'stelow-workflow-codebase-critique', path: 'stelow-workflow-codebase-critique/SKILL.md', requiresGate: false, requiresToolRef: true },
  { name: 'stelow-workflow-ux-critique', path: 'stelow-workflow-ux-critique/SKILL.md', requiresGate: false, requiresToolRef: true },
  { name: 'stelow-workflow-scope-executor', path: 'stelow-workflow-scope-executor/SKILL.md', requiresGate: false, requiresToolRef: true },
  { name: 'stelow-workflow-execution-critique', path: 'stelow-workflow-execution-critique/SKILL.md', requiresGate: false, requiresToolRef: true },
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

      // ── Scope-executor specific: acceptance-based delegation ──
      if (skill.name === 'stelow-workflow-scope-executor') {
        it('should use acceptance-based delegation in Step 3', () => {
          expect(content).toMatch(/acceptance/i);
          expect(content).toMatch(/criteria/i);
          expect(content).toMatch(/verify/i);
          expect(content).toMatch(/MAX_ITERATIONS|selfCorrectionBudget|maxFinalizationTurns/i);
        });

        it('should support parent-controlled loop fallback', () => {
          expect(content).toMatch(/feedback_log|feedback/i);
          expect(content).toMatch(/plateau|different approach/i);
        });

        it('should persist state to iteration-state file', () => {
          expect(content).toMatch(/iteration-state-/);
          expect(content).toMatch(/Persist state/);
        });

        it('should handle resume after compaction', () => {
          expect(content).toMatch(/resume|rehydrate/i);
        });

        it('should escalate to human after max iterations', () => {
          expect(content).toMatch(/ESCALATE/i);
        });
      }

      it('should have overview, process, or workflow section', () => {
        expect(content).toMatch(/## (Overview|Process|Workflow|Input)/i);
      });

      it('should document what it produces', () => {
        expect(content).toMatch(/output|produces|saved to|generates/i);
      });

      if (skill.requiresGate) {
        it('should mention visual_review', () => {
          expect(content).toMatch(/visual_review/i);
        });

        it('should reference gate command (visual_review.md or --gate)', () => {
          expect(content).toMatch(/visual_review\.md|--gate|visual_review annotate/i);
        });
      }
    });
  });

  // Tech Planning has its own gate
  describe('Tech Planning gate', () => {
    const techContent = readFileSync(
      join(PROJECT_ROOT, 'skills', 'stelow-workflow-tech-planning', 'SKILL.md'),
      'utf8'
    );
    it('should have visual_review --gate reference', () => {
      expect(techContent).toMatch(/visual_review.*--gate|--gate|visual_review\.md/i);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════
// SECTION C: Stage Files & References
// ═════════════════════════════════════════════════════════════════════

describe('Iteration Loop Consistency', () => {
  it('scopes-and-sequencing.md should document [MAX_ITERATIONS]', () => {
    const path = join(PROJECT_ROOT, 'skills/stelow-workflow-tech-planning/references/scopes-and-sequencing.md');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/MAX_ITERATIONS/);
  });

  it('execution.md routing table should reference acceptance or iteration for features', () => {
    const execContent = readFileSync(
      join(PROJECT_ROOT, 'skills/stelow-workflow-orchestrator/stages/execution.md'), 'utf8'
    );
    expect(execContent).toMatch(/iteration|acceptance/i);
  });

  it('canonical goals.md sources reference acceptance contract pattern', () => {
    // Single source: the orchestrator copy. Sub-skills link it via
    // sibling-relative paths (no copies since the sync removal).
    const canonical = join(PROJECT_ROOT, 'skills/stelow-workflow-orchestrator/references/cli-tools/goals.md');
    expect(existsSync(canonical)).toBe(true);
    expect(readFileSync(canonical, 'utf8')).toMatch(/acceptance|iteration loop/i);
  });

  it('scope-executor goals.md documents acceptance contract fields', () => {
    // Assert the contract on the canonical source only (single source;
    // scope-executor links it, carries no copy).
    const canonical = join(PROJECT_ROOT, 'skills/stelow-workflow-orchestrator/references/cli-tools/goals.md');
    expect(existsSync(canonical)).toBe(true);
    const canonicalContent = readFileSync(canonical, 'utf8');
    expect(canonicalContent).toMatch(/criteria/i);
    expect(canonicalContent).toMatch(/verify/i);
    expect(canonicalContent).toMatch(/stopRules/i);
  });

});

describe('Stage Files', () => {
  const stageFiles = ['setup.md', 'context.md', 'gate.md', 'execution.md'];

  stageFiles.forEach(stage => {
    describe(stage, () => {
      const path = join(PROJECT_ROOT, 'skills/stelow-workflow-orchestrator/stages', stage);

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
    it('gate.md should mention visual_review', () => {
      expect(readStageFile('gate.md')).toMatch(/visual_review/i);
    });

    it('execution.md should document execution workflow', () => {
      expect(readStageFile('execution.md')).toMatch(/Execution|subagent|acceptance|optimization.*goal/i);
    });
  });
});

describe('cli-tools References', () => {
  const cliToolsDir = join(PROJECT_ROOT, 'skills/stelow-workflow-orchestrator/references/cli-tools');

  it('cli-tools directory should exist', () => {
    expect(existsSync(cliToolsDir)).toBe(true);
  });

  // Map of SKILL.md reference -> actual cli-tools file
  const toolFileMap: Record<string, string> = {
    'visual_review': 'visual_review.md',
    'subagents': 'subagents.md',
    'goals': 'goals.md',
    'ask': 'ask.md',
    'todo': 'todo.md',
    'stage-status': 'stage-status.md',
    'subagent': 'subagents.md',
    'visual_review.md': 'visual_review.md',
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
  const askPath = join(PROJECT_ROOT, 'skills/stelow-workflow-orchestrator/stages/ask-patterns.md');

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
  const refsDir = join(PROJECT_ROOT, 'skills/stelow-workflow-orchestrator/references');

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
  const execPath = join(PROJECT_ROOT, 'skills/stelow-workflow-orchestrator/stages/execution.md');

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

describe('Ask Single Source', () => {
  const workflowSkills = readdirSync(join(PROJECT_ROOT, 'skills'))
    .filter((name: string) => name.startsWith('stelow-workflow-'))
    .map((name: string) => join(PROJECT_ROOT, 'skills', name, 'SKILL.md'))
    .filter((p: string) => existsSync(p));
  const readAll = () => workflowSkills.map((p: string) => ({ path: p, text: readFileSync(p, 'utf8') }));

  it('no skill asks in prose (structured tool only)', () => {
    const banned = [/waiting for your choice/i, /let me know which (one|proposal|option)/i];
    const hits: string[] = [];
    for (const { path, text } of readAll()) {
      // The orchestrator rule names the banned phrase to forbid it — scrub
      // that self-reference so the lint flags real prose asks, not the rule.
      const scrubbed = text.replace(/Never write prose like "waiting for your choice"\.?/g, "");
      for (const re of banned) if (re.test(scrubbed)) hits.push(`${path} matches ${re}`);
    }
    expect(hits).toEqual([]);
  });

  it('every Pattern N mention resolves to stages/ask-patterns.md', () => {
    const hits: string[] = [];
    for (const { path, text } of readAll()) {
      if (!/Pattern \d+/.test(text)) continue;
      if (!/stages\/ask-patterns\.md/.test(text)) hits.push(path);
    }
    expect(hits).toEqual([]);
  });

  it('schema documents preview and artifact with one shared meaning', () => {
    const schema = readFileSync(join(PROJECT_ROOT, 'skills/stelow-workflow-orchestrator/stages/ask-patterns.md'), 'utf8');
    expect(schema).toMatch(/preview\?/);
    expect(schema).toMatch(/artifact\?/);
  });
});
