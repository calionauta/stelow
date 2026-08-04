/**
 * core-decoupling-contract.test.ts
 *
 * Locks down the host-agnostic invariants of the stelow extension core:
 *   1. `extensions/stelow/index.ts` is the slim bootstrap (<50 LOC).
 *   2. The core does NOT import any Pi-specific package
 *      (@earendil-works/pi-coding-agent, @earendil-works/pi-tui,
 *      plannotator, pi-intercom, pi-subagents, pi-supervisor, etc.).
 *   3. The pure modules (state, schemas, scope, file-lock, provenance,
 *      audit-trail, sync-skills, stages-guard) carry no Pi-only imports.
 *   4. The bootstrap calls `createAdapter(detectHost())`.
 *
 * These are the invariants that SW-002 established; this test guards
 * against accidental re-coupling during future polish work.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CORE_ENTRY = join(process.cwd(), "extensions/stelow/index.ts");
const PURE_MODULES = [
  "state.ts",
  "schemas.ts",
  "scope.ts",
  "file-lock.ts",
  "provenance.ts",
  "audit-trail.ts",
  "sync-skills.ts",
  "stages-guard.ts",
];
const PURE_DIR = join(process.cwd(), "extensions/stelow/modules");
const PI_PACKAGE_PATTERNS = [
  /@earendil-works\/pi-coding-agent/,
  /@earendil-works\/pi-tui/,
  /@plannotator\/pi-extension/,
  /@juicesharp\/rpiv-ask-user-question/,
  /\bpi-intercom\b/,
  /\bpi-subagents\b/,
  /\bpi-supervisor\b/,
];
const PI_TOOL_NAMES = [/\bplannotator\s+(annotate|review)/, /\.plannotator\/approvals/];

function collectFiles(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(p, ext));
    else if (entry.isFile() && entry.name.endsWith(ext)) out.push(p);
  }
  return out;
}

describe("core decoupling contract", () => {
  it("extensions/stelow/index.ts is the slim bootstrap (<50 LOC)", () => {
    expect(existsSync(CORE_ENTRY)).toBe(true);
    const lines = readFileSync(CORE_ENTRY, "utf8").split("\n").length;
    expect(lines).toBeLessThan(50);
  });

  it("core bootstrap does NOT import any Pi-only package", () => {
    const content = readFileSync(CORE_ENTRY, "utf8");
    for (const pattern of PI_PACKAGE_PATTERNS) {
      expect(content, `pattern ${pattern}`).not.toMatch(pattern);
    }
    // Also check we don't use bare pi.* tool calls in the bootstrap.
    for (const pattern of PI_TOOL_NAMES) {
      expect(content, `pattern ${pattern}`).not.toMatch(pattern);
    }
  });

  it("core bootstrap routes the Pi extension API before filesystem detection", () => {
    const content = readFileSync(CORE_ENTRY, "utf8");
    expect(content).toMatch(/api\s*\?\s*["']pi["']\s*:\s*detectHost\s*\(\s*\)/);
    expect(content).toMatch(/createAdapter\s*\(\s*resolveExtensionHost\s*\(\s*api\s*\)\s*\)/);
  });

  it("pure modules have no Pi-only imports", () => {
    for (const mod of PURE_MODULES) {
      const path = join(process.cwd(), "extensions/stelow", mod);
      if (!existsSync(path)) continue; // Optional modules may be absent in some configs.
      const content = readFileSync(path, "utf8");
      // Strip block + line comments so historical references in docstrings don't trip the test.
      const stripped = content
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      for (const pattern of PI_PACKAGE_PATTERNS) {
        expect(stripped, `${mod}: pattern ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("pure modules/* has no Pi-only imports", () => {
    if (!existsSync(PURE_DIR) || !statSync(PURE_DIR).isDirectory()) return;
    const files = collectFiles(PURE_DIR, ".ts");
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      const stripped = content
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      for (const pattern of PI_PACKAGE_PATTERNS) {
        expect(stripped, `${file}: pattern ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});