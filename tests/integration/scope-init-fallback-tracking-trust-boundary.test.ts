/**
 * SW-025 regression coverage for the JSON.parse trust-boundary in
 * `scope-init-fallback.md`.
 *
 * Finding (from SW-018 code review): the snippet used to call
 * `JSON.parse(fs.readFileSync(trackingPath, "utf8"))` outside the
 * documented error handling, so a malformed `stelow.json` terminated with
 * a SyntaxError stack trace instead of the advertised safe no-op. The
 * fix wraps the entire read+parse in a try/catch that emits
 * `could not read or parse` and exits 0 — existing tracking bytes are
 * preserved exactly.
 *
 * Each test below writes a deliberately malformed (or absent) tracking
 * file, runs the snippet, and asserts the safe-no-op contract: exit 0,
 * no leaked `SyntaxError` or stack-trace slot, stderr mentions
 * `could not read or parse`, and the on-disk bytes round-trip
 * byte-for-byte. The static test locks the try/catch shape so a future
 * edit that pulls `JSON.parse` out of the block flips immediately.
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

const JSON_PARSE_TRY_CATCH_RE =
  /try\s*\{\s*tracking\s*=\s*JSON\.parse\(fs\.readFileSync\(trackingPath/;

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
  const mirrorRoot = mkdtempSync(join(repoRoot, "build/.sw025-trust-"));
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
        name: "sw-025-trust",
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

describe("SW-025 scope-init-fallback JSON.parse trust-boundary", () => {
  let fixtureRoot: string;
  let trackingPath: string;
  let plansRoot: string;
  let snippet: string;
  let parserPath: string;
  let parserMirrorRoot: string;

  beforeAll(() => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "sw-025-trust-"));
    trackingPath = join(fixtureRoot, "stelow.json");
    plansRoot = join(fixtureRoot, ".stelow/2026-07-23/abc12345/plans");
    mkdirSync(plansRoot, { recursive: true });
    snippet = extractBashSnippet(readFileSync(fallbackPath, "utf8"));
    const artifact = prepareCanonicalArtifact();
    parserPath = artifact.parserPath;
    parserMirrorRoot = artifact.mirrorRoot;
  });

  afterAll(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
    rmSync(parserMirrorRoot, { recursive: true, force: true });
  });

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

  it("wraps the JSON.parse(fs.readFileSync(...)) call in a try/catch", () => {
    // Static lock: the snippet must contain `try { tracking = JSON.parse(fs.readFileSync(trackingPath...`
    // as a single statement. Removing the try/catch (the original defect)
    // would flip this assertion. The behavioral tests below also catch
    // the same mutation, but the static lock is what makes the regression
    // visible to a code review on plain `git diff`. The positive control:
    // the catch block must call `stop(..., 0)` (default code), not a
    // higher exit code, so the snippet is an exit-0 safe no-op.
    const tryMatch = snippet.match(JSON_PARSE_TRY_CATCH_RE);
    expect(tryMatch).not.toBeNull();
    expect(snippet).toContain("could not read or parse");
    expect(snippet).toContain("leaving state unchanged");
    // The catch handler must invoke `stop(..., 0)` so the snippet exits 0.
    expect(snippet).toContain(
      'stop(`could not read or parse ${trackingPath}; leaving state unchanged (',
    );
  });

  it("treats a truncated JSON file as a safe exit-0 no-op", () => {
    // Boundary: a mid-write crash leaves the tracking file truncated.
    // Pre-fix: `JSON.parse` throws SyntaxError, node unwinds the stack,
    // the process exits with a non-zero code and a stack trace. Post-fix:
    // exit 0 with `could not read or parse`, no leaked stack trace.
    // The mutation-killer is the no-stack-trace check: a V8 SyntaxError
    // always emits indented `    at ...` lines that the catch swallows.
    // The snippet's diagnostic deliberately includes `error.message`
    // (which contains "Unexpected token" as a substring), so the literal
    // "SyntaxError/Unexpected token" tokens must NOT be asserted absent.
    rmSync(trackingPath, { force: true });
    const truncated = '{ "workflows": [\n';
    writeFileSync(trackingPath, truncated, "utf8");
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);

    const result = run();
    expect(result.status, `stderr=${result.stderr}`).toBe(0);
    expect(result.stderr).toContain("could not read or parse");
    expect(result.stderr).toContain(trackingPath);
    // The stderr must be exactly the diagnostic line (no leaked stack).
    expect(result.stderr.split("\n").filter((line) => line.length > 0)).toHaveLength(1);
    expect(readFileSync(trackingPath, "utf8")).toBe(truncated);
  });

  it("treats an empty file as a safe exit-0 no-op", () => {
    // Boundary: the file exists but contains zero bytes. `JSON.parse("")`
    // throws SyntaxError pre-fix; the try/catch converts it to the
    // diagnostic message post-fix.
    rmSync(trackingPath, { force: true });
    writeFileSync(trackingPath, "", "utf8");
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);

    const result = run();
    expect(result.status, `stderr=${result.stderr}`).toBe(0);
    expect(result.stderr).toContain("could not read or parse");
    expect(result.stderr.split("\n").filter((line) => line.length > 0)).toHaveLength(1);
    expect(readFileSync(trackingPath, "utf8")).toBe("");
  });

  it("treats a foreign-byte file as a safe exit-0 no-op", () => {
    // Boundary: the file contains null bytes / non-UTF8 fragments from
    // a copy-paste error. `JSON.parse` throws SyntaxError pre-fix;
    // `fs.readFileSync` returns the raw Buffer-as-utf8 string and the
    // parser throws on the first non-JSON token.
    rmSync(trackingPath, { force: true });
    const foreign = "\x00\x01\x02 not json at all";
    writeFileSync(trackingPath, foreign, "utf8");
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);

    const result = run();
    expect(result.status, `stderr=${result.stderr}`).toBe(0);
    expect(result.stderr).toContain("could not read or parse");
    expect(result.stderr.split("\n").filter((line) => line.length > 0)).toHaveLength(1);
    expect(readFileSync(trackingPath, "utf8")).toBe(foreign);
  });

  it("treats a missing file as a safe exit-0 no-op", () => {
    // Boundary: the tracking file does not exist. `fs.readFileSync`
    // throws ENOENT; the try/catch converts it to the same diagnostic
    // message. This is the same handler that catches SyntaxError, so
    // the missing-file path must meet the same contract.
    rmSync(trackingPath, { force: true });
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);

    const result = run();
    expect(result.status, `stderr=${result.stderr}`).toBe(0);
    expect(result.stderr).toContain("could not read or parse");
    expect(result.stderr).toContain("ENOENT");
    expect(result.stderr.split("\n").filter((line) => line.length > 0)).toHaveLength(1);
    expect(existsSync(trackingPath)).toBe(false);
  });

  it("treats a valid JSON array root as a downstream-safe no-op", () => {
    // The JSON parses successfully but the shape is wrong: there is no
    // `workflows` array. The snippet must exit 0 with the documented
    // `no workflow at index 0` diagnostic and leave the file untouched.
    rmSync(trackingPath, { force: true });
    const arrayRoot = "[]\n";
    writeFileSync(trackingPath, arrayRoot, "utf8");
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);

    const result = run();
    expect(result.status, `stderr=${result.stderr}`).toBe(0);
    expect(result.stderr).toContain("no workflow at index 0");
    expect(result.stderr).toContain("leaving state unchanged");
    expect(readFileSync(trackingPath, "utf8")).toBe(arrayRoot);
  });

  it("syncs successfully when the tracking file is valid (positive control)", () => {
    // Positive control: proves the trust-boundary does not over-reach
    // and corrupt the happy path. A valid tracking file + valid spec-tech
    // must produce the standard `synced 3 scopes` output.
    writeFileSync(trackingPath, `${JSON.stringify(makeTracking(), null, 2)}\n`, "utf8");
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);

    const result = run();
    expect(result.status, `stderr=${result.stderr}`).toBe(0);
    expect(result.stdout).toBe(`[scope-init-fallback] synced 3 scopes from spec-tech_v1.md\n`);
    const workflow = readTracking().workflows[0];
    expect(workflow.specTechFile).toBe("spec-tech_v1.md");
    expect(workflow.scopes).toHaveLength(3);
  });
});
