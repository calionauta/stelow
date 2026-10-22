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
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
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

/**
 * The review-mode policy has ONE owner: the generated block in the
 * transitions reference. The helper used to enforce it from a `case`
 * statement, so a mode added to stages.yaml left the helper running the old
 * rules — and a stage declared skipped was only refused for the two gates
 * somebody remembered to hardcode.
 *
 * The proof patches the REFERENCE (never the helper) and shows the helper's
 * behaviour move with it.
 */
describe("the review-mode policy comes from the reference, not from the helper", () => {
  function patchedReference(extra: string): string {
    const dir = mkdtempSync(join(tmpdir(), "stelow-policy-"));
    dirs.push(dir);
    const path = join(dir, "transitions.md");
    const text = readFileSync(TRANSITIONS, "utf8");
    // Insert the probe mode right after the first mode block.
    const marker = "review_mode: Auto\n";
    const at = text.indexOf(marker);
    expect(at, "the reference carries a review-mode block").toBeGreaterThan(-1);
    const end = text.indexOf("\n\n", at);
    writeFileSync(path, text.slice(0, end + 1) + extra + "\n" + text.slice(end + 1));
    return path;
  }

  it("a stage the reference declares skipped is refused, with the successor named", () => {
    const reference = patchedReference("review_mode: Mutation Probe\nskipped:    critique\nno_human_wait: (none)");
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "shape", "Mutation Probe");
    const r = run(["advance", "critique", "--dry-run"], dir, {
      STELOW_STATEDIR: stateDir,
      STELOW_TRANSITIONS: reference,
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("critique is skipped in 'Mutation Probe' review mode");
    expect(r.stderr).toContain("advance directly to gate instead");
  });

  it("the predecessor of a skipped stage moves straight to the successor", () => {
    const reference = patchedReference("review_mode: Mutation Probe\nskipped:    critique\nno_human_wait: (none)");
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "shape", "Mutation Probe");
    seedArtifact(stateDir, "plans/spec-product_v1.md");
    const r = run(["advance", "gate", "--dry-run"], dir, {
      STELOW_STATEDIR: stateDir,
      STELOW_TRANSITIONS: reference,
    });
    expect(r.status, r.stderr).toBe(0);
  });

  it("a stage the reference declares skipped is NOT refused in a mode that keeps it", () => {
    // The same stage, a different mode: the policy decides, not the stage.
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "shape", "Auto");
    seedArtifact(stateDir, "plans/spec-product_v1.md");
    const r = run(["advance", "critique", "--dry-run"], dir, {
      STELOW_STATEDIR: stateDir,
      STELOW_TRANSITIONS: TRANSITIONS,
    });
    expect(r.status, r.stderr).toBe(0);
  });
});

describe("an unusable review mode fails fast", () => {
  it("an unknown review mode is refused, naming the modes it knows", () => {
    // The vocabulary is closed and owned by stages.yaml. A mode the helper
    // does not know used to skip enforcement entirely: the worker walked
    // into a stage that does not run in its mode and parked there.
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "planning", "Product Spec + Interface + Code Diff");
    const before = readFileSync(join(stateDir, "state.md"));
    const r = run(["advance", "execution", "--dry-run"], dir, {
      STELOW_STATEDIR: stateDir,
      STELOW_TRANSITIONS: TRANSITIONS,
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("unknown review_mode");
    expect(r.stderr).toContain("Product Spec + Interface + Tech Review + Code Diff");
    expect(Buffer.compare(before, readFileSync(join(stateDir, "state.md")))).toBe(0);
  });

  it("a state with no review mode is refused instead of silently unguarded", () => {
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "planning", "Auto");
    const path = join(stateDir, "state.md");
    writeFileSync(path, readFileSync(path, "utf8").replace(/^\s*review_mode:.*$/m, ""));
    const before = readFileSync(path);
    const r = run(["advance", "execution", "--dry-run"], dir, {
      STELOW_STATEDIR: stateDir,
      STELOW_TRANSITIONS: TRANSITIONS,
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("no review_mode");
    expect(Buffer.compare(before, readFileSync(path))).toBe(0);
  });
});

// ---------------------------------------------------------------------------

/**
 * `stelow next` is the ONE answer to "what can I move to from here".
 *
 * The router used to re-derive it with its own awk/grep over the
 * transitions reference — a fourth implementation of the rule, coarser than
 * the helper's (no intent route, no review mode). It accepted moves the
 * helper then refused, and the workflow stalled between the two answers.
 * The command exists so there is nothing left to re-derive.
 */
describe("stelow next answers with the helper's own rule", () => {
  function nextJson(stateDir: string, dir: string): { allowed: string[]; forward: string[] } {
    const r = run(["next", "--json"], dir, {
      STELOW_STATEDIR: stateDir,
      STELOW_TRANSITIONS: TRANSITIONS,
    });
    expect(r.status, r.stderr).toBe(0);
    return JSON.parse(r.stdout);
  }

  it("reports the same set `advance` accepts, and names the forward move", () => {
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "planning", "Auto");
    const body = nextJson(stateDir, dir);
    // plan-gate does not run in Auto: it is not a legal move, and the
    // successor is.
    expect(body.allowed).toContain("execution");
    expect(body.allowed).not.toContain("plan-gate");
    expect(body.forward).toEqual(["execution"]);
  });

  it("every candidate it reports is one `advance` accepts", () => {
    const dir = gitRepo();
    for (const [stage, mode] of [
      ["planning", "Auto"],
      ["planning", "Product Spec + Interface + Tech Review + Code Diff"],
      ["verification", "Auto"],
      ["int-gate", "Auto"],
    ] as const) {
      const stateDir = makeStateDir(dir, stage, mode);
      const body = nextJson(stateDir, dir);
      for (const candidate of body.allowed) {
        const r = run(["advance", candidate, "--dry-run"], dir, {
          STELOW_STATEDIR: stateDir,
          STELOW_TRANSITIONS: TRANSITIONS,
        });
        // A candidate can still be refused by the artifact guard (the
        // pre-condition), but never by the transition rule.
        expect(
          r.stderr,
          `advance ${stage} -> ${candidate} (${mode}) must be accepted by the rule`,
        ).not.toMatch(/invalid transition|is skipped in/);
      }
    }
  });

  it("the forward move is the one that goes forward, not the reject edge", () => {
    // `planning` rejects to `architecture`, which is BEHIND it. Reporting
    // that as the forward move would walk the workflow backwards.
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "planning", "Auto");
    const body = nextJson(stateDir, dir);
    expect(body.allowed).toContain("architecture");
    expect(body.forward).not.toContain("architecture");
  });
});

describe("a stage that waits for nobody still runs", () => {
  it("selection is NOT bypassed in Auto: no human pick is not no stage", () => {
    // `no_human_wait` and `skipped` are different kinds. `selection` runs in
    // Auto — the agent decides the pick instead of parking for one — and it
    // produces the two artifacts the architecture stage reads. Bypassing it
    // would hand the next stage a prose interface with no graph.
    const dir = gitRepo();
    const stateDir = makeStateDir(dir, "int-gate", "Auto");
    const bypass = run(["advance", "architecture", "--dry-run"], dir, {
      STELOW_STATEDIR: stateDir,
      STELOW_TRANSITIONS: TRANSITIONS,
    });
    expect(bypass.status).not.toBe(0);
    expect(bypass.stderr).toContain("invalid transition");

    const into = run(["advance", "selection", "--dry-run"], dir, {
      STELOW_STATEDIR: stateDir,
      STELOW_TRANSITIONS: TRANSITIONS,
    });
    expect(into.status, into.stderr).toBe(0);
  });
});

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
