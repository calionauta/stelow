/**
 * Vitest global setup — runs ONCE before any test file.
 *
 * Generated non-orchestrator `references/cli-tools/*.md` mirrors are
 * gitignored build outputs of `scripts/sync-cli-tools.sh`. In a
 * clean source checkout they are absent on disk, which surfaces as
 * ENOENT failures in test suites that read those paths.
 *
 * `scripts/sync-cli-tools.sh` is **not parallel-safe**: two
 * concurrent invocations racing on a partially-populated tree
 * produce `cp: cannot create regular file ... File exists` errors
 * because both processes see a missing file at the same time and
 * try to copy the same source path. Vitest's per-file worker
 * parallelism can race two test files' `beforeAll` hooks against
 * each other unless we serialize this work globally.
 *
 * Running the sync as a global setup ensures exactly one
 * invocation completes BEFORE any test file's imports or
 * `beforeAll` runs. Test files remain self-sufficient: they see a
 * populated tree and don't need their own `beforeAll` sync step.
 *
 * The sync is also idempotent — if mirrors already exist,
 * `--check-only` semantics skip unchanged files.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..');

const SYNC_SCRIPT = join(PROJECT_ROOT, 'scripts/sync-cli-tools.sh');

export async function setup(): Promise<void> {
  if (!existsSync(SYNC_SCRIPT)) {
    throw new Error(`Sync script not found at ${SYNC_SCRIPT}`);
  }
  try {
    execSync(`bash "${SYNC_SCRIPT}"`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 60000,
    });
  } catch (err) {
    throw new Error(
      `Global setup sync of cli-tools mirrors failed. ` +
        `Cause: ${(err as Error).message}`,
    );
  }
}
