/**
 * skill-count-readme-contract.test.ts
 *
 * SW-015 contract guard: README.md's "What stelow does" / Key Features
 * sentence and the "## 📋 Skills" section must report skill counts and
 * category breakdown that match the canonical source of truth
 *   (every skills/<dir>/SKILL.md with frontmatter metadata.category).
 *
 * Source-of-truth derivation:
 *   1. Real subprocess invocation of: find skills -maxdepth 2 -name SKILL.md -path glob-prefix
 *   2. Independent FS enumeration: every immediate child of `skills/`
 *      whose name starts with `stelow-product-` AND that contains
 *      `SKILL.md`. The two paths must produce the SAME 25 paths.
 *   3. Per-file frontmatter: parse the `---`-delimited YAML block,
 *      read the indented `category:` value from the `metadata:` block,
 *      and verify `name:` equals the directory name.
 *
 * README parser is scoped to the `## 📋 Skills` section so unrelated
 * category/count mentions elsewhere cannot satisfy the contract. The
 * orchestrator's intentional public display alias `` `stelow` ``
 * (described in `skills/stelow-product-orchestrator/SKILL.md` as
 * `[stelow]`) is the ONLY normalization applied; all sub-skill rows
 * must use exact stelow-product-prefixed directory names.
 *
 * This test intentionally exercises real I/O (execFileSync, readFileSync,
 * readdirSync, statSync). It mocks nothing and reads no `process.env`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(__filename), '..', '..');
const SKILLS_DIR = join(PROJECT_ROOT, 'skills');
const README_PATH = join(PROJECT_ROOT, 'README.md');

type Category = 'product' | 'research' | 'code' | 'meta';
const ALLOWED_CATEGORIES: readonly Category[] = ['product', 'research', 'code', 'meta'];
const ORCHESTRATOR_DIR = 'stelow-product-orchestrator';
const ORCHESTRATOR_ALIAS = 'stelow';

// ── Source enumeration ────────────────────────────────────────────

function runCanonicalFind(): string[] {
  const out = execFileSync(
    'find',
    ['skills', '-maxdepth', '2', '-name', 'SKILL.md', '-path', '*/stelow-product-*'],
    { cwd: PROJECT_ROOT, encoding: 'utf8' },
  );
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .sort();
}

function enumerateImmediateSkillDirs(): string[] {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('stelow-product-'))
    .filter((e) => statSync(join(SKILLS_DIR, e.name, 'SKILL.md')).isFile())
    .map((e) => `skills/${e.name}/SKILL.md`)
    .sort();
}

interface SkillSource {
  relPath: string;
  dirName: string;
  category: Category;
}

function parseCategoryFromMetadata(
  filePath: string,
): { name: string; category: Category } {
  const content = readFileSync(filePath, 'utf8');
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) {
    throw new Error(`No frontmatter delimiters in ${filePath}`);
  }
  const block = fm[1];
  const lines = block.split(/\r?\n/);

  // Top-level `name:` field.
  const nameLine = lines.find((l) => /^name:\s*(\S+)/.test(l));
  if (!nameLine) {
    throw new Error(`No top-level name field in frontmatter of ${filePath}`);
  }
  const name = nameLine.replace(/^name:\s*/, '').trim();

  // Find the `metadata:` block at column 0.
  const metaLineIdx = lines.findIndex((l) => /^metadata:\s*$/.test(l));
  if (metaLineIdx === -1) {
    throw new Error(`No metadata: block in frontmatter of ${filePath}`);
  }
  // Collect the indented category field. Stop at the first non-indented
  // line (next top-level key) or end of frontmatter.
  let category: string | null = null;
  for (let i = metaLineIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue;
    if (!/^\s+\S/.test(line)) break; // next top-level key reached
    const m = line.match(/^\s+category:\s*(\S+)/);
    if (m) {
      category = m[1];
      break;
    }
  }
  if (!category) {
    throw new Error(`No category field under metadata: in ${filePath}`);
  }
  if (!ALLOWED_CATEGORIES.includes(category as Category)) {
    throw new Error(
      `Unexpected category "${category}" in ${filePath}; expected one of ${ALLOWED_CATEGORIES.join(', ')}`,
    );
  }
  return { name, category: category as Category };
}

function loadSources(): SkillSource[] {
  const paths = runCanonicalFind();
  return paths.map((relPath) => {
    const fullPath = join(PROJECT_ROOT, relPath);
    const dirName = relPath.split('/')[1];
    const { name, category } = parseCategoryFromMetadata(fullPath);
    if (name !== dirName) {
      throw new Error(
        `Frontmatter name "${name}" does not match directory "${dirName}" in ${relPath}`,
      );
    }
    return { relPath, dirName, category };
  });
}

// ── README parser (scoped to the ## 📋 Skills section) ───────────

function readReadme(): string {
  return readFileSync(README_PATH, 'utf8');
}

function extractSkillsSection(readme: string): string {
  const headingMatch = readme.match(/^## 📋 Skills\s*$/m);
  if (!headingMatch) {
    throw new Error('README is missing the `## 📋 Skills` heading');
  }
  const start = headingMatch.index! + headingMatch[0].length;
  const after = readme.slice(start);
  // Stop at the next level-2 heading that is not 📋 Skills.
  const nextH2 = after.match(/^## (?!📋 )/m);
  const end = nextH2 ? start + nextH2.index! : readme.length;
  return readme.slice(start, end);
}

interface SummaryRow {
  category: string;
  count: string;
}

function parseSummaryTable(skillsSection: string): SummaryRow[] {
  // The summary table lives BEFORE the first level-3 subheading.
  const beforeH3 = skillsSection.split(/^### /m, 1)[0];
  const rows: SummaryRow[] = [];
  for (const rawLine of beforeH3.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const firstLower = cells[0].toLowerCase();
    // Skip header / separator rows.
    if (firstLower === 'category' || firstLower === 'role') continue;
    if (/^[-:]+$/.test(cells[1])) continue;
    rows.push({ category: cells[0], count: cells[1] });
  }
  return rows;
}

interface Level3Block {
  title: string;
  body: string;
}

function extractLevel3Blocks(skillsSection: string): Level3Block[] {
  const blocks: Level3Block[] = [];
  let current: Level3Block | null = null;
  for (const line of skillsSection.split('\n')) {
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (m) {
      if (current) blocks.push(current);
      current = { title: m[1], body: '' };
    } else if (current) {
      current.body = current.body ? `${current.body}\n${line}` : line;
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function extractSkillNameCountFromHeading(heading: string): { label: string; count: number } | null {
  // Heading like "🎛️ Orchestrator (1)" or "Orchestrator (1)" → label "Orchestrator", count 1.
  const m = heading.match(/^(.+?)\s*\((\d+)\)\s*$/);
  if (!m) return null;
  const rawLabel = m[1].trim();
  // Strip leading emoji and punctuation decorations (Unicode-aware).
  const label = rawLabel.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  return { label, count: Number(m[2]) };
}

function parseSkillRowsFromBlock(blockBody: string): string[] {
  const names: string[] = [];
  for (const rawLine of blockBody.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('|')) continue;
    // Preferred path: a backticked skill name in the first cell.
    const m = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (m) {
      names.push(m[1]);
      continue;
    }
    // Fallback for non-backticked rows. Skip table separators
    // (lines whose cells are only `-` / `:`) and the header row.
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    const first = cells[0];
    if (!first || first === 'Skill') continue;
    if (/^[-:]+$/.test(first)) continue;
    names.push(first);
  }
  return names;
}

// ── Tests ────────────────────────────────────────────────────────

describe('SW-015 — README skill-count contract', () => {
  const sources = loadSources();
  const skillsByCategory: Record<Category, string[]> = {
    product: [],
    research: [],
    code: [],
    meta: [],
  };
  for (const s of sources) skillsByCategory[s.category].push(s.dirName);
  const orchestrator = sources.find((s) => s.dirName === ORCHESTRATOR_DIR);
  const subSkills = sources.filter((s) => s.dirName !== ORCHESTRATOR_DIR);

  describe('source-of-truth enumeration', () => {
    it('canonical `find` selection matches independent immediate-directory enumeration', () => {
      const fromFind = runCanonicalFind();
      const fromFs = enumerateImmediateSkillDirs();
      expect(fromFind).toEqual(fromFs);
      // Both must converge on exactly 25 source paths.
      expect(fromFind.length).toBe(25);
      // Every entry must be an immediate child directory of skills/.
      for (const p of fromFind) {
        expect(p).toMatch(/^skills\/stelow-product-[^/]+\/SKILL\.md$/);
      }
    });

    it('contains exactly 25 paths, exactly one orchestrator, exactly 24 sub-skills', () => {
      expect(sources).toHaveLength(25);
      const orchestrators = sources.filter((s) => s.dirName === ORCHESTRATOR_DIR);
      expect(orchestrators).toHaveLength(1);
      expect(subSkills).toHaveLength(24);
      expect(orchestrator).toBeDefined();
    });

    it('every SKILL.md frontmatter name matches its directory name', () => {
      // loadSources() already enforces this; assert it survived the
      // round-trip and re-check every source explicitly.
      for (const s of sources) {
        const fm = parseCategoryFromMetadata(join(PROJECT_ROOT, s.relPath));
        expect(fm.name).toBe(s.dirName);
      }
    });
  });

  describe('frontmatter category counts (derived from source)', () => {
    it('inclusive counts are product 8 / research 12 / code 4 / meta 1', () => {
      // Inclusive: orchestrator (product) + every sub-skill.
      expect(skillsByCategory.product).toHaveLength(8);
      expect(skillsByCategory.research).toHaveLength(12);
      expect(skillsByCategory.code).toHaveLength(4);
      expect(skillsByCategory.meta).toHaveLength(1);
      // Sanity: 8 + 12 + 4 + 1 = 25.
      expect(
        skillsByCategory.product.length +
          skillsByCategory.research.length +
          skillsByCategory.code.length +
          skillsByCategory.meta.length,
      ).toBe(25);
    });

    it('product sub-skill set (after excluding orchestrator) has size 7', () => {
      const productSubSkills = skillsByCategory.product.filter(
        (d) => d !== ORCHESTRATOR_DIR,
      );
      expect(productSubSkills).toHaveLength(7);
      // Every product sub-skill must be a sub-skill (not the orchestrator).
      expect(productSubSkills).not.toContain(ORCHESTRATOR_DIR);
      // Orchestrator must be in the inclusive product set.
      expect(skillsByCategory.product).toContain(ORCHESTRATOR_DIR);
    });
  });

  describe('README rejects stale arithmetic and categorization', () => {
    const readme = readReadme();

    it('rejects the stale "5+8+5+6 = 24 sub-skills" claim (whitespace tolerant)', () => {
      // Exact no-space form would let a future spacing variant slip past;
      // the spec requires whitespace tolerance so both forms are rejected.
      expect(readme).not.toMatch(/5\s*\+\s*8\s*\+\s*5\s*\+\s*6\s*=\s*24\s+sub-skills/i);
    });

    it('rejects the stale "5 strategic approaches + 8 domain tactics + 11 utility skills" wording', () => {
      expect(readme).not.toMatch(
        /5\s+strategic\s+approaches\s*\+\s*8\s+domain\s+tactics\s*\+\s*11\s+utility\s+skills/i,
      );
    });

    it('rejects the stale contemporary labels (strategic / domain / utility as categories)', () => {
      // These are the labels used by the obsolete breakdown. They must
      // not appear as a contemporary categorization anywhere in README.
      expect(readme).not.toMatch(/\bstrategic approaches\b/i);
      expect(readme).not.toMatch(/\bdomain tactics\b/i);
      // `utility skill(s)` as a category phrase:
      expect(readme).not.toMatch(/\butility skills?\b/i);
      // The four obsolete sub-section labels:
      expect(readme).not.toMatch(/^### .*Product Strategies\s*\(\d+\)/m);
      expect(readme).not.toMatch(/^### .*Workflow Stages\s*\(\d+\)/m);
      expect(readme).not.toMatch(/^### .*Product Tactics\s*\(\d+\)/m);
      expect(readme).not.toMatch(/^### .*Complementary\s*\(\d+\)/m);
    });
  });

  describe('Skills section summary table', () => {
    const readme = readReadme();
    const section = extractSkillsSection(readme);
    const summaryRows = parseSummaryTable(section);

    it('extracts at least the inclusive-summary rows', () => {
      // Need product/research/code/meta plus the total row.
      expect(summaryRows.length).toBeGreaterThanOrEqual(5);
    });

    it('reports the total "1 orchestrator + 24 sub-skills = 25"', () => {
      const totals = summaryRows.filter((r) =>
        r.count.includes('1 orchestrator + 24 sub-skills = 25'),
      );
      expect(totals.length).toBeGreaterThanOrEqual(1);
      // The row is the totals row; its category label can be `Total` or
      // similar. It must NOT be one of the four frontmatter categories.
      for (const t of totals) {
        expect(t.category.toLowerCase()).not.toBe('product');
        expect(t.category.toLowerCase()).not.toBe('research');
        expect(t.category.toLowerCase()).not.toBe('code');
        expect(t.category.toLowerCase()).not.toBe('meta');
      }
    });

    it('reports inclusive numeric counts: product 8 / research 12 / code 4 / meta 1', () => {
      function expectRowWith(categoryToken: string, expectedCount: number) {
        const matching = summaryRows.filter((r) =>
          r.category.toLowerCase().includes(categoryToken.toLowerCase()),
        );
        expect(matching.length, `rows mentioning "${categoryToken}"`).toBeGreaterThanOrEqual(1);
        for (const row of matching) {
          // Accept either a bare number or a parenthesized variant
          // like "8 (incl. orchestrator)".
          expect(row.count, `${categoryToken} row count`).toMatch(
            new RegExp(`\\b${expectedCount}\\b`),
          );
        }
      }
      expectRowWith('product', 8);
      expectRowWith('research', 12);
      expectRowWith('code', 4);
      expectRowWith('meta', 1);
    });
  });

  describe('Skills section level-3 category blocks', () => {
    const readme = readReadme();
    const section = extractSkillsSection(readme);
    const blocks = extractLevel3Blocks(section);
    const blocksByHeading = new Map<string, Level3Block>();
    for (const b of blocks) blocksByHeading.set(b.title, b);

    it('contains exactly 5 level-3 category blocks: Orchestrator / Product / Research / Code / Meta', () => {
      expect(blocks).toHaveLength(5);
      const expectedHeadings = [
        'Orchestrator (1)',
        'Product (7)',
        'Research (12)',
        'Code (4)',
        'Meta (1)',
      ];
      const actualLabels = blocks.map((b) => {
        const parsed = extractSkillNameCountFromHeading(b.title);
        return parsed ? `${parsed.label} (${parsed.count})` : b.title;
      });
      expect(actualLabels).toEqual(expectedHeadings);
    });

    it('Orchestrator block has exactly one row whose name normalizes to the canonical orchestrator directory', () => {
      const orchestratorBlock = blocks.find(
        (b) => extractSkillNameCountFromHeading(b.title)?.label === 'Orchestrator',
      );
      expect(orchestratorBlock).toBeDefined();
      const rows = parseSkillRowsFromBlock(orchestratorBlock!.body);
      expect(rows).toHaveLength(1);
      // Intentional public alias: `stelow` → `stelow-product-orchestrator`.
      const normalized = rows[0] === ORCHESTRATOR_ALIAS ? ORCHESTRATOR_DIR : rows[0];
      expect(normalized).toBe(ORCHESTRATOR_DIR);
    });
  });

  describe('per-bucket skill lists match the source (mutation-killing)', () => {
    const readme = readReadme();
    const section = extractSkillsSection(readme);
    const blocks = extractLevel3Blocks(section);
    const blockByLabel = (label: string): Level3Block | undefined => {
      const target = `${label} (`;
      return blocks.find((b) => b.title.includes(target));
    };

    function rowsFor(label: string): string[] {
      const block = blockByLabel(label);
      expect(block, `block "${label} (...)" present`).toBeDefined();
      return parseSkillRowsFromBlock(block!.body);
    }

    it('Product block lists exactly the 7 product sub-skills (no orchestrator, no other category)', () => {
      const productRows = rowsFor('Product').sort();
      const expected = skillsByCategory.product
        .filter((d) => d !== ORCHESTRATOR_DIR)
        .sort();
      expect(productRows).toEqual(expected);
      expect(productRows).not.toContain(ORCHESTRATOR_DIR);
      // None of the rows should be a research/code/meta skill.
      for (const d of skillsByCategory.research) expect(productRows).not.toContain(d);
      for (const d of skillsByCategory.code) expect(productRows).not.toContain(d);
      for (const d of skillsByCategory.meta) expect(productRows).not.toContain(d);
    });

    it('Research block lists exactly the 12 research sub-skills', () => {
      const rows = rowsFor('Research').sort();
      const expected = [...skillsByCategory.research].sort();
      expect(rows).toEqual(expected);
    });

    it('Code block lists exactly the 4 code sub-skills', () => {
      const rows = rowsFor('Code').sort();
      const expected = [...skillsByCategory.code].sort();
      expect(rows).toEqual(expected);
    });

    it('Meta block lists exactly the 1 meta sub-skill', () => {
      const rows = rowsFor('Meta').sort();
      const expected = [...skillsByCategory.meta].sort();
      expect(rows).toEqual(expected);
    });

    it('sub-skill blocks are disjoint and union with orchestrator equals all 25 source names', () => {
      const productRows = rowsFor('Product');
      const researchRows = rowsFor('Research');
      const codeRows = rowsFor('Code');
      const metaRows = rowsFor('Meta');
      const orchestratorRows = rowsFor('Orchestrator').map(
        (n) => (n === ORCHESTRATOR_ALIAS ? ORCHESTRATOR_DIR : n),
      );
      const allRows = [
        ...productRows,
        ...researchRows,
        ...codeRows,
        ...metaRows,
        ...orchestratorRows,
      ];
      // Each block must be disjoint from the others (no skill appears
      // in two blocks; no duplicates within a block).
      const seen = new Set<string>();
      for (const r of allRows) {
        expect(seen.has(r), `duplicate row "${r}" across blocks`).toBe(false);
        seen.add(r);
      }
      // Set equality with the canonical source set.
      const expected = new Set(sources.map((s) => s.dirName));
      expect(new Set(allRows)).toEqual(expected);
      expect(allRows).toHaveLength(25);
    });
  });
});
