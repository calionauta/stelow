/**
 * check-version-coherence.test.ts
 *
 * SW-034 integration test for the v0.55.2 release-drift guard. The guard
 * exists because SW-028 (`27188f7`) deliberately rolled back the source-side
 * `package.json#version` from v0.55.2 to v0.55.1 without declaring intent; the
 * drift was only caught by manual `git show` long after merge.
 *
 * These tests exercise the full guard against real bare-remote git fixtures.
 * Each scenario builds its own tmpdir with a `git init --bare origin.git`
 * remote so that `origin/main` and the annotated tag are real refs in the
 * fixture — without that, every mismatch scenario would silently fall into
 * the no-tag fallback and pass.
 *
 * If any scenario regresses, the post-mortem at
 * docs/agents-md-refs/post-mortems/v0.55.2-release-drift.md has resurfaced.
 * Do NOT skip.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');
const SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'check-version-coherence.sh');

// Track every tmpdir fixture so afterEach tears it down. Each scenario owns
// its own root so scenarios are independent — no shared git state.
const tmpRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tmpRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

type FixtureOptions = {
  annotatedTag?: string | null;
  initialVersion: string;
  followupVersion?: string | null;
  followupMessage?: string;
  // Optional pretty-print format for the package.json written for the
  // followup commit (defaults to minified one-line JSON).
  prettyPackageJson?: boolean;
};

type Fixture = {
  workDir: string;
  remoteDir: string;
  scriptPath: string;
  packageJson: string;
};

/**
 * Build a tmpdir fixture with a real `origin` remote. The bare remote gets
 * every push (so `origin/main` and the annotated tag exist as real refs), and
 * the working copy mirrors a typical checkout.
 *
 * For scenarios that need a commit-msg-style staged change (scenarios 3 and 5
 * below), the fixture also leaves `package.json` re-staged in the index with
 * the followup version so `git diff --cached -- package.json` returns a
 * non-empty diff.
 *
 * Scenario layout:
 *   root/
 *     origin.git/   (bare)
 *     work/         (working copy; `scripts/check-version-coherence.sh` is copied here)
 */
async function buildFixture(opts: FixtureOptions): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'stelow-sw034-'));
  tmpRoots.push(root);

  const remoteDir = join(root, 'origin.git');
  const workDir = join(root, 'work');
  await mkdir(remoteDir, { recursive: true });
  await mkdir(workDir, { recursive: true });

  // 1. bare origin remote — every scenario gets one so `origin/main` is real.
  execFileSync('git', ['init', '--bare', remoteDir], { stdio: 'pipe' });

  // 2. working repo, main branch (explicit; CI environment is consistent).
  execFileSync('git', ['init', '-b', 'main', workDir], { stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: workDir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: workDir, stdio: 'pipe' });
  execFileSync('git', ['remote', 'add', 'origin', remoteDir], { cwd: workDir, stdio: 'pipe' });
  // Force git to not emit pager; otherwise `git log` from the script can hang
  // in interactive shells.
  execFileSync('git', ['config', 'core.pager', 'cat'], { cwd: workDir, stdio: 'pipe' });
  // The script depends on `origin/main` resolving to a real ref; force a
  // fetch so annotated-tag resolution succeeds on bare-remote fixtures.
  execFileSync(
    'git',
    ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'],
    { cwd: workDir, stdio: 'pipe' },
  );

  const packageJsonPath = join(workDir, 'package.json');
  const writePackageJson = async (version: string): Promise<void> => {
    const pkg = opts.prettyPackageJson
      ? `{\n  "name": "fixture",\n  "version": "${version}"\n}\n`
      : JSON.stringify({ name: 'fixture', version });
    await writeFile(packageJsonPath, pkg, 'utf8');
  };

  // 3. seed package.json + initial commit + push.
  await writePackageJson(opts.initialVersion);
  execFileSync('git', ['add', 'package.json'], { cwd: workDir, stdio: 'pipe' });
  execFileSync('git', ['commit', '-m', 'chore: initial commit'], { cwd: workDir, stdio: 'pipe' });
  execFileSync('git', ['push', 'origin', 'main'], { cwd: workDir, stdio: 'pipe' });

  // 4. optional annotated tag + push.
  if (opts.annotatedTag) {
    execFileSync('git', ['tag', '-a', opts.annotatedTag, '-m', opts.annotatedTag], {
      cwd: workDir,
      stdio: 'pipe',
    });
    execFileSync('git', ['push', 'origin', opts.annotatedTag], { cwd: workDir, stdio: 'pipe' });
  }

  // 5. optional follow-up commit that mutates `package.json#version`.
  if (opts.followupVersion) {
    await writePackageJson(opts.followupVersion);
    execFileSync('touch', [packageJsonPath], { stdio: 'pipe' });
    execFileSync('git', ['add', 'package.json'], { cwd: workDir, stdio: 'pipe' });
    const body = opts.followupMessage ?? `chore: bump to ${opts.followupVersion}`;
    execFileSync('git', ['commit', '-m', body], { cwd: workDir, stdio: 'pipe' });
    execFileSync('git', ['push', 'origin', 'main'], { cwd: workDir, stdio: 'pipe' });
  }

  // 6. copy the script under test into the working dir so the script's
  // `cd "$(git rev-parse --show-toplevel)"` lands inside the fixture and not
  // the SHARED repo tree.
  await mkdir(join(workDir, 'scripts'), { recursive: true });
  const scriptPath = join(workDir, 'scripts', 'check-version-coherence.sh');
  await copyFile(SCRIPT_PATH, scriptPath);
  execFileSync('chmod', ['+x', scriptPath], { stdio: 'pipe' });

  return {
    workDir,
    remoteDir,
    scriptPath,
    packageJson: packageJsonPath,
  };
}

type RunResult = {
  status: number;
  stdout: string;
  stderr: string;
};

async function runScript(workDir: string, scriptPath: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    execFile(
      'bash',
      [scriptPath, ...args],
      { cwd: workDir, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        const result: RunResult = {
          status:
            error && 'code' in error && typeof error.code === 'number' ? error.code : 0,
          stdout,
          stderr,
        };
        if (error && (error as { killed?: boolean }).killed) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );
  });
}

/**
 * Stage a pending `package.json#version` change so the commit-msg mode of
 * the script's `git diff --cached -- package.json` returns a non-empty
 * diff. Mirrors what the husky commit-msg hook sees: the index has the
 * change but the commit has not been finalised yet.
 */
async function stagePendingVersionChange(fx: Fixture, version: string): Promise<void> {
  await writeFile(fx.packageJson, JSON.stringify({ name: 'fixture', version }), 'utf8');
  execFileSync('touch', [fx.packageJson], { stdio: 'pipe' });
  execFileSync('git', ['add', 'package.json'], { cwd: fx.workDir, stdio: 'pipe' });
}

describe('SW-034: check-version-coherence.sh tag-aware guard', () => {
  it('scenario 1: matching tag, no trailer (pass — proves the tag-match path independently)', async () => {
    const fx = await buildFixture({ annotatedTag: 'v0.55.2', initialVersion: '0.55.2' });

    const result = await runScript(fx.workDir, fx.scriptPath, ['--mode=ci']);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('::error::');
    expect(result.stderr).not.toContain('::error::');
    expect(result.stdout).toContain('matches latest annotated tag');
  });

  it('scenario 2: mismatch without trailer (fail — symptom-reproduction of SW-028)', async () => {
    const fx = await buildFixture({
      annotatedTag: 'v0.55.2',
      initialVersion: '0.55.2',
      followupVersion: '0.55.1',
      followupMessage: 'chore(SW-028): restore canonical v0.55.1 baseline',
    });

    const result = await runScript(fx.workDir, fx.scriptPath, ['--mode=ci']);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('::error::');
    expect(result.stdout).toContain('package.json#version');
    expect(result.stdout).toContain('0.55.1');
    expect(result.stdout).toContain('v0.55.2');
    expect(result.stdout).toContain('v0.55.2-release-drift.md');
  });

  it('scenario 3: mismatch with Rollback: trailer including reason (pass — commit-msg mode)', async () => {
    const fx = await buildFixture({
      annotatedTag: 'v0.55.2',
      initialVersion: '0.55.2',
      followupVersion: '0.55.1',
      followupMessage:
        'chore(SW-028): restore canonical v0.55.1 baseline\n\nRollback: v0.55.2 → v0.55.1 — defer v0.55.2 release artifacts; see post-mortem',
    });
    // Stage a DIFFERENT version (HEAD is already 0.55.1 from the followup
    // commit) so the index diff is non-empty. Writing 0.55.1 here would
    // produce an empty diff and the script would return 0 early without
    // ever checking the trailer — masking the very behaviour this
    // scenario is supposed to cover.
    await stagePendingVersionChange(fx, '0.55.0');

    const messagePath = join(fx.workDir, 'msg');
    await writeFile(
      messagePath,
      'chore(SW-028): restore canonical v0.55.1 baseline\n\nRollback: v0.55.2 → v0.55.1 — defer v0.55.2 release artifacts; see post-mortem\n',
      'utf8',
    );

    const result = await runScript(fx.workDir, fx.scriptPath, [
      '--hook=commit-msg',
      messagePath,
    ]);

    expect(result.status).toBe(0);
  });

  it('scenario 4: mismatch with Release-Bump: trailer (pass — legitimate forward bump)', async () => {
    const fx = await buildFixture({
      annotatedTag: 'v0.55.2',
      initialVersion: '0.55.2',
      followupVersion: '0.55.3',
      followupMessage: 'chore: bump to v0.55.3\n\nRelease-Bump: v0.55.3',
    });

    const result = await runScript(fx.workDir, fx.scriptPath, ['--mode=ci']);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('::error::');
  });

  it('scenario 5: Rollback: trailer WITHOUT reason (fail — commit-msg mode)', async () => {
    const fx = await buildFixture({
      annotatedTag: 'v0.55.2',
      initialVersion: '0.55.2',
      followupVersion: '0.55.1',
      followupMessage:
        'chore(SW-028): restore canonical v0.55.1 baseline\n\nRollback: v0.55.2 → v0.55.1',
    });
    // Stage a different version (the forward bump) so the index diff is
    // non-empty; the message-file rollback reason check is what fails.
    await stagePendingVersionChange(fx, '0.55.3');

    const messagePath = join(fx.workDir, 'msg');
    await writeFile(
      messagePath,
      'chore(SW-028): restore canonical v0.55.1 baseline\n\nRollback: v0.55.2 → v0.55.1\n',
      'utf8',
    );

    const result = await runScript(fx.workDir, fx.scriptPath, [
      '--hook=commit-msg',
      messagePath,
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('mandatory reason');
  });

  it('scenario 6: no annotated tag (pass with warning — first-release scenario)', async () => {
    const fx = await buildFixture({
      annotatedTag: null,
      initialVersion: '0.55.0',
    });

    const result = await runScript(fx.workDir, fx.scriptPath, ['--mode=ci']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('::warning::');
    expect(result.stdout).toContain('no annotated tag');
  });
});