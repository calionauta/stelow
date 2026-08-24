/**
 * skill-count-readme-contract.test.ts
 *
 * SW-015 contract guard: README.md's "## 📋 Skills" section must report
 * skill counts and prefix-group breakdown that match the canonical source
 * of truth (every skills/<dir>/SKILL.md with frontmatter metadata.category
 * aligned to the `stelow-workflow-*` / `stelow-product-*` prefix).
 *
 * Source-of-truth derivation:
 *   1. Real subprocess invocation of: find skills -maxdepth 2 -name SKILL.md -path glob-prefix
 *   2. Independent FS enumeration: every immediate child of `skills/`
 *      whose name starts with `stelow-product-` or `stelow-workflow-`
 *      AND that contains `SKILL.md`. The two paths must produce the SAME 26 paths.
 *   3. Per-file frontmatter: parse the `---`-delimited YAML block,
 *      read the indented `category:` value from the `metadata:` block
 *      (must be `workflow` or `product`, matching the dir prefix), and
 *      verify `name:` equals the directory name.
 *
 * README parser is scoped to the `## 📋 Skills` section so unrelated
 * count mentions elsewhere cannot satisfy the contract. Every row in the
 * two level-3 blocks must use the exact directory name (no aliases).
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

type Group = 'workflow' | 'product';
const ALLOWED_GROUPS: readonly Group[] = ['workflow', 'product'];
const ORCHESTRATOR_DIR = 'stelow-workflow-orchestrator';

function groupFromDir(dirName: string): Group {
  if (dirName.startsWith('stelow-workflow-')) return 'workflow';
  if (dirName.startsWith('stelow-product-')) return 'product';
  throw new Error(`Unknown prefix group for directory "${dirName}"`);
}

// ── Source enumeration ────────────────────────────────────────────

function runCanonicalFind(): string[] {
  const out = execFileSync(
    'find',
    ['skills', '-maxdepth', '2', '-name', 'SKILL.md', '-path', '*/stelow-*-*'],
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
    .filter(
      (e) =>
        e.isDirectory() &&
        (e.name.startsWith('stelow-product-') || e.name.startsWith('stelow-workflow-')),
    )
    .filter((e) => statSync(join(SKILLS_DIR, e.name, 'SKILL.md')).isFile())
    .map((e) => `skills/${e.name}/SKILL.md`)
    .sort();
}

interface SkillSource {
  relPath: string;
  dirName: string;
  group: Group;
}

function parseCategoryFromMetadata(
  filePath: string,
): { name: string; category: Group } {
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
  if (!ALLOWED_GROUPS.includes(category as Group)) {
    throw new Error(
      `Unexpected category "${category}" in ${filePath}; expected one of ${ALLOWED_GROUPS.join(', ')}`,
    );
  }
  return { name, category: category as Group };
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
    if (category !== groupFromDir(dirName)) {
      throw new Error(
        `Frontmatter category "${category}" does not match prefix group "${groupFromDir(dirName)}" of "${dirName}" in ${relPath}`,
      );
    }
    return { relPath, dirName, group: category };
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
    if (firstLower === 'category' || firstLower === 'prefix' || firstLower === 'role') continue;
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
  // Heading like "🏗️ Workflow (12)" → label "Workflow", count 12.
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
  const skillsByGroup: Record<Group, string[]> = { workflow: [], product: [] };
  for (const s of sources) skillsByGroup[s.group].push(s.dirName);
  const orchestrator = sources.find((s) => s.dirName === ORCHESTRATOR_DIR);
  const subSkills = sources.filter((s) => s.dirName !== ORCHESTRATOR_DIR);

  describe('source-of-truth enumeration', () => {
    it('canonical `find` selection matches independent immediate-directory enumeration', () => {
      const fromFind = runCanonicalFind();
      const fromFs = enumerateImmediateSkillDirs();
      expect(fromFind).toEqual(fromFs);
      // Both must converge on exactly 26 source paths.
      expect(fromFind.length).toBe(26);
      // Every entry must be an immediate child directory of skills/.
      for (const p of fromFind) {
        expect(p).toMatch(/^skills\/(stelow-product-|stelow-workflow-)[^/]+\/SKILL\.md$/);
      }
    });

    it('contains exactly 26 paths, exactly one orchestrator, exactly 25 sub-skills', () => {
      expect(sources).toHaveLength(26);
      const orchestrators = sources.filter((s) => s.dirName === ORCHESTRATOR_DIR);
      expect(orchestrators).toHaveLength(1);
      expect(subSkills).toHaveLength(25);
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

  describe('frontmatter group counts (derived from source)', () => {
    it('inclusive counts are workflow 12 / product 14', () => {
      // Inclusive: orchestrator (workflow) + every sub-skill.
      expect(skillsByGroup.workflow).toHaveLength(12);
      expect(skillsByGroup.product).toHaveLength(14);
      // Sanity: 12 + 14 = 26.
      expect(
        skillsByGroup.workflow.length + skillsByGroup.product.length,
      ).toBe(26);
    });

    it('frontmatter category matches the directory prefix for every skill', () => {
      // The prefix IS the grouping: stelow-workflow-* ⇔ category workflow,
      // stelow-product-* ⇔ category product. loadSources() enforces this;
      // assert it explicitly here so a broken alignment is a named failure.
      for (const s of sources) {
        const fm = parseCategoryFromMetadata(join(PROJECT_ROOT, s.relPath));
        expect(fm.category, `${s.dirName} category`).toBe(groupFromDir(s.dirName));
      }
    });

    it('product group contains no orchestrator; orchestrator is in workflow group', () => {
      expect(skillsByGroup.product).not.toContain(ORCHESTRATOR_DIR);
      expect(skillsByGroup.workflow).toContain(ORCHESTRATOR_DIR);
    });
  });

  describe('README rejects stale arithmetic and categorization', () => {
    const readme = readReadme();

    it('rejects the stale "5+8+5+6 = 24 sub-skills" claim (whitespace tolerant)', () => {
      expect(readme).not.toMatch(/5\s*\+\s*8\s*\+\s*5\s*\+\s*6\s*=\s*24\s+sub-skills/i);
    });

    it('rejects the stale "5 strategic approaches + 8 domain tactics + 11 utility skills" wording', () => {
      expect(readme).not.toMatch(
        /5\s+strategic\s+approaches\s*\+\s*8\s+domain\s+tactics\s*\+\s*11\s+utility\s+skills/i,
      );
    });

    it('rejects the stale contemporary labels (strategic / domain / utility as categories)', () => {
      expect(readme).not.toMatch(/\bstrategic approaches\b/i);
      expect(readme).not.toMatch(/\bdomain tactics\b/i);
      expect(readme).not.toMatch(/\butility skills?\b/i);
      // The obsolete four-category sub-section labels:
      expect(readme).not.toMatch(/^### .*Product Strategies\s*\(\d+\)/m);
      expect(readme).not.toMatch(/^### .*Workflow Stages\s*\(\d+\)/m);
      expect(readme).not.toMatch(/^### .*Product Tactics\s*\(\d+\)/m);
      expect(readme).not.toMatch(/^### .*Complementary\s*\(\d+\)/m);
    });

    it('rejects the previous four-category headings (Product/Research/Code/Meta as sections)', () => {
      // The pre-prefix README grouped by metadata.category with these
      // section headings; they must not reappear.
      expect(readme).not.toMatch(/^### .*Research\s*\(\d+\)/m);
      expect(readme).not.toMatch(/^### .*Code\s*\(\d+\)/m);
      expect(readme).not.toMatch(/^### .*Meta\s*\(\d+\)/m);
    });
  });

  describe('Skills section summary table', () => {
    const readme = readReadme();
    const section = extractSkillsSection(readme);
    const summaryRows = parseSummaryTable(section);

    it('extracts at least the prefix-summary rows', () => {
      // Need workflow/product plus the total row.
      expect(summaryRows.length).toBeGreaterThanOrEqual(3);
    });

    it('reports the total "1 orchestrator + 25 sub-skills = 26"', () => {
      const totals = summaryRows.filter((r) =>
        r.count.includes('1 orchestrator + 25 sub-skills = 26'),
      );
      expect(totals.length).toBeGreaterThanOrEqual(1);
      // The row is the totals row; its category label can be `Total` or
      // similar. It must NOT be one of the two prefix groups.
      for (const t of totals) {
        expect(t.category.toLowerCase()).not.toBe('workflow');
        expect(t.category.toLowerCase()).not.toBe('product');
      }
    });

    it('reports inclusive numeric counts: workflow 12 / product 14', () => {
      function expectRowWith(categoryToken: string, expectedCount: number) {
        const matching = summaryRows.filter((r) =>
          r.category.toLowerCase().includes(categoryToken.toLowerCase()),
        );
        expect(matching.length, `rows mentioning "${categoryToken}"`).toBeGreaterThanOrEqual(1);
        for (const row of matching) {
          expect(row.count, `${categoryToken} row count`).toMatch(
            new RegExp(`\\b${expectedCount}\\b`),
          );
        }
      }
      expectRowWith('workflow', 12);
      expectRowWith('product', 14);
    });
  });

  describe('Skills section level-3 group blocks', () => {
    const readme = readReadme();
    const section = extractSkillsSection(readme);
    const blocks = extractLevel3Blocks(section);
    const blocksByHeading = new Map<string, Level3Block>();
    for (const b of blocks) blocksByHeading.set(b.title, b);

    it('contains exactly 2 level-3 blocks: Workflow (12) / Product (14)', () => {
      expect(blocks).toHaveLength(2);
      const expectedHeadings = ['Workflow (12)', 'Product (14)'];
      const actualLabels = blocks.map((b) => {
        const parsed = extractSkillNameCountFromHeading(b.title);
        return parsed ? `${parsed.label} (${parsed.count})` : b.title;
      });
      expect(actualLabels).toEqual(expectedHeadings);
    });
  });

  describe('per-group skill lists match the source (mutation-killing)', () => {
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

    it('Workflow block lists exactly the 12 workflow skills, including the orchestrator', () => {
      const rows = rowsFor('Workflow').sort();
      const expected = [...skillsByGroup.workflow].sort();
      expect(rows).toEqual(expected);
      expect(rows).toContain(ORCHESTRATOR_DIR);
    });

    it('Product block lists exactly the 14 product skills', () => {
      const rows = rowsFor('Product').sort();
      const expected = [...skillsByGroup.product].sort();
      expect(rows).toEqual(expected);
    });

    it('blocks are disjoint and union with orchestrator equals all 26 source names', () => {
      const workflowRows = rowsFor('Workflow');
      const productRows = rowsFor('Product');
      const allRows = [...workflowRows, ...productRows];
      // Each block must be disjoint from the others (no skill appears
      // in both blocks; no duplicates within a block).
      const seen = new Set<string>();
      for (const r of allRows) {
        expect(seen.has(r), `duplicate row "${r}" across blocks`).toBe(false);
        seen.add(r);
      }
      // Set equality with the canonical source set.
      const expected = new Set(sources.map((s) => s.dirName));
      expect(new Set(allRows)).toEqual(expected);
      expect(allRows).toHaveLength(26);
    });
  });
});
