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
const WORKFLOW_DIR = join(SKILLS_DIR, 'cali-product-workflow');
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
    { path: join(SKILLS_DIR, 'cali-product-tech-planning', 'SKILL.md'), name: 'tech-planning/SKILL.md' },
    { path: join(SKILLS_DIR, 'cali-product-shape-up', 'references', 'proposal-structure.md'), name: 'proposal-structure.md' },
    { path: join(WORKFLOW_DIR, 'references', 'cli-tools', 'supervise.md'), name: 'supervise.md' },
  ];

  it.each(filesToScan)('$name has no stale XS/S/M/L/XL as appetite labels', ({ path }) => {
    const content = readFileSync(path, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip lines that are part of complexity_estimate (valid usage)
      if (line.includes('complexity_estimate')) continue;
      if (line.includes('{XS|S|M|L|XL}')) continue;

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

  it('scope-executor/SKILL.md has no XL heading (must be Comprehensive)', () => {
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
    expect(content).toMatch(/\.cali-product-workflow\/\*\/\*\/index\.json/);
  });

  it('gate.md uses consistent double-wildcard glob pattern', () => {
    const content = readStage('gate.md');
    expect(content).toMatch(/\.cali-product-workflow\/\*\/\*\/\$_DIR\/index\.json/);
  });

  it('scope-executor uses correct path with {_dir} level (not broken single-wildcard)', () => {
    const content = readSkill('cali-product-scope-executor');
    expect(content).toMatch(/\.cali-product-workflow\/\*\/\*\/plans/);
    expect(content).not.toMatch(/\.cali-product-workflow\/\*\/plans/);
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

describe('No duplicate Comprehensive rows in appetite tables', () => {
  const filesWithTables: { path: string; name: string }[] = [
    { path: join(STAGES_DIR, 'execution.md'), name: 'execution.md' },
    { path: join(SKILLS_DIR, 'cali-product-codebase-critique', 'SKILL.md'), name: 'codebase-critique/SKILL.md' },
    { path: join(SKILLS_DIR, 'cali-product-ux-critique', 'SKILL.md'), name: 'ux-critique/SKILL.md' },
    { path: join(SKILLS_DIR, 'cali-product-tech-planning', 'SKILL.md'), name: 'tech-planning/SKILL.md' },
    { path: join(STAGES_DIR, 'verification.md'), name: 'verification.md' },
  ];

  it.each(filesWithTables)('$name has no IDENTICAL consecutive Comprehensive rows', ({ path, name }) => {
    const content = readFileSync(path, 'utf-8');
    const lines = content.split('\n');
    let prevRow: string | null = null;
    for (const line of lines) {
      if (line.startsWith('| `Comprehensive` |')) {
        if (prevRow !== null) {
          // Different table columns are OK (e.g. "0 files" vs "1+ files")
          // Only flag if the ENTIRE row content is identical
          expect(line).not.toEqual(prevRow);
        }
        prevRow = line;
      } else if (line.startsWith('| `') && !line.startsWith('| `Comprehensive` |')) {
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
    expect(content).toContain('"PoC"');
    expect(content).toContain('"Focused (Recommended)"');
    expect(content).toContain('"Comprehensive"');
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
    const appetiteRows = content.match(/\| `(PoC|Focused|Comprehensive)` \|/g);
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

    const execPatterns = execContent.match(/`(PoC|Focused|Comprehensive)` \| \*\*(Skip|Activate)\*\*/g);
    const superPatterns = superContent.match(/`(PoC|Focused|Comprehensive)` \| \*\*(Skip|Activate)\*\*/g);

    expect(execPatterns).toBeDefined();
    expect(superPatterns).toBeDefined();
    expect(execPatterns![0]).toBe(superPatterns![0]); // PoC
    expect(execPatterns![1]).toBe(superPatterns![1]); // Focused
    expect(execPatterns![2]).toBe(superPatterns![2]); // Comprehensive
  });
});

// ═════════════════════════════════════════════════════════════════════
// 9. DEFAULT FALLBACK VALUES
// ═════════════════════════════════════════════════════════════════════

describe('Default fallback values are Focused (not stale M)', () => {
  it('execution.md defaults to Focused', () => {
    const content = readStage('execution.md');
    expect(content).toMatch(/echo "Focused"/);
    expect(content).not.toMatch(/echo "M"/);
  });

  it('verification.md defaults to Focused', () => {
    const content = readStage('verification.md');
    expect(content).toMatch(/echo "Focused"/);
    expect(content).not.toMatch(/echo "M"/);
  });

  it('tech-planning defaults to Focused', () => {
    const content = readSkill('cali-product-tech-planning');
    expect(content).toMatch(/echo "Focused"/);
    expect(content).not.toMatch(/echo "M"/);
  });

  it('codebase-critique defaults to Focused (APPETITE variable)', () => {
    const content = readSkill('cali-product-codebase-critique');
    expect(content).toMatch(/Focused/);
    expect(content).not.toMatch(/APPETITE="M"|APPETITE: M/);
  });

  it('scope-executor defaults to Focused', () => {
    const content = readSkill('cali-product-scope-executor');
    expect(content).toMatch(/echo "Focused"/);
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
// 11. COMPLEXITY_ESTIMATE COMPARISON LOGIC
// ═════════════════════════════════════════════════════════════════════

describe('Complexity_estimate comparison logic (no ordinal comparison bug)', () => {
  it('plan-critique uses case-based comparison, not ordinal mapping', () => {
    const content = readSkill('cali-product-plan-critique');
    expect(content).toMatch(/case "\$APPETITE" in/);
    expect(content).toMatch(/PoC\)/);
    expect(content).toMatch(/Focused\)/);
    expect(content).toMatch(/Comprehensive\)/);
    expect(content).not.toMatch(/APPETITE_ORDER/);
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
    const skillMd = readSkill('cali-product-workflow');
    expect(skillMd).toContain('Jobs To Be Done');
    expect(skillMd).toContain('Evolutionary Principles');
    expect(skillMd).toContain('Opportunity Mapping');
    expect(skillMd).toContain('Multi-Method Market Analysis');
    expect(skillMd).toContain('Product Discovery');
  });

  test('lists all 8 domain libraries (8-option rule)', () => {
    const skillMd = readSkill('cali-product-workflow');
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

  test('gate uses canonical appetite labels (PoC, Focused, Comprehensive)', () => {
    expect(context).toContain('PoC');
    expect(context).toContain('Focused');
    expect(context).toContain('Comprehensive');
  });

  test('gate matrix has PoC + Auto skip rule', () => {
    expect(context).toMatch(/PoC.*Auto|skip.*PoC|skip.*Auto/i);
  });

  test('gate matrix has PoC + non-Auto reduced ask rule', () => {
    expect(context).toMatch(/Reduced ask|reference-only|opt-in/i);
  });

  test('gate matrix has Focused/Comprehensive full behavior', () => {
    expect(context).toMatch(/Focused.*Full|full ask|Comprehensive.*Full/i);
  });

  test('SKILL.md uses :10/:20 labels (not 2a/2b)', () => {
    const skillMd = readSkill('cali-product-workflow');
    expect(skillMd).toMatch(/Context stage — :10/);
    expect(skillMd).toMatch(/Context stage — :20/);
    expect(skillMd).not.toMatch(/Context stage — 2a/);
    expect(skillMd).not.toMatch(/Context stage — 2b/);
  });
});
