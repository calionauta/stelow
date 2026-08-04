/**
 * scan-test-value.ts — v2
 *
 * Scans test files and flags likely FACHADA (mock/bad) tests.
 * Hard to prove value; easier to detect low signal.
 *
 * Strong BAD signals (delete candidates):
 *  - Test with 0 asserts
 *  - Test where assertCount == testCount AND each test is just `expect(x).toBe(x)`
 *  - Test that only checks that the function does NOT throw
 *  - Test with `it.skip` / `describe.skip`
 *  - Test that checks "it exists" (snapshot of imports/exports)
 *  - Test with > 50% of lines being `vi.mock` or imports
 *  - Test file is untracked in git (WIP / abandoned)
 *
 * Borderline (manual review):
 *  - Test with exactly 1 expect per it()
 *  - Test with no error/edge case coverage
 *  - Test that only tests the framework, not the code
 *
 * Usage: npx tsx scripts/scan-test-value.ts
 */
import { readFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();

interface FileAnalysis {
  path: string;
  testCount: number;
  assertCount: number;
  itCount: number;       // number of `it(` blocks
  skipCount: number;     // number of `.skip` or `xit` or `xdescribe`
  hasErrorTests: boolean; // tests that exercise throw/reject/edge
  hasTrivialBody: boolean; // most tests are just `expect(x).toBe(x)`
  isUntracked: boolean;
  lines: number;
  hasMocks: boolean;
  mockLineCount: number;
  badSignals: string[];
  classification: "DELETE" | "REVIEW" | "OK";
}

function analyzeFile(path: string): FileAnalysis {
  const src = readFileSync(path, "utf-8");
  const lines = src.split("\n");
  const isUntracked = isUntrackedFile(path);

  // Test counts
  const itMatches = src.match(/\bit\s*\(/g) ?? [];
  const describeMatches = src.match(/\bdescribe\s*\(/g) ?? [];
  const itCount = itMatches.length;
  const testCount = itCount; // rename for clarity
  const assertCount = (src.match(/\bexpect\s*\(/g) ?? []).length;
  const skipCount = (src.match(/\b(it|describe)\.skip\b|\bxit\s*\(|\bxdescribe\s*\(/g) ?? []).length;

  // Body extraction: extract each `it("name", () => { ... })` body
  const itBodies = extractItBodies(src);
  const hasErrorTests = itBodies.some(b => /toThrow|rejects|catch|throw|Error\(|edge|empty|null\b/.test(b));

  // Trivial body check: bodies that just say `expect(x).toBe(y)` and nothing else
  const trivialBodies = itBodies.filter(b => {
    const trimmed = b.trim().replace(/\s+/g, " ");
    return /^\s*expect\([^)]+\)\.toBe\([^)]+\)\s*;?\s*$/.test(trimmed);
  });
  const hasTrivialBody = itBodies.length > 0 && trivialBodies.length / itBodies.length > 0.5;

  // Mock density
  const mockLines = lines.filter((l) => /vi\.mock|vi\.fn\(|mockImplementation|jest\.mock/.test(l)).length;
  const hasMocks = mockLines > 0;

  const badSignals: string[] = [];

  // Strong BAD signals
  if (assertCount === 0) badSignals.push("ZERO assertions");
  if (skipCount > 0) badSignals.push(`${skipCount} skipped tests (${(skipCount / Math.max(1, itCount) * 100).toFixed(0)}%)`);
  if (itCount > 0 && assertCount / itCount < 0.8) badSignals.push(`low assert density (${(assertCount / Math.max(1, itCount)).toFixed(2)}/test)`);
  if (hasTrivialBody) badSignals.push(`${trivialBodies.length}/${itBodies.length} tests are trivial single-line expects`);
  if (mockLines / lines.length > 0.15 && assertCount / Math.max(1, itCount) < 2) badSignals.push(`>15% mock lines + low assert density`);
  if (isUntracked) badSignals.push("untracked in git (WIP?)");

  // Edge case coverage
  if (!hasErrorTests && itCount >= 5) badSignals.push("no error/edge case tests");

  let classification: "DELETE" | "REVIEW" | "OK" = "OK";
  if (assertCount === 0 || (hasTrivialBody && trivialBodies.length === itBodies.length)) {
    classification = "DELETE";
  } else if (badSignals.length >= 2) {
    classification = "REVIEW";
  }

  return {
    path: relative(ROOT, path),
    testCount,
    assertCount,
    itCount,
    skipCount,
    hasErrorTests,
    hasTrivialBody,
    isUntracked,
    lines: lines.length,
    hasMocks,
    mockLineCount: mockLines,
    badSignals,
    classification,
  };
}

function extractItBodies(src: string): string[] {
  const bodies: string[] = [];
  // Match `it("name", () => { ... })` with balanced braces
  const re = /\bit\s*\(\s*["'`]([^"'`]+)["'`](?:\s*,\s*[^,]+)?\s*,\s*(?:async\s*)?\(\s*(?:[^)]*)\)\s*=>\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    while (i < src.length && depth > 0) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") depth--;
      i++;
    }
    if (depth === 0) bodies.push(src.slice(start, i - 1));
  }
  return bodies;
}

function isUntrackedFile(path: string): boolean {
  try {
    const rel = relative(ROOT, path);
    const out = execSync(`git status --porcelain -- "${rel}"`, { encoding: "utf-8" });
    return out.trim().startsWith("??");
  } catch {
    return false;
  }
}

function walkTests(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) files.push(...walkTests(full));
    else if (entry.endsWith(".test.ts") || entry.endsWith(".test.js")) files.push(full);
  }
  return files;
}

const analyses = walkTests(join(ROOT, "tests"))
  .map(analyzeFile)
  .sort((a, b) => {
    const order = { DELETE: 0, REVIEW: 1, OK: 2 } as const;
    return order[a.classification] - order[b.classification];
  });

const deleteCount = analyses.filter((a) => a.classification === "DELETE").length;
const reviewCount = analyses.filter((a) => a.classification === "REVIEW").length;
const okCount = analyses.filter((a) => a.classification === "OK").length;

console.log("=".repeat(80));
console.log("TEST VALUE SCAN v2 — Delete / Review / OK");
console.log("=".repeat(80));
console.log(`\nDELETE (likely safe to remove): ${deleteCount}`);
console.log(`REVIEW (manual decision needed): ${reviewCount}`);
console.log(`OK (high signal): ${okCount}\n`);

for (const cls of ["DELETE", "REVIEW", "OK"] as const) {
  const group = analyses.filter((a) => a.classification === cls);
  if (group.length === 0) continue;
  console.log("─".repeat(80));
  console.log(`[${cls}] ${group.length} file(s)`);
  console.log("─".repeat(80));
  for (const a of group) {
    console.log(`\n  ${a.path}`);
    console.log(`    ${a.itCount} tests, ${a.assertCount} asserts, ${a.lines} lines${a.skipCount ? `, ${a.skipCount} skipped` : ""}`);
    if (a.badSignals.length > 0) {
      console.log(`    ⚠ ${a.badSignals.join("; ")}`);
    }
  }
  console.log("");
}