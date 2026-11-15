// tests/unit/stelow-helper.test.ts
//
// Unit tests for scripts/stelow (SCOPE-2 helper). No mocks — each test
// spawns a real bash subprocess against a temp git repo. Parallel-safe:
// every test gets its own temp dir keyed by process.pid + nanoid-ish.
//
// Coverage:
//   - status (text + --json, nested config:, missing state.md)
//   - advance validation (valid candidate, invalid candidate, byte-identical revert)
//   - advance lock (mkdir contention, TTL auto-cleanup)
//   - doctor (6 drift classes, incl. stale-lock / missing-dir / orphan-pid,
//     and the recipe-declaration check: a stage naming a recipe with no file)
//
// To run:  npm run test:unit -- stelow-helper

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, realpathSync, rmSync, symlinkSync, utimesSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";

const REPO_ROOT = join(__dirname, "..", "..");
const HELPER_SRC = join(REPO_ROOT, "scripts", "stelow");
const TRANSITIONS_SRC = join(REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md");

interface Workdir { dir: string; helper: string; }

const workdirs: Workdir[] = [];

function makeWorkdir(): Workdir {
  const id = randomBytes(6).toString("hex");
  const dir = mkdtempSync(join(tmpdir(), `stelow-test-${process.pid}-${id}`));
  // init git
  execSync("git init -q", { cwd: dir });
  execSync("git config user.email test@test", { cwd: dir });
  execSync("git config user.name test", { cwd: dir });
  // copy helper
  mkdirSync(join(dir, "scripts"), { recursive: true });
  const helper = join(dir, "scripts", "stelow");
  writeFileSync(helper, readFileSync(HELPER_SRC));
  // copy transitions
  mkdirSync(join(dir, "skills", "stelow-workflow-orchestrator", "references"), { recursive: true });
  writeFileSync(join(dir, "skills", "stelow-workflow-orchestrator", "references", "transitions.md"),
                readFileSync(TRANSITIONS_SRC));
  execSync("git add -A && git commit -q -m init", { cwd: dir });
  const wd = { dir, helper };
  workdirs.push(wd);
  return wd;
}

// Backdate a lock dir's mtime with Node (portable; GNU/BSD `touch -d` differs).
function backdateLock(wd: Workdir, when: Date): void {
  const lock = join(wd.dir, ".stelow", "lock");
  utimesSync(lock, when, when);
}

function makeState(wd: Workdir, current_stage: string): void {
  writeFileSync(join(wd.dir, "state.md"), `---
name: t
intent: feature
current_stage: ${current_stage}
status: active
config:
  quality: production
  exploration_count: 3
  exploration_hybrid: true
  review_mode: Auto
  product_type: software
stages:
  ${current_stage}: in-progress
---
# t
`);
}

function makeLegacyState(wd: Workdir, current_stage: string): void {
  writeFileSync(join(wd.dir, "state.md"), `---
name: t
intent: feature
current_stage: ${current_stage}
status: active
config:
  appetite: Core
  review_mode: Auto
  product_type: software
stages:
  ${current_stage}: in-progress
---
# t
`);
}

// A stage block in the shape `stages.yaml` really uses: two-space list entry,
// `execution:` at four, `recipe:` at six. `null` is the eight-times-repeated
// spelling in the real file — it is *not* a declaration.
function stageBlock(name: string, recipe: string | null): string {
  return `  - name: ${name}\n    order: 10\n    playbook: stages/${name}.md\n    execution:\n      mode: direct\n      recipe: ${recipe === null ? "null" : recipe}\n      write_policy: none\n`;
}

function stagesYaml(blocks: string[]): string {
  return `version: 2\n\nstages:\n${blocks.join("\n")}`;
}

function writeStages(wd: Workdir, yaml: string): void {
  mkdirSync(join(wd.dir, "skills", "stelow-workflow-orchestrator"), { recursive: true });
  writeFileSync(join(wd.dir, "skills", "stelow-workflow-orchestrator", "stages.yaml"), yaml);
}

function writeRecipe(wd: Workdir, id: string): void {
  mkdirSync(join(wd.dir, "recipes"), { recursive: true });
  writeFileSync(join(wd.dir, "recipes", `${id}.yaml`), `id: ${id}\n`);
}

function seedArtifact(statedir: string, relativePath: string): void {
  const target = join(statedir, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, "# Test artifact\n");
}

function run(wd: Workdir, args: string[], env: Record<string, string> = {}, cwd: string = wd.dir): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("bash", [wd.helper, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, PATH: process.env.PATH ?? "", ...env },
  });
  return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

afterAll(() => {
  for (const w of workdirs) {
    try { rmSync(w.dir, { recursive: true, force: true }); } catch {}
  }
});

// ---------------------------------------------------------------------------

describe("status", () => {
  let wd: Workdir;
  beforeEach(() => { wd = makeWorkdir(); });

  it("prints ?-rows when state.md is absent", () => {
    const r = run(wd, ["status"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("workflow : ?");
    expect(r.stdout).toContain("lock     : free");
  });

  it("reads top-level + nested config: scalars from state.md", () => {
    makeState(wd, "shape");
    const r = run(wd, ["status"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("workflow : t");
    expect(r.stdout).toContain("stage    : shape");
    expect(r.stdout).toContain("quality  : production");
    expect(r.stdout).toContain("explore  : count=3 hybrid=true");
    expect(r.stdout).toContain("review   : Auto");
  });

  it("maps a legacy appetite-only state to knobs with an announced mapping", () => {
    makeLegacyState(wd, "shape");
    const r = run(wd, ["status"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("quality  : production (legacy appetite Core)");
    expect(r.stdout).toContain("explore  : count=3 hybrid=true");
  });

  it("status --json is parseable JSON with current_stage + config", () => {
    makeState(wd, "shape");
    const r = run(wd, ["status", "--json"]);
    expect(r.status).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.current_stage).toBe("shape");
    expect(j.config.quality).toBe("production");
    expect(j.config.review_mode).toBe("Auto");
  });
});

// ---------------------------------------------------------------------------

describe("advance", () => {
  let wd: Workdir;
  beforeEach(() => {
    wd = makeWorkdir();
    makeState(wd, "shape");
    seedArtifact(join(wd.dir, ".stelow"), "plans/spec-product_v1.md");
  });

  it("refuses to leave shape when its required artifact is missing", () => {
    rmSync(join(wd.dir, ".stelow", "plans", "spec-product_v1.md"));
    const before = readFileSync(join(wd.dir, "state.md"));
    const r = run(wd, ["advance", "critique"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("missing required artifact: plans/spec-product*.md");
    expect(Buffer.compare(before, readFileSync(join(wd.dir, "state.md")))).toBe(0);
  });

  it("rejects unknown candidate without mutating state.md", () => {
    const before = readFileSync(join(wd.dir, "state.md"));
    const r = run(wd, ["advance", "bogus"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("invalid transition");
    const after = readFileSync(join(wd.dir, "state.md"));
    expect(Buffer.compare(before, after)).toBe(0);
  });

  it("finds a required artifact in the workflow's own nested state dir", () => {
    // REGRESSION. The workflow mints .stelow/<date>/<dirHash>/ and points
    // STELOW_STATE at the state.md inside it. The guard globbed only the
    // .stelow ROOT, so "plans/spec-product*.md" never matched the nested
    // file and every real workflow was refused with "missing required
    // artifact" — the guard said the file was absent while it sat right
    // there. The state dir has to be derived from STATE.
    const stateDir = join(wd.dir, ".stelow", "2026-09-02", "nested-guard");
    mkdirSync(join(stateDir, "plans"), { recursive: true });
    const statePath = join(stateDir, "state.md");
    writeFileSync(statePath, readFileSync(join(wd.dir, "state.md")));
    writeFileSync(join(stateDir, "plans", "spec-product_v1.md"), "# Product spec");

    const result = run(wd, ["advance", "critique"], { STELOW_STATE: statePath });
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(statePath, "utf8")).toMatch(/current_stage: critique/);
  });

  it("still refuses to leave shape when the nested artifact is missing", () => {
    // The fix must not turn the guard off: a workflow dir with no artifact
    // is exactly the case the guard exists for.
    const stateDir = join(wd.dir, ".stelow", "2026-09-02", "nested-guard-missing");
    mkdirSync(join(stateDir, "plans"), { recursive: true });
    const statePath = join(stateDir, "state.md");
    writeFileSync(statePath, readFileSync(join(wd.dir, "state.md")));

    const result = run(wd, ["advance", "critique"], { STELOW_STATE: statePath });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("missing required artifact: plans/spec-product*.md");
  });

  it("treats a state.md reached through a symlink as the workflow's own dir", () => {
    // REGRESSION (macOS CI). tmpdir() on macOS is /var/folders/... — a
    // symlink to /private/var/... — while git reports the physical path. The
    // guard compared abspath, so the workflow's own nested dir looked OUTSIDE
    // .stelow and the root fallback satisfied the guard with ANOTHER
    // workflow's plans/spec-product artifact: the advance succeeded when it
    // had to be refused. realpath both sides.
    const stateDir = join(wd.dir, ".stelow", "2026-09-02", "symlinked-missing");
    mkdirSync(join(stateDir, "plans"), { recursive: true });
    writeFileSync(join(stateDir, "state.md"), readFileSync(join(wd.dir, "state.md")));

    const link = join(tmpdir(), `stelow-link-${process.pid}-${randomBytes(4).toString("hex")}`);
    symlinkSync(wd.dir, link, "dir");
    try {
      const statePath = join(link, ".stelow", "2026-09-02", "symlinked-missing", "state.md");
      const result = run(wd, ["advance", "critique"], { STELOW_STATE: statePath });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("missing required artifact: plans/spec-product*.md");
    } finally {
      rmSync(link, { force: true });
    }
  });

  it("rejects a known stage that is not reachable from the current stage", () => {
    const before = readFileSync(join(wd.dir, "state.md"));
    const r = run(wd, ["advance", "scope"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("invalid transition 'shape' -> 'scope'");
    expect(Buffer.compare(before, readFileSync(join(wd.dir, "state.md")))).toBe(0);
  });

  it("advances valid next stage and updates frontmatter", () => {
    const r = run(wd, ["advance", "critique"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("advanced to critique");
    const sm = readFileSync(join(wd.dir, "state.md"), "utf8");
    expect(sm).toMatch(/current_stage:\s*critique/);
    expect(sm).toMatch(/  shape:\s*done/);
    expect(sm).toMatch(/  critique:\s*in-progress/);
    expect(sm).toMatch(/history:\n  - stage: shape\n    at: .+\n    status: done/);
  });

  it("accepts a canonical intent shortcut", () => {
    makeState(wd, "gate");
    const statePath = join(wd.dir, "state.md");
    writeFileSync(statePath, readFileSync(statePath, "utf8").replace("intent: feature", "intent: bugfix"));
    const r = run(wd, ["advance", "execution"]);
    expect(r.status).toBe(0);
    expect(readFileSync(statePath, "utf8")).toMatch(/current_stage:\s*execution/);
  });

  it("appends history to .stelow/invariants.json", () => {
    run(wd, ["advance", "critique"]);
    const inv = JSON.parse(readFileSync(join(wd.dir, ".stelow", "invariants.json"), "utf8"));
    expect(inv.current_stage).toBe("critique");
    expect(inv.history.at(-1).stage).toBe("critique");
    expect(typeof inv.history.at(-1).at).toBe("string");
  });

  it("records every new workflow document against the stage being completed", () => {
    const stateDir = join(wd.dir, ".stelow", "2026-09-02", "artifacts-test");
    mkdirSync(join(stateDir, "plans"), { recursive: true });
    const statePath = join(stateDir, "state.md");
    writeFileSync(statePath, readFileSync(join(wd.dir, "state.md"), "utf8").replace("---\n# t", "artifacts: []\n---\n# t"));
    writeFileSync(join(stateDir, "plans", "spec-product_v1.md"), "# Product spec");
    writeFileSync(join(stateDir, "plans", "ui-alternatives.md"), "# UI alternatives");

    const result = run(wd, ["advance", "critique"], { STELOW_STATEDIR: stateDir });
    expect(result.status).toBe(0);
    const state = readFileSync(statePath, "utf8");
    expect(state).toMatch(/- stage: shape\n    kind: document\n    label: spec product v1\n    path: \.stelow\/2026-09-02\/artifacts-test\/plans\/spec-product_v1\.md/);
    expect(state).toMatch(/- stage: shape\n    kind: document\n    label: ui alternatives\n    path: \.stelow\/2026-09-02\/artifacts-test\/plans\/ui-alternatives\.md/);
    expect((state.match(/generated_at:/g) ?? []).length).toBe(2);
  });

  it("records non-Markdown workflow output so strict audit can attest it", () => {
    const stateDir = join(wd.dir, ".stelow", "2026-09-02", "artifact-output-test");
    mkdirSync(join(stateDir, "verification"), { recursive: true });
    const statePath = join(stateDir, "state.md");
    writeFileSync(statePath, readFileSync(join(wd.dir, "state.md"), "utf8").replace("---\n# t", "artifacts: []\n---\n# t"));
    writeFileSync(join(stateDir, "verification", "report.json"), '{"passed":true}\n');
    seedArtifact(stateDir, "plans/spec-product_v1.md");

    expect(run(wd, ["advance", "critique"], { STELOW_STATEDIR: stateDir }).status).toBe(0);
    expect(readFileSync(statePath, "utf8")).toMatch(/- stage: shape\n    kind: artifact\n    label: report\n    path: \.stelow\/2026-09-02\/artifact-output-test\/verification\/report\.json/);
  });

  it("fails when lock is held by another process (non-fatal exit)", () => {
    // manually hold the lock
    mkdirSync(join(wd.dir, ".stelow", "lock"), { recursive: true });
    writeFileSync(join(wd.dir, ".stelow", "lock", "pid"), "999999");
    writeFileSync(join(wd.dir, ".stelow", "lock", "host"), "test");
    const before = readFileSync(join(wd.dir, "state.md"));
    const r = run(wd, ["advance", "critique"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/lock held/);
    expect(Buffer.compare(before, readFileSync(join(wd.dir, "state.md")))).toBe(0);
  });

  it("auto-clears stale lock (>TTL) and proceeds", () => {
    mkdirSync(join(wd.dir, ".stelow", "lock"), { recursive: true });
    writeFileSync(join(wd.dir, ".stelow", "lock", "pid"), "999999");
    writeFileSync(join(wd.dir, ".stelow", "lock", "host"), "test");
    // backdate the lock dir by 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    backdateLock(wd, fiveMinAgo);
    const r = run(wd, ["advance", "critique"], { STELOW_LOCK_TTL_SEC: "10" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("advanced to critique");
  });

  it("isolates status, state, invariants, and lock in STELOW_STATEDIR", () => {
    const stateDir = join(wd.dir, ".stelow", "2026-09-02", "sw-test");
    mkdirSync(stateDir, { recursive: true });
    const rootState = join(wd.dir, "state.md");
    const workflowState = join(stateDir, "state.md");
    writeFileSync(workflowState, readFileSync(rootState));
    seedArtifact(stateDir, "plans/spec-product_v1.md");
    rmSync(rootState);
    const env = { STELOW_STATEDIR: stateDir };

    const status = run(wd, ["status", "--json"], env);
    expect(JSON.parse(status.stdout).current_stage).toBe("shape");
    expect(run(wd, ["advance", "critique"], env).status).toBe(0);
    expect(readFileSync(workflowState, "utf8")).toMatch(/current_stage:\s*critique/);
    expect(existsSync(join(stateDir, "invariants.json"))).toBe(true);
    expect(existsSync(join(wd.dir, ".stelow", "invariants.json"))).toBe(false);
    expect(existsSync(rootState)).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("doctor", () => {
  let wd: Workdir;
  beforeEach(() => { wd = makeWorkdir(); });

  it("does not print the trusted sentence when the check could not run", () => {
    // The fixture pins no stages.yaml, so after S3/S8 this run reports
    // `stages-unchecked` and the trusted sentence correctly stops printing.
    // Softening this back would restore the silence the card removes.
    const r = run(wd, ["doctor"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/info\s+stages-unchecked/);
    expect(r.stdout).not.toContain("ok (no drift)");
  });

  it("--json returns valid JSON with ok=true on clean repo", () => {
    const r = run(wd, ["doctor", "--json"]);
    expect(r.status).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.ok).toBe(true);
    expect(Array.isArray(j.findings)).toBe(true);
  });

  it("flags state-transitions-drift when current_stage not in transitions", () => {
    makeState(wd, "this-stage-does-not-exist-anywhere");
    const r = run(wd, ["doctor", "--json"]);
    expect(r.status).not.toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.ok).toBe(false);
    expect(j.findings.some((f: any) => f.class === "state-transitions-drift")).toBe(true);
  });

  it("flags stale-lock with warn severity (not fatal)", () => {
    mkdirSync(join(wd.dir, ".stelow", "lock"), { recursive: true });
    writeFileSync(join(wd.dir, ".stelow", "lock", "pid"), "1");
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    backdateLock(wd, fiveMinAgo);
    const r = run(wd, ["doctor"]);
    expect(r.status).toBe(0); // warn is non-fatal
    expect(r.stdout).toMatch(/warn\s+stale-lock/);
  });

  it("flags missing-dir with warn when intent is not one of the 5", () => {
    writeFileSync(join(wd.dir, "state.md"), `---
name: t
intent: nonsense
current_stage: shape
status: active
stages: {}
---
# t
`);
    const r = run(wd, ["doctor", "--json"]);
    const j = JSON.parse(r.stdout);
    expect(j.findings.some((f: any) => f.class === "missing-dir")).toBe(true);
  });
});

describe("doctor recipe declarations", () => {
  let wd: Workdir;
  beforeEach(() => { wd = makeWorkdir(); });

  function findings(r: { stdout: string }): any[] {
    return JSON.parse(r.stdout).findings;
  }
  function rows(r: { stdout: string }, klass: string): any[] {
    return findings(r).filter((f: any) => f.class === klass);
  }

  it("U1: a declaration with no file is an error naming stage, recipe and path", () => {
    writeStages(wd, stagesYaml([stageBlock("shape", "'nope'")]));
    mkdirSync(join(wd.dir, "recipes"));
    const r = run(wd, ["doctor"]);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/error\s+recipe-missing\s+stage shape: recipe 'nope' has no file at recipes\/nope\.yaml/);
  });

  it("U2: the same declaration is clean once the recipe file exists", () => {
    writeStages(wd, stagesYaml([stageBlock("shape", "nope")]));
    writeRecipe(wd, "nope");
    const r = run(wd, ["doctor"]);
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain("recipe-missing");
    expect(r.stdout).toContain("ok (no drift)");
  });

  it("U3: `recipe: null` is not a declaration (the real file has eight)", () => {
    writeStages(wd, stagesYaml([
      stageBlock("triage", null), stageBlock("select", null), stageBlock("gate", null),
      stageBlock("int-gate", null), stageBlock("selection", null), stageBlock("plan-gate", null),
      stageBlock("diff-gate", null), stageBlock("audit", null),
    ]));
    const r = run(wd, ["doctor", "--json"]);
    // Zero declarations is S4's stages-empty warn; it is not a missing recipe.
    expect(r.status).toBe(0);
    expect(rows(r, "recipe-missing")).toHaveLength(0);
    expect(JSON.parse(r.stdout).ok).toBe(true);
    expect(rows(r, "stages-empty")).toHaveLength(1);
  });

  it("U4: no stages file at the default path is info, and never the ok line", () => {
    const r = run(wd, ["doctor", "--json"]);
    expect(r.status).toBe(0);
    expect(rows(r, "stages-unchecked")).toHaveLength(1);
    expect(rows(r, "stages-unchecked")[0].severity).toBe("info");
    expect(run(wd, ["doctor"]).stdout).not.toContain("ok (no drift)");
  });

  it("U5: an explicit STELOW_STAGES pointing at nothing is an error", () => {
    const r = run(wd, ["doctor", "--json"], { STELOW_STAGES: join(wd.dir, "nope", "stages.yaml") });
    expect(r.status).toBe(1);
    expect(rows(r, "stages-missing")).toHaveLength(1);
    expect(rows(r, "stages-missing")[0].severity).toBe("error");
    expect(r.stderr).not.toContain("Traceback");
  });

  it("U6: an unreadable stages file is an error, not a traceback", () => {
    if (process.getuid?.() === 0) return; // root reads anything
    writeStages(wd, stagesYaml([stageBlock("shape", "nope")]));
    chmodSync(join(wd.dir, "skills", "stelow-workflow-orchestrator", "stages.yaml"), 0o000);
    const r = run(wd, ["doctor", "--json"]);
    expect(r.status).toBe(1);
    expect(rows(r, "stages-unreadable")).toHaveLength(1);
    expect(r.stderr).not.toContain("Traceback");
    chmodSync(join(wd.dir, "skills", "stelow-workflow-orchestrator", "stages.yaml"), 0o644);
  });

  it("U7: a stages file with no declarations warns stages-empty", () => {
    writeStages(wd, "version: 2\n\nstages:\n");
    writeRecipe(wd, "orphan");
    const r = run(wd, ["doctor", "--json"]);
    expect(r.status).toBe(0);
    expect(rows(r, "stages-empty")).toHaveLength(1);
    expect(rows(r, "stages-empty")[0].severity).toBe("warn");
  });

  it("U8: a recipe line outside a stage block warns with its line number", () => {
    writeStages(wd, `version: 2\nrecipe: nope\n\nstages:\n${stageBlock("shape", null)}`);
    const r = run(wd, ["doctor", "--json"]);
    expect(r.status).toBe(0);
    const unparsed = rows(r, "stages-unparsed");
    expect(unparsed).toHaveLength(1);
    expect(unparsed[0].severity).toBe("warn");
    expect(unparsed[0].message).toContain("line 2");
  });

  it("U9: the plural execution.recipes is deliberately unread", () => {
    // The sibling declaration is what proves the reader ran: it is read and
    // reported, while the plural spelling above it produces no row at all.
    writeStages(wd, `version: 2\n\nstages:\n  - name: shape\n    execution:\n      recipes: [a, b]\n  - name: critique\n    execution:\n      recipe: gone\n`);
    mkdirSync(join(wd.dir, "recipes"));
    const r = run(wd, ["doctor", "--json"]);
    expect(r.status).toBe(1);
    const missing = rows(r, "recipe-missing");
    expect(missing).toHaveLength(1);
    expect(missing[0].message).toContain("stage critique");
  });

  it("U10: a recipes dir inside ROOT prints a relative path", () => {
    writeStages(wd, stagesYaml([stageBlock("shape", "nope")]));
    mkdirSync(join(wd.dir, "recipes"));
    const r = run(wd, ["doctor", "--json"]);
    expect(rows(r, "recipe-missing")[0].message).toBe("stage shape: recipe 'nope' has no file at recipes/nope.yaml");
  });

  it("U11: a recipes dir outside ROOT prints the absolute path it looked in", () => {
    writeStages(wd, stagesYaml([stageBlock("shape", "nope")]));
    const outside = mkdtempSync(join(tmpdir(), "stelow-recipes-outside-"));
    try {
      const r = run(wd, ["doctor", "--json"], { STELOW_RECIPES: outside });
      expect(rows(r, "recipe-missing")[0].message).toBe(
        `stage shape: recipe 'nope' has no file at ${realpathSync(outside)}/nope.yaml`);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("U12: a recipe file no stage declares is not a finding", () => {
    writeStages(wd, stagesYaml([
      stageBlock("shape", "present"),
      stageBlock("critique", "gone"),
    ]));
    writeRecipe(wd, "present");
    writeRecipe(wd, "orphan");
    const r = run(wd, ["doctor", "--json"]);
    const missing = rows(r, "recipe-missing");
    // The declared-and-present stage and the undeclared file stay silent; the
    // sibling declaration proves the reader looked at all three.
    expect(missing).toHaveLength(1);
    expect(missing[0].message).toContain("stage critique");
    expect(r.stdout).not.toContain("orphan");
  });

  it("U13: a directory named <recipe>.yaml does not satisfy the declaration", () => {
    writeStages(wd, stagesYaml([stageBlock("shape", "nope")]));
    mkdirSync(join(wd.dir, "recipes", "nope.yaml"), { recursive: true });
    const r = run(wd, ["doctor", "--json"]);
    expect(r.status).toBe(1);
    expect(rows(r, "recipe-missing")).toHaveLength(1);
  });

  it("U14: --json carries the finding with severity, class and ok=false", () => {
    writeStages(wd, stagesYaml([stageBlock("shape", "nope")]));
    mkdirSync(join(wd.dir, "recipes"));
    const r = run(wd, ["doctor", "--json"]);
    expect(r.status).toBe(1);
    const j = JSON.parse(r.stdout);
    expect(j.ok).toBe(false);
    expect(j.findings).toHaveLength(1);
    expect(j.findings[0].severity).toBe("error");
    expect(j.findings[0].class).toBe("recipe-missing");
  });

  it("U15: findings follow stages-file order, after the existing classes", () => {
    makeState(wd, "no-such-stage-anywhere");
    writeStages(wd, stagesYaml([stageBlock("shape", "nope"), stageBlock("critique", "gone")]));
    mkdirSync(join(wd.dir, "recipes"));
    const r = run(wd, ["doctor", "--json"]);
    expect(r.status).toBe(1);
    const classes = findings(r).map((f: any) => f.class);
    expect(classes[0]).toBe("state-transitions-drift");
    expect(classes.filter((c: string) => c === "recipe-missing")).toHaveLength(2);
    const messages = rows(r, "recipe-missing").map((f: any) => f.message);
    expect(messages[0]).toContain("stage shape");
    expect(messages[1]).toContain("stage critique");
  });

  it("U16: the check is read-only", () => {
    writeStages(wd, stagesYaml([stageBlock("shape", "nope")]));
    mkdirSync(join(wd.dir, "recipes"));
    const r = run(wd, ["doctor"]);
    // The finding proves the check ran; the absent dir proves it wrote nothing.
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/error\s+recipe-missing/);
    expect(existsSync(join(wd.dir, ".stelow"))).toBe(false);
  });

  it("U17: declarations with no recipes directory is one error, not ten", () => {
    writeStages(wd, stagesYaml([stageBlock("shape", "nope")]));
    const r = run(wd, ["doctor", "--json"]);
    expect(r.status).toBe(1);
    expect(rows(r, "recipes-dir-missing")).toHaveLength(1);
    expect(rows(r, "recipes-dir-missing")[0].severity).toBe("error");
    expect(rows(r, "recipe-missing")).toHaveLength(0);
  });

  it("U18: inside-ness follows realpath, not spelling (relative, trailing /, symlink)", () => {
    writeStages(wd, stagesYaml([stageBlock("shape", "nope")]));
    writeRecipe(wd, "other"); // the recipes dir exists; nope.yaml does not
    const expected = "stage shape: recipe 'nope' has no file at recipes/nope.yaml";
    for (const spelling of ["./recipes", "./recipes/", join(wd.dir, "recipes")]) {
      expect(rows(run(wd, ["doctor", "--json"], { STELOW_RECIPES: spelling }), "recipe-missing")[0].message)
        .toBe(expected);
    }
    // A symlink inside ROOT pointing at the real recipes dir keeps the relative form.
    symlinkSync(join(wd.dir, "recipes"), join(wd.dir, "linked-recipes"));
    expect(rows(run(wd, ["doctor", "--json"], { STELOW_RECIPES: join(wd.dir, "linked-recipes") }), "recipe-missing")[0].message)
      .toBe(expected);
    // A symlink inside ROOT pointing outside it prints where it looked.
    const outside = mkdtempSync(join(tmpdir(), "stelow-link-outside-"));
    try {
      symlinkSync(outside, join(wd.dir, "escape"));
      expect(rows(run(wd, ["doctor", "--json"], { STELOW_RECIPES: join(wd.dir, "escape") }), "recipe-missing")[0].message)
        .toBe(`stage shape: recipe 'nope' has no file at ${realpathSync(outside)}/nope.yaml`);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("U19: a trailing comment on a `- name:` line cannot charge its recipe to the stage above", () => {
    // Valid YAML, and `validate:stages` accepts it: a reader that keeps the
    // previous stage standing here reports a false `recipe-missing` for shape
    // and never checks critique.
    writeStages(wd, `version: 2\n\nstages:\n  - name: shape\n    execution:\n      recipe: present\n  - name: critique  # the second entry\n    execution:\n      recipe: gone\n`);
    writeRecipe(wd, "present");
    const r = run(wd, ["doctor", "--json"]);
    expect(rows(r, "recipe-missing")).toHaveLength(0);
    const unparsed = rows(r, "stages-unparsed");
    expect(unparsed).toHaveLength(1);
    expect(unparsed[0].severity).toBe("warn");
    expect(unparsed[0].message).toContain("line 9");
    expect(r.status).toBe(0);
  });

  it("U20: a quoted stage id prints without its quotes", () => {
    writeStages(wd, `version: 2\n\nstages:\n  - name: "shape"\n    execution:\n      recipe: nope\n`);
    mkdirSync(join(wd.dir, "recipes"));
    expect(rows(run(wd, ["doctor", "--json"]), "recipe-missing")[0].message)
      .toBe("stage shape: recipe 'nope' has no file at recipes/nope.yaml");
  });

  it("U21: an inline execution mapping is reported, not skipped", () => {
    writeStages(wd, `version: 2\n\nstages:\n  - name: shape\n    execution: {mode: direct, recipe: absent}\n  - name: critique\n    execution:\n      recipe: gone\n`);
    mkdirSync(join(wd.dir, "recipes"));
    const r = run(wd, ["doctor", "--json"]);
    const unparsed = rows(r, "stages-unparsed");
    expect(unparsed).toHaveLength(1);
    expect(unparsed[0].severity).toBe("warn");
    expect(unparsed[0].message).toContain("line 5");
    const missing = rows(r, "recipe-missing");
    expect(missing).toHaveLength(1);
    expect(missing[0].message).toContain("stage critique");
  });

  it("U22: a recipe line under another top-level key is still unparsed", () => {
    writeStages(wd, `version: 2\nother:\n  recipe: nope\n\nstages:\n  - name: shape\n    execution:\n      recipe: absent\n`);
    writeRecipe(wd, "absent");
    const r = run(wd, ["doctor", "--json"]);
    expect(rows(r, "recipe-missing")).toHaveLength(0);
    const unparsed = rows(r, "stages-unparsed");
    expect(unparsed).toHaveLength(1);
    expect(unparsed[0].message).toContain("line 3");
  });
});

// The only case that can catch a reader resolving four of ten declarations.
describe("doctor recipe declarations — real repository", () => {
  const repoW: Workdir = { dir: REPO_ROOT, helper: HELPER_SRC };
  const STAGES = ["setup", "context", "shape", "critique", "scope", "interface", "planning",
                  "execution", "verification", "audit"];

  it("RR1: the checked-out repo is clean and the check actually ran", () => {
    const r = run(repoW, ["doctor", "--json"], {}, REPO_ROOT);
    expect(r.status).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.findings).toEqual([]);
    expect(j.ok).toBe(true);
    expect(run(repoW, ["doctor"], {}, REPO_ROOT).stdout).toContain("ok (no drift)");
  });

  it("RR2: an empty recipes dir yields exactly the ten real declarations", () => {
    const empty = mkdtempSync(join(tmpdir(), "stelow-recipes-empty-"));
    try {
      const r = run(repoW, ["doctor", "--json"], { STELOW_RECIPES: empty }, REPO_ROOT);
      expect(r.status).toBe(1);
      const rows = JSON.parse(r.stdout).findings.filter((f: any) => f.class === "recipe-missing");
      expect(rows).toHaveLength(10);
      expect(rows.map((f: any) => f.message.match(/^stage (\S+):/)[1])).toEqual(STAGES);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe("audit-trail", () => {
  let wd: Workdir;
  beforeEach(() => { wd = makeWorkdir(); });

  const PLAN = ".stelow/2026-09-16/sw-audit/plans/spec-tech_v1.md";

  // One registered artifact under the workflow's own state dir: the minimum
  // the trail exists to link. Returns the state dir the helper is pointed at.
  function setup(artifactPath: string = PLAN): { stateDir: string; env: Record<string, string>; state: string } {
    makeState(wd, "audit");
    const stateDir = join(wd.dir, ".stelow", "2026-09-16", "sw-audit");
    mkdirSync(join(stateDir, "plans"), { recursive: true });
    const state = readFileSync(join(wd.dir, "state.md"), "utf8").replace(
      "---\n# t",
      `artifacts:\n  - stage: planning\n    kind: document\n    label: technical plan\n    path: ${artifactPath}\n---\n# t`,
    );
    writeFileSync(join(stateDir, "state.md"), state);
    if (!artifactPath.startsWith("/") && !artifactPath.split("/").includes("..")) {
      writeFileSync(join(wd.dir, artifactPath), "# Plan\n");
    }
    return { stateDir, env: { STELOW_STATEDIR: stateDir }, state };
  }

  it("builds a canonical trace and rejects state or artifact drift", () => {
    const { stateDir, env, state } = setup();
    expect(run(wd, ["audit-trail", "build"], env).status).toBe(0);
    const trail = readFileSync(join(stateDir, "audit-trail.md"), "utf8");
    expect(trail).toContain("<!-- stelow-audit-trail: v3 -->");
    expect(trail).toContain("[technical plan](plans/spec-tech_v1.md)");
    expect(trail).toMatch(/[a-f0-9]{64}/);
    expect(run(wd, ["audit-trail", "check"], env).status).toBe(0);
    writeFileSync(join(stateDir, "plans", "spec-tech_v1.md"), "# Changed plan\n");
    const artifactStale = run(wd, ["audit-trail", "check"], env);
    expect(artifactStale.status).toBe(1);
    expect(artifactStale.stderr).toContain("stale");
    expect(run(wd, ["audit-trail", "build"], env).status).toBe(0);
    writeFileSync(join(stateDir, "state.md"), state.replace("status: active", "status: completed"));
    const stale = run(wd, ["audit-trail", "check"], env);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain("stale");
  });

  // The receipt must attest the whole tree the work was verified in, not only
  // the commit: uncommitted and untracked code is exactly what a Done card is
  // reviewed for, and it used to pass the check untouched under a fixed HEAD.
  it("pins the repository snapshot and goes stale on worktree drift", () => {
    const { stateDir, env } = setup();
    const build = run(wd, ["audit-trail", "build", "--json"], env);
    expect(build.status).toBe(0);
    const result = JSON.parse(build.stdout);
    expect(result.contract).toBe("v3");
    expect(result.snapshot.head).toMatch(/^[a-f0-9]{40}$/);
    expect(result.snapshot.root).toBe(realpathSync(wd.dir));
    expect(result.snapshot.tracked).toMatch(/^[a-f0-9]{64}$/);
    expect(result.snapshot.untracked_count).toBeGreaterThan(0);
    // The trail is written after its own digest and must never digest itself,
    // or every check of its own output would read as stale.
    expect(readFileSync(join(stateDir, "audit-trail.md"), "utf8")).toContain("| Git repository |");
    expect(run(wd, ["audit-trail", "check"], env).status).toBe(0);

    // Uncommitted change to a tracked file: same HEAD, different tree.
    writeFileSync(join(wd.dir, "scripts", "stelow"), `${readFileSync(join(wd.dir, "scripts", "stelow"), "utf8")}\n# drift\n`);
    expect(run(wd, ["audit-trail", "check"], env).status).toBe(1);
    expect(run(wd, ["audit-trail", "build"], env).status).toBe(0);
    expect(run(wd, ["audit-trail", "check"], env).status).toBe(0);

    // A new untracked file is a change too, without touching HEAD at all.
    writeFileSync(join(wd.dir, "scratch.txt"), "new work\n");
    expect(run(wd, ["audit-trail", "check"], env).status).toBe(1);
    expect(run(wd, ["audit-trail", "build"], env).status).toBe(0);
    const rebuilt = JSON.parse(run(wd, ["audit-trail", "check", "--json"], env).stdout);
    expect(rebuilt.ok).toBe(true);
    expect(rebuilt.snapshot.untracked_count).toBeGreaterThan(result.snapshot.untracked_count);
  });

  // A linked worktree is the same repository in a different directory. The
  // snapshot names the repository both directories share, so a host can tell
  // that case from two repositories that merely look alike.
  it("names the repository identity shared by a project and its worktree", () => {
    const { env } = setup();
    const build = run(wd, ["audit-trail", "build", "--json"], env);
    expect(build.status).toBe(0);
    const projectCommon = JSON.parse(build.stdout).snapshot.commonDir;
    expect(projectCommon).toMatch(/\.git$/);

    const wt = join(wd.dir, "wt");
    execSync(`git worktree add -q --detach ${wt}`, { cwd: wd.dir });
    const wbuild = run(wd, ["audit-trail", "build", "--json"], env, wt);
    expect(wbuild.status).toBe(0);
    const worktreeCommon = JSON.parse(wbuild.stdout).snapshot.commonDir;
    expect(worktreeCommon).toBe(projectCommon);
    expect(existsSync(worktreeCommon)).toBe(true);
  });

  it("rebuilds a stale audit trail after that receipt was committed", () => {
    const { stateDir, env } = setup();
    expect(run(wd, ["audit-trail", "build"], env).status).toBe(0);
    execSync(`git add ${join(stateDir, "audit-trail.md")} && git commit -qm tracked-audit-trail`, { cwd: wd.dir });

    writeFileSync(join(stateDir, "plans", "spec-tech_v1.md"), "# Revised plan\n");
    expect(run(wd, ["audit-trail", "build"], env).status).toBe(0);
    expect(run(wd, ["audit-trail", "check"], env).status).toBe(0);
  });

  // A project can be a subdirectory of its repository (a monorepo package).
  // `advance` records artifact paths relative to the directory it ran in, so
  // the trail has to resolve them the same way — resolving against the Git
  // toplevel instead would report every artifact as a missing file.
  it("resolves manifest paths the way advance recorded them, in a subdirectory project", () => {
    makeState(wd, "audit");
    const project = join(wd.dir, "packages", "app");
    const stateDir = join(project, ".stelow", "2026-09-16", "sw-audit");
    mkdirSync(join(stateDir, "plans"), { recursive: true });
    const state = readFileSync(join(wd.dir, "state.md"), "utf8").replace(
      "---\n# t",
      `artifacts:\n  - stage: planning\n    kind: document\n    label: technical plan\n    path: .stelow/2026-09-16/sw-audit/plans/spec-tech_v1.md\n---\n# t`,
    );
    writeFileSync(join(stateDir, "state.md"), state);
    writeFileSync(join(stateDir, "plans", "spec-tech_v1.md"), "# Plan\n");
    const env = { STELOW_STATEDIR: stateDir };
    expect(run(wd, ["audit-trail", "build"], env, project).status).toBe(0);
    const trail = readFileSync(join(stateDir, "audit-trail.md"), "utf8");
    expect(trail).toMatch(/\| planning \| document \| \[technical plan\]\(plans\/spec-tech_v1\.md\) \| `[a-f0-9]{64}` \|/);
    expect(run(wd, ["audit-trail", "check"], env, project).status).toBe(0);

    // Git reports paths from its toplevel, not from `packages/app`. An
    // untracked repository-root file must therefore be hashed by contents;
    // otherwise its edits would leave this receipt incorrectly current.
    const rootScratch = join(wd.dir, "repo-level-scratch.txt");
    writeFileSync(rootScratch, "first version\n");
    expect(run(wd, ["audit-trail", "build"], env, project).status).toBe(0);
    writeFileSync(rootScratch, "second version\n");
    expect(run(wd, ["audit-trail", "check"], env, project).status).toBe(1);
  });

  // Artifact manifests are agent-authored input, so a path that leaves the
  // project must fail closed instead of letting the trail hash or link a file
  // outside the workspace.
  it("refuses artifact paths that leave the project", () => {
    const escaped = setup("../outside.md");
    const traversal = run(wd, ["audit-trail", "build"], escaped.env);
    expect(traversal.status).toBe(1);
    expect(traversal.stderr).toContain("stay inside the project");
    expect(() => readFileSync(join(escaped.stateDir, "audit-trail.md"), "utf8")).toThrow();

    const absolute = setup("/etc/hostname");
    const outside = run(wd, ["audit-trail", "build"], absolute.env);
    expect(outside.status).toBe(1);
    expect(outside.stderr).toContain("stay inside the project");
  });

  // --strict is the host completion gate: a workflow document that was written
  // but never registered would otherwise be missing from the receipt's links.
  it("--strict refuses unregistered workflow documents", () => {
    const { stateDir, env } = setup();
    expect(run(wd, ["audit-trail", "build"], env).status).toBe(0);
    expect(readFileSync(join(stateDir, "audit-trail.md"), "utf8")).toContain("| Unregistered workflow files | 0 |");
    writeFileSync(join(stateDir, "lessons.md"), "# Lessons\n");

    const strict = run(wd, ["audit-trail", "build", "--strict"], env);
    expect(strict.status).toBe(1);
    expect(strict.stderr).toContain("unregistered workflow documents or artifacts");
    expect(strict.stderr).toContain("lessons.md");
    const strictJson = JSON.parse(run(wd, ["audit-trail", "build", "--strict", "--json"], env).stdout);
    expect(strictJson.ok).toBe(false);
    expect(strictJson.contract).toBe("v3");

    // Without --strict the trail still records the gap instead of hiding it.
    expect(run(wd, ["audit-trail", "build"], env).status).toBe(0);
    expect(readFileSync(join(stateDir, "audit-trail.md"), "utf8")).toContain("| Unregistered workflow files | 1 |");

    // Registering it is the fix, and then the gate passes.
    const state = readFileSync(join(stateDir, "state.md"), "utf8").replace(
      "---\n# t",
      `  - stage: audit\n    kind: document\n    label: lessons\n    path: .stelow/2026-09-16/sw-audit/lessons.md\n---\n# t`,
    );
    writeFileSync(join(stateDir, "state.md"), state);
    expect(run(wd, ["audit-trail", "build", "--strict"], env).status).toBe(0);
    expect(run(wd, ["audit-trail", "check", "--strict"], env).status).toBe(0);
  });

  // Disposable Tier G drafts are worker-judged scratch, not deliverables:
  // the strict gate must not trip on them — a draft burst blocks no done.
  it("--strict ignores disposable drafts/", () => {
    const { stateDir, env } = setup();
    mkdirSync(join(stateDir, "drafts"), { recursive: true });
    writeFileSync(join(stateDir, "drafts", "draft-1.md"), "# Draft\n");
    expect(run(wd, ["audit-trail", "build", "--strict"], env).status).toBe(0);
    expect(run(wd, ["audit-trail", "check", "--strict"], env).status).toBe(0);
  });

  // A run's own output is evidence, not a card document. Its reports carry
  // deliverable titles (the native audit stage's is literally "Execution
  // Critique Report"), so counting them demanded registration — and registering
  // one then failed the artifact contracts, which are written for documents a
  // worker authors for review. That dead end blocked a card whose test run,
  // security scan and PR were all green.
  it("--strict ignores a run's own output under runs/", () => {
    const { stateDir, env } = setup();
    mkdirSync(join(stateDir, "runs", "exec_1", "audit"), { recursive: true });
    writeFileSync(join(stateDir, "runs", "exec_1", "audit", "evidence.md"), "# Evidence\n");
    writeFileSync(join(stateDir, "runs", "exec_1", "audit", "requirements.md"), "# Requirements\n");
    expect(run(wd, ["audit-trail", "build", "--strict"], env).status).toBe(0);
    expect(run(wd, ["audit-trail", "check", "--strict"], env).status).toBe(0);
  });

  it("--strict refuses unregistered non-Markdown output", () => {
    const { stateDir, env } = setup();
    writeFileSync(join(stateDir, "verification.json"), '{"passed":true}\n');
    const strict = run(wd, ["audit-trail", "build", "--strict"], env);
    expect(strict.status).toBe(1);
    expect(strict.stderr).toContain("verification.json");

    const state = readFileSync(join(stateDir, "state.md"), "utf8").replace(
      "---\n# t",
      `  - stage: audit\n    kind: artifact\n    label: verification\n    path: .stelow/2026-09-16/sw-audit/verification.json\n---\n# t`,
    );
    writeFileSync(join(stateDir, "state.md"), state);
    expect(run(wd, ["audit-trail", "build", "--strict"], env).status).toBe(0);
    expect(run(wd, ["audit-trail", "check", "--strict"], env).status).toBe(0);
  });
});
