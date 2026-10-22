/**
 * scan-test-value.ts — the test-value gate.
 *
 * The question this answers: which tests are load-bearing, and which are
 * decoration? A test is load-bearing when it PINS a behaviour — when the
 * behaviour breaks, the test fails.
 *
 * The signals here are the ones that can be detected without running
 * anything. The decisive one is not here: `scripts/mutation-gate.py`
 * applies a semantic mutation to a rule and requires the suite to fail.
 * A mutant that survives names a rule nobody pins. This scanner finds the
 * SHAPE problems — the tests that could not pin anything even if the
 * behaviour broke under them.
 *
 * DELETE (the test cannot fail for a reason that matters):
 *   - no assertions at all;
 *   - every test body is a single trivial `expect(x).toBe(y)`;
 *   - the only assertion is "it does not throw";
 *   - the code under test is MOCKED — the test proves the mock works;
 *   - the file's tests are skipped or the file is untracked (WIP);
 *   - a snapshot of "whatever the code happens to produce" and nothing else.
 *
 * REVIEW (a person must decide):
 *   - exactly one assertion per test;
 *   - no error, boundary or edge case anywhere in the file;
 *   - mock lines dominate the file;
 *   - the file asserts on framework behaviour rather than on the code.
 *
 * Usage: npx tsx scripts/scan-test-value.ts [--json]
 */
import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();

type Classification = "DELETE" | "REVIEW" | "OK";

interface FileAnalysis {
  path: string;
  itCount: number;
  assertCount: number;
  lines: number;
  signals: string[];
  weakTests: { name: string; line: number; reason: string }[];
  classification: Classification;
}

interface TestBlock {
  name: string;
  body: string;
  line: number;
}

/** Every `it(...)` block in the file, with its name and where it starts. */
function extractTests(src: string): TestBlock[] {
  const blocks: TestBlock[] = [];
  // The options object is matched as a braced literal, and NOTHING else may
  // sit between the name and the arrow function. A greedy `[^,]+` here
  // matched across the NEXT test — the body it captured was the rest of the
  // file, so every shape check ran against the wrong text and found nothing.
  const re = /\b(?:it|test)\s*\(\s*["'`]([^"'`]+)["'`]\s*(?:,\s*\{[^}]*\})?\s*,\s*(?:async\s*)?\(\s*(?:[^)]*)\)\s*=>\s*\{/g;
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
    if (depth === 0) {
      blocks.push({
        name: m[1],
        body: src.slice(start, i - 1),
        line: src.slice(0, m.index).split("\n").length,
      });
    }
  }
  return blocks;
}

/**
 * Why a single test cannot fail for a reason that matters.
 *
 * The criteria apply per TEST, not per file: a file can carry six
 * load-bearing tests and one that checks the file exists.
 */
function testSignals(block: TestBlock): string[] {
  const signals: string[] = [];
  const body = block.body;
  const asserts = (body.match(/\bexpect\s*\(/g) ?? []).length;
  if (asserts === 0) {
    signals.push("no assertion");
    return signals;
  }
  if (meaningfulAsserts(body) === 0) {
    signals.push("only asserts it does not throw");
    return signals;
  }
  // "It exists": every assertion in the body is an existence or stat check,
  // and the body does not PRODUCE the thing it checks. A committed file
  // that a test merely observes is not a behaviour — it cannot fail for a
  // reason that matters. A file the test just created (or a command the
  // test just ran) IS the behaviour, and the same assertion is load-bearing.
  const expectCalls = body.match(/expect\s*\([^;]*\)/g) ?? [];
  // A stat check on the MODE is a convention, not an existence check: the
  // helper is invoked as a command, so its exec bit is behaviour.
  const nonExistence = expectCalls.filter(
    (call) => !/existsSync|statSync/.test(call) || /\.mode\b/.test(call),
  );
  if (expectCalls.length > 0 && nonExistence.length === 0) {
    const withoutAsserts = body
      .replace(/expect\s*\([^;]*\)/g, "")
      .replace(/const\s+\w+\s*=\s*join\([^;]*\);?/g, "")
      .replace(/\/\/.*$/gm, "")
      .replace(/^\s*;+\s*$/gm, "")
      .trim();
    if (withoutAsserts.length === 0) {
      signals.push("observes a committed file instead of exercising the code");
      return signals;
    }
  }
  return signals;
}

/** The assertions in a body, minus the ones that only prove "no crash". */
function meaningfulAsserts(body: string): number {
  const all = body.match(/\bexpect\s*\(/g) ?? [];
  const noThrow = body.match(/\bexpect\s*\([^)]*\)\s*\.(?:not\s*\.\s*)?toThrow\s*\(/g) ?? [];
  const resolves = body.match(/\bexpect\s*\([^)]*\)\s*\.(?:not\s*\.\s*)?resolves\s*\.\s*toThrow\s*\(/g) ?? [];
  return all.length - noThrow.length - resolves.length;
}

function analyzeFile(path: string): FileAnalysis {
  const src = readFileSync(path, "utf-8");
  const lines = src.split("\n");
  const blocks = extractTests(src);
  const bodies = blocks.map((b) => b.body);
  const signals: string[] = [];
  const weakTests: { name: string; line: number; reason: string }[] = [];

  const assertCount = (src.match(/\bexpect\s*\(/g) ?? []).length;
  const itCount = bodies.length;
  const skipCount = (src.match(/\b(?:it|test|describe)\.skip\b|\bxit\s*\(|\bxdescribe\s*\(/g) ?? []).length;
  const mockLines = lines.filter((l) => /vi\.mock|vi\.fn\(|mockImplementation|jest\.mock|sinon\.stub/.test(l)).length;
  const snapshotCount = (src.match(/\btoMatchSnapshot\s*\(/g) ?? []).length;

  // A test that only proves "it did not crash" pins nothing: a function
  // that returned undefined would pass it too.
  const onlyNoThrow = bodies.length > 0 && bodies.every((b) => meaningfulAsserts(b) === 0);
  const trivialBodies = bodies.filter((b) => {
    const trimmed = b.trim().replace(/\s+/g, " ");
    return /^\s*expect\([^)]+\)\.toBe\([^)]+\)\s*;?\s*$/.test(trimmed);
  });
  const allTrivial = bodies.length > 0 && trivialBodies.length === bodies.length;

  // The code under test, mocked away. A test that proves the mock works is
  // not a test of the code.
  const importedUnderTest = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  const mockedModules = [...src.matchAll(/vi\.mock\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const mocksTheSubject = mockedModules.some((mod) =>
    importedUnderTest.some((imported) => {
      const base = imported.split("/").pop()?.replace(/\.(ts|js|mjs|mts)$/, "");
      const mocked = mod.split("/").pop()?.replace(/\.(ts|js|mjs|mts)$/, "");
      return base === mocked;
    }),
  );

  const hasEdgeCoverage = bodies.some((b) =>
    /toThrow|rejects|catch|edge|empty|null\b|undefined|boundary|missing|malformed|invalid|empty/i.test(b),
  );

  for (const block of blocks) {
    const reasons = testSignals(block);
    if (reasons.length > 0) {
      weakTests.push({ name: block.name, line: block.line, reason: reasons.join("; ") });
    }
  }

  if (assertCount === 0) signals.push("ZERO assertions");
  if (onlyNoThrow && assertCount > 0) signals.push("every test only asserts it does not throw");
  if (allTrivial) signals.push("every test is a single trivial expect");
  if (mocksTheSubject) signals.push("mocks the code under test");
  if (skipCount > 0) signals.push(`${skipCount} skipped test(s)`);
  if (isUntrackedFile(path)) signals.push("untracked in git (WIP)");
  if (snapshotCount > 0 && assertCount - snapshotCount === 0) signals.push("snapshots and nothing else");
  if (weakTests.length > 0) {
    signals.push(`${weakTests.length} test(s) that cannot fail for a reason that matters`);
  }

  let classification: Classification = "OK";
  if (
    assertCount === 0 ||
    onlyNoThrow ||
    allTrivial ||
    mocksTheSubject ||
    skipCount > 0 ||
    isUntrackedFile(path) ||
    (snapshotCount > 0 && assertCount - snapshotCount === 0) ||
    weakTests.length > 0
  ) {
    classification = "DELETE";
  } else {
    if (itCount > 0 && assertCount / itCount < 1.5) {
      signals.push(`low assert density (${(assertCount / itCount).toFixed(2)}/test)`);
    }
    if (!hasEdgeCoverage && itCount >= 5) signals.push("no error/edge case tests");
    if (lines.length > 0 && mockLines / lines.length > 0.15) {
      signals.push(`mock lines are ${Math.round((mockLines / lines.length) * 100)}% of the file`);
    }
    if (signals.length >= 2) classification = "REVIEW";
  }

  return {
    path: relative(ROOT, path),
    itCount,
    assertCount,
    lines: lines.length,
    signals,
    weakTests,
    classification,
  };
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
    if (statSync(full).isDirectory()) files.push(...walkTests(full));
    else if (entry.endsWith(".test.ts") || entry.endsWith(".test.js")) files.push(full);
  }
  return files;
}

const analyses = walkTests(join(ROOT, "tests"))
  .map(analyzeFile)
  .sort((a, b) => {
    const order = { DELETE: 0, REVIEW: 1, OK: 2 } as const;
    return order[a.classification] - order[b.classification] || a.path.localeCompare(b.path);
  });

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(analyses, null, 2));
} else {
  const deleteCount = analyses.filter((a) => a.classification === "DELETE").length;
  const reviewCount = analyses.filter((a) => a.classification === "REVIEW").length;
  console.log("=".repeat(80));
  console.log("TEST VALUE SCAN — Delete / Review / OK");
  console.log("=".repeat(80));
  console.log(`\nDELETE: ${deleteCount}   REVIEW: ${reviewCount}   OK: ${analyses.length - deleteCount - reviewCount}\n`);
  for (const cls of ["DELETE", "REVIEW"] as const) {
    const group = analyses.filter((a) => a.classification === cls);
    if (group.length === 0) continue;
    console.log("─".repeat(80));
    console.log(`[${cls}] ${group.length} file(s)`);
    console.log("─".repeat(80));
    for (const a of group) {
      console.log(`\n  ${a.path}`);
      console.log(`    ${a.itCount} tests, ${a.assertCount} asserts, ${a.lines} lines`);
      if (a.signals.length > 0) console.log(`    ⚠ ${a.signals.join("; ")}`);
      for (const weak of a.weakTests) {
        console.log(`      ✗ line ${weak.line}: ${weak.name} — ${weak.reason}`);
      }
    }
    console.log("");
  }
}
