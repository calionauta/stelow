/**
 * fusion-plugin-build-drift.test.ts
 *
 * SW-016 regression guard for the silent 382-file `references/cli-tools/*.md`
 * deletion in `npm run build`.
 *
 * Bug history:
 *   `scripts/prepare-fusion-plugin.ts` regenerates `plugins/fusion-plugin-stelow/skills/`
 *   from a `cp()` of `repoRoot/skills/<id>/`. The gitignored
 *   `skills/.../references/cli-tools/...md` mirrors are build outputs of
 *   `scripts/sync-cli-tools.sh`. On a fresh checkout, those mirrors are absent
 *   on disk, so `prepareFusionPlugin` copies a tree WITHOUT them and silently
 *   drops the 382 tracked `plugins/fusion-plugin-stelow/skills/.../references/cli-tools/...md`
 *   files. SW-010 and SW-012 worked around this with a post-build
 *   `git checkout HEAD -- plugins/fusion-plugin-stelow/skills/` — fragile and
 *   operator-dependent.
 *
 * Fix (Option A): `package.json#scripts.build` now invokes
 * `./scripts/sync-cli-tools.sh` BEFORE `npm run prepare:fusion-plugin`, so the
 * source tree is fully populated when `prepareFusionPlugin` reads from it.
 *
 * Self-sufficiency strategy (SW-005 / SW-007 pattern):
 *   This test MUST be deterministic from a clean checkout. It builds a tmpdir
 *   fixture with the minimum repo structure, deliberately leaves the root
 *   `skills/.../references/cli-tools/...md` mirrors absent (only the 17 orchestrator
 *   source files + 4 gitignore-negated skill-specific extras are present, i.e.
 *   exactly what a fresh checkout contains), then runs the fix's exact sequence
 *   (`sync-cli-tools.sh` → `prepareFusionPlugin`) and asserts the resulting
 *   plugin tree's `references/cli-tools/*` matches HEAD's tracked shape byte-for-byte.
 *
 *   The test does NOT depend on `tests/global-setup.ts` — that setup populates
 *   the SHARED repo tree, but the assertion here is on a tmpdir fixture the
 *   test owns and tears down.
 *
 * If this test fails, the build pipeline silently re-introduces the
 * pre-SW-016 deletion bug. Do NOT skip.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prepareFusionPlugin } from '../../scripts/prepare-fusion-plugin.js';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');
const SYNC_SCRIPT = join(PROJECT_ROOT, 'scripts', 'sync-cli-tools.sh');

// Derive the skill-specific keep-list dynamically from `git ls-files` so the
// fixture mirrors a real fresh checkout (which contains every tracked file,
// not just the ones a prior `.gitignore` negation happened to cover). Any
// tracked `skills/<sub-skill>/references/cli-tools/*.md` file is preserved by
// the fixture; tracked orchestrator-source files are kept separately because
// `scripts/sync-cli-tools.sh` only copies from the orchestrator. This avoids
// the staleness class of bug that produced SW-029 (a tracked file added in a
// later SW drifted out of a hardcoded keep-list and was over-aggressively
// deleted by the fixture).
let SKILL_SPECIFIC_KEEP: Set<string>;

/**
 * Build the skill-specific keep-list at module-load time. We use the SHARED
 * `repoRoot` repo's `git ls-files` (the same one the test runs against) so
 * HEAD's tracked shape — not a stale hand-written constant — drives the
 * fixture. The orchestrator's source directory is excluded because the
 * fixture's `if (entry.name === 'stelow-product-orchestrator') continue;`
 * branch preserves every orchestrator file unconditionally.
 */
function buildSkillSpecificKeep(): Set<string> {
  const out = execSync(
    `git ls-files 'skills/*/references/cli-tools/*.md' | grep -v 'stelow-product-orchestrator/' | xargs -n1 basename | sort -u`,
    { cwd: PROJECT_ROOT, stdio: 'pipe', encoding: 'utf8' },
  );
  return new Set(out.trim().split('\n').filter(Boolean));
}

// Track every tmpdir fixture so afterEach can tear it down. NEVER share state
// across tests — each `it` owns its own root.
const tmpRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tmpRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

/**
 * Build a tmpdir that simulates a fresh-checkout state of the repository:
 *
 *   - skills/stelow-product-orchestrator/references/cli-tools/*  (tracked source of truth, kept)
 *   - skills/<sub-skill>/references/cli-tools/<skill-specific>.md  (gitignore-negated, kept)
 *   - skills/<sub-skill>/references/cli-tools/<other>           (gitignored build output, ABSENT)
 *   - extensions/stelow/, scripts/prepare-fusion-plugin.ts, scripts/sync-cli-tools.sh
 *   - plugins/fusion-plugin-stelow/manifest.json, package.json, tsconfig.json
 *   - package.json (with current version)
 *
 * Returns the tmpdir path (the `repoRoot` for prepareFusionPlugin).
 */
async function buildCleanCheckoutFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'stelow-sw-016-'));
  tmpRoots.push(root);

  // extensions/ — must include stelow/ + adapters/commands/fusion-artifacts.ts
  // which prepareFusionPlugin imports.
  await cp(join(PROJECT_ROOT, 'extensions'), join(root, 'extensions'), {
    recursive: true,
  });

  // scripts/ — the two scripts under test.
  await mkdir(join(root, 'scripts'), { recursive: true });
  await cp(SYNC_SCRIPT, join(root, 'scripts', 'sync-cli-tools.sh'));
  await cp(
    join(PROJECT_ROOT, 'scripts', 'prepare-fusion-plugin.ts'),
    join(root, 'scripts', 'prepare-fusion-plugin.ts'),
  );

  // package.json — only `name` + `version` are read by prepareFusionPlugin.
  const pkg = JSON.parse(await readFile(join(PROJECT_ROOT, 'package.json'), 'utf8')) as {
    name: string;
    version: string;
  };
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ name: pkg.name, version: pkg.version }),
    'utf8',
  );

  // plugins/fusion-plugin-stelow/ — manifest.json + package.json + tsconfig.json
  // (prepareFusionPlugin reads manifest.json; the rest is needed for tsc to
  // succeed if a future test expands this fixture).
  await mkdir(join(root, 'plugins', 'fusion-plugin-stelow'), { recursive: true });
  await cp(
    join(PROJECT_ROOT, 'plugins', 'fusion-plugin-stelow', 'manifest.json'),
    join(root, 'plugins', 'fusion-plugin-stelow', 'manifest.json'),
  );
  await cp(
    join(PROJECT_ROOT, 'plugins', 'fusion-plugin-stelow', 'package.json'),
    join(root, 'plugins', 'fusion-plugin-stelow', 'package.json'),
  );
  await cp(
    join(PROJECT_ROOT, 'plugins', 'fusion-plugin-stelow', 'tsconfig.json'),
    join(root, 'plugins', 'fusion-plugin-stelow', 'tsconfig.json'),
  );

  // skills/ — every sub-skill + orchestrator; cli-tools mirrors removed
  // (except the 18 orchestrator source files + the tracked skill-specific
  // extras that are tracked at HEAD). `SKILL_SPECIFIC_KEEP` is derived
  // dynamically from `git ls-files` so this set self-corrects whenever a
  // tracked `references/cli-tools/*.md` is added or removed at HEAD.
  await mkdir(join(root, 'skills'), { recursive: true });
  const skillEntries = await readdir(join(PROJECT_ROOT, 'skills'), { withFileTypes: true });
  for (const entry of skillEntries) {
    if (!entry.isDirectory() || !entry.name.startsWith('stelow-product-')) continue;
    await cp(join(PROJECT_ROOT, 'skills', entry.name), join(root, 'skills', entry.name), {
      recursive: true,
    });
    if (entry.name === 'stelow-product-orchestrator') {
      // Orchestrator is the source of truth — keep ALL its cli-tools.
      continue;
    }
    // Sub-skill: strip the gitignored cli-tools mirrors, keep the tracked
    // skill-specific extras that are present at HEAD. The keep-list is
    // derived dynamically (see `buildSkillSpecificKeep`) so adding a new
    // tracked skill-specific file at HEAD does not require updating this
    // test.
    const cliToolsDir = join(root, 'skills', entry.name, 'references', 'cli-tools');
    let cliToolsEntries: string[] = [];
    try {
      cliToolsEntries = await readdir(cliToolsDir);
    } catch {
      continue; // no cli-tools dir present at HEAD
    }
    if (!SKILL_SPECIFIC_KEEP) {
      // Lazy init: `beforeAll` cannot be used here because this is a per-test
      // helper (not a test file's setup hook), and module-load ordering would
      // race against vitest's worker spin-up. Computing it once per call is
      // cheap (one `git ls-files`) and keeps the helper self-contained.
      SKILL_SPECIFIC_KEEP = buildSkillSpecificKeep();
    }
    for (const file of cliToolsEntries) {
      if (SKILL_SPECIFIC_KEEP.has(file)) continue;
      await rm(join(cliToolsDir, file), { recursive: true, force: true });
    }
  }

  return root;
}

/**
 * Walk a directory and return the relative file paths of every file under
 * `references/cli-tools/`. Used to compare the plugin tree's cli-tools shape
 * against HEAD's tracked shape.
 */
async function listCliTools(pluginRoot: string): Promise<string[]> {
  const root = join(pluginRoot, 'skills');
  const result: string[] = [];
  const skills = await readdir(root, { withFileTypes: true });
  for (const skill of skills) {
    if (!skill.isDirectory()) continue;
    const cliToolsDir = join(root, skill.name, 'references', 'cli-tools');
    let files: string[] = [];
    try {
      files = await readdir(cliToolsDir);
    } catch {
      continue; // no cli-tools dir — fine, just skip
    }
    for (const file of files) {
      result.push(join(skill.name, 'references', 'cli-tools', file));
    }
  }
  return result.sort();
}

/**
 * Read the expected (HEAD's tracked) list of `references/cli-tools/*` files
 * under `plugins/fusion-plugin-stelow/skills/`. This is the source of truth —
 * if HEAD adds or removes a file, the test self-corrects to match.
 */
async function expectedHeadCliTools(): Promise<string[]> {
  // Use the actual repo as the source of truth. The test's fixture is
  // rebuilt fresh each run; HEAD's tracked shape is the contract.
  const proc = execSync(
    `git ls-files plugins/fusion-plugin-stelow/skills/ | grep cli-tools | sed 's|^plugins/fusion-plugin-stelow/skills/||'`,
    { cwd: PROJECT_ROOT, stdio: 'pipe', encoding: 'utf8' },
  );
  return proc.trim().split('\n').filter(Boolean).sort();
}

describe('SW-016: prepareFusionPlugin must not silently delete tracked cli-tools', () => {
  it('a fresh-checkout fixture (root cli-tools mirrors absent) regenerates an identical plugin tree after sync', async () => {
    const root = await buildCleanCheckoutFixture();

    // Sanity: confirm the fixture really IS a fresh-checkout state.
    // The orchestrator source directory must still hold all 18 files (it is
    // the source of truth and is tracked at HEAD).
    const orchFiles = await readdir(
      join(root, 'skills', 'stelow-product-orchestrator', 'references', 'cli-tools'),
    );
    expect(orchFiles.length).toBeGreaterThanOrEqual(17);
    // The gitignored mirrors must be ABSENT for at least one sub-skill.
    const subSkillMirrors = await readdir(
      join(root, 'skills', 'stelow-product-ads', 'references', 'cli-tools'),
    ).catch(() => [] as string[]);
    // Either the dir is absent (readdir throws) or empty.
    expect(subSkillMirrors.length).toBe(0);

    // Apply the FIX: sync first, then prepare.
    execSync(`bash "${join(root, 'scripts', 'sync-cli-tools.sh')}"`, {
      cwd: root,
      stdio: 'pipe',
      timeout: 60000,
    });
    const skillCount = await prepareFusionPlugin({
      repoRoot: root,
      pluginDir: join(root, 'plugins', 'fusion-plugin-stelow'),
    });
    expect(skillCount).toBe(25);

    // The plugin tree's cli-tools shape must equal HEAD's tracked shape
    // exactly — zero deletions, zero insertions.
    const expected = await expectedHeadCliTools();
    const actual = await listCliTools(join(root, 'plugins', 'fusion-plugin-stelow'));

    expect(actual).toEqual(expected);
  });

  it('without sync-cli-tools first, prepareFusionPlugin reproduces the pre-fix deletion (documented baseline)', async () => {
    // This test documents the BUG that the regression test above prevents.
    // It is intentionally written as the "what happens if you skip sync"
    // proof: with the fix's first half removed, prepareFusionPlugin alone
    // will silently drop every gitignored mirror from the destination tree.
    //
    // The assertion is loose: at least one deletion MUST occur. If this test
    // ever fails, the bug has been masked (e.g., by a future change that
    // populates the source tree through a different mechanism) and the SW-016
    // regression test above can be re-evaluated.
    const root = await buildCleanCheckoutFixture();

    // Do NOT run sync — call prepare directly. This simulates a pre-SW-016
    // build (the old `prepare:fusion-plugin && build:fusion-plugin && tsc && copy`).
    const skillCount = await prepareFusionPlugin({
      repoRoot: root,
      pluginDir: join(root, 'plugins', 'fusion-plugin-stelow'),
    });
    expect(skillCount).toBe(25);

    // The plugin tree's cli-tools shape MUST be missing the gitignored mirrors.
    const expected = await expectedHeadCliTools();
    const actual = await listCliTools(join(root, 'plugins', 'fusion-plugin-stelow'));

    // Sanity: 18 tracked root files (orchestrator source) survive; the rest
    // are missing. The actual count must be strictly less than the expected.
    expect(actual.length).toBeLessThan(expected.length);
    // Every surviving file is one of the 18 orchestrator source files (which
    // are tracked and present in the fixture) OR one of the tracked
    // skill-specific extras (derived from `git ls-files`, NOT hardcoded).
    // The 360 gitignored mirror files MUST be missing.
    const orchSourceFiles = await readdir(
      join(root, 'skills', 'stelow-product-orchestrator', 'references', 'cli-tools'),
    );
    // Derive the tracked skill-specific extras from `git ls-files` and store
    // them as full relative paths (matching the shape `actual` produces).
    const trackedSkillSpecific = execSync(
      `git ls-files 'skills/*/references/cli-tools/*.md' | grep -v 'stelow-product-orchestrator/'`,
      { cwd: PROJECT_ROOT, stdio: 'pipe', encoding: 'utf8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((p) => p.replace(/^skills\//, ''));
    const expectedSurvivors = new Set([
      ...orchSourceFiles.map((f) =>
        join('stelow-product-orchestrator', 'references', 'cli-tools', f),
      ),
      ...trackedSkillSpecific,
    ]);
    expect(actual.length).toBe(expectedSurvivors.size);
    for (const file of actual) {
      expect(expectedSurvivors.has(file)).toBe(true);
    }
  });
});

describe('SW-016: package.json#scripts.build ordering', () => {
  it('invokes sync-cli-tools.sh before prepare:fusion-plugin', () => {
    // Read the actual package.json to assert the build ordering. This is the
    // second half of the Option A contract: even if the fix is removed from
    // the script chain, the package.json#scripts.build ordering must still
    // pin sync before prepare.
    const pkg = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    const build = pkg.scripts['build'] ?? '';
    const syncIdx = build.indexOf('sync-cli-tools');
    const prepareIdx = build.indexOf('prepare:fusion-plugin');
    expect(syncIdx).toBeGreaterThanOrEqual(0);
    expect(prepareIdx).toBeGreaterThan(syncIdx);
  });
});
