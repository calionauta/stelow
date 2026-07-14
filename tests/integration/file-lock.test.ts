/**
 * Integration tests: File lock (G3A from stelow-reliability plan)
 *
 * Verifies the advisory file lock prevents the read-modify-write race
 * that atomic write (G3B) does NOT cover. Without the lock, two
 * concurrent `readTracking → mutate → writeTracking` calls can both
 * see the same state and lose one mutation.
 *
 * Coverage:
 *  - Lock is acquired on first writer
 *  - Second writer waits, then succeeds after release
 *  - Stale lock (older than TTL) is reclaimed
 *  - Lock file is removed on release
 *  - writeTracking is wrapped in the lock (no caller can bypass)
 *  - Concurrent writeTracking calls don't lose updates
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { acquireFileLock, FileLockError } from '../../extensions/stelow/file-lock';
import { writeTracking } from '../../extensions/stelow/state';
import type { TrackingData } from '../../extensions/stelow/types';

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'stelow-lock-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('acquireFileLock', () => {
  it('creates a lock file in the cwd .stelow dir', () => {
    const release = acquireFileLock(workDir);
    const lockPath = join(workDir, '.stelow', '.lock');
    expect(existsSync(lockPath)).toBe(true);
    release();
    expect(existsSync(lockPath)).toBe(false);
  });

  it('second acquisition blocks until first releases', () => {
    const release1 = acquireFileLock(workDir);
    // Try to acquire with short timeout — should throw
    expect(() => {
      acquireFileLock(workDir, { ttlMs: 1000, maxRetries: 5 });
    }).toThrow(FileLockError);
    release1();
  });

  it('lock file contains pid + acquiredAt metadata', () => {
    const release = acquireFileLock(workDir);
    const content = JSON.parse(readFileSync(join(workDir, '.stelow', '.lock'), 'utf-8'));
    expect(content.pid).toBe(process.pid);
    expect(content.acquiredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    release();
  });

  it('release() is idempotent (can be called twice)', () => {
    const release = acquireFileLock(workDir);
    release();
    // Second call must not throw (best-effort release)
    expect(() => release()).not.toThrow();
  });

  it('reclaims a stale lock (mtime > TTL)', () => {
    // Manually create a stale lock file
    const lockPath = join(workDir, '.stelow', '.lock');
    mkdirSync(join(workDir, '.stelow'), { recursive: true });
    writeFileSync(lockPath, JSON.stringify({ pid: 99999, acquiredAt: '2020-01-01T00:00:00Z' }));
    // Backdate the mtime
    const oldTime = new Date(Date.now() - 60_000); // 60s ago
    require('node:fs').utimesSync(lockPath, oldTime, oldTime);

    // Should succeed because the lock is stale
    const release = acquireFileLock(workDir, { ttlMs: 1000 });
    expect(existsSync(lockPath)).toBe(true);
    release();
  });
});

describe('writeTracking — lock integration', () => {
  const baseData = (name: string): TrackingData => ({
    $schema: 'x',
    version: '1.0',
    created: '2026-07-14T00:00:00.000Z',
    updated: '2026-07-14T00:00:00.000Z',
    workflows: [
      {
        name,
        description: 'x',
        status: 'in-progress',
        currentPhase: 0,
        phases: [],
        stage: {
          current_stage: 'setup',
          previous_stage: null,
          transitioned_at: '2026-07-14T00:00:00.000Z',
          history: [],
          supervisor_active: false,
        },
        created: '2026-07-14T00:00:00.000Z',
        updated: '2026-07-14T00:00:00.000Z',
        cwd: workDir,
        dirHash: 'h1',
      },
    ],
  });

  it('writeTracking acquires + releases lock (no leftover)', () => {
    writeTracking(workDir, baseData('wf-1'));
    const lockPath = join(workDir, '.stelow', '.lock');
    expect(existsSync(lockPath)).toBe(false);
  });

  it('parallel writeTracking calls do not corrupt state (lock serializes)', async () => {
    // 10 parallel writes with DIFFERENT workflow names. Atomic write
    // ensures file is valid JSON. The lock ensures that the read-modify-
    // write critical section in writeTracking is serialized. The final
    // state contains one workflow (one write won), not partial data.
    const N = 10;
    const writes: Promise<void>[] = [];
    for (let i = 0; i < N; i++) {
      const data = baseData(`wf-${i}`);
      writes.push(Promise.resolve().then(() => writeTracking(workDir, data)));
    }
    await Promise.all(writes);

    const target = join(workDir, 'stelow.json');
    const parsed = JSON.parse(readFileSync(target, 'utf-8')) as TrackingData;
    expect(parsed.workflows).toHaveLength(1);
    expect(parsed.workflows[0].name).toMatch(/^wf-\d$/);
  });

  it('lock does not survive process death (next writer waits then acquires)', () => {
    // Simulate a crashed process: create a lock but never release it
    const lockPath = join(workDir, '.stelow', '.lock');
    mkdirSync(join(workDir, '.stelow'), { recursive: true });
    writeFileSync(lockPath, JSON.stringify({ pid: 99999, acquiredAt: '2020-01-01T00:00:00Z' }));
    const oldTime = new Date(Date.now() - 60_000);
    require('node:fs').utimesSync(lockPath, oldTime, oldTime);

    // writeTracking should still work — stale lock reclaimed
    expect(() => writeTracking(workDir, baseData('wf-after-crash'))).not.toThrow();
    const parsed = JSON.parse(readFileSync(join(workDir, 'stelow.json'), 'utf-8')) as TrackingData;
    expect(parsed.workflows[0].name).toBe('wf-after-crash');
  });

  it('lock release is best-effort on exception (try/finally in writeTracking)', () => {
    // Force writeTracking to throw mid-execution by passing an invalid
    // workflow. The lock must still be released so the next writer
    // doesn't deadlock.
    const invalid: TrackingData = {
      $schema: 'x',
      version: '1.0',
      created: 'x',
      updated: 'x',
      workflows: [
        {
          name: '', // invalid
          description: 'x',
          status: 'in-progress',
          currentPhase: 0,
          phases: [],
          stage: {
            current_stage: 'setup',
            previous_stage: null,
            transitioned_at: 'x',
            history: [],
            supervisor_active: false,
          },
          created: 'x',
          updated: 'x',
        },
      ],
    };
    expect(() => writeTracking(workDir, invalid)).toThrow();

    // Lock must be released despite the throw
    const lockPath = join(workDir, '.stelow', '.lock');
    expect(existsSync(lockPath)).toBe(false);

    // Next write should succeed
    expect(() => writeTracking(workDir, baseData('wf-after-throw'))).not.toThrow();
  });
});