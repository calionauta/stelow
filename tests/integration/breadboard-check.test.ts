/**
 * `stelow check breadboard` — the map's executable rules, and the guard that
 * runs them when a workflow leaves `selection`.
 *
 * Why this is an integration test against the real helper: the rules used to
 * live in repo-side JavaScript that a workflow never reached (the host runs
 * `advance`, and a project has no checkout). Moving them into the portable
 * helper is only worth anything if the helper is what runs — so these tests
 * spawn the helper, not an imported function.
 *
 * The failure this suite is built around: a map that looks complete and is not.
 * A display nothing feeds, a store nothing reads, a wire to an id that does not
 * exist — each renders beautifully and sends Architecture a shape nobody can
 * build.
 *
 * Two severities, two answers, and the tests pin BOTH:
 *   error → refused (no view, no advance)
 *   gap   → reported, and the workflow goes on (the writer decides)
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HELPER = join(REPO_ROOT, "scripts", "stelow");
const TRANSITIONS = join(REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md");
const SCHEMA = JSON.parse(readFileSync(join(REPO_ROOT, "schemas", "breadboard.json"), "utf8"));

/**
 * A map that exercises every optional field, so the schema-derived cases below
 * have a real path to mutate. The canonical example in the reference document
 * is smaller; this one is the contract's full surface.
 */
const COMPLETE = {
  schemaVersion: 1,
  interfaceId: "A",
  selectedBy: "human",
  scopeCoverage: [{ scopeId: "S1", effect: "served", note: "first slice" }],
  places: [
    { id: "P1", name: "Inbox", description: "Saved ideas", system: "frontend" },
    { id: "P2", name: "Idea Editor", mode: "Edit Mode" },
  ],
  affordances: [
    { id: "U1", kind: "ui", name: "New Idea button", place: "P1", control: "click", wiresOut: ["P2"], component: "inbox", notes: "top right" },
    { id: "U2", kind: "ui", name: "Problem input", place: "P2", control: "type", returnsTo: ["S1"] },
    { id: "U3", kind: "ui", name: "Title heading", place: "P2", control: "render" },
    { id: "N1", kind: "code", name: "saveIdea()", place: "P2", control: "call", wiresOut: ["N2"], returnsTo: ["S2"], tentative: false },
    { id: "N2", kind: "code", name: "ideaRepo.save()", place: "P2", control: "call" },
    { id: "S1", kind: "store", name: "draftIdea", place: "P2", control: "write", returnsTo: ["U2"] },
    { id: "S2", kind: "store", name: "savedIdea", place: "P2", control: "write", returnsTo: ["U3"] },
  ],
};

type CheckResult = {
  status: number;
  stdout: string;
  stderr: string;
  json: {
    ok: boolean;
    counts: { ids: number; referenced: number; dangling: number; contract: number; errors: number; gaps: number };
    contract: { path: string; message: string }[];
    problems: { check: string; severity: string; id: string; name: string; reason: string }[];
  } | null;
};

function runCheck(map: unknown, args: string[] = []): CheckResult {
  const dir = mkdtempSync(join(tmpdir(), "stelow-check-"));
  try {
    const path = join(dir, "breadboard.json");
    writeFileSync(path, JSON.stringify(map), "utf8");
    const result = spawnSync("bash", [HELPER, "check", "breadboard", path, ...args], { encoding: "utf8" });
    const stdout = result.stdout ?? "";
    let json = null;
    if (args.includes("--json") && stdout.trim()) json = JSON.parse(stdout);
    return { status: result.status ?? 1, stdout, stderr: result.stderr ?? "", json };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function problemIds(result: CheckResult, severity: string): string[] {
  return (result.json?.problems ?? []).filter((p) => p.severity === severity).map((p) => p.id).sort();
}

describe("check breadboard: the two severities", () => {
  it("accepts a complete, coherent map", () => {
    const result = runCheck(COMPLETE, ["--json"]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.json?.ok).toBe(true);
    expect(result.json?.problems).toEqual([]);
    expect(result.json?.counts).toMatchObject({ ids: 9, errors: 0, gaps: 0 });
  });

  it("reports a gap without refusing the map", () => {
    // A display nothing feeds may be a map the writer is still completing.
    // Failing the workflow on it would be wrong; hiding it would be worse.
    const map = structuredClone(COMPLETE);
    map.places.push({ id: "P8", name: "Empty" });
    const result = runCheck(map, ["--json"]);
    expect(result.status).toBe(0);
    expect(result.json?.ok).toBe(true);
    expect(result.json?.counts.gaps).toBe(1);
    expect(problemIds(result, "gap")).toEqual(["P8"]);
    expect(result.json?.problems[0].check).toBe("place has affordances");
  });

  it("refuses --strict when only a gap remains", () => {
    const map = structuredClone(COMPLETE);
    map.places.push({ id: "P8", name: "Empty" });
    const result = runCheck(map, ["--json", "--strict"]);
    expect(result.status).toBe(1);
    expect(result.json?.ok).toBe(false);
    expect(result.json?.counts.errors).toBe(0);
    expect(result.json?.counts.gaps).toBe(1);
  });

  it("refuses a map that contradicts itself", () => {
    const map = structuredClone(COMPLETE);
    map.affordances[0].wiresOut = ["P404"];
    const result = runCheck(map, ["--json"]);
    expect(result.status).toBe(1);
    expect(result.json?.ok).toBe(false);
    expect(problemIds(result, "error")).toEqual(["U1"]);
    expect(result.json?.problems[0].reason).toContain("P404");
  });

  it("prints findings on stderr and a summary on stdout without --json", () => {
    const map = structuredClone(COMPLETE);
    map.affordances[0].wiresOut = ["P404"];
    const result = runCheck(map);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("error — U1 (New Idea button)");
    expect(result.stdout).toContain("1 error(s)");
  });

  it("refuses an unreadable map with a named file, not a stack trace", () => {
    const dir = mkdtempSync(join(tmpdir(), "stelow-check-"));
    try {
      const path = join(dir, "broken.json");
      writeFileSync(path, "{ not json", "utf8");
      const result = spawnSync("bash", [HELPER, "check", "breadboard", path], { encoding: "utf8" });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("broken.json");
      expect(result.stderr).toContain("not valid JSON");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects an unknown flag instead of ignoring it", () => {
    const result = runCheck(COMPLETE, ["--stict"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown flag");
  });
});

// ── the contract, derived from the schema ────────────────────────────────────
//
// The helper enforces a copy of schemas/breadboard.json. A copy drifts. These
// cases are GENERATED from the schema, so a rule added there fails here until
// the helper learns it — the parity is mechanical instead of promised.

type Mutation = { label: string; apply: (map: any) => void };

function rulesFromSchema(): Mutation[] {
  const mutations: Mutation[] = [];

  // A schema path can name an optional field a map happens not to carry
  // (`returnsTo` on this affordance, `scopeCoverage` on this map). The walker
  // must still be able to plant a violation there, so it creates the missing
  // containers on the way down — otherwise that rule's case silently becomes a
  // no-op and a whole rule family goes untested.
  const at = (map: any, path: (string | number)[]) =>
    path.reduce((node, key) => {
      if (node[key] === undefined) node[key] = typeof key === "number" ? [] : {};
      return node[key];
    }, map);

  const walk = (node: any, path: (string | number)[]): void => {
    if (!node || typeof node !== "object") return;
    const where = path.length ? path.join(".") : "root";

    if (node.required) {
      for (const name of node.required) {
        mutations.push({
          label: `${where}: missing required "${name}"`,
          apply: (map) => {
            const parent = at(map, path);
            if (parent && typeof parent === "object") delete parent[name];
          },
        });
      }
    }
    if (node.additionalProperties === false) {
      mutations.push({
        label: `${where}: unknown property`,
        apply: (map) => {
          const parent = at(map, path);
          if (parent && typeof parent === "object") parent.extraKey = 1;
        },
      });
    }
    if (node.type === "array" && node.minItems) {
      mutations.push({
        label: `${where}: empty array`,
        apply: (map) => {
          const parent = at(map, path.slice(0, -1));
          if (parent) parent[path[path.length - 1]] = [];
        },
      });
    }
    if (node.type === "array" && node.items) walk(node.items, [...path, 0]);
    if (node.properties) {
      for (const [name, child] of Object.entries(node.properties)) walk(child, [...path, name]);
    }
    if (node.type === "string" && node.pattern) {
      mutations.push({
        label: `${where}: breaks ${node.pattern}`,
        apply: (map) => {
          const parent = at(map, path.slice(0, -1));
          if (parent) parent[path[path.length - 1]] = "!! not an id !!";
        },
      });
    }
    if (node.minLength) {
      mutations.push({
        label: `${where}: empty string`,
        apply: (map) => {
          const parent = at(map, path.slice(0, -1));
          if (parent) parent[path[path.length - 1]] = "";
        },
      });
    }
    if (node.enum) {
      mutations.push({
        label: `${where}: outside the enum`,
        apply: (map) => {
          const parent = at(map, path.slice(0, -1));
          if (parent) parent[path[path.length - 1]] = "not-a-member";
        },
      });
    }
    if (node.const !== undefined) {
      mutations.push({
        label: `${where}: not ${JSON.stringify(node.const)}`,
        apply: (map) => {
          const parent = at(map, path.slice(0, -1));
          if (parent) parent[path[path.length - 1]] = "not-the-constant";
        },
      });
    }
  };

  walk(SCHEMA, []);
  return mutations;
}

describe("the helper's contract is the published schema", () => {
  it("derives at least one case per rule family (the walker is not silently empty)", () => {
    const mutations = rulesFromSchema();
    expect(mutations.length).toBeGreaterThan(20);
    expect(mutations.map((m) => m.label)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/places\.0: missing required "id"/),
        expect.stringMatching(/affordances\.0\.wiresOut\.0: breaks/),
        expect.stringMatching(/root: unknown property/),
      ]),
    );
  });

  it("rejects every violation the schema describes", () => {
    for (const mutation of rulesFromSchema()) {
      const map = structuredClone(COMPLETE);
      mutation.apply(map);
      const result = runCheck(map, ["--json"]);
      // Every schema rule is a contract error: the verdict must refuse it and
      // must say it is the contract, not a design gap.
      expect(result.status, mutation.label).toBe(1);
      expect(result.json?.counts.contract, mutation.label).toBeGreaterThan(0);
    }
  }, 120_000);
});

// ── the guard: leaving selection requires a valid map ────────────────────────
//
// The worker can forget to run the checks; `advance` cannot. This is the whole
// point of moving the rules into the helper — the host already runs it.

function workflowRepo(map: unknown): { dir: string; state: string } {
  const dir = mkdtempSync(join(tmpdir(), "stelow-guard-"));
  spawnSync("git", ["init", "-q"], { cwd: dir });
  spawnSync("git", ["config", "user.email", "t@t"], { cwd: dir });
  spawnSync("git", ["config", "user.name", "t"], { cwd: dir });

  mkdirSync(join(dir, "scripts"), { recursive: true });
  writeFileSync(join(dir, "scripts", "stelow"), readFileSync(HELPER));
  mkdirSync(join(dir, "skills", "stelow-workflow-orchestrator", "references"), { recursive: true });
  writeFileSync(join(dir, "skills", "stelow-workflow-orchestrator", "references", "transitions.md"), readFileSync(TRANSITIONS));

  const stateDir = join(dir, ".stelow", "2026-10-22", "guard");
  mkdirSync(join(stateDir, "interfaces"), { recursive: true });
  const state = join(stateDir, "state.md");
  writeFileSync(
    state,
    `---
name: t
intent: feature
current_stage: selection
status: active
config:
  quality: production
  exploration_count: 3
  exploration_hybrid: true
  review_mode: Auto
  product_type: software
stages:
  shape: done
  interface: done
  int-gate: done
  selection: in-progress
---
# t
`,
  );
  writeFileSync(join(stateDir, "interfaces", "selected-interface.md"), "# selected\n");
  writeFileSync(join(stateDir, "interfaces", "breadboard.json"), JSON.stringify(map));
  return { dir, state };
}

function advance(dir: string, state: string): { status: number; stderr: string; stage: string } {
  const result = spawnSync("bash", ["scripts/stelow", "advance", "architecture"], {
    cwd: dir,
    env: { ...process.env, STELOW_STATE: state },
    encoding: "utf8",
  });
  const stage = (readFileSync(state, "utf8").match(/^current_stage:\s*(\S+)/m) ?? [])[1] ?? "?";
  return { status: result.status ?? 1, stderr: result.stderr ?? "", stage };
}

describe("advance runs the check on the selection transition", () => {
  it("advances with a map the rules accept", () => {
    const { dir, state } = workflowRepo(COMPLETE);
    try {
      const result = advance(dir, state);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stage).toBe("architecture");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a map with an error and leaves the stage untouched", () => {
    // The bug this pins: a workflow that advanced past a map whose wiring
    // points at an id nobody declared handed Architecture a shape that cannot
    // be built, and nothing noticed until planning.
    const map = structuredClone(COMPLETE);
    map.affordances[0].wiresOut = ["P404"];
    const { dir, state } = workflowRepo(map);
    try {
      const result = advance(dir, state);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("wires to P404");
      expect(result.stderr).toContain("breadboard check failed");
      expect(result.stage).toBe("selection");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("advances with gaps, and says so", () => {
    // A gap is a judgement call for the writer, not a reason to freeze the
    // workflow. It is reported on the transition so the next stage sees it.
    const map = structuredClone(COMPLETE);
    map.places.push({ id: "P8", name: "Empty" });
    const { dir, state } = workflowRepo(map);
    try {
      const result = advance(dir, state);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toContain("place has affordances");
      expect(result.stage).toBe("architecture");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
