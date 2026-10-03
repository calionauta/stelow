/**
 * Integration Tests: mode-skipped transitions, gate refusals, non-git roots.
 *
 * The review_mode/appetite rules in do_advance (passthrough successors +
 * gate refusals with redirects) and the STELOW_STATEDIR root fallback are
 * the behaviors hosts (bb exploratory cards, CI) depend on. Each test names
 * the deadlock or breakage it prevents.
 *
 * Harness: real bash subprocesses in temp dirs (git or explicitly not),
 * no mocks. To run:  npm run test:integration -- stelow-advance-modes
 */
import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HELPER = join(REPO_ROOT, "scripts", "stelow");
const TRANSITIONS = join(REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md");

const dirs: string[] = [];

function makeStateDir(base: string, stage: string, reviewMode: string, appetite = "Core", intent = "feature"): string {
  const stateDir = join(base, ".stelow", "2026-09-06", `sw-${randomBytes(3).toString("hex")}`);
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, "state.md"), `---
name: t
intent: ${intent}
current_stage: ${stage}
status: active
config:
  appetite: ${appetite}
  review_mode: ${reviewMode}
  product_type: software
stages:
  ${stage}: in-progress
artifacts: []
history: []
---
# t
`);
  return stateDir;
}

function seedArtifact(statedir: string, relativePath: string): void {
  const target = join(statedir, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, "# Test artifact\n");
}

function run(args: string[], cwd: string, env: Record<string, string> = {}): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("bash", [HELPER, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, PATH: process.env.PATH ?? "", ...env },
  });
  return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

afterAll(() => {
  for (const dir of dirs) {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

function gitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "stelow-modes-"));
  execSync("git init -q", { cwd: dir });
  dirs.push(dir);
  return dir;
}

function plainDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "stelow-modes-plain-"));
  dirs.push(dir);
  return dir;
}

// ---------------------------------------------------------------------------

describe("non-git workspaces", () => {
  it("dies with exit 2 without STELOW_STATEDIR (needs a root to resolve against)", () => {
    const dir = plainDir();
    const r = run(["status"], dir, { STELOW_TRANSITIONS: TRANSITIONS });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("not in a git repo");
  });

  it("works from a non-git cwd when STELOW_STATEDIR points at a workflow dir", () => {
    const dir = plainDir();
    const stateDir = makeStateDir(dir, "shape", "Auto");
    const r = run(["status"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("stage    : shape");
  });
});

// ---------------------------------------------------------------------------

describe("mode-skipped passthroughs", () => {
  it("planning -> execution passes in Auto (would deadlock at the skipped gate)", () => {
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "planning", "Auto");
    seedArtifact(stateDir, "plans/spec-tech_v1.md");
    const env = { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS };
    const before = readFileSync(join(stateDir, "state.md"));
    const dry = run(["advance", "execution", "--dry-run"], dir, env);
    expect(dry.status).toBe(0);
    expect(Buffer.compare(before, readFileSync(join(stateDir, "state.md")))).toBe(0);
    const real = run(["advance", "execution"], dir, env);
    expect(real.status).toBe(0);
    expect(readFileSync(join(stateDir, "state.md"), "utf8")).toMatch(/current_stage:\s*execution/);
  });

  it("planning -> execution is refused in full Tech Review mode (gate exists there)", () => {
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "planning", "Product Spec + Interface + Tech Review + Code Diff");
    const r = run(["advance", "execution", "--dry-run"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("invalid transition");
  });

  it("investigate context -> audit is reachable: the route ends there, so nothing may refuse it", () => {
    // The investigate graph projection is
    //   triage -> select -> setup -> context -> audit
    // so audit is the stage that FOLLOWS context on this track. Without a
    // graph edge the per-stage block and the route intersect to ZERO
    // candidates and the card dies at context with "no transition defined"
    // -- a deadlock with no redirect, on a track whose whole point is to
    // stop at the audit.
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "context", "Auto", "Core", "investigate");
    const r = run(["advance", "audit", "--dry-run"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
    expect(r.status).toBe(0);
  });

  it("the same graph edge does NOT hand context -> audit to the other tracks", () => {
    // Every route ends at audit, so scoping a route edge by MEMBERSHIP admits
    // audit for all of them and one graph edge silently rewrites every track:
    // a feature card could jump from analysis straight to the final review,
    // skipping shape, planning, execution and verification. Only investigate
    // has audit immediately after context.
    for (const intent of ["feature", "new-product", "bugfix", "refactor"]) {
      const dir = gitRepo();
      const stateDir = makeStateDir(dir, "context", "Auto", "Core", intent);
      const r = run(["advance", "audit", "--dry-run"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
      expect(r.status, `${intent} must not reach audit from context`).not.toBe(0);
      expect(r.stderr).toContain("invalid transition");
    }
  });

  it("a reject still goes backward on a route-scoped stage", () => {
    // Route scoping must not strand a card that needs to go back. context
    // rejects to setup, and setup is BEHIND context on every route, so
    // filtering forward moves only is the rule -- filtering to "ahead" would
    // delete this and leave no way out of a bad context.
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "context", "Auto", "Core", "investigate");
    const r = run(["advance", "setup", "--dry-run"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
    expect(r.status).toBe(0);
  });

  it("a stage may rework itself on a route-scoped stage", () => {
    // shape declares `rework: shape` — the same stage, re-run. Re-running the
    // current stage is never a route violation, so scoping by position must
    // not filter it out: doing so refuses `shape -> shape` and takes shape
    // rework with it.
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "shape", "Auto");
    seedArtifact(stateDir, "plans/spec-product_v1.md");
    const r = run(["advance", "shape", "--dry-run"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
    expect(r.status).toBe(0);
  });

  it("verification -> audit passes in Auto", () => {
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "verification", "Auto");
    const r = run(["advance", "audit", "--dry-run"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
    expect(r.status).toBe(0);
  });

  it("setup -> shape passes in Lean+Auto only", () => {
    const lean = gitRepo();
    const leanDir = makeStateDir(lean, "setup", "Auto", "Lean");
    expect(run(["advance", "shape", "--dry-run"], lean, { STELOW_STATEDIR: leanDir, STELOW_TRANSITIONS: TRANSITIONS }).status).toBe(0);
    const core = gitRepo();
    const coreDir = makeStateDir(core, "setup", "Auto", "Core");
    expect(run(["advance", "shape", "--dry-run"], core, { STELOW_STATEDIR: coreDir, STELOW_TRANSITIONS: TRANSITIONS }).status).not.toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe("transition token hygiene", () => {
  it("prose words from parenthetical comments never become candidates", () => {
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "triage", "Auto");
    const env = { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS };
    for (const bogus of ["stays", "at", "path", "returns", "to", "none"]) {
      const r = run(["advance", bogus, "--dry-run"], dir, env);
      expect(r.status, `candidate '${bogus}' must be rejected`).not.toBe(0);
      expect(r.stderr).toContain("invalid transition");
    }
    const before = readFileSync(join(stateDir, "state.md"));
    expect(Buffer.compare(before, readFileSync(join(stateDir, "state.md")))).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe("mode-skipped gate refusals", () => {
  it("plan-gate in Auto refuses with the execution redirect and mutates nothing", () => {
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "planning", "Auto");
    const env = { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS };
    const before = readFileSync(join(stateDir, "state.md"));
    const r = run(["advance", "plan-gate", "--dry-run"], dir, env);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("advance directly to execution instead");
    expect(Buffer.compare(before, readFileSync(join(stateDir, "state.md")))).toBe(0);
  });

  it("plan-gate passes in full Tech Review mode", () => {
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "planning", "Product Spec + Interface + Tech Review + Code Diff");
    seedArtifact(stateDir, "plans/spec-tech_v1.md");
    const r = run(["advance", "plan-gate", "--dry-run"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
    expect(r.status).toBe(0);
  });

  it("diff-gate in Auto refuses with the audit redirect", () => {
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "verification", "Auto");
    const r = run(["advance", "audit", "--dry-run"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
    expect(r.status).toBe(0);
    const gate = run(["advance", "diff-gate", "--dry-run"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
    expect(gate.status).not.toBe(0);
    expect(gate.stderr).toContain("advance directly to audit instead");
  });
});

// ---------------------------------------------------------------------------
// Gate SETS (`review_gates`), which the ladder could not express.
// ---------------------------------------------------------------------------

function makeGateStateDir(base: string, stage: string, gates: string, appetite = "Core", intent = "feature"): string {
  const stateDir = join(base, ".stelow", "2026-09-06", `sw-${randomBytes(3).toString("hex")}`);
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, "state.md"), `---
name: t
intent: ${intent}
current_stage: ${stage}
status: active
config:
  appetite: ${appetite}
  review_gates: ${gates}
  product_type: software
stages:
  ${stage}: in-progress
artifacts: []
history: []
---
# t
`);
  return stateDir;
}

// seed prints the state dir as its last stdout line, absolute.
function seededStateDir(stdout: string): string {
  const line = stdout.trim().split("\n").pop() ?? "";
  return line.endsWith("state.md") ? join(line, "..") : line;
}

describe("review gate sets", () => {
  // The defect this replaces: a set with no ladder rung was written as
  // `review_mode: Auto`, and the helper read the LADDER — so a card that asked
  // for `tech` had its plan-gate refused as if it had asked for nothing. Both
  // of these presets ship in the host's picker, so this is a card a user could
  // create and could not run.
  it("a set with no ladder rung runs the gate it selected", () => {
    const dir = gitRepo();
    const stateDir = makeGateStateDir(dir, "planning", "[spec, tech]");
    seedArtifact(stateDir, "plans/spec-tech_v1.md");
    const env = { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS };
    const gate = run(["advance", "plan-gate", "--dry-run"], dir, env);
    expect(gate.status).toBe(0);
  });

  it("the same set still refuses the gate it left unselected", () => {
    const dir = gitRepo();
    // From verification: diff-gate is on the route, so the refusal is the
    // gate's own and names the set. From planning it would be refused earlier
    // as an off-route target, which says nothing about the set.
    const stateDir = makeGateStateDir(dir, "verification", "[spec, tech]");
    const gate = run(["advance", "diff-gate", "--dry-run"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
    expect(gate.status).not.toBe(0);
    // The refusal names the set the workflow actually runs. "not selected"
    // alone told a reader nothing when they were told something else at
    // creation time.
    expect(gate.stderr).toContain("[spec,tech]");
    expect(gate.stderr).toContain("advance directly to audit instead");
  });

  it("an empty set is Auto: every gated stage refuses", () => {
    const dir = gitRepo();
    const env = { STELOW_TRANSITIONS: TRANSITIONS };
    const plan = makeGateStateDir(dir, "planning", "[]");
    expect(run(["advance", "plan-gate", "--dry-run"], dir, { ...env, STELOW_STATEDIR: plan }).status).not.toBe(0);
    const diff = makeGateStateDir(dir, "verification", "[]");
    expect(run(["advance", "diff-gate", "--dry-run"], dir, { ...env, STELOW_STATEDIR: diff }).status).not.toBe(0);
  });

  it("interface-only runs the interface gate and nothing else", () => {
    const dir = gitRepo();
    const stateDir = makeGateStateDir(dir, "planning", "[interface]");
    const r = run(["advance", "plan-gate", "--dry-run"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("advance directly to execution instead");
  });

  it("a state that declared neither field is not enforced at all", () => {
    // No review_gates and no review_mode: there is nothing to enforce against,
    // so inventing a skip would strand the worker at a gate nobody configured.
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "planning", "");
    // makeStateDir writes `review_mode: `, which IS a declaration; strip it.
    const path = join(stateDir, "state.md");
    writeFileSync(path, readFileSync(path, "utf8").replace(/^  review_mode:.*$/m, ""));
    seedArtifact(stateDir, "plans/spec-tech_v1.md");
    const r = run(["advance", "plan-gate", "--dry-run"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
    expect(r.status).toBe(0);
  });

  it("status names the set as atoms, not a rung", () => {
    const dir = gitRepo();
    const stateDir = makeGateStateDir(dir, "planning", "[spec, interface]");
    const r = run(["status"], dir, { STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("spec,interface");
  });

  it("seed writes review_gates and refuses an unknown atom", () => {
    const dir = gitRepo();
    const ok = run(["seed", "--name", "s1", "--intent", "feature", "--review-gates", "spec,tech"], dir, { STELOW_TRANSITIONS: TRANSITIONS });
    expect(ok.status).toBe(0);
    const found = readFileSync(join(seededStateDir(ok.stdout), "state.md"), "utf8");
    expect(found).toMatch(/review_gates: \[spec, tech\]/);
    // The ladder must not be written at all: every reader resolves atoms, and
    // a second field is a second answer that can disagree with the first.
    expect(found).not.toMatch(/review_mode:/);

    // A typo that vanished would leave a workflow whose gates do not match
    // what the caller believes it asked for.
    const bad = run(["seed", "--name", "s2", "--intent", "feature", "--review-gates", "spec,teh"], dir, { STELOW_TRANSITIONS: TRANSITIONS });
    expect(bad.status).not.toBe(0);
    expect(bad.stderr).toContain("teh");
  });

  it("seed with no gate flag means Auto, written as an empty set", () => {
    const dir = gitRepo();
    const r = run(["seed", "--name", "s3", "--intent", "feature"], dir, { STELOW_TRANSITIONS: TRANSITIONS });
    expect(r.status).toBe(0);
    const found = readFileSync(join(seededStateDir(r.stdout), "state.md"), "utf8");
    expect(found).toMatch(/review_gates: \[\]/);
  });
});
