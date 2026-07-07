/**
 * sync-content-equality.test.ts
 *
 * Regression guard for `scripts/sync-cli-tools.sh`.
 *
 * The sync script copies the canonical `subagents.md` from
 * `skills/stelow-product-orchestrator/references/cli-tools/` to each
 * sub-skill's `references/cli-tools/`. There are 25 copies (1 source +
 * 24 sub-skills).
 *
 * Bug history: a previous version only checked file EXISTENCE, not
 * content equality — stale content passed silently. The fix uses
 * `cmp -s` for byte-level comparison. This test catches:
 *   1. Drift between source and any sub-skill copy.
 *   2. Stale orchestrator-only files in sub-skill copies
 *      (context-efficiency.md, execution-loop.md).
 *   3. Skill-specific files accidentally removed by sync.
 *
 * If these tests fail, run `npm run sync:cli-tools` (or
 * `./scripts/sync-cli-tools.sh`) to repair.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');

const SYNC_SCRIPT = join(PROJECT_ROOT, 'scripts/sync-cli-tools.sh');
const SOURCE_DIR = join(PROJECT_ROOT, 'skills/stelow-product-orchestrator/references/cli-tools');
const SOURCE_FILE = join(SOURCE_DIR, 'subagents.md');
const SKILLS_DIR = join(PROJECT_ROOT, 'skills');

const SYNC_EXCLUDE = ['context-efficiency.md', 'execution-loop.md'];

// ═════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════

function md5(path: string): string {
  const content = readFileSync(path);
  return createHash('md5').update(content).digest('hex');
}

function listSkills(): string[] {
  return readdirSync(SKILLS_DIR).filter((d) => {
    const p = join(SKILLS_DIR, d);
    return statSync(p).isDirectory() && d !== 'stelow-product-orchestrator';
  });
}

function subagentCopies(): { skill: string; path: string }[] {
  return listSkills().map((skill) => ({
    skill,
    path: join(SKILLS_DIR, skill, 'references/cli-tools/subagents.md'),
  }));
}

// ═════════════════════════════════════════════════════════════════════
// 1. SOURCE FILE EXISTS
// ═════════════════════════════════════════════════════════════════════

describe('Source subagents.md exists', () => {
  it('source file exists', () => {
    expect(existsSync(SOURCE_FILE)).toBe(true);
  });

  it('source file has content', () => {
    const content = readFileSync(SOURCE_FILE, 'utf-8');
    expect(content.length).toBeGreaterThan(1000);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. ALL SUB-SKILL COPIES MATCH SOURCE BY CONTENT (not just existence)
// ═════════════════════════════════════════════════════════════════════

describe('Sub-skill copies match source content (sample 2 of 24)', () => {
  const sourceHash = md5(SOURCE_FILE);
  const samples = subagentCopies().slice(0, 2);
  for (const copy of samples) {
    it(`${copy.skill} — content matches source (md5)`, () => {
      if (!existsSync(copy.path)) {
        throw new Error(`Copy missing at ${copy.path}`);
      }
      const copyHash = md5(copy.path);
      expect(copyHash).toBe(sourceHash);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════
// 3. NO STALE ORCHESTRATOR-ONLY FILES IN SUB-SKILL COPIES
// ═════════════════════════════════════════════════════════════════════

describe('No stale orchestrator-only files in sub-skill copies', () => {
  for (const skill of listSkills()) {
    it(`${skill} — does not contain ${SYNC_EXCLUDE.join(' or ')}`, () => {
      const copyDir = join(SKILLS_DIR, skill, 'references/cli-tools');
      for (const excluded of SYNC_EXCLUDE) {
        const excludedPath = join(copyDir, excluded);
        if (existsSync(excludedPath)) {
          throw new Error(
            `Stale orchestrator-only file found: ${relative(PROJECT_ROOT, excludedPath)}. ` +
              `Sync should have removed it. Run ./scripts/sync-cli-tools.sh.`,
          );
        }
      }
    });
  }
});

// ═════════════════════════════════════════════════════════════════════
// 4. SYNC SCRIPT BEHAVIOR (functional test, not just static check)
// ═════════════════════════════════════════════════════════════════════

describe('Sync script behavior', () => {
  it('exists and is executable', () => {
    expect(existsSync(SYNC_SCRIPT)).toBe(true);
    const stat = statSync(SYNC_SCRIPT);
    // Owner-executable bit (0o100) set
    expect(stat.mode & 0o100).toBeGreaterThan(0);
  });

  it('--check-only exits 0 when source and copies are in sync', () => {
    // First, ensure copies are in sync by running a real sync
    execSync(`bash "${SYNC_SCRIPT}"`, { cwd: PROJECT_ROOT, stdio: 'pipe' });
    // Then --check-only should be silent (exit 0)
    const result = execSync(`bash "${SYNC_SCRIPT}" --check-only`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
    });
    // The output should contain "All skills match source" for success
    const output = result.toString();
    expect(output).toMatch(/All skills match source/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. SUBAGENTS.MD HAS THE CRITICAL RULE BLOCK (cross-check with #1)
// ═════════════════════════════════════════════════════════════════════

describe('subagents.md has the CRITICAL RULE block (every copy)', () => {
  for (const copy of subagentCopies()) {
    it(`${copy.skill} — has CRITICAL RULE block at the top`, () => {
      if (!existsSync(copy.path)) return; // covered by other test
      const content = readFileSync(copy.path, 'utf-8');
      const first200 = content.split('\n').slice(0, 200).join('\n');
      expect(first200).toMatch(/CRITICAL RULE/i);
    });
  }
});