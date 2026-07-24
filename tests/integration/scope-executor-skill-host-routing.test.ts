/**
 * SW-018 regression coverage for the scope-executor host matrix.
 *
 * The fixture exercises the actual node -e block published in
 * scope-init-fallback.md. The parser artifact used by the child process is a
 * temporary copy of the repository's compiled artifact with only the ESM
 * relative-specifier suffixes normalized for plain Node resolution; it is not
 * a second parser. The returned Scope[] is therefore produced by the shipped
 * parseSpecTechScopes implementation, not by a test double.
 */
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseSpecTechScopes } from "../../extensions/stelow/state";

type JsonRecord = Record<string, unknown>;
type FixtureTracking = JsonRecord & {
  workflows: JsonRecord[];
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceSkillPath = join(repoRoot, "skills/stelow-product-scope-executor/SKILL.md");
const pluginSkillPath = join(
  repoRoot,
  "plugins/fusion-plugin-stelow/skills/stelow-product-scope-executor/SKILL.md",
);
const fallbackPath = join(
  repoRoot,
  "skills/stelow-product-scope-executor/references/cli-tools/scope-init-fallback.md",
);
const baselineStateSha = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();

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

const SPEC_TECH_V2 = `
[SCOPE-7]
[TYPE] spike
Objective: Replace the v1 spike
Dependencies: None
DoD: A v2 recommendation
`;

function extractStep2e(text: string): string {
  const start = text.indexOf("### Step 2e");
  expect(start, "the skill must contain Step 2e").toBeGreaterThanOrEqual(0);
  const rest = text.slice(start);
  const nextHeading = rest.search(/\n### Step (?!2e)/);
  return rest.slice(0, nextHeading < 0 ? rest.length : nextHeading).trimEnd();
}

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
 * TypeScript's bundler-mode output intentionally omits .js on relative ESM
 * imports. Normalize those specifiers in a temporary ignored copy so a plain
 * `node -e` process can load the real compiled module. No source/runtime file
 * is changed, and the parser implementation remains the artifact under test.
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
  const mirrorRoot = mkdtempSync(join(repoRoot, "build/.sw018-parser-"));
  const mirrorSourceRoot = join(mirrorRoot, "extensions/stelow");
  mkdirSync(mirrorSourceRoot, { recursive: true });
  cpSync(sourceRoot, mirrorSourceRoot, { recursive: true });

  for (const file of walkFiles(mirrorSourceRoot).filter((candidate) => candidate.endsWith(".js"))) {
    const original = readFileSync(file, "utf8");
    const normalized = original.replace(/(["'])(\.\.?\/[^"']+)\1/g, (full, quote: string, specifier: string) => {
      // Keep explicit extensions, URL-like imports, and package specifiers.
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

function makeTracking(created = "2026-07-23T10:00:00.000Z"): FixtureTracking {
  return {
    $schema: "https://raw.githubusercontent.com/calionauta/stelow/main/stelow.schema.json",
    version: "0.55.1",
    created,
    updated: created,
    workflows: [
      {
        name: "sw-018-fixture",
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

function scopesFrom(text: string): JsonRecord[] {
  return parseSpecTechScopes(text) as unknown as JsonRecord[];
}

describe("SW-018 scope-executor host routing", () => {
  const sourceText = readFileSync(sourceSkillPath, "utf8");
  const pluginText = readFileSync(pluginSkillPath, "utf8");
  const sourceStep = extractStep2e(sourceText);
  const pluginStep = extractStep2e(pluginText);
  const fallbackText = readFileSync(fallbackPath, "utf8");

  it("keeps the regenerated plugin Step 2e byte-identical to source", () => {
    expect(pluginStep).toBe(sourceStep);
  });

  it("removes the universal auto-sync claim and names every host path", () => {
    expect(sourceText).not.toContain("extension auto-syncs");
    expect(pluginText).not.toContain("extension auto-syncs");
    expect(sourceStep).toMatch(/\bPi\b/);
    expect(sourceStep).toMatch(/\bFusion\b/);
    expect(sourceStep).toMatch(/[Gg]eneric/);
    expect(sourceStep).toContain("parseSpecTechScopes");
    expect(sourceStep).toContain("scope-init-fallback.md");
    expect(sourceStep).toContain("status: 'pending'");
  });

  it("keeps the fallback on the canonical artifact with no parser-switching copy", () => {
    expect(fallbackText).toContain("build/extensions/stelow/state.js");
    const snippet = extractBashSnippet(fallbackText);
    expect(snippet).toContain("parseSpecTechScopes");
    expect(snippet).not.toContain("content.split(/(?=");
    expect(snippet).not.toMatch(/catch\s*\{[^}]*parseSpecTechScopes\s*=/);
  });

  it("does not modify the frozen parser source", () => {
    const result = spawnSync(
      "git",
      ["diff", "--quiet", baselineStateSha, "--", "extensions/stelow/state.ts"],
      { cwd: repoRoot },
    );
    expect(result.status).toBe(0);
  });
});

describe("SW-018 generic scope-init fallback runtime", () => {
  let fixtureRoot: string;
  let trackingPath: string;
  let plansRoot: string;
  let snippet: string;
  let parserPath: string;
  let parserMirrorRoot: string;

  beforeAll(() => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "sw-018-scope-init-"));
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

  function writeTracking(tracking: FixtureTracking): void {
    writeFileSync(trackingPath, `${JSON.stringify(tracking, null, 2)}\n`, "utf8");
  }

  function readTracking(): FixtureTracking {
    return JSON.parse(readFileSync(trackingPath, "utf8")) as FixtureTracking;
  }

  function clearSpecTech(): void {
    if (!existsSync(plansRoot)) mkdirSync(plansRoot, { recursive: true });
    for (const name of readdirSync(plansRoot)) {
      if (name.startsWith("spec-tech_") && name.endsWith(".md")) {
        rmSync(join(plansRoot, name), { force: true });
      }
    }
  }

  function writeSpec(name: string, content: string, directory = plansRoot): void {
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, name), `${content.trim()}\n`, "utf8");
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

  function reset(created = "2026-07-23T10:00:00.000Z"): void {
    clearSpecTech();
    writeTracking(makeTracking(created));
  }

  it("populates three scopes with canonical fields and pending status", () => {
    reset();
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);
    const result = run();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("synced 3 scopes from spec-tech_v1.md");

    const workflow = readTracking().workflows[0];
    expect(workflow.specTechFile).toBe("spec-tech_v1.md");
    expect(workflow.scopes).toEqual(scopesFrom(SPEC_TECH_V1));
    const scopes = workflow.scopes as JsonRecord[];
    expect(scopes).toHaveLength(3);
    expect(scopes.every((scope) => scope.status === "pending")).toBe(true);
    expect(scopes[0]).toMatchObject({
      id: "scope-1",
      type: "feature",
      name: "Implement user login",
      targetFiles: ["src/auth/**", "src/middleware/auth.ts"],
      maxIterations: 5,
    });
    expect(scopes[0]).not.toHaveProperty("blockedBy");
    expect(scopes[1]).toMatchObject({
      id: "scope-2",
      type: "optimization",
      blockedBy: ["scope-1"],
      maxIterations: 3,
    });
  });

  it("is idempotent when the latest filename is already recorded", () => {
    reset();
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);
    const tracking = readTracking();
    tracking.workflows[0].scopes = scopesFrom(SPEC_TECH_V1);
    tracking.workflows[0].specTechFile = "spec-tech_v1.md";
    writeTracking(tracking);
    const before = readFileSync(trackingPath, "utf8");
    const beforeMtime = statSync(trackingPath).mtimeMs;

    const result = run();
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("scopes already in sync");
    expect(readFileSync(trackingPath, "utf8")).toBe(before);
    expect(statSync(trackingPath).mtimeMs).toBe(beforeMtime);
  });

  it("replaces scopes when a lexicographically newer version appears", () => {
    reset();
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);
    const first = run();
    expect(first.status).toBe(0);
    writeSpec("spec-tech_v2.md", SPEC_TECH_V2);

    const result = run();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("synced 1 scopes from spec-tech_v2.md");
    const workflow = readTracking().workflows[0];
    expect(workflow.specTechFile).toBe("spec-tech_v2.md");
    expect(workflow.scopes).toEqual(scopesFrom(SPEC_TECH_V2));
  });

  it("leaves state untouched when no planning file exists", () => {
    reset();
    const before = readFileSync(trackingPath, "utf8");
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("no spec-tech_*.md");
    expect(readFileSync(trackingPath, "utf8")).toBe(before);
  });

  it("treats a spec-tech file with no scope blocks as a safe no-op", () => {
    reset();
    writeSpec("spec-tech_v9.md", "# No scope blocks here\n");
    const before = readFileSync(trackingPath, "utf8");
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("had no [SCOPE-N] blocks");
    expect(readFileSync(trackingPath, "utf8")).toBe(before);
  });

  it("uses today's date when wf.created is an invalid legacy timestamp", () => {
    const today = new Date().toISOString().slice(0, 10);
    const todayPlans = join(fixtureRoot, ".stelow", today, "legacy999", "plans");
    clearSpecTech();
    rmSync(join(fixtureRoot, ".stelow"), { recursive: true, force: true });
    writeTracking(makeTracking("not-a-date"));
    const invalidTracking = readTracking();
    invalidTracking.workflows[0].dirHash = "legacy999";
    writeTracking(invalidTracking);
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1, todayPlans);

    const result = run();
    expect(result.status, result.stderr).toBe(0);
    expect(readTracking().workflows[0].specTechFile).toBe("spec-tech_v1.md");
    expect(readTracking().workflows[0].scopes).toEqual(scopesFrom(SPEC_TECH_V1));
  });

  it("treats malformed stelow.json as an exit-0 no-op", () => {
    clearSpecTech();
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);
    const malformed = '{ "workflows": [\n';
    writeFileSync(trackingPath, malformed, "utf8");
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("could not read or parse");
    expect(result.stderr).not.toContain("SyntaxError");
    expect(readFileSync(trackingPath, "utf8")).toBe(malformed);
  });

  it("fails loudly instead of switching to an unshipped parser", () => {
    reset();
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);
    const before = readFileSync(trackingPath, "utf8");
    const result = run({ STELOW_PARSER_PATH: join(fixtureRoot, "missing-state.js") });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("canonical parser");
    expect(result.stderr).toContain("STELOW_PARSER_PATH");
    expect(readFileSync(trackingPath, "utf8")).toBe(before);
  });

  it("matches parseSpecTechScopes exactly on the three-scope fixture", () => {
    reset();
    writeSpec("spec-tech_v1.md", SPEC_TECH_V1);
    const result = run();
    expect(result.status).toBe(0);
    const actual = readTracking().workflows[0].scopes;
    expect(actual).toEqual(scopesFrom(SPEC_TECH_V1));
  });
});
