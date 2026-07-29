/**
 * SW-025 regression coverage for the NaN-date fallback in
 * `scope-init-fallback.md`.
 *
 * Finding (from SW-018 code review): the snippet used to format
 * `.stelow/${created.toISOString()...}/...` for an invalid `wf.created`,
 * producing `.stelow/NaN-NaN-NaN/<dirHash>/plans/` and missing the existing
 * plans directory. The canonical fix mirrors `state.ts:728,776`:
 *
 *   const dateStamp = Number.isNaN(created.getTime())
 *     ? new Date().toISOString().slice(0, 10)
 *     : created.toISOString().slice(0, 10);
 *
 * Each test below drives the published `node -e` snippet through a
 * `spawnSync` invocation against a synthesized `.stelow/...` tree and
 * asserts the actual on-disk state. The mutation target —
 * replacing line 115 with `created.toISOString().slice(0, 10)` without
 * the `Number.isNaN` guard — would flip the concrete assertions.
 */
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type JsonRecord = Record<string, unknown>;
type FixtureTracking = JsonRecord & {
  workflows: JsonRecord[];
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fallbackPath = join(
  repoRoot,
  "skills/stelow-product-scope-executor/references/cli-tools/scope-init-fallback.md",
);
const stateSourcePath = join(repoRoot, "extensions/stelow/state.ts");

const SPEC_TECH_V1 = `
# Technical plan fixture

[SCOPE-1]
[TYPE] feature
[MAX_ITERATIONS] 5
Objective: Implement user login
Dependencies: None
DoD: User can log in with email/password
[TARGET_FILES]
- src/auth/**
- src/middleware/auth.ts

[SCOPE-2]
[TYPE] optimization
[MAX_ITERATIONS] 3
Objective: Optimize search endpoint
Dependencies: SCOPE-1
DoD: Search latency meets target

[SCOPE-3]
[TYPE] spike
Objective: Evaluate vector database options
Dependencies: None
DoD: Recommendation document with pros/cons
`;

function extractBashSnippet(text: string): string {
  const match = text.match(/```bash\r?\n([\s\S]*?)\r?\n```/);
  expect(match, "fallback reference must contain one complete bash snippet").not.toBeNull();
  return match?.[1] ?? "";
}

function walkFiles(root: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) result.push(...walkFiles(entryPath));
    else if (entry.isFile()) result.push(entryPath);
  }
  return result;
}

/**
 * Splice the compiled `state.js` into a tmpdir so the `node -e` snippet can
 * `require()` it through `STELOW_PARSER_PATH`. TS bundler output drops the
 * `.js` extension on relative ESM specifiers; we add it back so plain
 * Node resolution works. This is the same shim used by the SW-018 umbrella
 * test; recreating it here keeps the three SW-025 test files self-contained
 * (per the file-scope rule that no shared helper module be added).
 */
function prepareCanonicalArtifact(): { parserPath: string; mirrorRoot: string } {
  const compiler = join(repoRoot, "node_modules/typescript/bin/tsc");
  expect(existsSync(compiler), "dependencies must be installed for this integration test").toBe(true);
  execFileSync(process.execPath, [compiler, "-p", join(repoRoot, "tsconfig.build.json")], {
    cwd: repoRoot,
    stdio: "pipe",
  });

  const sourceRoot = join(repoRoot, "build/extensions/stelow");
  expect(existsSync(join(sourceRoot, "state.js")), "the core build must emit state.js").toBe(true);
  const mirrorRoot = mkdtempSync(join(repoRoot, "build/.sw025-nandate-parser-"));
  const mirrorSourceRoot = join(mirrorRoot, "extensions/stelow");
  mkdirSync(mirrorSourceRoot, { recursive: true });
  cpSync(sourceRoot, mirrorSourceRoot, { recursive: true });

  for (const file of walkFiles(mirrorSourceRoot).filter((candidate) => candidate.endsWith(".js"))) {
    const original = readFileSync(file, "utf8");
    const normalized = original.replace(/(["'])(\.\.?\/[^"']+)\1/g, (full, quote: string, specifier: string) => {
      if (/[?#]$/.test(specifier) || /\.[a-zA-Z0-9]+$/.test(specifier)) return full;
      return `${quote}${specifier}.js${quote}`;
    });
    if (normalized !== original) writeFileSync(file, normalized, "utf8");
  }

  return {
    parserPath: join(mirrorSourceRoot, "state.js"),
    mirrorRoot,
  };
}

function makeTracking(created: string, dirHash: string): FixtureTracking {
  return {
    $schema: "https://raw.githubusercontent.com/calionauta/stelow/main/stelow.schema.json",
    version: "0.55.2",
    created,
    updated: created,
    workflows: [
      {
        name: "sw-025-nandate",
        status: "in-progress",
        currentPhase: 13,
        created,
        updated: created,
        dirHash,
        scopes: [],
      },
    ],
  };
}

describe("SW-025 scope-init-fallback NaN-date invariant", () => {
  let fixtureRoot: string;
  let trackingPath: string;
  let snippet: string;
  let parserPath: string;
  let parserMirrorRoot: string;
  let todayUtc: string;

  beforeAll(() => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "sw-025-nandate-"));
    trackingPath = join(fixtureRoot, "stelow.json");
    snippet = extractBashSnippet(readFileSync(fallbackPath, "utf8"));
    const artifact = prepareCanonicalArtifact();
    parserPath = artifact.parserPath;
    parserMirrorRoot = artifact.mirrorRoot;
    todayUtc = new Date().toISOString().slice(0, 10);
  });

  afterAll(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
    rmSync(parserMirrorRoot, { recursive: true, force: true });
  });

  function reset(): void {
    rmSync(join(fixtureRoot, ".stelow"), { recursive: true, force: true });
    rmSync(trackingPath, { force: true });
  }

  function writeTracking(tracking: FixtureTracking): void {
    writeFileSync(trackingPath, `${JSON.stringify(tracking, null, 2)}\n`, "utf8");
  }

  function writeSpec(name: string, content: string, directory: string): void {
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, name), `${content.trim()}\n`, "utf8");
  }

  function readTracking(): FixtureTracking {
    return JSON.parse(readFileSync(trackingPath, "utf8")) as FixtureTracking;
  }

  function run(env: Record<string, string> = {}): {
    status: number;
    stdout: string;
    stderr: string;
  } {
    const result = spawnSync("bash", ["-c", snippet], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        STELOW_ROOT: fixtureRoot,
        WF_INDEX: "0",
        STELOW_PARSER_PATH: parserPath,
        ...env,
      },
    });
    expect(result.error, result.error?.message).toBeUndefined();
    return {
      status: result.status ?? -1,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }

  it("preserves the static NaN-guard expression in the published snippet", () => {
    // Locks the source line 115 contract: a future hand-edit removing the
    // `Number.isNaN` guard flips this assertion. The runtime tests below
    // catch the same mutation via behavior, but the static lock is what
    // makes a code review reject the regression on plain `git diff`.
    const guard = "Number.isNaN(created.getTime())";
    const fallback = "new Date().toISOString().slice(0, 10)";
    expect(guard).toBe("Number.isNaN(created.getTime())");
    expect(fallback).toBe("new Date().toISOString().slice(0, 10)");
    expect(snippet).toContain(guard);
    expect(snippet).toContain(fallback);
    // The two branches must occupy the same ternary expression — a fix
    // that drops the NaN guard and falls through to `created.toISOString()`
    // would reverse the order and drop "Number.isNaN" entirely.
    const ternaryIndex = snippet.indexOf(guard);
    expect(ternaryIndex, "guard must precede the fallback").toBeGreaterThan(0);
    const fallbackIndex = snippet.indexOf(fallback, ternaryIndex);
    expect(fallbackIndex).toBeGreaterThan(ternaryIndex);
    // The exact ternary shape must read as
    // `Number.isNaN(created.getTime()) ? new Date()... : created.toISOString()...`
    const ternaryShape =
      "Number.isNaN(created.getTime())\n  ? new Date().toISOString().slice(0, 10)\n  : created.toISOString().slice(0, 10)";
    expect(snippet).toContain(ternaryShape);
  });

  it("falls back to today's UTC date when wf.created is a non-coercible string", () => {
    reset();
    const todayPlans = join(fixtureRoot, ".stelow", todayUtc, "legacy999", "plans");
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1, todayPlans);
    writeTracking(makeTracking("not-a-date", "legacy999"));

    const result = run();
    expect(result.status, `stderr=${result.stderr}`).toBe(0);
    // Positive control: the snippet's success line goes to stdout. The
    // resolved plans directory must be `<todayUtc>/legacy999/...`. If
    // the NaN guard were dropped, the dirHash `legacy999` would still
    // appear in the path, but the `todayUtc` segment would be replaced
    // with `NaN-NaN-NaN` and the resolved read would miss every fixture.
    expect(result.stdout).toBe(`[scope-init-fallback] synced 3 scopes from spec-tech_v1.md\n`);
    // The on-disk tracking must now reflect the parsed scopes.
    const workflow = readTracking().workflows[0];
    expect(workflow.specTechFile).toBe("spec-tech_v1.md");
    const scopes = workflow.scopes as JsonRecord[];
    expect(scopes).toHaveLength(3);
    expect(scopes.map((scope) => scope.id)).toEqual(["scope-1", "scope-2", "scope-3"]);
    expect(scopes.every((scope) => scope.status === "pending")).toBe(true);
    expect(workflow.updated).toBeTypeOf("string");
  });

  it("falls back to today's UTC date when wf.created is an empty string", () => {
    reset();
    const todayPlans = join(fixtureRoot, ".stelow", todayUtc, "emptyd8", "plans");
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1, todayPlans);
    writeTracking(makeTracking("", "emptyd8"));

    const result = run();
    expect(result.status, `stderr=${result.stderr}`).toBe(0);
    expect(result.stdout).toBe(`[scope-init-fallback] synced 3 scopes from spec-tech_v1.md\n`);

    const workflow = readTracking().workflows[0];
    expect(workflow.specTechFile).toBe("spec-tech_v1.md");
    expect(workflow.scopes).toHaveLength(3);
  });

  it("resolves the plans directory using a valid wf.created (regression control)", () => {
    // Negative control: the NaN fallback must not break the valid-date path.
    // If someone replaces the ternary with a hardcoded `todayUtc` (losing
    // the valid-date branch), this test fails because the plans directory
    // lives under `.stelow/2026-07-23/`, not under today's UTC.
    reset();
    const historicalDate = "2026-07-23";
    const historicalPlans = join(
      fixtureRoot,
      ".stelow",
      historicalDate,
      "abc12345",
      "plans",
    );
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1, historicalPlans);
    writeTracking(makeTracking("2026-07-23T10:00:00.000Z", "abc12345"));

    const result = run();
    expect(result.status, `stderr=${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("synced 3 scopes from spec-tech_v1.md");
    const workflow = readTracking().workflows[0];
    expect(workflow.specTechFile).toBe("spec-tech_v1.md");
    expect(workflow.scopes).toHaveLength(3);
  });

  it("falls back to today even when no plans exist under today's date (safe no-op)", () => {
    // Boundary: the NaN fallback yields a plans directory path that does
    // not exist on disk. The snippet must exit 0 (either via the
    // `could not read plans directory` path when the directory is absent,
    // or via the `no spec-tech_*.md` path when the directory is empty)
    // and leave the tracking file byte-identical to its pre-run state.
    // The positive control: the resolved path the snippet complains
    // about is `<todayUtc>/emptyplan/...` — a pre-fix NaN-NaN-NaN path
    // would never mention today's UTC date.
    reset();
    writeTracking(makeTracking("not-a-date", "emptyplan"));
    const before = readFileSync(trackingPath, "utf8");

    const result = run();
    expect(result.status).toBe(0);
    expect(result.stderr).toContain(todayUtc);
    expect(result.stderr).toContain("emptyplan");
    expect(result.stderr).toMatch(/no spec-tech_\*\.\*|could not read plans directory/);
    expect(readFileSync(trackingPath, "utf8")).toBe(before);
  });

  it("falls back to today when wf.created is a syntactically-valid but nonsense date", () => {
    // Boundary: `new Date("2026-13-99T99:99:99Z")` yields a Date whose
    // getTime() returns NaN (the JavaScript constructor refuses
    // out-of-range field values). The snippet must still fall back to
    // today's UTC date. Pre-fix would format `NaN-NaN-NaN`.
    reset();
    const todayPlans = join(fixtureRoot, ".stelow", todayUtc, "nonsense7", "plans");
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1, todayPlans);
    writeTracking(makeTracking("2026-13-99T99:99:99Z", "nonsense7"));

    const result = run();
    expect(result.status, `stderr=${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("synced 3 scopes from spec-tech_v1.md");
    const workflow = readTracking().workflows[0];
    expect(workflow.specTechFile).toBe("spec-tech_v1.md");
    expect(workflow.scopes).toHaveLength(3);
  });

  it("guards the canonical NaN-fallback contract in the runtime state.ts", () => {
    // Lock the source-side contract that the snippet mirrors. The snippet
    // is supposed to track `extensions/stelow/state.ts`; if the runtime
    // drifts, the snippet will follow it on the next release and the
    // behavior tests above will silently start passing against a broken
    // canonical implementation. The exact expression must appear AT
    // LEAST twice (line 728 and line 776), mirroring the snippet's
    // single occurrence.
    const source = readFileSync(stateSourcePath, "utf8");
    const expression = "isNaN(createdDate.getTime()) ? getDateStamp() : getDateStamp(createdDate)";
    const occurrences = source.split(expression).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
    // getDateStamp at line 557 must accept an optional Date and fall back
    // to `new Date()` when omitted. This is the helper the snippet's
    // `new Date().toISOString().slice(0, 10)` mirrors.
    const helperSignature = "export function getDateStamp(date?: Date): string";
    expect(source).toContain(helperSignature);
    const helperBody = "return (date || new Date()).toISOString().slice(0, 10);";
    expect(source).toContain(helperBody);
  });
});
