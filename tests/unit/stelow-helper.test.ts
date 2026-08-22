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
//   - doctor (4 drift classes)
//
// To run:  npm run test:unit -- stelow-helper

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, statSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";

const REPO_ROOT = join(__dirname, "..", "..");
const HELPER_SRC = join(REPO_ROOT, "scripts", "stelow");
const TRANSITIONS_SRC = join(REPO_ROOT, "skills", "stelow-product-orchestrator", "references", "transitions.md");

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
  mkdirSync(join(dir, "skills", "stelow-product-orchestrator", "references"), { recursive: true });
  writeFileSync(join(dir, "skills", "stelow-product-orchestrator", "references", "transitions.md"),
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
  appetite: Core
  review_mode: Auto
  product_type: software
stages:
  ${current_stage}: in-progress
---
# t
`);
}

function run(wd: Workdir, args: string[]): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("bash", [wd.helper, ...args], {
    cwd: wd.dir, encoding: "utf8", env: { ...process.env, PATH: process.env.PATH ?? "" },
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
    expect(r.stdout).toContain("appetite : Core");
    expect(r.stdout).toContain("review   : Auto");
  });

  it("status --json is parseable JSON with current_stage + config", () => {
    makeState(wd, "shape");
    const r = run(wd, ["status", "--json"]);
    expect(r.status).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.current_stage).toBe("shape");
    expect(j.config.appetite).toBe("Core");
    expect(j.config.review_mode).toBe("Auto");
  });
});

// ---------------------------------------------------------------------------

describe("advance", () => {
  let wd: Workdir;
  beforeEach(() => { wd = makeWorkdir(); makeState(wd, "shape"); });

  it("rejects unknown candidate without mutating state.md", () => {
    const before = readFileSync(join(wd.dir, "state.md"));
    const r = run(wd, ["advance", "bogus"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("invalid candidate");
    const after = readFileSync(join(wd.dir, "state.md"));
    expect(Buffer.compare(before, after)).toBe(0);
  });

  it("advances valid next stage and updates frontmatter", () => {
    const r = run(wd, ["advance", "critique"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("advanced to critique");
    const sm = readFileSync(join(wd.dir, "state.md"), "utf8");
    expect(sm).toMatch(/current_stage:\s*critique/);
  });

  it("appends history to .stelow/invariants.json", () => {
    run(wd, ["advance", "critique"]);
    const inv = JSON.parse(readFileSync(join(wd.dir, ".stelow", "invariants.json"), "utf8"));
    expect(inv.current_stage).toBe("critique");
    expect(inv.history.at(-1).stage).toBe("critique");
    expect(typeof inv.history.at(-1).at).toBe("string");
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
    const r = run(wd, ["advance", "critique"], { env: { ...process.env, STELOW_LOCK_TTL_SEC: "10" } });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("advanced to critique");
  });
});

// ---------------------------------------------------------------------------

describe("doctor", () => {
  let wd: Workdir;
  beforeEach(() => { wd = makeWorkdir(); });

  it("reports ok on clean repo", () => {
    const r = run(wd, ["doctor"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("ok (no drift)");
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