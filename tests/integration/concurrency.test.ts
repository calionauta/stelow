/**
 * Integration tests: Concurrent writeTracking (G7A from stelow-reliability plan)
 *
 * Verifies the atomic write + runtime validation combo holds under
 * concurrent stress. Without atomic write (G3B), parallel writes could
 * interleave and produce a corrupt JSON file. With atomic write, each
 * write is a tmp+rename so the final state must be one of the inputs.
 *
 * Strategy:
 *  - Fire N parallel writeTracking() calls, each writing a workflow with
 *    a unique name (so we can identify which write won).
 *  - After Promise.all resolves, the file must be valid JSON.
 *  - The final state must contain EXACTLY ONE workflow (one write won).
 *
 * This is not a proof of correctness — it is a regression guard against
 * reintroducing non-atomic writes.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeTracking } from '../../extensions/stelow/state';
import type { TrackingData, Workflow } from '../../extensions/stelow/types';

let workDir: string;

const baseTracking = (name: string, dirHash: string): TrackingData => ({
  $schema: 'https://example.com/schema',
  version: '1.0',
  created: '2026-07-14T00:00:00.000Z',
  updated: '2026-07-14T00:00:00.000Z',
  workflows: [
    {
      name,
      description: 'concurrent test',
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
      dirHash,
    },
  ],
});

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'stelow-concurrency-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

// SW-009: 120000ms (120s) suite-level timeout — see rationale below.
// This suite was failing `Test timed out in 10000ms` (and later
// `30000ms`, then `60000ms`) on cold-cache GitHub Actions shared
// runners while completing in ~130ms locally. The 50-parallel-write
// test in particular is highly sensitive to environmental variance;
// observed CI elapsed time was ~67.5s, exceeding the prior 60s
// ceiling. 120s provides margin for environmental variance without
// papering over real regressions.
describe('concurrent writeTracking', () => {
  it('10 parallel writes produce a single valid JSON file with one workflow', async () => {
    const N = 10;
    const writes: Promise<void>[] = [];
    for (let i = 0; i < N; i++) {
      const data = baseTracking(`wf-${i.toString().padStart(2, '0')}`, `hash${i}`);
      writes.push(Promise.resolve().then(() => writeTracking(workDir, data)));
    }
    await Promise.all(writes);

    // File must be valid JSON (atomic write guarantees this)
    const target = join(workDir, 'stelow.json');
    const parsed = JSON.parse(readFileSync(target, 'utf-8')) as TrackingData;

    // Exactly one workflow survived (one write won the race)
    expect(parsed.workflows).toHaveLength(1);
    expect(parsed.workflows[0].name).toMatch(/^wf-\d{2}$/);
  });

  it('50 parallel writes — final state is consistent', async () => {
    const N = 50;
    const writes: Promise<void>[] = [];
    for (let i = 0; i < N; i++) {
      const data = baseTracking(`wf-${i.toString().padStart(3, '0')}`, `h${i}`);
      writes.push(Promise.resolve().then(() => writeTracking(workDir, data)));
    }
    await Promise.all(writes);

    const target = join(workDir, 'stelow.json');
    const parsed = JSON.parse(readFileSync(target, 'utf-8')) as TrackingData;
    expect(parsed.workflows).toHaveLength(1);
    expect(parsed.workflows[0].name).toMatch(/^wf-\d{3}$/);
  });

  it('no .tmp files leak after parallel writes', async () => {
    const N = 20;
    const writes: Promise<void>[] = [];
    for (let i = 0; i < N; i++) {
      const data = baseTracking(`wf-${i}`, `h${i}`);
      writes.push(Promise.resolve().then(() => writeTracking(workDir, data)));
    }
    await Promise.all(writes);

    const files = readdirSync(workDir);
    const tmp = files.filter((f) => f.endsWith('.tmp'));
    expect(tmp).toEqual([]);
  });

  it('parallel writes with same workflow name — validation accepts all', async () => {
    // Different `updated` timestamps, same name. Each write is a complete
    // snapshot, so they are all valid; one wins the race.
    const N = 10;
    const writes: Promise<void>[] = [];
    for (let i = 0; i < N; i++) {
      const data: TrackingData = {
        $schema: 'https://example.com/schema',
        version: '1.0',
        created: '2026-07-14T00:00:00.000Z',
        updated: `2026-07-14T00:00:${i.toString().padStart(2, '0')}.000Z`,
        workflows: [
          {
            name: 'race-winner',
            description: 'race',
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
            updated: `2026-07-14T00:00:${i.toString().padStart(2, '0')}.000Z`,
            cwd: workDir,
            dirHash: 'same',
          },
        ],
      };
      writes.push(Promise.resolve().then(() => writeTracking(workDir, data)));
    }
    await Promise.all(writes);

    const parsed = JSON.parse(readFileSync(join(workDir, 'stelow.json'), 'utf-8')) as TrackingData;
    expect(parsed.workflows).toHaveLength(1);
    expect(parsed.workflows[0].name).toBe('race-winner');
    // updated must match one of the writes (not corrupted)
    expect(parsed.workflows[0].updated).toMatch(/^2026-07-14T00:00:\d{2}\.000Z$/);
  });

  it('parallel mixed-success: some writes throw, others succeed', async () => {
    // Half valid, half invalid (missing required field). Atomic write
    // + runtime validation: invalid writes throw without corrupting file.
    const validCount = 5;
    const invalidCount = 5;
    const writes: Promise<void>[] = [];

    for (let i = 0; i < validCount; i++) {
      writes.push(Promise.resolve().then(() => writeTracking(workDir, baseTracking(`v-${i}`, `vh${i}`))));
    }
    for (let i = 0; i < invalidCount; i++) {
      const bad: TrackingData = {
        $schema: 'x',
        version: '1.0',
        created: 'x',
        updated: 'x',
        workflows: [
          {
            name: '', // invalid: empty name
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
      writes.push(Promise.resolve().then(() => writeTracking(workDir, bad)));
    }

    // Some will throw — collect results
    const results = await Promise.allSettled(writes);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(validCount);
    expect(rejected.length).toBe(invalidCount);

    // File must be valid JSON with one workflow (from one of the valid writes)
    const parsed = JSON.parse(readFileSync(join(workDir, 'stelow.json'), 'utf-8')) as TrackingData;
    expect(parsed.workflows).toHaveLength(1);
    expect(parsed.workflows[0].name).toMatch(/^v-\d$/);

    // No .tmp leftovers
    const tmp = readdirSync(workDir).filter((f) => f.endsWith('.tmp'));
    expect(tmp).toEqual([]);
  });
}, 120000 /* SW-009: 120s absorbs cold-cache CI fs latency for 50 parallel writeTracking calls. See comment at file head for rationale. */);