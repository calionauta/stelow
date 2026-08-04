/**
 * Advisory file lock (G3A from stelow-reliability plan)
 *
 * Prevents read-modify-write races on stelow.json when multiple
 * agents/sessions write concurrently. Without this, two parallel
 * `readTracking → mutate → writeTracking` calls can:
 *   - Both read the same state
 *   - Both write back
 *   - One's mutation is silently lost
 *
 * Algorithm: O_EXCL atomic create of a lock file in `.stelow/.lock`.
 * The OS guarantees that `open(O_EXCL)` succeeds for exactly one
 * process at a time. If it fails, another writer holds the lock;
 * we wait with exponential backoff and retry.
 *
 * Stale lock recovery: lock files have a TTL (default 10s). If the
 * holder process crashes mid-write, the stale lock is reclaimed
 * after the TTL. The TTL is checked by comparing mtime.
 *
 * POSIX-portable (uses openSync + closeSync + unlinkSync from
 * node:fs). Works on macOS + Linux. Windows has different locking
 * semantics but stelow is a Node.js project targeting Mac/Linux.
 *
 * Convention over configuration:
 *  - Default TTL: 10 seconds (most writes complete in <1s)
 *  - Default max retries: 50 (≈ 5s total wait before throwing)
 *  - Lock file path: `<dir>/.stelow/.lock` (same dir as stelow.json)
 */

import { openSync, closeSync, unlinkSync, statSync, writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";

const DEFAULT_TTL_MS = 10_000;
const DEFAULT_MAX_RETRIES = 50;
const RETRY_BASE_DELAY_MS = 50; // doubles each retry up to 200ms cap

export class FileLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileLockError";
  }
}

export interface LockOptions {
  /** Lock TTL in ms. Stale locks older than this can be reclaimed. */
  ttlMs?: number;
  /** Max retries before throwing. */
  maxRetries?: number;
}

/**
 * Acquire an exclusive advisory lock on a directory. Returns a release
 * function. Blocks until the lock is acquired or the timeout is
 * reached (throws FileLockError).
 *
 * Usage:
 *   const release = await acquireFileLock(workDir);
 *   try { writeTracking(...) } finally { await release(); }
 */
export function acquireFileLock(dir: string, opts: LockOptions = {}): () => void {
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const lockPath = join(dir, ".stelow", ".lock");
  const lockDir = dirname(lockPath);
  mkdirSync(lockDir, { recursive: true });

  // Try to acquire the lock, retry with exponential backoff.
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (tryAcquire(lockPath, ttlMs)) {
      return () => releaseLock(lockPath);
    }
    // Backoff: 50, 75, 112, 168, 200, 200, ... (capped at 200ms)
    const delay = Math.min(RETRY_BASE_DELAY_MS * Math.pow(1.5, attempt), 200);
    sleepSync(delay);
  }
  throw new FileLockError(
    `Could not acquire lock at ${lockPath} after ${maxRetries} retries. ` +
    `A holder may be stuck. Check for stale .stelow/.lock or kill stale processes.`,
  );
}

/** Try to acquire the lock once. Returns true on success, false on contention. */
function tryAcquire(lockPath: string, ttlMs: number): boolean {
  // Stale lock check: if a lock file exists but is older than the TTL,
  // we can reclaim it. We must do this atomically — open with O_EXCL
  // and check the mtime inside the same syscall chain.
  if (existsSync(lockPath)) {
    try {
      const stat = statSync(lockPath);
      const age = Date.now() - stat.mtimeMs;
      if (age > ttlMs) {
        // Stale — try to remove and re-acquire
        try {
          unlinkSync(lockPath);
        } catch {
          // Another process removed it first — that's fine
        }
      } else {
        return false; // held by another live process
      }
    } catch {
      return false; // can't stat — treat as held
    }
  }

  // Atomic create. O_EXCL fails if the file already exists.
  try {
    const fd = openSync(lockPath, "wx"); // 'wx' = O_WRONLY | O_CREAT | O_EXCL
    // Write the pid + timestamp for diagnostics
    writeFileSync(fd, JSON.stringify({
      pid: process.pid,
      acquiredAt: new Date().toISOString(),
    }));
    closeSync(fd);
    return true;
  } catch (err: any) {
    if (err.code === "EEXIST") return false;
    throw err;
  }
}

function releaseLock(lockPath: string): void {
  try {
    if (existsSync(lockPath)) {
      // Only delete if we are the holder (best-effort check)
      const content = readFileSync(lockPath, "utf-8");
      try {
        const meta = JSON.parse(content);
        if (meta.pid === process.pid) {
          unlinkSync(lockPath);
        }
      } catch {
        // Corrupt lock — leave for TTL
      }
    }
  } catch {
    // Best-effort release
  }
}

/** Sync sleep (ms). Used to backoff between lock retries. */
function sleepSync(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // Busy-wait. OK for short backoff (max 200ms).
  }
}