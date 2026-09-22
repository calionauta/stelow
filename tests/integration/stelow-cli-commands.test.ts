/**
 * Integration Tests: stelow seed / schema / advance --json --dry-run / ask.
 *
 * Same harness as stelow-helper.test.ts: real bash subprocesses against
 * temp git repos, no mocks. Covers the S2/S3 surface added on top of the
 * status/advance/doctor core.
 *
 * Bug each group catches (repo policy: name it or delete it):
 * - seed: wrong first stage per intent, duplicate stelow.json entries,
 *   missing validation (garbage intent/appetite accepted).
 * - schema: dispatch/surface drift (command exists but undocumented).
 * - advance flags: dry-run mutating state, JSON polluting stdout on error.
 * - ask: usage accepted loosely, missing identity hanging instead of
 *   refusing, timeout losing the pending file, collect not consuming the
 *   answer, re-run duplicating waits, cancel treated as submit.
 *
 * To run:  npm run test:integration -- stelow-cli-commands
 */
import { describe, it, expect, afterAll } from "vitest";
import { execSync, spawnSync, spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HELPER = join(REPO_ROOT, "scripts", "stelow");
const TRANSITIONS_SRC = join(REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md");
const POLL_INTERVAL_MS = 25;
const PENDING_FILE_ATTEMPTS = 100;

interface Workdir { dir: string; stateDir: string; env: Record<string, string>; }

const workdirs: string[] = [];

function makeWorkdir(): Workdir {
  const id = randomBytes(6).toString("hex");
  const dir = mkdtempSync(join(tmpdir(), `stelow-cmd-${process.pid}-${id}`));
  execSync("git init -q", { cwd: dir });
  execSync("git config user.email test@test", { cwd: dir });
  execSync("git config user.name test", { cwd: dir });
  const stateDir = join(dir, ".stelow");
  mkdirSync(join(dir, "skills", "stelow-workflow-orchestrator", "references"), { recursive: true });
  writeFileSync(join(dir, "skills", "stelow-workflow-orchestrator", "references", "transitions.md"),
                readFileSync(TRANSITIONS_SRC));
  execSync("git add -A && git commit -q -m init", { cwd: dir });
  workdirs.push(dir);
  return {
    dir,
    stateDir,
    env: {
      STELOW_STATEDIR: stateDir,
      STELOW_TRANSITIONS: join(dir, "skills", "stelow-workflow-orchestrator", "references", "transitions.md"),
      STELOW_THREAD_ID: "thr_test123",
      STELOW_ASK_TIMEOUT_MS: "1500",
    },
  };
}

function run(wd: Workdir, args: string[], extraEnv: Record<string, string> = {}): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("bash", [HELPER, ...args], {
    cwd: wd.dir, encoding: "utf8",
    env: { ...process.env, PATH: process.env.PATH ?? "", ...wd.env, ...extraEnv },
  });
  return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

async function waitForFile(path: string, attempts = PENDING_FILE_ATTEMPTS): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (existsSync(path)) return true;
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return existsSync(path);
}

afterAll(() => {
  for (const dir of workdirs) {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

// ---------------------------------------------------------------------------

describe("seed", () => {
  it("mints a dated state dir with intent-correct first stage", () => {
    const wd = makeWorkdir();
    const r = run(wd, ["seed", "--name", "demo", "--intent", "feature"]);
    expect(r.status).toBe(0);
    const statePath = r.stdout.trim();
    expect(statePath).toMatch(/\.stelow\/\d{4}-\d{2}-\d{2}\/sw-[a-z0-9-]+\/state\.md$/);
    expect(existsSync(statePath)).toBe(true);
    const blob = readFileSync(statePath, "utf8");
    expect(blob).toMatch(/current_stage:\s*setup/);
    const tracking = JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8"));
    expect(tracking.workflows).toHaveLength(1);
    expect(tracking.workflows[0].dirHash).toMatch(/^sw-/);
  });

  it("starts new-product at triage", () => {
    const wd = makeWorkdir();
    const r = run(wd, ["seed", "--name", "np", "--intent", "new-product"]);
    expect(r.status).toBe(0);
    expect(readFileSync(r.stdout.trim(), "utf8")).toMatch(/current_stage:\s*triage/);
  });

  it("seed --json prints machine-readable paths", () => {
    const wd = makeWorkdir();
    const r = run(wd, ["seed", "--name", "j", "--intent", "feature", "--json"]);
    expect(r.status).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.state).toMatch(/state\.md$/);
    expect(j.dirHash).toMatch(/^sw-/);
    expect(j.statedir).toContain(j.dirHash);
  });

  it("rejects bad intent, bad appetite, missing name with exit 2", () => {
    const wd = makeWorkdir();
    for (const args of [
      ["seed", "--name", "x", "--intent", "bogus"],
      ["seed", "--name", "x", "--intent", "feature", "--appetite", "Huge"],
      ["seed", "--intent", "feature"],
    ]) {
      const r = run(wd, args);
      expect(r.status).toBe(2);
    }
  });

  it("re-seeding the same name replaces the tracking entry (no duplicates)", () => {
    const wd = makeWorkdir();
    expect(run(wd, ["seed", "--name", "dup", "--intent", "feature"]).status).toBe(0);
    expect(run(wd, ["seed", "--name", "dup", "--intent", "feature"]).status).toBe(0);
    const tracking = JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8"));
    expect(tracking.workflows.filter((w: any) => w.name === "dup")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------

describe("schema", () => {
  it("lists every dispatch subcommand with usage and exit codes", () => {
    const wd = makeWorkdir();
    const r = run(wd, ["schema"]);
    expect(r.status).toBe(0);
    const j = JSON.parse(r.stdout);
    for (const cmd of ["status", "advance", "doctor", "seed", "ask", "sync-scopes", "lock", "config", "scope"]) {
      expect(Object.keys(j), `schema covers ${cmd}`).toContain(cmd);
      expect(j[cmd].usage, `${cmd} usage`).toBeTruthy();
      expect(j[cmd].exit_codes, `${cmd} exit codes`).toBeTruthy();
    }
  });

  it("rejects unknown commands with exit 2", () => {
    const wd = makeWorkdir();
    expect(run(wd, ["schema", "bogus"]).status).toBe(2);
  });
});

// ---------------------------------------------------------------------------

describe("advance flags", () => {
  function seeded(wd: Workdir): string {
    const r = run(wd, ["seed", "--name", "d", "--intent", "feature"]);
    expect(r.status).toBe(0);
    return r.stdout.trim();
  }

  it("--dry-run validates without mutating", () => {
    const wd = makeWorkdir();
    const statePath = seeded(wd);
    const env = { STELOW_STATEDIR: statePath.replace(/\/state\.md$/, "") };
    const before = readFileSync(statePath);
    const r = run(wd, ["advance", "context", "--dry-run"], env);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("would advance setup -> context");
    expect(Buffer.compare(before, readFileSync(statePath))).toBe(0);
  });

  it("--dry-run still refuses invalid transitions", () => {
    const wd = makeWorkdir();
    const statePath = seeded(wd);
    const env = { STELOW_STATEDIR: statePath.replace(/\/state\.md$/, "") };
    const r = run(wd, ["advance", "scope", "--dry-run"], env);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("invalid transition");
  });

  it("--json prints previous/advanced stages", () => {
    const wd = makeWorkdir();
    const statePath = seeded(wd);
    const env = { STELOW_STATEDIR: statePath.replace(/\/state\.md$/, "") };
    const r = run(wd, ["advance", "context", "--json"], env);
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual({ advanced_to: "context", previous_stage: "setup" });
  });
});

// ---------------------------------------------------------------------------

describe("ask file protocol", () => {
  it("usage errors exit 2 (single option, --thread flag, missing identity)", () => {
    const wd = makeWorkdir();
    expect(run(wd, ["ask", "--question", "Q?"]).status).toBe(2);
    expect(run(wd, ["ask", "--thread", "x", "--question", "Q?", "--option", "A", "--option", "B"]).status).toBe(2);
    const r = run(wd, ["ask", "--question", "Q?", "--option", "A", "--option", "B"], { STELOW_THREAD_ID: "", BB_THREAD_ID: "" });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("STELOW_THREAD_ID");
  });

  it("timeout keeps pending.json and exits 1 with STOP-and-wait", () => {
    const wd = makeWorkdir();
    const r = run(wd, ["ask", "--question", "Color?", "--option", "Red", "--option", "Blue"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("STOP and wait");
    const pending = JSON.parse(readFileSync(join(wd.stateDir, "ask", "pending.json"), "utf8"));
    expect(pending.questions).toHaveLength(1);
    expect(pending.questions[0].id).toBe("q1");
    expect(pending.questions[0].options.map((o: any) => o.label)).toEqual(["Red", "Blue"]);
    expect(pending.thread_id).toBe("thr_test123");
  });

  it("contract ids travel with their group into pending.json", () => {
    const wd = makeWorkdir();
    const askDir = join(wd.stateDir, "ask");
    const r = run(wd, ["ask", "--question", "Color?", "--contract", "interface-pick", "--option", "Red", "--option", "Blue"]);
    expect(r.status).toBe(1);
    const pending = JSON.parse(readFileSync(join(askDir, "pending.json"), "utf8"));
    expect(pending.questions[0].contract).toBe("interface-pick");
    const plain = run(wd, ["ask", "--question", "Other?", "--option", "A", "--option", "B"]);
    expect(plain.status).toBe(1);
    const pendingPlain = JSON.parse(readFileSync(join(askDir, "pending.json"), "utf8"));
    expect(pendingPlain.questions[0].contract).toBeNull();
  });

  it("contract misuse fails fast with usage errors", () => {
    const wd = makeWorkdir();
    expect(run(wd, ["ask", "--question", "Q?", "--contract", "not a slug!", "--option", "A", "--option", "B"]).status).toBe(2);
    expect(run(wd, ["ask", "--contract", "x", "--question", "Q?", "--option", "A", "--option", "B"]).status).toBe(2);
  });

  it("collects an arrived answer and consumes it", async () => {
    const wd = makeWorkdir();
    const askDir = join(wd.stateDir, "ask");
    const child = spawn("bash", [HELPER, "ask", "--question", "Color?", "--option", "Red", "--option", "Blue"], {
      cwd: wd.dir, env: { ...process.env, PATH: process.env.PATH ?? "", ...wd.env },
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    // Wait for the helper's durable handoff before writing the answer.
    expect(await waitForFile(join(askDir, "pending.json"))).toBe(true);
    writeFileSync(join(askDir, "answer.json"), JSON.stringify({ answers: { q1: ["Red"] } }));
    const exit: number = await new Promise((resolve) => child.on("close", resolve));
    expect(exit).toBe(0);
    expect(JSON.parse(stdout)).toEqual({ answers: { q1: ["Red"] } });
    expect(existsSync(join(askDir, "answer.json"))).toBe(false);
  });

  it("re-run with live pending refuses instead of duplicating the wait", () => {
    const wd = makeWorkdir();
    const askDir = join(wd.stateDir, "ask");
    mkdirSync(askDir, { recursive: true });
    writeFileSync(join(askDir, "pending.json"), JSON.stringify({
      questions: [{ id: "q1", question: "Q?", multiple: false, options: [] }],
      thread_id: "thr_test123",
      asked_at: new Date().toISOString(),
      asked_at_ms: Date.now(),
      timeout_ms: 3600000,
    }));
    const r = run(wd, ["ask", "--question", "Other?", "--option", "A", "--option", "B"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("already pending");
  });

  it("explicit cancel surfaces raw JSON with exit 1", async () => {
    const wd = makeWorkdir();
    const askDir = join(wd.stateDir, "ask");
    const child = spawn("bash", [HELPER, "ask", "--question", "Q?", "--option", "A", "--option", "B"], {
      cwd: wd.dir, env: { ...process.env, PATH: process.env.PATH ?? "", ...wd.env },
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    expect(await waitForFile(join(askDir, "pending.json"))).toBe(true);
    writeFileSync(join(askDir, "answer.json"), JSON.stringify({ cancelled: true, reason: "user" }));
    const exit: number = await new Promise((resolve) => child.on("close", resolve));
    expect(exit).toBe(1);
    expect(JSON.parse(stdout).cancelled).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("read-only commands never touch the filesystem", () => {
  it("status/doctor/dry-run do not create a missing state dir", () => {
    const wd = makeWorkdir();
    const ghost = join(wd.dir, ".stelow", "2099-01-01", "sw-ghost");
    const env = { STELOW_STATEDIR: ghost, STELOW_TRANSITIONS: TRANSITIONS_SRC };
    run(wd, ["status"], env);
    run(wd, ["doctor"], env);
    expect(existsSync(ghost)).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("sync-scopes", () => {
  const SPEC = [
    "[SCOPE-1] Login",
    "[TYPE] feature",
    "[MAX_ITERATIONS] 5",
    "Objective: Implement login",
    "Dependencies: None",
    "DoD: works",
    "[TARGET_FILES]",
    "- src/auth/**",
    "",
    "[SCOPE-2] Speed",
    "[TYPE] optimization",
    "Objective: Faster",
    "Dependencies: SCOPE-1",
    "DoD: fast",
    "",
  ].join("\n");

  function seedWithSpec(wdName: string): { wd: any; statedir: string } {
    const wd = makeWorkdir();
    const seed = run(wd, ["seed", "--name", wdName, "--intent", "feature", "--json"]);
    expect(seed.status).toBe(0);
    const statedir = (JSON.parse(seed.stdout) as any).statedir as string;
    mkdirSync(join(statedir, "plans"), { recursive: true });
    writeFileSync(join(statedir, "plans", "spec-tech_v1.md"), SPEC);
    return { wd, statedir };
  }

  it("parses [SCOPE-N] blocks into wf.scopes[]", () => {
    const { wd, statedir } = seedWithSpec("sync-parse");
    const env = { STELOW_STATEDIR: statedir };
    const r = run(wd, ["sync-scopes", "--json"], env);
    expect(r.status).toBe(0);
    expect(Object.keys(JSON.parse(r.stdout)).sort()).toEqual(["dirHash", "specTechFile", "synced"]);
    expect(JSON.parse(r.stdout).synced).toBe(2);
    const tracking = JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8"));
    const scopes = tracking.workflows[0].scopes;
    expect(scopes.map((s: any) => s.id)).toEqual(["scope-1", "scope-2"]);
    expect(scopes[0]).toMatchObject({ type: "feature", name: "Login", maxIterations: 5, status: "pending" });
    expect(Object.keys(scopes[0]).sort()).toEqual(
      ["blockedBy", "id", "maxIterations", "name", "status", "targetFiles", "type"],
    );
    expect(scopes[0].targetFiles).toEqual(["src/auth/**"]);
    expect(scopes[1]).toMatchObject({ type: "optimization", maxIterations: 3 });
    expect(scopes[1].blockedBy).toEqual(["scope-1"]);
    expect(tracking.workflows[0].specTechFile).toBe("spec-tech_v1.md");
  });

  it("parses human ### SCOPE-N headings as a fallback", () => {
    const wd = makeWorkdir();
    const seed = run(wd, ["seed", "--name", "sync-human", "--intent", "feature", "--json"]);
    expect(seed.status).toBe(0);
    const statedir = (JSON.parse(seed.stdout) as any).statedir as string;
    mkdirSync(join(statedir, "plans"), { recursive: true });
    writeFileSync(join(statedir, "plans", "spec-tech_v1.md"), [
      "## 1. Identified Scopes",
      "",
      "### SCOPE-1: Overlay split",
      "[TYPE] feature",
      "Dependencies: none",
      "",
      "### SCOPE-2: Drawer fallback",
      "Dependencies: SCOPE-1",
      "",
    ].join("\n"));
    const r = run(wd, ["sync-scopes", "--json"], { STELOW_STATEDIR: statedir });
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).synced).toBe(2);
    const tracking = JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8"));
    expect(tracking.workflows[0].scopes.map((s: any) => s.id)).toEqual(["scope-1", "scope-2"]);
    expect(tracking.workflows[0].scopes[1].blockedBy).toEqual(["scope-1"]);
  });

  it("is idempotent on second run", () => {
    const { wd, statedir } = seedWithSpec("sync-idem");
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["sync-scopes", "--json"], env).status).toBe(0);
    const second = run(wd, ["sync-scopes", "--json"], env);
    expect(second.status).toBe(0);
    expect(JSON.parse(second.stdout).synced).toBe(0);
  });

  it("missing spec-tech is an exit-0 no-op", () => {
    const wd = makeWorkdir();
    const seed = run(wd, ["seed", "--name", "sync-empty", "--intent", "feature", "--json"]);
    expect(seed.status).toBe(0);
    const statedir = (JSON.parse(seed.stdout) as any).statedir as string;
    const r = run(wd, ["sync-scopes"], { STELOW_STATEDIR: statedir });
    expect(r.status).toBe(0);
    const tracking = JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8"));
    expect(tracking.workflows[0].scopes ?? []).toEqual([]);
  });

  it("rejects unknown flags with exit 2", () => {
    const wd = makeWorkdir();
    expect(run(wd, ["sync-scopes", "--bogus"]).status).toBe(2);
  });

describe("scope", () => {
  const SPEC = [
    "[SCOPE-1] Login",
    "[TYPE] feature",
    "Dependencies: none",
    "",
    "[SCOPE-2] Speed",
    "Dependencies: SCOPE-1",
    "",
  ].join("\n");

  function seedScope(wdName: string): { wd: any; statedir: string } {
    const wd = makeWorkdir();
    const seed = run(wd, ["seed", "--name", wdName, "--intent", "feature", "--json"]);
    expect(seed.status).toBe(0);
    const statedir = (JSON.parse(seed.stdout) as any).statedir as string;
    mkdirSync(join(statedir, "plans"), { recursive: true });
    writeFileSync(join(statedir, "plans", "spec-tech_v1.md"), SPEC);
    expect(run(wd, ["sync-scopes"], { STELOW_STATEDIR: statedir }).status).toBe(0);
    return { wd, statedir };
  }

  function scopesOf(wd: any): any[] {
    return JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8")).workflows[0].scopes;
  }

  it("starts a scope with started_at and enforces dependency order", () => {
    const { wd, statedir } = seedScope("scope-start");
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["scope", "start", "--scope", "scope-2"], env).status).toBe(1);
    const started = run(wd, ["scope", "start", "--scope", "scope-1", "--json"], env);
    expect(started.status).toBe(0);
    expect(JSON.parse(started.stdout)).toMatchObject({ id: "scope-1", status: "in-progress" });
    expect(typeof JSON.parse(started.stdout).started_at).toBe("string");
    const first = scopesOf(wd).find((s: any) => s.id === "scope-1");
    expect(first.status).toBe("in-progress");
    expect(typeof first.started_at).toBe("string");
    expect(run(wd, ["scope", "done", "--scope", "scope-1"], env).status).toBe(0);
    expect(run(wd, ["scope", "start", "--scope", "scope-2"], env).status).toBe(0);
    expect(run(wd, ["scope", "start", "--scope", "scope-1"], env).status).toBe(1);
  });

  it("closes only with shut tasks and never regresses", () => {
    const { wd, statedir } = seedScope("scope-done");
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["scope", "start", "--scope", "scope-1"], env).status).toBe(0);
    expect(run(wd, ["scope", "done", "--scope", "scope-9"], env).status).toBe(1);
    expect(run(wd, ["scope", "done", "--scope", "scope-1", "--json"], env).status).toBe(0);
    expect(scopesOf(wd).find((s: any) => s.id === "scope-1").status).toBe("done");
    expect(run(wd, ["scope", "done", "--scope", "scope-1"], env).status).toBe(1);
    expect(run(wd, ["scope", "start", "--scope", "scope-1"], env).status).toBe(1);
  });

  it("refuses done on open tasks and unverified records", () => {
    const { wd, statedir } = seedScope("scope-gates");
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["scope", "start", "--scope", "scope-1"], env).status).toBe(0);
    const tracking = () => JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8"));
    const setScope = (fn: (s: any) => void) => {
      const t = tracking();
      fn(t.workflows[0].scopes.find((s: any) => s.id === "scope-1"));
      writeFileSync(join(wd.dir, "stelow.json"), JSON.stringify(t, null, 2));
    };
    setScope((s) => { s.tasks = [{ id: "1.1", name: "x", status: "pending", source: "planned" }]; });
    expect(run(wd, ["scope", "done", "--scope", "scope-1"], env).status).toBe(1);
    setScope((s) => { s.tasks = [{ id: "1.1", name: "x", status: "done", source: "planned" }]; s.record = { verified: false }; });
    expect(run(wd, ["scope", "done", "--scope", "scope-1"], env).status).toBe(1);
    setScope((s) => { s.record = { verified: true }; });
    expect(run(wd, ["scope", "done", "--scope", "scope-1"], env).status).toBe(0);
  });

  it("persists iteration and actual files on done", () => {
    const { wd, statedir } = seedScope("scope-close-meta");
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["scope", "start", "--scope", "scope-1"], env).status).toBe(0);
    expect(run(wd, ["scope", "done", "--scope", "scope-1", "--iteration", "3", "--actual-files", "a.ts,b.ts"], env).status).toBe(0);
    const scope = JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8")).workflows[0].scopes.find((s: any) => s.id === "scope-1");
    expect(scope).toMatchObject({ status: "done", iteration: 3, actual_files: ["a.ts", "b.ts"] });
    expect(run(wd, ["scope", "done", "--scope", "scope-1", "--iteration", "x"], env).status).toBe(2);
  });

  it("rejects usage with exit 2", () => {
    const wd = makeWorkdir();
    expect(run(wd, ["scope"]).status).toBe(2);
    expect(run(wd, ["scope", "start"]).status).toBe(2);
  });
});

  function seedWithCustomSpec(wdName: string, spec: string): { wd: any; statedir: string } {
    const wd = makeWorkdir();
    const seed = run(wd, ["seed", "--name", wdName, "--intent", "feature", "--json"]);
    expect(seed.status).toBe(0);
    const statedir = (JSON.parse(seed.stdout) as any).statedir as string;
    mkdirSync(join(statedir, "plans"), { recursive: true });
    writeFileSync(join(statedir, "plans", "spec-tech_v1.md"), spec);
    return { wd, statedir };
  }

  const scope = (n: number, deps: string) =>
    `[SCOPE-${n}] Scope ${n}\n[TYPE] feature\nObjective: work\nDependencies: ${deps}\nDoD: done\n`;

  it("refuses a 2-cycle with exit 1 and names the cycle", () => {
    const { wd, statedir } = seedWithCustomSpec("sync-cycle2", scope(1, "SCOPE-2") + "\n" + scope(2, "SCOPE-1"));
    const r = run(wd, ["sync-scopes", "--json"], { STELOW_STATEDIR: statedir });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/blockedBy cycle detected: scope-1 -> scope-2 -> scope-1/);
    const tracking = JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8"));
    expect(tracking.workflows[0].scopes ?? []).toEqual([]);
  });

  it("refuses a self-block with exit 1", () => {
    const { wd, statedir } = seedWithCustomSpec("sync-self", scope(1, "SCOPE-1"));
    const r = run(wd, ["sync-scopes"], { STELOW_STATEDIR: statedir });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/scope-1 -> scope-1/);
  });

  it("refuses a 3-cycle with exit 1", () => {
    const spec = scope(1, "SCOPE-3") + "\n" + scope(2, "SCOPE-1") + "\n" + scope(3, "SCOPE-2");
    const { wd, statedir } = seedWithCustomSpec("sync-cycle3", spec);
    const r = run(wd, ["sync-scopes"], { STELOW_STATEDIR: statedir });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/blockedBy cycle detected/);
  });

  it("accepts a diamond (no false positive) and warns on dangling refs", () => {
    const spec = scope(1, "None") + "\n" + scope(2, "SCOPE-1") + "\n" + scope(3, "SCOPE-1") + "\n" + scope(4, "SCOPE-2, SCOPE-3, SCOPE-9");
    const { wd, statedir } = seedWithCustomSpec("sync-diamond", spec);
    const r = run(wd, ["sync-scopes", "--json"], { STELOW_STATEDIR: statedir });
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).synced).toBe(4);
    expect(r.stderr).toMatch(/unknown scopes.*scope-9/);
    const tracking = JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8"));
    expect(tracking.workflows[0].scopes[3].blockedBy).toEqual(["scope-2", "scope-3", "scope-9"]);
  });

  it("preserves audit-gap scopes and discovered tasks across a spec revision", () => {
    const { wd, statedir } = seedWithSpec("sync-preserve");
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["sync-scopes", "--json"], env).status).toBe(0);
    // Host-created rework scope + executor-discovered task (not in the spec).
    const trackingPath = join(wd.dir, "stelow.json");
    const tracking = JSON.parse(readFileSync(trackingPath, "utf8"));
    tracking.workflows[0].scopes.push({ id: "scope-4", name: "Rework", status: "in-progress", source: "audit-gap", gap: "tokens never expire", tasks: [] });
    tracking.workflows[0].scopes[0].tasks = [{ id: "1.1", name: "Index", source: "discovered", status: "pending", note: "slow query" }];
    writeFileSync(trackingPath, JSON.stringify(tracking));
    // Revise the spec (v2 keeps both scopes) and re-sync.
    writeFileSync(join(statedir, "plans", "spec-tech_v2.md"), SPEC);
    const r = run(wd, ["sync-scopes", "--json"], env);
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).synced).toBe(3);
    const after = JSON.parse(readFileSync(trackingPath, "utf8")).workflows[0].scopes;
    expect(after.map((s: any) => s.id)).toEqual(["scope-1", "scope-2", "scope-4"]);
    expect(after[2]).toMatchObject({ source: "audit-gap", status: "in-progress", gap: "tokens never expire" });
    expect(after[0].tasks).toEqual([{ id: "1.1", name: "Index", source: "discovered", status: "pending", note: "slow query" }]);
    expect(after[0].discovered_tasks_count).toBe(1);
  });

  it("rehouses an audit-gap scope when a revised spec reuses its number", () => {
    const { wd, statedir } = seedWithSpec("sync-collide");
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["sync-scopes", "--json"], env).status).toBe(0);
    const trackingPath = join(wd.dir, "stelow.json");
    const tracking = JSON.parse(readFileSync(trackingPath, "utf8"));
    tracking.workflows[0].scopes.push({ id: "scope-3", name: "Rework", status: "in-progress", source: "audit-gap", gap: "late gap", tasks: [] });
    writeFileSync(trackingPath, JSON.stringify(tracking));
    // v2 adds a third spec scope that collides with the rework number.
    writeFileSync(join(statedir, "plans", "spec-tech_v2.md"), SPEC + "\n[SCOPE-3] Third\n[TYPE] feature\nObjective: more\nDependencies: None\nDoD: more\n");
    expect(run(wd, ["sync-scopes", "--json"], env).status).toBe(0);
    const after = JSON.parse(readFileSync(trackingPath, "utf8")).workflows[0].scopes;
    const rework = after.find((s: any) => s.source === "audit-gap");
    expect(rework).toMatchObject({ id: "scope-4", status: "in-progress", gap: "late gap" });
    expect(after.find((s: any) => s.id === "scope-3" && !s.source)).toMatchObject({ name: "Third" });
  });
});

// ---------------------------------------------------------------------------

describe("config get", () => {
  function seedTracking(wd: any, workflows: unknown): void {
    writeFileSync(join(wd.dir, "stelow.json"), JSON.stringify({ workflows }));
  }

  it("reads fields from the in-progress workflow", () => {
    const wd = makeWorkdir();
    seedTracking(wd, [{ name: "w", status: "in-progress", config: { appetite: "Lean" } }]);
    const r = run(wd, ["config", "get", "appetite", "Core"]);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("Lean");
  });

  it("falls back to the default when missing", () => {
    const wd = makeWorkdir();
    seedTracking(wd, [{ name: "w", status: "in-progress", config: {} }]);
    expect(run(wd, ["config", "get", "appetite", "Core"]).stdout.trim()).toBe("Core");
    expect(run(wd, ["config", "get", "domains_detected", "[]"]).stdout.trim()).toBe("[]");
  });

  it("missing tracking yields the default with exit 0", () => {
    const wd = makeWorkdir();
    const r = run(wd, ["config", "get", "appetite", "Core"]);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("Core");
  });

  it("preserves arrays as JSON", () => {
    const wd = makeWorkdir();
    seedTracking(wd, [{ name: "w", status: "in-progress", config: { domains_detected: ["pricing"] } }]);
    const r = run(wd, ["config", "get", "domains_detected", "[]"]);
    expect(JSON.parse(r.stdout)).toEqual(["pricing"]);
  });

  it("reads the workflow its state dir belongs to, not the first entry", () => {
    // Several workflows in flight in one project is normal for card-based
    // hosts: the status-only filter handed back whichever entry came first, so
    // a worker read another workflow's appetite and review gates.
    const wd = makeWorkdir();
    seedTracking(wd, [
      { name: "a", status: "in-progress", dirHash: "sw-a", config: { appetite: "Lean", review_mode: "Auto" } },
      { name: "b", status: "in-progress", dirHash: "sw-b", config: { appetite: "Complete", review_mode: "Product Spec + Interface + Tech Review + Code Diff" } },
    ]);
    const forB = { STELOW_STATEDIR: join(wd.dir, ".stelow", "2026-01-01", "sw-b") };
    expect(run(wd, ["config", "get", "appetite", "Core"], forB).stdout.trim()).toBe("Complete");
    expect(run(wd, ["config", "get", "review_mode", "Auto"], forB).stdout.trim())
      .toBe("Product Spec + Interface + Tech Review + Code Diff");
    expect(run(wd, ["config", "get", "appetite", "Core"], { STELOW_STATEDIR: join(wd.dir, ".stelow", "2026-01-01", "sw-a") }).stdout.trim())
      .toBe("Lean");
  });

  it("prefers the state's owner id over its directory name", () => {
    const wd = makeWorkdir();
    seedTracking(wd, [
      { name: "a", workflowId: "card_a", status: "in-progress", dirHash: "sw-a", config: { appetite: "Lean" } },
      { name: "b", workflowId: "card_b", status: "in-progress", dirHash: "sw-b", config: { appetite: "Complete" } },
    ]);
    const stateDir = join(wd.dir, ".stelow", "2026-01-01", "sw-b");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "state.md"),
      "---\nworkflow_id: card_a\nname: a\nintent: feature\ncurrent_stage: execution\nstatus: active\n---\n");
    expect(run(wd, ["config", "get", "appetite", "Core"], { STELOW_STATEDIR: stateDir }).stdout.trim()).toBe("Lean");
  });

  it("rejects missing field with exit 2", () => {
    const wd = makeWorkdir();
    expect(run(wd, ["config", "get"]).status).toBe(2);
    expect(run(wd, ["config"]).status).toBe(2);
  });
});
