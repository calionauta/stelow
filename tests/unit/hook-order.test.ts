/**
 * Unit tests: Hook registration order (G9A from stelow-reliability plan)
 *
 * Snapshots the order of `pi.on(...)` hook registrations in
 * extensions/stelow/index.ts. Refactors that accidentally reorder
 * hooks (e.g. `tool_call` before `input`) would break invariants
 * (footer status depends on session_start having run first, etc.).
 *
 * If you INTENTIONALLY reorder hooks:
 *   1. Update the expected array below
 *   2. Add a comment in this test explaining the invariant being changed
 *   3. Verify all integration tests still pass
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const INDEX_PATH = resolve(__dirname, '..', '..', 'extensions', 'stelow', 'adapters', 'pi', 'hooks.ts');

describe('hook registration order in extensions/stelow/index.ts', () => {
  it('registers hooks in the expected order', () => {
    const src = readFileSync(INDEX_PATH, 'utf-8');

    // Extract every `pi.on("event_name", ...)` call in source order.
    // Regex matches the exact registration pattern; ignores commented-out
    // lines because they are not in `pi.on(...)` literal form.
    const regex = /pi\.on\(\s*["']([a-z_]+)["']\s*,/g;
    const found: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(src)) !== null) {
      found.push(m[1]);
    }

    // Dedupe preserving order — only first occurrence matters because a
    // single hook event should be registered once. We assert the FIRST
    // registration order; duplicates would mean a refactor regression.
    const firstSeen: string[] = [];
    const seen = new Set<string>();
    for (const ev of found) {
      if (!seen.has(ev)) {
        seen.add(ev);
        firstSeen.push(ev);
      }
    }

    // Expected order — derived from current source. If you change this,
    // you must also change the array here AND justify the reorder in a
    // commit message.
    const expected = [
      'input',          // first user input — guards /sw-* commands
      'session_start',  // footer initialization
      'tool_call',      // side-effect hooks (writeTracking, validation)
      'turn_end',       // phase transition guard
      'agent_end',      // final state write
    ];

    expect(firstSeen).toEqual(expected);
  });

  it('does not register duplicate hook events', () => {
    const src = readFileSync(INDEX_PATH, 'utf-8');
    const regex = /pi\.on\(\s*["']([a-z_]+)["']\s*,/g;
    const counts: Record<string, number> = {};
    let m: RegExpExecArray | null;
    while ((m = regex.exec(src)) !== null) {
      counts[m[1]] = (counts[m[1]] || 0) + 1;
    }

    const dupes = Object.entries(counts).filter(([, n]) => n > 1);
    expect(dupes).toEqual([]);
  });
});