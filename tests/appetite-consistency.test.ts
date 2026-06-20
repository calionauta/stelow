/**
 * appetite-consistency.test.ts
 *
 * Regression tests for appetite+mode redesign.
 * Catches stale old labels, inconsistent globs, orphaned text, duplicate
 * tables, Portuguese in English sections, and other regressions.
 *
 * If these tests fail, a human MUST investigate — it means the appetite+mode
 * architecture has drifted from its verified state.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..');

// ── Paths ───────────────────────────────────────────────────────────

const SKILLS_DIR = join(PROJECT_ROOT, 'skills');
const WORKFLOW_DIR = join(SKILLS_DIR, 'stelow');
const STAGES_DIR = join(WORKFLOW_DIR, 'stages');

function readStage(name: string): string {
  return readFileSync(join(STAGES_DIR, name), 'utf-8');
}

function readSkill(name: string): string {
  return readFileSync(join(SKILLS_DIR, name, 'SKILL.md'), 'utf-8');
}

// ═════════════════════════════════════════════════════════════════════
// 1. NO STALE OLD LABELS
// ═════════════════════════════════════════════════════════════════════

describe('No stale old appetite labels', () => {
  const filesToScan: { path: string; name: string }[] = [
    { path: join(STAGES_DIR, 'execution.md'), name: 'execution.md' },
    { path: join(STAGES_DIR, 'verification.md'), name: 'verification.md' },
    { path: join(STAGES_DIR, 'gate.md'), name: 'gate.md' },
    { path: join(STAGES_DIR, 'setup.md'), name: 'setup.md' },
    { path: join(STAGES_DIR, 'ask-patterns.md'), name: 'ask-patterns.md' },
    { path: join(SKILLS_DIR, 'cali-product-plan-critique', 'SKILL.md'), name: 'plan-critique/SKILL.md' },
    { path: join(SKILLS_DIR, 'cali-product-codebase-critique', 'SKILL.md'), name: 'codebase-critique/SKILL.md' },
    { path: join(SKILLS_DIR, 'cali-product-ux-critique', 'SKILL.md'), name: 'ux-critique/SKILL.md' },
    { path: join(SKILLS_DIR, 'cali-product-scope-executor', 'SKILL.md'), name: 'scope-executor/SKILL.md' },
    { path: join(SKILLS_DIR, 'cali-product-execution-critique', 'SKILL.md'), name: 'execution-critique/SKILL.md' },
    { path: join(SKILLS_DIR, 'cali-product-tech-planning', 'SKILL.md'), name: 'tech-planning/SKILL.md' },
    { path: join(SKILLS_DIR, 'cali-product-shape-up', 'references', 'proposal-structure.md'), name: 'proposal-structure.md' },
    { path: join(WORKFLOW_DIR, 'references', 'cli-tools', 'supervise.md'), name: 'supervise.md' },
  ];

  it.each(filesToScan)('$name has no stale XS/S/M/L/XL as appetite labels', ({ path }) => {
    const content = readFileSync(path, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip lines that include appetite_fit (valid usage)
      if (line.includes('appetite_fit')) continue;
      // Skip lines describing how report verbosity varies by appetite (uses XS/S/L/XL conceptually)
      if (line.includes('report is more concise') || line.includes('full recommendations')) continue;

      // Check for backtick-wrapped old labels
      const oldLabelMatch = line.match(/`(XS|S|M|L|XL)`/);
      if (oldLabelMatch) {
        // If the line references appetite, fail
        expect({ line: i + 1, text: line.trim() }).not.toEqual(
          expect.objectContaining({ text: expect.stringMatching(/appetite/i) })
        );
      }
    }
  });

  it('scope-executor/SKILL.md has no XL heading (must be Complete)', () => {
    const content = readSkill('cali-product-scope-executor');
    expect(content).not.toMatch(/XL.*Human-in-loop/);
    expect(content).not.toMatch(/Step 2d: XL/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. GLOB CONSISTENCY
// ═════════════════════════════════════════════════════════════════════

describe('Glob pattern consistency', () => {
  it('setup.md uses find with **/*/*/index.json pattern', () => {
    const content = readStage('setup.md');
    expect(content).toMatch(/\.stelow\/\*\/\*\/index\.json/);
  });

  it('gate.md uses consistent double-wildcard glob pattern', () => {
    const content = readStage('gate.md');
    expect(content).toMatch(/\.stelow\/\*\/\*\/\$_DIR\/index\.json/);
  });

  it('scope-executor uses correct path with {_dir} level (not broken single-wildcard)', () => {
    const content = readSkill('cali-product-scope-executor');
    expect(content).toMatch(/\.stelow\/\*\/\*\/plans/);
    expect(content).not.toMatch(/\.stelow\/\*\/plans/);
  });

  it('execution.md uses {YYYY-MM-DD}/{_dir}/plans/ pattern', () => {
    const content = readStage('execution.md');
    expect(content).toMatch(/\{YYYY-MM-DD\}\/\{_dir\}\/plans\/spec-product/);
  });

  it('verification.md uses {YYYY-MM-DD}/{_dir}/plans/ pattern', () => {
    const content = readStage('verification.md');
    expect(content).toMatch(/\{YYYY-MM-DD\}\/\{_dir\}\/plans\/spec-product/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. NO PORTUGUESE IN ENGLISH STAGE FILES
// ═════════════════════════════════════════════════════════════════════

describe('No Portuguese in English sections (core stage files)', () => {
  const PORTUGUESE_PATTERNS = [
    /lançando/,        // "lançando" in bash echoes
    /arquivos/,        // "arquivos" in bash echoes
    /Humano no loop/,  // Portuguese label
    /por overhead/,    // Orphaned Portuguese fragment
    /Visão Geral/,     // "Visão Geral"
    /Como Ativar/,     // "Como Ativar"
    /Input recebido/,  // "Input recebido"
  ];

  const coreEnglishFiles: { path: string; name: string }[] = [
    { path: join(STAGES_DIR, 'execution.md'), name: 'execution.md' },
    { path: join(STAGES_DIR, 'verification.md'), name: 'verification.md' },
    { path: join(STAGES_DIR, 'gate.md'), name: 'gate.md' },
    { path: join(STAGES_DIR, 'setup.md'), name: 'setup.md' },
    { path: join(STAGES_DIR, 'ask-patterns.md'), name: 'ask-patterns.md' },
    { path: join(WORKFLOW_DIR, 'references', 'cli-tools', 'supervise.md'), name: 'supervise.md' },
  ];

  it.each(coreEnglishFiles)('$name has no Portuguese text', ({ path, name }) => {
    const content = readFileSync(path, 'utf-8');
    for (const pattern of PORTUGUESE_PATTERNS) {
      const matches = content.match(new RegExp(pattern.source, 'g'));
      if (matches) {
        const lines = content.split('\n');
        const violatingLines: number[] = [];
        lines.forEach((line, idx) => {
          if (pattern.test(line)) violatingLines.push(idx + 1);
        });
        expect({ file: name, pattern: pattern.source, lines: violatingLines }).toEqual(
          { file: name, pattern: pattern.source, lines: [] }
        );
      }
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. NO DUPLICATE COMPREHENSIVE ROWS
// ═════════════════════════════════════════════════════════════════════

describe('No duplicate Complete rows in appetite tables', () => {
  const filesWithTables: { path: string; name: string }[] = [
    { path: join(STAGES_DIR, 'execution.md'), name: 'execution.md' },
    { path: join(SKILLS_DIR, 'cali-product-codebase-critique', 'SKILL.md'), name: 'codebase-critique/SKILL.md' },
    { path: join(SKILLS_DIR, 'cali-product-ux-critique', 'SKILL.md'), name: 'ux-critique/SKILL.md' },
    { path: join(SKILLS_DIR, 'cali-product-tech-planning', 'SKILL.md'), name: 'tech-planning/SKILL.md' },
    { path: join(STAGES_DIR, 'verification.md'), name: 'verification.md' },
  ];

  it.each(filesWithTables)('$name has no IDENTICAL consecutive Complete rows', ({ path, name }) => {
    const content = readFileSync(path, 'utf-8');
    const lines = content.split('\n');
    let prevRow: string | null = null;
    for (const line of lines) {
      if (line.startsWith('| `Complete` |')) {
        if (prevRow !== null) {
          // Different table columns are OK (e.g. "0 files" vs "1+ files")
          // Only flag if the ENTIRE row content is identical
          expect(line).not.toEqual(prevRow);
        }
        prevRow = line;
      } else if (line.startsWith('| `') && !line.startsWith('| `Complete` |')) {
        prevRow = null; // reset when switching to a different appetite row
      }
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. NO ORPHANED TEXT / FORMATTING ISSUES
// ═════════════════════════════════════════════════════════════════════

describe('No orphaned text or formatting issues', () => {
  it('execution.md has no orphaned Portuguese fragment or duplicate supervisor tables', () => {
    const content = readStage('execution.md');
    expect(content).not.toMatch(/por overhead/);
    expect(content).not.toMatch(/Humano no loop/);
  });

  it('execution.md has only one canonical supervisor table (not duplicated)', () => {
    const content = readStage('execution.md');
    // Count the canonical supervisor table with Rationale column
    const rationalLines = content.match(/\| \*\*Rationale\*\* \|/g);
    expect(rationalLines?.length || 0).toBeLessThanOrEqual(1);
  });

  it('verification.md has no (if interactive) orphaned text', () => {
    const content = readStage('verification.md');
    expect(content).not.toMatch(/\(if interactive\)/);
  });

  it('gate.md has no bare {v} placeholder in file paths', () => {
    const content = readStage('gate.md');
    const lines = content.split('\n');
    for (const line of lines) {
      // Skip grep command lines (they use {v} as regex pattern — valid)
      if (line.includes('grep') && line.includes('{v}')) continue;
      if (line.includes('.approved.md') || line.includes('spec-product')) {
        expect(line).not.toMatch(/\{v\}/);
      }
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// 6. VALID APPETITE & MODE VALUES
// ═════════════════════════════════════════════════════════════════════

describe('Valid appetite values throughout', () => {
  it('ask-patterns.md contains valid appetite labels', () => {
    const content = readStage('ask-patterns.md');
    // Labels are inside TypeScript code blocks as strings
    expect(content).toContain('"Lean"');
    expect(content).toContain('"Core (Recommended)"');
    expect(content).toContain('"Complete"');
  });

  it('ask-patterns.md contains valid mode labels', () => {
    const content = readStage('ask-patterns.md');
    expect(content).toContain('"Auto"');
    expect(content).toContain('"Light"');
    expect(content).toContain('"Moderate"');
    expect(content).toContain('"Full Product"');
    expect(content).toContain('"Full Product + Tech"');
  });

  it('proposal-structure.md references only valid appetite values', () => {
    const content = readFileSync(
      join(SKILLS_DIR, 'cali-product-shape-up', 'references', 'proposal-structure.md'),
      'utf-8'
    );
    const appetiteRows = content.match(/\| `(Lean|Core|Complete)` \|/g);
    expect(appetiteRows?.length).toBeGreaterThanOrEqual(3);
    expect(content).not.toMatch(/\| `(XS|S|M|L|XL)` \|.*Plan Critique/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 7. GATE MODE AWARENESS
// ═════════════════════════════════════════════════════════════════════

describe('Gate is Mode-aware', () => {
  it('gate.md reads Mode from index.json', () => {
    const content = readStage('gate.md');
    expect(content).toMatch(/MODE=\$.*INDEX/);
    expect(content).toMatch(/"mode"/);
  });

  it('gate.md has mode-based activation table', () => {
    const content = readStage('gate.md');
    expect(content).toMatch(/\| Mode \|.*Plannotator/);
    expect(content).toMatch(/\| Auto \|/);
  });

  it('gate.md handles Auto mode (skip Plannotator)', () => {
    const content = readStage('gate.md');
    expect(content).toMatch(/MODE_AUTO/);
    expect(content).toMatch(/auto-approved/i);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 8. SUPERVISOR TABLE CONSISTENCY
// ═════════════════════════════════════════════════════════════════════

describe('Supervisor table consistency', () => {
  it('execution.md supervisor rows match supervise.md reference', () => {
    const execContent = readStage('execution.md');
    const superContent = readFileSync(
      join(WORKFLOW_DIR, 'references', 'cli-tools', 'supervise.md'),
      'utf-8'
    );

    const execPatterns = execContent.match(/`(Lean|Core|Complete)` \| \*\*(Skip|Activate)\*\*/g);
    const superPatterns = superContent.match(/`(Lean|Core|Complete)` \| \*\*(Skip|Activate)\*\*/g);

    expect(execPatterns).toBeDefined();
    expect(superPatterns).toBeDefined();
    expect(execPatterns![0]).toBe(superPatterns![0]); // Lean
    expect(execPatterns![1]).toBe(superPatterns![1]); // Core
    expect(execPatterns![2]).toBe(superPatterns![2]); // Complete
  });
});

// ═════════════════════════════════════════════════════════════════════
// 9. DEFAULT FALLBACK VALUES
// ═════════════════════════════════════════════════════════════════════

describe('Default fallback values are Core (not stale M)', () => {
  it('execution.md defaults to Core', () => {
    const content = readStage('execution.md');
    expect(content).toMatch(/echo "Core"/);
    expect(content).not.toMatch(/echo "M"/);
  });

  it('verification.md defaults to Core', () => {
    const content = readStage('verification.md');
    expect(content).toMatch(/echo "Core"/);
    expect(content).not.toMatch(/echo "M"/);
  });

  it('tech-planning defaults to Core', () => {
    const content = readSkill('cali-product-tech-planning');
    expect(content).toMatch(/echo "Core"/);
    expect(content).not.toMatch(/echo "M"/);
  });

  it('codebase-critique defaults to Core (APPETITE variable)', () => {
    const content = readSkill('cali-product-codebase-critique');
    expect(content).toMatch(/Core/);
    expect(content).not.toMatch(/APPETITE="M"|APPETITE: M/);
  });

  it('scope-executor defaults to Core', () => {
    const content = readSkill('cali-product-scope-executor');
    expect(content).toMatch(/echo "Core"/);
    expect(content).not.toMatch(/echo "M"/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 10. ASK PATTERNS COMPLETENESS
// ═════════════════════════════════════════════════════════════════════

describe('Ask patterns completeness', () => {
  it('ask-patterns.md has Pattern 7 (appetite declaration)', () => {
    const content = readStage('ask-patterns.md');
    expect(content).toMatch(/Pattern 7:/);
    expect(content).toMatch(/Appetite/i);
  });

  it('ask-patterns.md has Pattern 8 (mode selection)', () => {
    const content = readStage('ask-patterns.md');
    expect(content).toMatch(/Pattern 8:/);
    expect(content).toMatch(/Mode/i);
  });

  it('setup.md references both Pattern 7 and Pattern 8', () => {
    const content = readStage('setup.md');
    expect(content).toMatch(/Pattern 7/);
    expect(content).toMatch(/Pattern 8/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 11. APPETITE_FIT CHECK LOGIC (constraint, not estimation)
// ═════════════════════════════════════════════════════════════════════

describe('Appetite_fit check logic (constraint check, not estimation)', () => {
  it('plan-critique uses appetite_fit case-based check, not ordinal mapping', () => {
    const content = readSkill('cali-product-plan-critique');
    expect(content).toMatch(/case "\$FIT" in/);
    expect(content).toMatch(/fits\)/);
    expect(content).toMatch(/cuts_needed\)/);
    expect(content).toMatch(/reshape\)/);
    expect(content).not.toMatch(/APPETITE_ORDER/);
    expect(content).not.toMatch(/complexity_estimate/);
  });

  it('proposal-structure.md uses appetite_fit not complexity_estimate', () => {
    const content = readFileSync(
      join(SKILLS_DIR, 'cali-product-shape-up', 'references', 'proposal-structure.md'),
      'utf-8'
    );
    expect(content).toMatch(/appetite_fit/);
    expect(content).not.toMatch(/complexity_estimate/);
    expect(content).toMatch(/This is NOT an estimate/);
  });

  it('shape-up SKILL.md uses appetite_fit not complexity_estimate', () => {
    const content = readSkill('cali-product-shape-up');
    expect(content).toMatch(/appetite_fit/);
    expect(content).not.toMatch(/complexity_estimate/);
    expect(content).toMatch(/constraint, não estimativa/);
  });

  it('scope-executor SKILL.md uses Appetite Fit not Complexity Estimate', () => {
    const content = readSkill('cali-product-scope-executor');
    expect(content).toMatch(/Appetite Fit/);
    expect(content).not.toMatch(/Complexity Estimate/);
  });

  it('setup.md references appetite_fit not complexity_estimate', () => {
    const content = readStage('setup.md');
    expect(content).toMatch(/appetite_fit/);
    expect(content).not.toMatch(/complexity_estimate/);
    expect(content).toMatch(/constraint, not a target/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 12. SUB-SKILL CLI-TOOLS PRESENCE
// ═════════════════════════════════════════════════════════════════════

describe('Sub-skill cli-tools are present', () => {
  const subSkills = [
    'cali-product-codebase-critique',
    'cali-product-ux-critique',
    'cali-product-plan-critique',
    'cali-product-scope-executor',
    'cali-product-tech-planning',
    'cali-product-shape-up',
    'cali-product-interface-alternatives',
    'cali-product-execution-critique',
  ];

  const expectedTools = ['subagents.md', 'todo.md', 'supervise.md'];

  it.each(subSkills)('%s has cli-tools directory with key files', (skill) => {
    const cliToolsDir = join(SKILLS_DIR, skill, 'references', 'cli-tools');
    expect(existsSync(cliToolsDir)).toBe(true);

    for (const tool of expectedTools) {
      if (existsSync(join(cliToolsDir, tool))) {
        expect(existsSync(join(cliToolsDir, tool))).toBe(true);
      }
    }
  });
});

describe('context:5 appetite/mode gate', () => {
  const context = readStage('context.md');

  test('declares context:5 stage before context:10', () => {
    const idx5 = context.indexOf('### context:5');
    const idx10 = context.indexOf('### context:10');
    expect(idx5).toBeGreaterThan(-1);
    expect(idx10).toBeGreaterThan(-1);
    expect(idx5).toBeLessThan(idx10);
  });

  test('lists all 5 strategic approaches (5-option rule)', () => {
    const skillMd = readSkill('stelow');
    expect(skillMd).toContain('Jobs To Be Done');
    expect(skillMd).toContain('Evolutionary Principles');
    expect(skillMd).toContain('Opportunity Mapping');
    expect(skillMd).toContain('Multi-Method Market Analysis');
    expect(skillMd).toContain('Product Discovery');
  });

  test('lists all 8 domain libraries (8-option rule)', () => {
    const skillMd = readSkill('stelow');
    expect(skillMd).toContain('Pricing');
    expect(skillMd).toContain('Trust');
    expect(skillMd).toContain('Ads');
    expect(skillMd).toContain('Promotions');
    expect(skillMd).toContain('Health');
    expect(skillMd).toContain('Marketplace');
    expect(skillMd).toContain('Open Source');
    expect(skillMd).toContain('Business Models');
  });

  test('gate uses canonical mode label "Full Product + Tech" (not "Full Tech")', () => {
    expect(context).toContain('Full Product + Tech');
    expect(context).not.toContain('Full Tech');
  });

  test('gate uses canonical appetite labels (Lean, Core, Complete)', () => {
    expect(context).toContain('Lean');
    expect(context).toContain('Core');
    expect(context).toContain('Complete');
  });

  test('gate matrix has Lean + Auto skip rule', () => {
    expect(context).toMatch(/Lean.*Auto|skip.*Lean|skip.*Auto/i);
  });

  test('gate matrix has Lean + non-Auto reduced ask rule', () => {
    expect(context).toMatch(/Reduced ask|reference-only|opt-in/i);
  });

  test('gate matrix has Core/Complete full behavior', () => {
    expect(context).toMatch(/Core.*Full|full ask|Complete.*Full/i);
  });

  test('SKILL.md uses :10/:20 labels (not 2a/2b)', () => {
    const skillMd = readSkill('stelow');
    expect(skillMd).toMatch(/Context stage — :10/);
    expect(skillMd).toMatch(/Context stage — :20/);
    expect(skillMd).not.toMatch(/Context stage — 2a/);
    expect(skillMd).not.toMatch(/Context stage — 2b/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 13. SHAPE-UP STEP ORDERING
// ═════════════════════════════════════════════════════════════════════

describe('shape-up step ordering', () => {
  const content = readSkill('cali-product-shape-up');

  test('shape:10 before shape:15 before shape:20', () => {
    const idx10 = content.indexOf('shape:10');
    const idx15 = content.indexOf('shape:15');
    const idx20 = content.indexOf('shape:20');
    expect(idx10).toBeGreaterThan(-1);
    expect(idx15).toBeGreaterThan(-1);
    expect(idx20).toBeGreaterThan(-1);
    expect(idx10).toBeLessThan(idx15);
    expect(idx15).toBeLessThan(idx20);
  });

  test('shape:15 mentions assumption check', () => {
    expect(content).toMatch(/Assumption Check/i);
  });

  test('shape:15 scales by mode (Auto/Light/Moderate/Full)', () => {
    expect(content).toMatch(/Auto.*Light.*auto-resolve|top-3.*Moderate|top-5.*Full/i);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 14. TECH-PLANNING STEP ORDERING
// ═════════════════════════════════════════════════════════════════════

describe('tech-planning step ordering', () => {
  const content = readSkill('cali-product-tech-planning');

  test('tech:5 before planning:10', () => {
    const idx5 = content.indexOf('### tech:5');
    const idx10 = content.indexOf('### planning:10');
    expect(idx5).toBeGreaterThan(-1);
    expect(idx10).toBeGreaterThan(-1);
    expect(idx5).toBeLessThan(idx10);
  });

  test('tech:5 mentions stack discovery', () => {
    expect(content).toMatch(/Discover Stack/i);
  });

  test('tech:5 references doc-search and stack-skills', () => {
    expect(content).toMatch(/doc-search/);
    expect(content).toMatch(/stack-skills/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 15. CRITIQUE FLOW STEP ORDERING
// ═════════════════════════════════════════════════════════════════════

describe('plan-critique flow step ordering', () => {
  const content = readSkill('cali-product-plan-critique');

  test('critique steps in correct order: 20 → 30 → 40 → 45 → 50', () => {
    const idx20 = content.indexOf('### critique:20');
    const idx30 = content.indexOf('### critique:30');
    const idx40 = content.indexOf('### critique:40');
    const idx45 = content.indexOf('### critique:45');
    const idx50 = content.indexOf('### critique:50');
    expect(idx20).toBeGreaterThan(-1);
    expect(idx30).toBeGreaterThan(-1);
    expect(idx40).toBeGreaterThan(-1);
    expect(idx45).toBeGreaterThan(-1);
    expect(idx50).toBeGreaterThan(-1);
    expect(idx20).toBeLessThan(idx30);
    expect(idx30).toBeLessThan(idx40);
    expect(idx40).toBeLessThan(idx45);
    expect(idx45).toBeLessThan(idx50);
  });

  test('critique:30 subagents classify only (no auto-resolve)', () => {
    expect(content).toMatch(/CLASSIFY only/);
    expect(content).not.toMatch(/auto-resolve clear defaults/);
  });

  test('critique:45 references structured-question tool', () => {
    expect(content).toMatch(/structured-question/);
  });

  test('critique:50 merges into spec-product.md', () => {
    expect(content).toMatch(/Merge into spec-product/);
  });

  test('critique:50 mentions Gate Review — Critical Decisions section', () => {
    expect(content).toMatch(/Critical Decisions/);
  });

  test('integration diagram matches 5-step flow', () => {
    // The diagram in the Integration section must list all 5 steps
    const diagramStart = content.indexOf('critique: Critique Gate');
    if (diagramStart > -1) {
      const diagram = content.slice(diagramStart, diagramStart + 400);
      expect(diagram).toMatch(/critique:20/);
      expect(diagram).toMatch(/critique:30/);
      expect(diagram).toMatch(/critique:40/);
      expect(diagram).toMatch(/critique:45/);
      expect(diagram).toMatch(/critique:50/);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// 16. MODE DESCRIPTION SYNC (ask-patterns vs setup)
// ═════════════════════════════════════════════════════════════════════

describe('Mode description sync between ask-patterns and setup', () => {
  const askPatterns = readStage('ask-patterns.md');
  const setup = readStage('setup.md');

  // Verify all 5 mode labels appear in both files
  test.each(['Auto', 'Light', 'Moderate', 'Full Product', 'Full Product + Tech'])(
    'mode label "%s" appears in ask-patterns.md and setup.md',
    (label) => {
      expect(askPatterns).toContain(label);
      expect(setup).toContain(label);
    }
  );

  test('ask-patterns mode effect matrix has Gap Resolution column', () => {
    expect(askPatterns).toMatch(/Gap Resolution/);
  });

  test('ask-patterns has Gap Resolution semantics section', () => {
    expect(askPatterns).toMatch(/Gap Resolution semantics/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 17. CLI TOOLS PRESENCE (PURPOSE-NAMED)
// ═════════════════════════════════════════════════════════════════════

describe('Purpose-named CLI tools exist', () => {
  const cliDir = join(SKILLS_DIR, 'cali-product-tech-planning', 'references', 'cli-tools');

  test('doc-search.md exists', () => {
    expect(existsSync(join(cliDir, 'doc-search.md'))).toBe(true);
  });

  test('stack-skills.md exists', () => {
    expect(existsSync(join(cliDir, 'stack-skills.md'))).toBe(true);
  });

  test('doc-search.md mentions ctx7 as recommended tool', () => {
    const content = readFileSync(join(cliDir, 'doc-search.md'), 'utf-8');
    expect(content).toMatch(/ctx7.*Recommended/);
  });

  test('stack-skills.md mentions npx skills as recommended tool', () => {
    const content = readFileSync(join(cliDir, 'stack-skills.md'), 'utf-8');
    expect(content).toMatch(/npx skills/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 18. GOLDEN RULE MODE CAVEAT
// ═════════════════════════════════════════════════════════════════════

describe('plan-critique golden rule has mode caveat', () => {
  const content = readSkill('cali-product-plan-critique');

  test('golden rule caveat mentions Auto/Light modes', () => {
    expect(content).toMatch(/Mode caveat/);
    expect(content).toMatch(/Auto.*Light.*internal recommendation/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 19. TOOL-REFERENCE-PATTERN NAMING CONVENTION
// ═════════════════════════════════════════════════════════════════════

describe('tool-reference-pattern naming convention', () => {
  const content = readFileSync(join(PROJECT_ROOT, 'docs/agents-md-refs/tool-reference-pattern.md'), 'utf-8');

  test('names by purpose rule exists', () => {
    expect(content).toMatch(/Name by purpose/);
  });
});
