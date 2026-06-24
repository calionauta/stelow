/**
 * workflow-root.ts — Single source of truth for "what worktree does this cwd
 * belong to?" across the stelow extension, the muxy panel, and the herdr
 * split-pane TUI.
 *
 * History: the extension used to climb up to a parent directory whenever the
 * cwd had no `stelow.json` of its own. This was meant to handle "user is
 * inside src/ but tracking is at repo root". In practice, it caused a real
 * bug: when a user runs /sw-start in /Users/cali/Development/PROJECT-X
 * (which has no .stelow), the resolver climbed up to /Users/cali/Development
 * (which DID have .stelow from a previous workflow) and falsely reported an
 * active workflow, blocking /sw-start.
 *
 * Fix: only climb up when the parent is the git toplevel of the cwd. This
 * means: "user is in a subdir of a git repo, and tracking lives at repo root"
 * — the original intent — without conflating it with "user is in a sibling
 * project under a shared parent directory".
 *
 * This is the canonical TypeScript implementation. The muxy panel mirrors
 * it (see integrations/muxy/stelow-board/src/panel/data.js — search for
 * "MIRROR of workflow-root"). The herdr Rust plugin uses a different
 * mechanism (HERDR_PLUGIN_CONTEXT_JSON.workspace_cwd from herdr runtime)
 * that achieves the same effect without git calls.
 */
import { execSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";

const WORKFLOW_DIR = ".stelow";
const TRACKING_FILE = "stelow.json";

/**
 * Find the project root that owns the workflow state for `cwd`.
 *
 * Resolution order:
 *   1. cwd itself — if it has `.stelow/` or `stelow.json`, it IS the project.
 *   2. Walk up to git toplevel of cwd — if a parent has `.stelow/` or
 *      `stelow.json`, use it. This handles "user is in src/ but tracking is
 *      at repo root".
 *   3. cwd as fallback — treat as new project, will create tracking here.
 *
 * The git-toplevel check is the critical part: it prevents the previous
 * bug where a sibling project (no git relationship) under a shared parent
 * got falsely attributed to the parent's workflow state.
 *
 * @param cwd Absolute path (resolved). Tilde (~) NOT expanded.
 * @returns The project root path. Same as cwd if no project root found.
 */
export function findProjectWorkflowRoot(cwd: string): string {
  // realpathSync resolves symlinks (e.g. macOS /var/folders/... → /private/var/folders/...)
  // and ensures absolute paths. We do this for both input and the git-root
  // result so they're directly comparable in tests and in callers.
  const absolute = safeRealpath(cwd);

  // 1. cwd has its own tracking → it's the project root.
  if (hasTracking(absolute)) return absolute;

  // 2. Walk up to git toplevel of cwd. If a parent has tracking, use it.
  const gitRoot = tryGitToplevel(absolute);
  if (gitRoot && gitRoot !== absolute) {
    if (hasTracking(gitRoot)) return gitRoot;
  }

  // 3. Fallback: cwd is a new project (or has no tracking yet).
  return absolute;
}

/** Does this directory contain workflow tracking files? */
function hasTracking(dir: string): boolean {
  return existsSync(join(dir, WORKFLOW_DIR)) ||
         existsSync(join(dir, TRACKING_FILE));
}

/**
 * Run `git rev-parse --show-toplevel` to find the git repo root.
 * Returns null if cwd is not inside a git repo or git isn't available.
 *
 * Time-budgeted: if git is slow or hangs (large repo, network fs), we
 * fall back to returning null. The cwd is then treated as not-inside-a-git-repo.
 */
function tryGitToplevel(cwd: string): string | null {
  try {
    const out = execSync("git rev-parse --show-toplevel", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
      windowsHide: true,
    }).trim();
    if (!out) return null;
    // Resolve symlinks so callers can compare paths byte-for-byte.
    return safeRealpath(out);
  } catch {
    // Not in a git repo, git not installed, timeout, permission denied, etc.
    return null;
  }
}

/**
 * Best-effort realpath. Falls back to resolve() if realpath fails
 * (e.g. path doesn't exist yet — common when cwd is a fresh project).
 */
function safeRealpath(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}

/**
 * @deprecated Use `findProjectWorkflowRoot` instead. Retained as an alias
 * for backward compatibility with existing imports.
 */
export const resolveProjectDir = findProjectWorkflowRoot;