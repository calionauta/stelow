/**
 * SW-025 regression coverage for the no-third-parser invariant in
 * `scope-init-fallback.md`.
 *
 * Finding (from SW-018 code review): the snippet used to carry a
 * duplicated parser implementation as a fall-through catch block, which
 * created a third parser that could silently diverge from the canonical
 * `parseSpecTechScopes`. The fix is a hard, actionable error: a missing
 * or malformed parser artifact exits 1 with a diagnostic naming
 * `STELOW_PARSER_PATH` and `canonical parser`, and existing tracking
 * bytes are preserved.
 *
 * The three static scans below lock the absence of the inline parser
 * body, the inline block literal, and any catch that reassigns the
 * parser. The three behavioral tests verify the contract: a missing
 * artifact exits 1, a malformed artifact (no `parseSpecTechScopes`
 * export) exits 1, and the canonical artifact drives a successful sync.
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

// Mutation targets these patterns catch if reintroduced.
const INLINE_PARSER_SPLIT_RE = /\.split\(\/\(\?=\[SCOPE/;
const INLINE_BLOCK_LITERAL_RE = /\[SCOPE-\d+\]/;
const CATCH_REASSIGN_RE = /catch\s*\(?[^)]*\)?\s*\{[^}]*parseSpecTechScopes\s*=/;

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

function prepareCanonicalArtifact(): { parserPath: string; mirrorRoot: string } {
  const compiler = join(repoRoot, "node_modules/typescript/bin/tsc");
  expect(existsSync(compiler), "dependencies must be installed for this integration test").toBe(true);
  execFileSync(process.execPath, [compiler, "-p", join(repoRoot, "tsconfig.build.json")], {
    cwd: repoRoot,
    stdio: "pipe",
  });

  const sourceRoot = join(repoRoot, "build/extensions/stelow");
  expect(existsSync(join(sourceRoot, "state.js")), "the core build must emit state.js").toBe(true);
  const mirrorRoot = mkdtempSync(join(repoRoot, "build/.sw025-noparser-"));
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

function makeTracking(): FixtureTracking {
  const created = "2026-07-23T10:00:00.000Z";
  return {
    $schema: "https://raw.githubusercontent.com/calionauta/stelow/main/stelow.schema.json",
    version: "0.55.2",
    created,
    updated: created,
    workflows: [
      {
        name: "sw-025-noparser",
        status: "in-progress",
        currentPhase: 13,
        created,
        updated: created,
        dirHash: "abc12345",
        scopes: [],
      },
    ],
  };
}

describe("SW-025 scope-init-fallback no-third-parser invariant", () => {
  let fixtureRoot: string;
  let trackingPath: string;
  let plansRoot: string;
  let snippet: string;
  let parserPath: string;
  let parserMirrorRoot: string;

  beforeAll(() => {
    // Initialize the cleanup-target path BEFORE any step that may throw
    // (specifically `prepareCanonicalArtifact`, which calls `execFileSync`
    // on `node_modules/typescript/bin/tsc`). If that step throws and the
    // `afterAll` cleanup runs against an uninitialized variable, vitest
    // reports a misleading `TypeError: The "path" argument must be of
    // type string ... Received undefined` that masks the real cause. By
    // allocating a real tmpdir placeholder up front, the cleanup is
    // always able to run (or no-op gracefully via the `afterAll` guard
    // below if the placeholder was never overwritten by `prepareCanonicalArtifact`).
    parserMirrorRoot = mkdtempSync(join(repoRoot, "build/.sw025-noparser-fallback-"));
    fixtureRoot = mkdtempSync(join(tmpdir(), "sw-025-noparser-"));
    trackingPath = join(fixtureRoot, "stelow.json");
    plansRoot = join(fixtureRoot, ".stelow/2026-07-23/abc12345/plans");
    mkdirSync(plansRoot, { recursive: true });
    snippet = extractBashSnippet(readFileSync(fallbackPath, "utf8"));
    const artifact = prepareCanonicalArtifact();
    parserPath = artifact.parserPath;
    // Overwrite the placeholder with the real mirror produced by
    // `prepareCanonicalArtifact`. If the placeholder was never assigned
    // (e.g., a future regression removes the initialization above), the
    // `afterAll` guard below prevents the cleanup from throwing.
    parserMirrorRoot = artifact.mirrorRoot;
  });

  afterAll(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
    // Defense in depth: only clean up `parserMirrorRoot` if it was actually
    // assigned to a real path. Without this guard, an uninitialized
    // variable (e.g., if `beforeAll` throws before its assignment) would
    // cause `rmSync(undefined, ...)` to throw a misleading TypeError that
    // masks the real failure.
    if (typeof parserMirrorRoot === "string" && parserMirrorRoot.length > 0) {
      rmSync(parserMirrorRoot, { recursive: true, force: true });
    }
  });

  function reset(): void {
    if (existsSync(plansRoot)) {
      for (const name of readdirSync(plansRoot)) {
        if (name.startsWith("spec-tech_") && name.endsWith(".md")) {
          rmSync(join(plansRoot, name), { force: true });
        }
      }
    }
    writeFileSync(trackingPath, `${JSON.stringify(makeTracking(), null, 2)}\n`, "utf8");
  }

  function writeSpec(name: string, content: string): void {
    writeFileSync(join(plansRoot, name), `${content.trim()}\n`, "utf8");
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

  it("contains no inline parser split() regex inside the snippet body", () => {
    // Locks the absence of `content.split(/(?=[SCOPE-N])/)` (or any
    // variant that detects scope blocks). Re-introducing the inline
    // parser would flip this assertion. The positive control: the
    // snippet's parser block must reference the canonical artifact
    // path that the shipped parser loader targets.
    const inlineMatch = snippet.match(INLINE_PARSER_SPLIT_RE);
    expect(inlineMatch).toBeNull();
    expect(snippet).toContain("build/extensions/stelow/state.js");
    expect(snippet).toContain("STELOW_PARSER_PATH");
    expect(snippet).toContain("canonical parser");
  });

  it("contains no inline [SCOPE-N] block literal in the snippet body", () => {
    // The canonical parser is the only place `[SCOPE-N]` is recognized.
    // The reference snippet must forward the raw content to that parser
    // without itself trying to detect block headers.
    const blockMatch = snippet.match(INLINE_BLOCK_LITERAL_RE);
    expect(blockMatch).toBeNull();
    // The snippet must call the parser via the require() loader.
    const requireIndex = snippet.indexOf("require(selectedParser)");
    expect(requireIndex).toBeGreaterThan(0);
    expect(snippet).toContain("parserModule.parseSpecTechScopes");
  });

  it("contains no catch block that reassigns parseSpecTechScopes", () => {
    // The original defect wrapped a `parseSpecTechScopes = (content) => {...}`
    // assignment inside a catch block so a `require()` failure could swap
    // in a hand-rolled parser. The fix removes the entire fallback body.
    const catchMatch = snippet.match(CATCH_REASSIGN_RE);
    expect(catchMatch).toBeNull();
    // The error-handling shape must be a `stop(..., 1)` call, not a
    // re-assignment. The shipped parser loader fails loudly.
    const catchStopIndex = snippet.indexOf("could not load the canonical parser");
    expect(catchStopIndex).toBeGreaterThan(0);
    expect(snippet).toContain("stop(`could not load the canonical parser");
  });

  it("exits 1 with an actionable diagnostic when the parser artifact is missing", () => {
    // Behavioral mirror of the static locks: a missing
    // STELOW_PARSER_PATH must surface as a hard failure, not a silent
    // fallback to an inline parser. If the catch block were re-introduced
    // with an inline parser, this test would flip to status 0 with
    // populated scopes.
    reset();
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);
    const before = readFileSync(trackingPath, "utf8");
    const missingPath = join(fixtureRoot, "no-such-parser.js");

    const result = run({ STELOW_PARSER_PATH: missingPath });
    expect(result.status, `stderr=${result.stderr}`).toBe(1);
    expect(result.stderr).toContain("canonical parser");
    expect(result.stderr).toContain("STELOW_PARSER_PATH");
    expect(result.stderr).toContain(missingPath);
    // On a hard failure the snippet must NOT emit the success stdout.
    expect(result.stdout).toBe("");
    // Tracking bytes preserved exactly — no partial write to disk.
    expect(readFileSync(trackingPath, "utf8")).toBe(before);
  });

  it("exits 1 when the parser artifact does not export parseSpecTechScopes", () => {
    // Boundary: a file exists at STELOW_PARSER_PATH but it does not
    // expose the canonical export. The snippet must reject it rather
    // than silently substitute a hand-rolled parser.
    reset();
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);
    const before = readFileSync(trackingPath, "utf8");
    const stubPath = join(fixtureRoot, "stub-parser.js");
    writeFileSync(
      stubPath,
      'module.exports = { unrelated: () => "not the parser" };\n',
      "utf8",
    );

    const result = run({ STELOW_PARSER_PATH: stubPath });
    expect(result.status, `stderr=${result.stderr}`).toBe(1);
    expect(result.stderr).toContain("does not export parseSpecTechScopes");
    expect(result.stderr).toContain(stubPath);
    expect(result.stdout).toBe("");
    expect(readFileSync(trackingPath, "utf8")).toBe(before);
  });

  it("exits 1 when the parser artifact loads but parseSpecTechScopes is not a function", () => {
    // Boundary: the export is named correctly but is a non-function
    // (e.g. a string, an object). The type-check guard must trigger
    // and the snippet must exit 1.
    reset();
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);
    const before = readFileSync(trackingPath, "utf8");
    const stubPath = join(fixtureRoot, "wrong-type-parser.js");
    writeFileSync(
      stubPath,
      'module.exports = { parseSpecTechScopes: "not a function" };\n',
      "utf8",
    );

    const result = run({ STELOW_PARSER_PATH: stubPath });
    expect(result.status, `stderr=${result.stderr}`).toBe(1);
    expect(result.stderr).toContain("does not export parseSpecTechScopes");
    expect(result.stdout).toBe("");
    expect(readFileSync(trackingPath, "utf8")).toBe(before);
  });

  it("exits 1 when the parser artifact is a malformed ES module", () => {
    // Boundary: the file exists but throws at load time (syntax error
    // in the stub). The catch must surface the load error and exit 1,
    // not silently substitute a different parser.
    reset();
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);
    const before = readFileSync(trackingPath, "utf8");
    const stubPath = join(fixtureRoot, "broken-parser.js");
    // Unmatched bracket — `require` will throw.
    writeFileSync(stubPath, "module.exports = { parseSpecTechScopes: function(\n", "utf8");

    const result = run({ STELOW_PARSER_PATH: stubPath });
    expect(result.status, `stderr=${result.stderr}`).toBe(1);
    expect(result.stderr).toContain("could not load the canonical parser");
    expect(result.stderr).toContain(stubPath);
    expect(result.stdout).toBe("");
    expect(readFileSync(trackingPath, "utf8")).toBe(before);
  });

  it("syncs three scopes through the canonical artifact (positive end-to-end control)", () => {
    // Final positive control: the parser loader must work end-to-end
    // when pointed at the real compiled state.js. This proves the
    // STELOW_PARSER_PATH plumbing is correct and the contract
    // "canonical parser" is honored.
    reset();
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);

    const result = run();
    expect(result.status, `stderr=${result.stderr}`).toBe(0);
    expect(result.stdout).toBe(`[scope-init-fallback] synced 3 scopes from spec-tech_v1.md\n`);
    const workflow = readTracking().workflows[0];
    expect(workflow.specTechFile).toBe("spec-tech_v1.md");
    const scopes = workflow.scopes as JsonRecord[];
    expect(scopes).toHaveLength(3);
    expect(scopes.every((scope) => scope.status === "pending")).toBe(true);
  });
});
