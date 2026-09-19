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
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, realpathSync, rmSync, utimesSync } from "node:fs";
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
  appetite: Core
  review_mode: Auto
  product_type: software
stages:
  ${current_stage}: in-progress
---
# t
`);
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
    expect(r.stderr).toContain("invalid transition");
    const after = readFileSync(join(wd.dir, "state.md"));
    expect(Buffer.compare(before, after)).toBe(0);
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
