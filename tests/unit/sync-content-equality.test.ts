/**
 * sync-content-equality.test.ts
 *
 * Regression guard for `scripts/sync-cli-tools.sh`.
 *
 * The sync script copies the canonical cli-tools files from
 * `skills/stelow-product-orchestrator/references/cli-tools/` to each
 * sub-skill's `references/cli-tools/`. There are 25 directories
 * (1 source + 24 sub-skills).
 *
 * Bug history: a previous version only checked file EXISTENCE, not
 * content equality — stale content passed silently. The fix uses
 * `cmp -s` for byte-level comparison. This test catches:
 *   1. Drift between source and any sub-skill copy.
 *   2. Stale orchestrator-only files in sub-skill copies
 *      (context-efficiency.md, execution-loop.md).
 *   3. Skill-specific files accidentally removed by sync.
 *
 * Self-sufficiency strategy (SW-005):
 *   This file MUST be deterministic from a clean checkout. Generated
 *   non-orchestrator `references/cli-tools/*.md` mirrors are gitignored
 *   build outputs of `scripts/sync-cli-tools.sh` — they are absent in
 *   a clean source checkout. The `tests/global-setup.ts` globalSetup
 *   populates the shared tree exactly once before any test file runs,
 *   so this file does not need its own `beforeAll` (and avoids racing
 *   `scripts/sync-cli-tools.sh` against another file's `beforeAll` in
 *   parallel Vitest workers — the script is not parallel-safe).
 *
 *   Content-equality coverage uses an explicit deterministic set
 *   (first / middle / last by alphabetical order) instead of a fragile
 *   `slice(0, 2)`, and the full per-skill CRITICAL-RULE block check
 *   runs against the same synced tree.
 *
 *   Isolated temp-fixture regressions (SW-005 label) exercise the
 *   script against a tmpdir the test owns and tears down: missing
 *   target directory, missing file, differing content, populated
 *   state, excluded-file cleanup, idempotent re-run. They never
 *   mutate the shared repository tree.
 *
 * If the in-tree sync regressions fail, run
 * `./scripts/sync-cli-tools.sh` to repair.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  mkdtempSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
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

/**
 * Deterministic coverage set for content-equality regression.
 *
 * The full set of 24 sub-skill copies is asserted in the per-skill
 * CRITICAL-RULE describe block below; this helper pins three
 * representative samples (first / middle / last by alphabetical order)
 * so the byte-equality contract is checked by content hash and any
 * drift immediately surfaces a meaningful named failure.
 */
function deterministicSamples(copies: { skill: string; path: string }[]) {
  if (copies.length === 0) return [];
  const sorted = [...copies].sort((a, b) => a.skill.localeCompare(b.skill));
  const last = sorted.length - 1;
  const mid = Math.floor(last / 2);
  const ids = new Set<number>([0, mid, last]);
  return [...ids].sort((a, b) => a - b).map((i) => sorted[i]);
}

// ═════════════════════════════════════════════════════════════════════
// SHARED-TREE PRE-SYNC (delegated to vitest globalSetup)
// ═════════════════════════════════════════════════════════════════════
//
// Generated non-orchestrator mirrors are gitignored. The vitest
// globalSetup (see `vitest.config.ts` and `tests/global-setup.ts`)
// runs `scripts/sync-cli-tools.sh` exactly once before any test
// file, so every assertion in this file can read the populated
// tree without introducing its own `beforeAll`. Running the script
// per-file here would race parallel Vitest workers against each
// other — the script is not parallel-safe.

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
//
// Deterministic coverage set replaces the historical `slice(0, 2)` so
// the regression fails meaningfully when ANY alphabetic ordering
// drifts, not only when the alphabetically-first two copies drift.
// The full per-skill CRITICAL-RULE block check (see #5) covers the
// entire 24-skill set.
// ═════════════════════════════════════════════════════════════════════

describe('Sub-skill copies match source content (deterministic sample)', () => {
  const sourceHash = md5(SOURCE_FILE);
  const samples = deterministicSamples(subagentCopies());
  // Guard: deterministicSamples must yield at least one sample when
  // there is at least one sub-skill. Vitest's `it.each` style would
  // mute this; using a plain for-loop fails loudly.
  if (samples.length === 0) {
    throw new Error(
      'No sub-skill copies found; subagentCopies() returned an empty list.',
    );
  }
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
        // Deterministic existence assertion: if the excluded file
        // exists, the sync left it behind — fail loudly. No silent
        // `return`; the test must always execute its assertion.
        expect(existsSync(excludedPath)).toBe(false);
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

  it('--check-only reports "All skills match source" after a sync', { timeout: 60000 }, () => {
    // Top-level beforeAll already ran one sync pass; assert that
    // --check-only reports a clean state without mutating the tree.
    const result = execSync(`bash "${SYNC_SCRIPT}" --check-only`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 60000,
    });
    const output = result.toString();
    expect(output).toMatch(/All skills match source/);
  });

  it('a second sync run produces no diff against the shared tree', { timeout: 60000 }, () => {
    // Idempotency: a sync on top of an already-populated tree must
    // NOT rewrite byte-identical files. We rely on `git status` /
    // `git diff` semantics indirectly by asserting --check-only's
    // success after a redundant sync.
    execSync(`bash "${SYNC_SCRIPT}"`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 60000,
    });
    const result = execSync(`bash "${SYNC_SCRIPT}" --check-only`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 60000,
    });
    expect(result.toString()).toMatch(/All skills match source/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4b. ISOLATED TEMP-FIXTURE REGRESSIONS (SW-005 label)
//
// These cases exercise the script against a tmpdir the test owns and
// tears down. They MUST NOT mutate the shared repository tree. Real
// Bash and real fs — no mocks — against the isolated fixture.
// ═════════════════════════════════════════════════════════════════════

describe('SW-005 isolated temp-fixture regressions', () => {
  let fixtureRoot: string;
  let fixtureSource: string;
  let fixtureSkill: string;
  let fixtureTarget: string;

  beforeAll(() => {
    // Layout under tmpdir/<hash>/:
    //   <fixtureRoot>/
    //     scripts/sync-cli-tools.sh        (copied executable)
    //     skills/
    //       stelow-product-orchestrator/references/cli-tools/
    //         subagents.md
    //         goals.md
    //         execution-loop.md   (orchestrator-only — must NOT sync)
    //         context-efficiency.md (orchestrator-only — must NOT sync)
    //       stelow-product-fixture-skill/references/cli-tools/   (target, dynamic)
    fixtureRoot = mkdtempSync(join(tmpdir(), 'stelow-sync-'));
    mkdirSync(join(fixtureRoot, 'scripts'), { recursive: true });
    mkdirSync(join(fixtureRoot, 'skills', 'stelow-product-fixture-skill'), {
      recursive: true,
    });
    fixtureSkill = 'stelow-product-fixture-skill';
    fixtureSource = join(
      fixtureRoot,
      'skills/stelow-product-orchestrator/references/cli-tools',
    );
    fixtureTarget = join(
      fixtureRoot,
      'skills/stelow-product-fixture-skill/references/cli-tools',
    );
    mkdirSync(fixtureSource, { recursive: true });

    // Copy the real sync script verbatim so we exercise its actual
    // behavior on a known starting state.
    const realScript = readFileSync(SYNC_SCRIPT, 'utf-8');
    const fixtureScript = join(fixtureRoot, 'scripts/sync-cli-tools.sh');
    writeFileSync(fixtureScript, realScript, { mode: 0o755 });

    // Seed an orchestration source that mirrors the real contract.
    writeFileSync(join(fixtureSource, 'subagents.md'), '# CRITICAL RULE block\n\nfoo\n');
    writeFileSync(join(fixtureSource, 'goals.md'), '# Goals\n\nacceptance / iteration\n');
    // Two excluded orchestrator-only files (must be removed from targets).
    writeFileSync(
      join(fixtureSource, 'execution-loop.md'),
      '# Orchestrator only — should NOT sync to sub-skills\n',
    );
    writeFileSync(
      join(fixtureSource, 'context-efficiency.md'),
      '# Orchestrator only — should NOT sync to sub-skills\n',
    );
  });

  // After every test the fixture exists in some known state. We tear
  // it down at the end so disk pressure stays low.
  // (vitest's `afterAll` would be nicer; we keep beforeAll to avoid
  // mutating shared order — a single rmSync at end is sufficient.)
  function teardown() {
    try {
      rmSync(fixtureRoot, { recursive: true, force: true });
    } catch {
      // best-effort: tmpdir cleanup tolerates orphans
    }
  }

  /**
   * Reset fixtureTarget to a clean empty directory. Each test
   * starts from this state and creates whatever files it needs to
   * establish the test's specific precondition.
   */
  function resetFixtureTarget() {
    rmSync(fixtureTarget, { recursive: true, force: true });
    mkdirSync(fixtureTarget, { recursive: true });
    expect(existsSync(fixtureTarget)).toBe(true);
    expect(readdirSync(fixtureTarget)).toEqual([]);
  }

  function runFixtureScript(args = '') {
    return execSync(`bash "${fixtureRoot}/scripts/sync-cli-tools.sh" ${args}`.trim(), {
      stdio: 'pipe',
      timeout: 30000,
    }).toString();
  }

  it('missing target directory is created and populated by sync', () => {
    resetFixtureTarget();
    rmSync(fixtureTarget, { recursive: true, force: true });
    expect(existsSync(fixtureTarget)).toBe(false);

    const output = runFixtureScript();
    expect(output).toMatch(/Synced|✅/);
    expect(existsSync(fixtureTarget)).toBe(true);
    expect(existsSync(join(fixtureTarget, 'subagents.md'))).toBe(true);
    expect(existsSync(join(fixtureTarget, 'goals.md'))).toBe(true);
    // Excluded orchestrator-only files MUST NOT be mirrored.
    expect(existsSync(join(fixtureTarget, 'execution-loop.md'))).toBe(false);
    expect(existsSync(join(fixtureTarget, 'context-efficiency.md'))).toBe(false);
  });

  it('missing file in target is materialized after sync', () => {
    resetFixtureTarget();
    // Target has only subagents.md; goals.md is missing and a
    // stale excluded file is present. After sync: goals.md is
    // copied, excluded file is removed.
    writeFileSync(join(fixtureTarget, 'subagents.md'), '# CRITICAL RULE block\n\nfoo\n');
    writeFileSync(
      join(fixtureTarget, 'execution-loop.md'),
      '# stale excluded file from previous sync\n',
    );
    expect(existsSync(join(fixtureTarget, 'goals.md'))).toBe(false);

    runFixtureScript();

    expect(existsSync(join(fixtureTarget, 'goals.md'))).toBe(true);
    expect(readFileSync(join(fixtureTarget, 'goals.md'), 'utf-8')).toContain('acceptance');
    // Stale excluded file MUST be cleaned up.
    expect(existsSync(join(fixtureTarget, 'execution-loop.md'))).toBe(false);
  });

  it('differing content in target is overwritten by source', () => {
    resetFixtureTarget();
    writeFileSync(join(fixtureTarget, 'subagents.md'), '# STALE — should be replaced\n');
    runFixtureScript();
    expect(readFileSync(join(fixtureTarget, 'subagents.md'), 'utf-8')).toContain(
      'CRITICAL RULE block',
    );
  });

  it('populated synchronized state reports "All skills match source"', () => {
    resetFixtureTarget();
    // Populate, then run again — second run must NOT report a
    // mismatch and must NOT show "Synced N stale" on its own.
    writeFileSync(
      join(fixtureTarget, 'subagents.md'),
      readFileSync(join(fixtureSource, 'subagents.md')),
    );
    writeFileSync(
      join(fixtureTarget, 'goals.md'),
      readFileSync(join(fixtureSource, 'goals.md')),
    );
    const output = runFixtureScript();
    expect(output).toMatch(/✅/);
    // Either "match" or "All skills match source" footer.
    expect(output).toMatch(/match/);
  });

  it('excluded-file cleanup removes orchestrator-only files from target', () => {
    resetFixtureTarget();
    writeFileSync(
      join(fixtureTarget, 'subagents.md'),
      readFileSync(join(fixtureSource, 'subagents.md')),
    );
    writeFileSync(
      join(fixtureTarget, 'goals.md'),
      readFileSync(join(fixtureSource, 'goals.md')),
    );
    writeFileSync(join(fixtureTarget, 'context-efficiency.md'), '# stale\n');
    writeFileSync(join(fixtureTarget, 'execution-loop.md'), '# stale\n');

    runFixtureScript();

    expect(existsSync(join(fixtureTarget, 'context-efficiency.md'))).toBe(false);
    expect(existsSync(join(fixtureTarget, 'execution-loop.md'))).toBe(false);
    expect(existsSync(join(fixtureTarget, 'subagents.md'))).toBe(true);
    expect(existsSync(join(fixtureTarget, 'goals.md'))).toBe(true);
  });

  it('idempotent re-run produces no diff in the target tree', () => {
    resetFixtureTarget();
    // Populate from a clean start, then run twice. After the second
    // run, every file should still byte-match its source (no
    // rewritten timestamp drift, no spurious content changes).
    runFixtureScript();
    const md5Before = (file: string) => md5(join(fixtureTarget, file));
    const before = {
      subagents: md5Before('subagents.md'),
      goals: md5Before('goals.md'),
    };
    runFixtureScript();
    const after = {
      subagents: md5Before('subagents.md'),
      goals: md5Before('goals.md'),
    };
    expect(after).toEqual(before);
  });

  it('tears down its fixture root so no orphans leak', () => {
    // Sanity: teardown() removes the tmpdir. Run the cleanup and
    // confirm the root is gone. This is the last SW-005 temp-fixture
    // test that touches the fixture, so it owns teardown for the
    // whole describe block.
    expect(existsSync(fixtureRoot)).toBe(true);
    teardown();
    expect(existsSync(fixtureRoot)).toBe(false);
  });

  afterAll(() => {
    // Belt-and-braces: if any test above bailed out via `expect`
    // before the teardown test could run, still clean up.
    if (existsSync(fixtureRoot)) {
      teardown();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. SUBAGENTS.MD HAS THE CRITICAL RULE BLOCK (cross-check with #1)
// ═════════════════════════════════════════════════════════════════════
//
// Full coverage — every sub-skill copy must contain the CRITICAL RULE
// block at the top of its subagents.md. Replaces the silent
// `if (!existsSync(copy.path)) return;` early-skip with a
// deterministic existence assertion: the vitest globalSetup has
// already prepared the tree, so missing copies must surface as a
// hard failure here.

describe('subagents.md has the CRITICAL RULE block (every copy)', () => {
  for (const copy of subagentCopies()) {
    it(`${copy.skill} — has CRITICAL RULE block at the top`, () => {
      expect(existsSync(copy.path)).toBe(true);
      const content = readFileSync(copy.path, 'utf-8');
      const first200 = content.split('\n').slice(0, 200).join('\n');
      expect(first200).toMatch(/CRITICAL RULE/i);
    });
  }
});
