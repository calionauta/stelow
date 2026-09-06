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
  const stateDir = join(base, ".stelow", "2026-09-06", `pw-${randomBytes(3).toString("hex")}`);
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
