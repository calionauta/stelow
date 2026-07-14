/**
 * Unit tests: Hook error containment (G1A from stelow-reliability plan)
 *
 * Verifies the safeHook wrapper is:
 *  - Defined in safe-hook.ts (single source of truth)
 *  - Imported and used by all 5 hooks in index.ts
 *  - Wraps with try/catch + console.error + return undefined
 *
 * For behavioral verification (does it actually catch errors?), see
 * tests/integration/safe-hook-integration.test.ts which exercises
 * the real function at runtime.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const INDEX_PATH = resolve(__dirname, '..', '..', 'extensions', 'stelow', 'index.ts');
const SAFE_HOOK_PATH = resolve(__dirname, '..', '..', 'extensions', 'stelow', 'safe-hook.ts');

describe('hook error containment (safeHook wiring)', () => {
  it('safeHook is defined in safe-hook.ts as the single source of truth', () => {
    const src = readFileSync(SAFE_HOOK_PATH, 'utf-8');
    expect(src).toMatch(/export function safeHook/);
  });

  it('safeHook is imported by index.ts', () => {
    const src = readFileSync(INDEX_PATH, 'utf-8');
    expect(src).toMatch(/import\s*\{\s*safeHook\s*\}\s*from\s*["']\.\/safe-hook["']/);
  });

  it('wraps all 5 hook registrations with safeHook in index.ts', () => {
    const src = readFileSync(INDEX_PATH, 'utf-8');
    const hookEvents = ['input', 'session_start', 'tool_call', 'turn_end', 'agent_end'];
    for (const ev of hookEvents) {
      const re = new RegExp(`pi\\.on\\(\\s*["']${ev}["']\\s*,\\s*safeHook\\(`);
      expect(src.match(re), `hook '${ev}' must be wrapped in safeHook`).not.toBeNull();
    }
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

  it('safe-hook.ts logs errors with hook name (does not swallow silently)', () => {
    const src = readFileSync(SAFE_HOOK_PATH, 'utf-8');
    // The wrapper must call console.error to surface failures.
    // It does NOT rethrow — that would break the input stream.
    expect(src).toMatch(/console\.error\(`\[stelow\]\s+hook\s+'\${name}'\s+threw:`/);
  });

  it('safe-hook.ts returns undefined on error (allow, do not block input)', () => {
    const src = readFileSync(SAFE_HOOK_PATH, 'utf-8');
    // Wrapper body must return `undefined;` in the catch block.
    // This signals Pi that the hook had no opinion — input flows through.
    const catchMatch = src.match(/catch\s*\([^)]*\)\s*\{[\s\S]*?return\s+undefined\s*;?\s*\}/);
    expect(catchMatch, 'catch block must return undefined to allow user input').not.toBeNull();
  });
});