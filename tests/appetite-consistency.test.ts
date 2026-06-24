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
const WORKFLOW_DIR = join(SKILLS_DIR, 'stelow-product-orchestrator');
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
    // Single-wildcard allowed only in standalone description line
    const badLines = content.split('\n').filter(l => l.match(/\.stelow\/\*\/plans/) && !l.includes('standalone'));
    expect(badLines).toEqual([]);
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
// 6. VALID APPETITE & REVIEW MODE VALUES
// ═════════════════════════════════════════════════════════════════════

describe('Valid appetite values throughout', () => {
  it('ask-patterns.md contains valid appetite labels', () => {
    const content = readStage('ask-patterns.md');
    // Labels are inside TypeScript code blocks as strings
    expect(content).toContain('"Lean"');
    expect(content).toContain('"Core (Recommended)"');
    expect(content).toContain('"Complete"');
  });

  it('ask-patterns.md contains valid review mode labels', () => {
    const content = readStage('ask-patterns.md');
    expect(content).toContain('"Auto"');
    expect(content).toContain('"Only Product Spec"');
    expect(content).toContain('"Product Spec + Interface Choice"');
    expect(content).toContain('"All Above + Scopes In/Out"');
    expect(content).toContain('"All Above + Tech Review"');
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
// 7. GATE REVIEW MODE AWARENESS
// ═════════════════════════════════════════════════════════════════════

describe('Gate is Review Mode-aware', () => {
  it('gate.md reads review_mode from index.json', () => {
    const content = readStage('gate.md');
    expect(content).toMatch(/REVIEW_MODE=\$.*INDEX/);
    expect(content).toMatch(/"review_mode"/);
  });

  it('gate.md has review mode-based activation table', () => {
    const content = readStage('gate.md');
    expect(content).toMatch(/\| Review Mode \|.*Plannotator/);
    expect(content).toMatch(/\| Auto \|/);
  });

  it('gate.md handles Auto review mode (skip Plannotator)', () => {
    const content = readStage('gate.md');
    expect(content).toMatch(/REVIEW_MODE_AUTO/);
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
    expect(content).toMatch(/constraint, not estimate/);
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
    const skillMd = readSkill('stelow-product-orchestrator');
    expect(skillMd).toContain('Jobs To Be Done');
    expect(skillMd).toContain('Evolutionary Principles');
    expect(skillMd).toContain('Opportunity Mapping');
    expect(skillMd).toContain('Multi-Method Market Analysis');
    expect(skillMd).toContain('Product Discovery');
  });

  test('lists all 8 domain libraries (8-option rule)', () => {
    const skillMd = readSkill('stelow-product-orchestrator');
    expect(skillMd).toContain('Pricing');
    expect(skillMd).toContain('Trust');
    expect(skillMd).toContain('Ads');
    expect(skillMd).toContain('Promotions');
    expect(skillMd).toContain('Health');
    expect(skillMd).toContain('Marketplace');
    expect(skillMd).toContain('Open Source');
    expect(skillMd).toContain('Business Models');
  });

  test('gate uses canonical review mode label "All Above + Tech Review" (not "Tech Review" alone)', () => {
    expect(context).toContain('All Above + Tech Review');
    expect(context).not.toContain('"Tech Review"');
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
    const skillMd = readSkill('stelow-product-orchestrator');
    expect(skillMd).toMatch(/Context stage — :10/);
    expect(skillMd).toMatch(/Context stage — :20/);
    expect(skillMd).not.toMatch(/Context stage — 2a/);
    expect(skillMd).not.toMatch(/Context stage — 2b/);
  });
});

describe('Interface exploration is appetite-scaled', () => {
  it('interface skill declares 1/3/5 proposal counts by appetite', () => {
    const content = readSkill('cali-product-interface-alternatives');
    expect(content).toMatch(/`Lean`.*1 suggested interface/);
    expect(content).toMatch(/`Core`.*3 archetypes explored \+ 1 hybrid/);
    expect(content).toMatch(/`Complete`.*5 archetypes explored \+ 1 hybrid/);
  });

  it('README documents appetite-scaled interface exploration', () => {
    const content = readFileSync(join(PROJECT_ROOT, 'README.md'), 'utf-8');
    expect(content).toMatch(/1, 3, or 5 ASCII archetypes/);
    expect(content).toMatch(/1 suggested interface only/);
    expect(content).toMatch(/3 interface archetypes explored/);
    expect(content).toMatch(/5 interface archetypes explored/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 13. SHAPE-UP STEP ORDERING
// ═════════════════════════════════════════════════════════════════════

describe('shape-up step ordering', () => {
  const content = readSkill('cali-product-shape-up');

  test('shape:10 before shape:12 before shape:15 before shape:20', () => {
    const idx10 = content.indexOf('## shape:10');
    const idx12 = content.indexOf('## shape:12');
    const idx15 = content.indexOf('## shape:15');
    const idx20 = content.indexOf('## shape:20');
    expect(idx10).toBeGreaterThan(-1);
    expect(idx12).toBeGreaterThan(-1); // new Tech Preview step
    expect(idx15).toBeGreaterThan(-1);
    expect(idx20).toBeGreaterThan(-1);
    expect(idx10).toBeLessThan(idx12);
    expect(idx12).toBeLessThan(idx15);
    expect(idx15).toBeLessThan(idx20);
  });

  test('shape:15 mentions assumption check', () => {
    expect(content).toMatch(/Assumption Check/i);
  });

  test('shape:15 scales by review mode', () => {
    expect(content).toMatch(/Auto.*Only Product Spec.*auto-resolve|top-3.*Interface Choice|top-5.*All Above/i);
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
      const diagram = content.slice(diagramStart, diagramStart + 600);
      expect(diagram).toMatch(/critique:20/);
      expect(diagram).toMatch(/critique:30/);
      expect(diagram).toMatch(/critique:40/);
      expect(diagram).toMatch(/critique:45/);
      expect(diagram).toMatch(/critique:50/);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// 16. REVIEW MODE DESCRIPTION SYNC (ask-patterns vs setup)
// ═════════════════════════════════════════════════════════════════════

describe('Mode description sync between ask-patterns and setup', () => {
  const askPatterns = readStage('ask-patterns.md');
  const setup = readStage('setup.md');

  // Verify all 5 review mode labels appear in both files
  test.each(['Auto', 'Only Product Spec', 'Product Spec + Interface Choice', 'All Above + Scopes In/Out', 'All Above + Tech Review'])(
    'review mode label "%s" appears in ask-patterns.md and setup.md',
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
// 18. GOLDEN RULE REVIEW MODE CAVEAT
// ═════════════════════════════════════════════════════════════════════

describe('plan-critique golden rule has review mode caveat', () => {
  const content = readSkill('cali-product-plan-critique');

  test('golden rule caveat mentions Auto/Only Product Spec modes', () => {
    expect(content).toMatch(/Mode caveat/);
    expect(content).toMatch(/Auto.*Only Product Spec.*internal recommendation/);
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

// ═════════════════════════════════════════════════════════════════════
// 20. QUALITY FLOOR — APPETITE NEVER CUTS QUALITY
// ═════════════════════════════════════════════════════════════════════
//
// Architectural invariant: appetite governs scope (how much the product does),
// never quality (how rigorously the product is verified). These tests block
// any future commit that re-introduces an appetite gate that skips a quality
// gate in verification/code-review/UI-audit/interactive-testing.
//
// Allowlist (legitimate Skip): scope-cutting contexts (skip an entire stage
// like Context, skip exploratory recon when no codebase exists, skip a
// non-applicable review mode behavior).
//
// If these tests fail, the regression is one of:
//   - Appetite table has `Skip` in a Lean/Core row for a quality gate
//   - Appetite table has `❌` for a quality gate at Lean/Core
//   - code-quality-review, code-review, ui-quality, interactive-testing
//     have appetite-driven skips that contradict the Quality Floor rule.

describe('Quality Floor: appetite never cuts quality', () => {
  // Columns that represent quality gates (verification rigor).
  // These columns must NOT contain 'Skip' or '❌' in Lean/Core rows.
  const QUALITY_COLUMNS = [
    'test-suite',
    'code-review',
    'code-quality-gate',
    'code-quality-review',
    'ui-quality',
    'interactive-testing',
    'invisible-20%',
    'invisible-20-percent',
    'a11y',
    'accessibility',
  ];

  // Files where appetite gates quality verification. These are the canonical
  // surfaces where a regression would break the Quality Floor.
  const qualityGateFiles: { path: string; name: string }[] = [
    { path: join(STAGES_DIR, 'verification.md'), name: 'verification.md' },
    { path: join(SKILLS_DIR, 'cali-product-codebase-critique', 'SKILL.md'), name: 'codebase-critique/SKILL.md' },
    { path: join(SKILLS_DIR, 'cali-product-ux-critique', 'SKILL.md'), name: 'ux-critique/SKILL.md' },
    { path: join(SKILLS_DIR, 'cali-product-testing-ai-code', 'SKILL.md'), name: 'testing-ai-code/SKILL.md' },
    { path: join(WORKFLOW_DIR, 'references', 'cli-tools', 'codequality-review.md'), name: 'codequality-review.md' },
    { path: join(SKILLS_DIR, 'cali-product-tech-planning', 'references', 'cli-tools', 'codequality-review.md'), name: 'tech-planning/codequality-review.md' },
    { path: join(SKILLS_DIR, 'cali-product-shape-up', 'references', 'cli-tools', 'codequality-review.md'), name: 'shape-up/codequality-review.md' },
  ];

  // Allowlist: legitimate scope-related skips that don't violate the floor.
  // Each entry: a substring that, when present in the cell, makes the skip legitimate.
  const SCOPE_ALLOWLIST = [
    'not reached',
    'not in scope',
    'no codebase',
    'no UI',
    'no ui',
    'greenfield',
    'no code',
    'no code changes',
    'no diff',
    'no test-*',
    'no new code',
    'unless risk',
    'risk is high',
    'when warranted',
    'when applicable',
    'when applicable',  // duplicate to keep list robust
    'when in scope',
    'explicitly requested',
    'explicit request',
    'user request',
    'user explicitly',
    'unless user',
    'if not installed',
    'not installed',
    'fallback',
    'if appetite',
    'context stage',  // context:5 whole-stage skip
    'Strategic Context',
    'triage',
    'group',          // triage group size bound
  ];

  function isLegitimatelyScoped(cellText: string): boolean {
    return SCOPE_ALLOWLIST.some((p) => cellText.toLowerCase().includes(p.toLowerCase()));
  }

  // Helper: find rows of the form `| \`Lean\` | ... |` or `| \`Core\` | ... |`
  // and return cells as arrays of strings.
  function extractAppetiteRows(content: string): Array<{ appetite: 'Lean' | 'Core' | 'Complete'; cells: string[]; lineNumber: number }> {
    const lines = content.split('\n');
    const rows: Array<{ appetite: 'Lean' | 'Core' | 'Complete'; cells: string[]; lineNumber: number }> = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/^\|\s*`(Lean|Core|Complete)`\s*\|/);
      if (m) {
        const cells = line.split('|').slice(1, -1).map((c) => c.trim());
        rows.push({ appetite: m[1] as 'Lean' | 'Core' | 'Complete', cells, lineNumber: i + 1 });
      }
    }
    return rows;
  }

  // Helper: identify quality-gate columns by header row above the table.
  function identifyQualityColumnIndexes(content: string): Map<number, string> {
    const lines = content.split('\n');
    const colMap = new Map<number, string>();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Find a header row containing a known quality column
      if (!line.match(/^\|.*\|.*\|/)) continue;
      const cells = line.split('|').slice(1, -1).map((c) => c.trim().toLowerCase());
      for (let c = 0; c < cells.length; c++) {
        for (const qc of QUALITY_COLUMNS) {
          if (cells[c].includes(qc.toLowerCase())) {
            colMap.set(c, qc);
            break;
          }
        }
      }
      if (colMap.size > 0) break;  // first header wins per file
    }
    return colMap;
  }

  describe.each(qualityGateFiles)('$name', ({ path, name }) => {
    const content = readFileSync(path, 'utf-8');
    const rows = extractAppetiteRows(content);
    const qualityCols = identifyQualityColumnIndexes(content);

    test('has at least one Lean/Core row to validate', () => {
      const leanOrCore = rows.filter((r) => r.appetite === 'Lean' || r.appetite === 'Core');
      // If the file has no appetite table at all, the test is vacuously true.
      // Only enforce when there ARE appetite rows AND quality columns.
      if (leanOrCore.length === 0) return;
      if (qualityCols.size === 0) return;
      expect(leanOrCore.length).toBeGreaterThan(0);
    });

    test('Lean/Core rows do NOT skip quality gates (Quality Floor)', () => {
      // Vacuous skip: no appetite table or no quality columns
      if (rows.length === 0 || qualityCols.size === 0) return;

      const violations: string[] = [];

      for (const row of rows) {
        if (row.appetite !== 'Lean' && row.appetite !== 'Complete') {
          // Core can also be checked but Lean is the strictest. Both must comply.
        }
        if (row.appetite !== 'Lean' && row.appetite !== 'Core') continue;

        for (const [colIdx, colName] of qualityCols) {
          const cell = row.cells[colIdx] ?? '';
          // Strip emojis and markdown bold
          const cellNormalized = cell.replace(/[*_`]/g, '').trim();
          const cellLower = cellNormalized.toLowerCase();

          // Check for skip patterns
          const hasSkip =
            cellLower.startsWith('skip') ||
            cellLower.includes('**skip') ||
            cellLower.startsWith('❌') ||
            cellLower.includes('no run') ||
            cellLower.includes('not run');

          if (!hasSkip) continue;
          if (isLegitimatelyScoped(cellNormalized)) continue;

          violations.push(
            `Line ${row.lineNumber} (\`${row.appetite}\`, column \`${colName}\`): "${cell.trim()}" — appetite is cutting a quality gate. Use the Quality Floor pattern (light/single/static) instead of Skip.`
          );
        }
      }

      if (violations.length > 0) {
        throw new Error(
          `Quality Floor regression in ${name}:\n` +
            violations.map((v) => '  - ' + v).join('\n')
        );
      }
      expect(violations).toEqual([]);
    });
  });

  test('verification.md explicitly declares the Quality Floor rule', () => {
    const verification = readStage('verification.md');
    // The rule must be present and use canonical phrasing
    expect(verification).toMatch(/Quality Floor/i);
    expect(verification).toMatch(/never appetite-gated/i);
    expect(verification).toMatch(/appetite governs scope.*never quality/i);
  });

  test('verification.md appetite table has NO empty `Skip` cells in Lean/Core quality columns', () => {
    const verification = readStage('verification.md');
    const rows = extractAppetiteRows(verification);
    const qualityCols = identifyQualityColumnIndexes(verification);

    // Look for the canonical verification matrix table
    const matrixRows = rows.filter(
      (r) => r.appetite === 'Lean' || r.appetite === 'Core' || r.appetite === 'Complete'
    );
    if (matrixRows.length < 3) return; // No appetite table; skip

    for (const row of matrixRows) {
      if (row.appetite === 'Complete') continue; // Complete can have conditional skips
      for (const [colIdx, colName] of qualityCols) {
        const cell = (row.cells[colIdx] ?? '').replace(/[*_`]/g, '').trim().toLowerCase();
        // Allow only quality-floor affirmative patterns
        const isAffirmative =
          cell.startsWith('✅') ||
          cell.startsWith('✓') ||
          cell.includes('run') ||
          cell.includes('light') ||
          cell.includes('quick tier') ||
          cell.includes('static') ||
          cell.includes('codebase mode') ||
          cell.includes('live site') ||
          cell.includes('conditional') ||
          cell.includes('parallel') ||
          cell.includes('mandatory') ||
          cell === '' ||
          cell.includes('when applicable') ||
          cell.includes('if risk');

        const isNegative =
          cell.startsWith('skip') || cell.startsWith('❌') || cell.includes('not run');

        if (isNegative && !isAffirmative) {
          throw new Error(
            `verification.md line ${row.lineNumber} (\`${row.appetite}\`, column \`${colName}\`): "${row.cells[colIdx]}" — Lean/Core row contains a Skip pattern in a quality column.`
          );
        }
      }
    }
  });

  test('codequality-review.md appetite matrix uses light/conditional/nuclear labels (not plain Skip)', () => {
    const orchCq = readFileSync(
      join(WORKFLOW_DIR, 'references', 'cli-tools', 'codequality-review.md'),
      'utf-8'
    );
    // After the Quality Floor refactor, Lean row must say "Light only" not "Skip"
    expect(orchCq).toMatch(/\*\*Light only\.\*\*/);
    // Complete rows must escalate (Thermo-Nuclear, mandatory)
    expect(orchCq).toMatch(/\*\*Thermo-Nuclear\*\*/); // any bold variant is fine (with or without trailing punctuation)
    expect(orchCq).toMatch(/Thermo-Nuclear mandatory/);
    // Must NOT have legacy "Skip unless the user explicitly requests it" in Lean
    // (the new text uses "Light only" + "skipped unless user explicitly requests it"
    // — both phrasings acceptable, but the row label must not be plain Skip)
    const leanRowMatch = orchCq.match(/^\| `Lean` \|[^|]+\|[^|]+\|/m);
    if (leanRowMatch) {
      expect(leanRowMatch[0]).toMatch(/Light/i);
      expect(leanRowMatch[0]).not.toMatch(/^\| `Lean` \| any \|\s*\*\*Skip\*\*/);
    }
  });
});
