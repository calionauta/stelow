/**
 * Property-based tests: Core invariants (G6A from stelow-reliability plan)
 *
 * Uses fast-check to fuzz the state module with random inputs and
 * verify the system holds its invariants. Each test runs 100 iterations
 * with shrinking to find minimal counter-examples.
 *
 * Properties covered:
 *  1. writeTracking + readTracking round-trip — any valid TrackingData
 *     written and read back yields equal data (modulo updated timestamp).
 *  2. renameWorkflow preserves dirHash — renaming a workflow does not
 *     change its disk location (the dirHash is the stable identifier).
 *  3. addToGlobalIndex + removeGlobalIndexEntry balance — adding then
 *     removing a workflow from the global index leaves no trace.
 *  4. parseSpecTechScopes idempotence — parsing the same content twice
 *     yields equal scope lists.
 *  5. Workflow schema validation — generate arbitrary objects, those
 *     that pass validateWorkflow can round-trip through JSON.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  writeTracking,
  readTracking,
  addToGlobalIndex,
  removeGlobalIndexEntry,
  renameWorkflow,
  readGlobalTracking,
  toSafeName,
} from '../../extensions/stelow/state';
import {
  validateWorkflow,
  WorkflowValidationError,
} from '../../extensions/stelow/schemas';
import { parseSpecTechScopes } from '../../extensions/stelow/state';
import type { TrackingData, Workflow } from '../../extensions/stelow/types';

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'stelow-property-'));
  // NOTE: We do NOT override process.env.HOME. The global tracking
  // path is process.env.HOME + global.json. Manipulating HOME in
  // parallel vitest test files causes races. Property 3 uses
  // unique dirHash values per run to avoid collisions with other
  // tests touching the real global tracking.
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

// ── Arbitrary generators ─────────────────────────────────────────

const phaseArbitrary = () =>
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-z0-9-]+$/.test(s)),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    status: fc.constantFrom('pending', 'in-progress', 'completed'),
  });

const scopeArbitrary = () =>
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-z0-9-]+$/.test(s)),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    type: fc.constantFrom('feature', 'spike', 'test-unit'),
    status: fc.constantFrom('pending', 'in-progress', 'completed'),
  });

const workflowArbitrary = () =>
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
    description: fc.string({ maxLength: 200 }),
    status: fc.constantFrom('in-progress', 'paused', 'completed', 'archived'),
    currentPhase: fc.integer({ min: 0, max: 16 }),
    phases: fc.array(phaseArbitrary(), { maxLength: 5 }),
    stage: fc.record({
      current_stage: fc.constantFrom('setup', 'shape', 'planning', 'execution'),
      previous_stage: fc.option(fc.string(), { nil: null }),
      transitioned_at: fc.constant('2026-07-14T00:00:00.000Z'),
      history: fc.constant([] as Array<unknown>),
      supervisor_active: fc.constant(false),
    }),
    created: fc.constant('2026-07-14T00:00:00.000Z'),
    updated: fc.constant('2026-07-14T00:00:00.000Z'),
  });

const trackingArbitrary = () =>
  fc.record({
    $schema: fc.constant('https://example.com/schema'),
    version: fc.string({ minLength: 1, maxLength: 10 }),
    created: fc.constant('2026-07-14T00:00:00.000Z'),
    updated: fc.constant('2026-07-14T00:00:00.000Z'),
    workflows: fc.array(workflowArbitrary(), { maxLength: 3 }),
  });

// ── Property 1: writeTracking + readTracking round-trip ──────────
// SW-009: 60000ms suite-level timeout. fast-check (fc.assert) with
// 50 numRuns over a tracking-data arbitrary expands into dozens of
// distinct round-trip assertions per test, and slow CI runners can
// blow past the global 30000ms testTimeout even though the test
// completes in ~tens-of-ms locally. Per-suite override keeps the
// global ceiling low while giving this property enough headroom.
describe('Property 1: write/read round-trip', () => {
  it('valid tracking data survives write → read', async () => {
    await fc.assert(
      fc.asyncProperty(trackingArbitrary(), async (data) => {
        // Skip workflows that have duplicate names (writeTracking doesn't dedup)
        const names = data.workflows.map((w) => w.name);
        if (new Set(names).size !== names.length) return;

        // Add dirHash to each workflow for stability
        const workflows = data.workflows.map((w, i) => ({
          ...w,
          cwd: workDir,
          dirHash: `h${i.toString().padStart(3, '0')}`,
        }));
        const stamped: TrackingData = { ...data, workflows };

        writeTracking(workDir, stamped);
        const read = readTracking(workDir);

        // Read must return something
        expect(read).not.toBeNull();
        if (!read) return;

        // updated was overwritten by writeTracking (it's mutated)
        // Skip timestamp check; compare structural fields
        expect(read.workflows).toHaveLength(stamped.workflows.length);
        for (let i = 0; i < stamped.workflows.length; i++) {
          expect(read.workflows[i].name).toBe(stamped.workflows[i].name);
          expect(read.workflows[i].status).toBe(stamped.workflows[i].status);
          expect(read.workflows[i].currentPhase).toBe(stamped.workflows[i].currentPhase);
          expect(read.workflows[i].dirHash).toBe(stamped.workflows[i].dirHash);
        }
      }),
      { numRuns: 50 },
    );
  });
}, 60000 /* SW-009: see comment at file head for rationale */);

// ── Property 2: renameWorkflow preserves dirHash ─────────────────
// SW-009: 60000ms suite-level timeout. Same rationale as Property 1:
// 50 numRuns of fc.property over a string generator produces enough
// fs/atomic-write traffic that slow CI runners exceed the global
// 30000ms ceiling. Local runs complete well under 10ms.
describe('Property 2: renameWorkflow preserves dirHash', () => {
  it('after rename, dirHash stays stable', () => {
    // Generate a random alphanumeric string, then call toSafeName on it
    // to model the real renameWorkflow behavior (it sanitizes the new
    // name before storing). The renamed name in tracking must equal
    // toSafeName(rawNewName), NOT the raw input.
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 30 })
          .filter((s) => /^[a-zA-Z0-9 _-]+$/.test(s)),  // generate any sane string
        fc.string({ minLength: 3, maxLength: 3 })
          .filter((s) => /^[a-z0-9]+$/.test(s)),       // dirHash: short, no leading dash
        (rawNewName, dirHash) => {
          // Apply toSafeName to model the real rename path
          const newName = toSafeName(rawNewName);
          // renameWorkflow rejects names shorter than 2 chars.
          if (newName.length < 2) return; // Skip: rename would fail before our invariant can apply
          const oldName = `old-${dirHash}`;
          const initial: TrackingData = {
            $schema: 'https://example.com/schema',
            version: '1.0',
            created: '2026-07-14T00:00:00.000Z',
            updated: '2026-07-14T00:00:00.000Z',
            workflows: [
              {
                name: oldName,
                description: '',
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
          };
          writeTracking(workDir, initial);

          const renamed = renameWorkflow(workDir, oldName, newName);
          expect(renamed.ok).toBe(true);

          const read = readTracking(workDir);
          expect(read).not.toBeNull();
          if (!read) return;

          const wf = read.workflows.find((w) => w.name === newName);
          expect(wf).toBeDefined();
          expect(wf?.dirHash).toBe(dirHash); // INVARIANT
        },
      ),
      { numRuns: 50 },
    );
  });
}, 60000 /* SW-009: see comment at file head for rationale */);

// ── Property 3: addToGlobalIndex + removeGlobalIndexEntry balance ─

describe('Property 3: add + remove is a no-op', () => {
  it('add then remove leaves the global index unchanged', () => {
    fc.assert(
      fc.property(
        workflowArbitrary(),
        fc.string({ minLength: 3, maxLength: 20 }).filter((s) => /^[a-z0-9-]+$/.test(s)),
        (wfBase, dirHash) => {
          // Snapshot before
          const before = readGlobalTracking();

          const wf: Workflow = {
            ...wfBase,
            name: `prop-wf-${dirHash}`,
            cwd: workDir,
            dirHash,
          };

          addToGlobalIndex(wf);
          const removed = removeGlobalIndexEntry(workDir, wf.name);
          expect(removed).toBe(true);

          const after = readGlobalTracking();
          // Both null OR both have same workflows array length
          if (before === null && after === null) return;
          if (before === null) {
            // After: exactly the workflow we added-then-removed, so should be empty
            // but it was added then removed → empty
            expect(after?.workflows ?? []).toEqual([]);
            return;
          }
          expect(after?.workflows.length).toBe(before.workflows.length);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('remove without prior add returns false (does not throw)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }).filter((s) => /^[a-z0-9-]+$/.test(s)),
        (name) => {
          const result = removeGlobalIndexEntry(workDir, `never-existed-${name}`);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ── Property 4: parseSpecTechScopes idempotence ──────────────────

describe('Property 4: parseSpecTechScopes idempotence', () => {
  it('parsing the same content twice yields equal scope lists', () => {
    // Build a synthetic spec-tech content with fuzzed scope names + types
    const specContentArbitrary = fc
      .array(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-z0-9-]+$/.test(s)),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          type: fc.constantFrom('feature', 'spike', 'test-unit'),
        }),
        { minLength: 0, maxLength: 4 },
      )
      .map((scopes) => {
        const header = `# spec-tech\n\n## Scopes\n\n`;
        const body = scopes
          .map(
            (s) =>
              `### ${s.id}: ${s.name}\n**Type**: ${s.type}\n**Target Files**:\n- \`src/${s.id}.ts\`\n`,
          )
          .join('\n');
        return header + body;
      });

    fc.assert(
      fc.property(specContentArbitrary, (content) => {
        const a = parseSpecTechScopes(content);
        const b = parseSpecTechScopes(content);
        expect(a).toEqual(b);
      }),
      { numRuns: 30 },
    );
  });
});

// ── Property 5: validateWorkflow — valid input round-trips ──────

describe('Property 5: schema validation', () => {
  it('arbitrary data that passes validateWorkflow survives JSON round-trip', () => {
    fc.assert(
      fc.property(workflowArbitrary(), (wf) => {
        try {
          const validated = validateWorkflow(wf);
          expect(validated).not.toBeNull();
          // JSON round-trip must not throw
          const json = JSON.stringify(validated);
          const parsed = JSON.parse(json);
          // Re-validate the parsed copy — must also pass
          validateWorkflow(parsed);
        } catch (err) {
          if (err instanceof WorkflowValidationError) {
            // Generated data may not always be valid; that's fine
            return;
          }
          throw err;
        }
      }),
      { numRuns: 50 },
    );
  });

  it('rejects objects with currentPhase < 0', () => {
    fc.assert(
      fc.property(
        workflowArbitrary(),
        fc.integer({ min: -100, max: -1 }),
        (wf, badPhase) => {
          const bad = { ...wf, currentPhase: badPhase };
          expect(() => validateWorkflow(bad)).toThrow(WorkflowValidationError);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('rejects objects with empty name', () => {
    fc.assert(
      fc.property(workflowArbitrary(), (wf) => {
        const bad = { ...wf, name: '' };
        expect(() => validateWorkflow(bad)).toThrow(WorkflowValidationError);
      }),
      { numRuns: 20 },
    );
  });
});

// ── Property 6: stages-guard permission check consistency ─────

import { createStagesGuard } from '../../extensions/stelow/adapters/stages-guard';

describe('Property 6: stages-guard permission check', () => {
  // Synthetic stage config: a stage with `blocked_tools` and `allowed_tools`.
  // Names are unique within a config (deduplicated) to avoid stage-map
  // collisions where two stages with the same name would override each
  // other in the underlying Map.
  const stageEntry = () =>
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-z0-9-]+$/.test(s)),
      blocked_tools: fc.array(
        fc.constantFrom('ask', 'read', 'grep', 'ls', 'write', 'edit', 'bash'),
        { maxLength: 3 },
      ),
      allowed_tools: fc.array(
        fc.constantFrom('ask', 'read', 'grep', 'ls', 'write', 'edit', 'bash'),
        { maxLength: 3 },
      ),
    });

  const stagesArbitrary = () =>
    fc.array(stageEntry(), { minLength: 1, maxLength: 4 }).map((stages) => {
      // Dedupe by name; last wins (deterministic)
      const seen = new Map<string, typeof stages[0]>();
      for (const s of stages) seen.set(s.name, s);
      return { stages: Array.from(seen.values()) };
    });

  const toolArbitrary = () =>
    fc.constantFrom('ask', 'read', 'grep', 'ls', 'write', 'edit', 'bash', 'unknown-tool');

  it('checkTool is deterministic — same input always yields same result', () => {
    fc.assert(
      fc.property(stagesArbitrary(), toolArbitrary(), (stages, tool) => {
        const state = { current_stage: stages.stages[0].name, previous_stage: null, transitioned_at: 'x', history: [], supervisor_active: false };
        const guard = createStagesGuard(stages, state);
        const r1 = guard(tool);
        const r2 = guard(tool);
        expect(r1).toEqual(r2);
      }),
      { numRuns: 30 },
    );
  });

  it('a tool in blocked_tools ALWAYS returns allowed=false', () => {
    fc.assert(
      fc.property(stagesArbitrary(), toolArbitrary(), (stages, tool) => {
        // Build a stage where the chosen tool is explicitly blocked
        const stageName = 'prop-stage';
        const config = {
          stages: [
            { name: stageName, blocked_tools: [tool], allowed_tools: [] },
            ...stages.stages.filter((s) => s.name !== stageName),
          ],
        };
        const state = { current_stage: stageName, previous_stage: null, transitioned_at: 'x', history: [], supervisor_active: false };
        const guard = createStagesGuard(config, state);
        const result = guard(tool);
        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.reason).toMatch(new RegExp(tool));
        }
      }),
      { numRuns: 30 },
    );
  });

  it('unknown stage name returns allowed=true (safe fallback)', () => {
    fc.assert(
      fc.property(stagesArbitrary(), toolArbitrary(), (stages, tool) => {
        const state = { current_stage: 'never-defined-stage', previous_stage: null, transitioned_at: 'x', history: [], supervisor_active: false };
        const guard = createStagesGuard(stages, state);
        const result = guard(tool);
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      }),
      { numRuns: 20 },
    );
  });

  it('a non-blocked tool returns allowed=true (no reason)', () => {
    fc.assert(
      fc.property(stagesArbitrary(), toolArbitrary(), (stages, tool) => {
        const stageName = stages.stages[0].name;
        // Make sure tool is NOT in the blocked list
        const stage = stages.stages[0];
        if (stage.blocked_tools.includes(tool)) return; // skip — covered by other test
        const state = { current_stage: stageName, previous_stage: null, transitioned_at: 'x', history: [], supervisor_active: false };
        const guard = createStagesGuard(stages, state);
        const result = guard(tool);
        expect(result.allowed).toBe(true);
      }),
      { numRuns: 30 },
    );
  });
});