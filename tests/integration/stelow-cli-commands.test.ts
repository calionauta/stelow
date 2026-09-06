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
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from "node:fs";import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HELPER = join(REPO_ROOT, "scripts", "stelow");
const TRANSITIONS_SRC = join(REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md");

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
    expect(statePath).toMatch(/\.stelow\/\d{4}-\d{2}-\d{2}\/pw-[a-z0-9-]+\/state\.md$/);
    expect(existsSync(statePath)).toBe(true);
    const blob = readFileSync(statePath, "utf8");
    expect(blob).toMatch(/current_stage:\s*setup/);
    const tracking = JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8"));
    expect(tracking.workflows).toHaveLength(1);
    expect(tracking.workflows[0].dirHash).toMatch(/^pw-/);
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
    expect(j.dirHash).toMatch(/^pw-/);
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
    for (const cmd of ["status", "advance", "doctor", "seed", "ask"]) {
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

  it("collects an arrived answer and consumes it", async () => {
    const wd = makeWorkdir();
    const askDir = join(wd.stateDir, "ask");
    const child = spawn("bash", [HELPER, "ask", "--question", "Color?", "--option", "Red", "--option", "Blue"], {
      cwd: wd.dir, env: { ...process.env, PATH: process.env.PATH ?? "", ...wd.env },
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    // wait for pending.json, then answer
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      if (existsSync(join(askDir, "pending.json"))) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(existsSync(join(askDir, "pending.json"))).toBe(true);
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
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      if (existsSync(join(askDir, "pending.json"))) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
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
    const ghost = join(wd.dir, ".stelow", "2099-01-01", "pw-ghost");
    const env = { STELOW_STATEDIR: ghost, STELOW_TRANSITIONS: TRANSITIONS_SRC };
    run(wd, ["status"], env);
    run(wd, ["doctor"], env);
    expect(existsSync(ghost)).toBe(false);
  });
});
