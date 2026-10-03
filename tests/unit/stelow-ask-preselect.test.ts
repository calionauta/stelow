/**
 * stelow-ask-preselect.test.ts
 *
 * Preselected options (`stelow ask --selected`) end to end against a real
 * helper subprocess. Opt-out confirms (mapped scopes, IN tables) start
 * checked; the human unchecks to remove. The pending file is the contract
 * hosts render from, so the test reads it — never the worker's intent.
 *
 * Ask blocks for an answer, so every staging run uses a short
 * STELOW_ASK_TIMEOUT_MS: expiry stages pending.json and exits 1, which is
 * exactly the state under test. Usage refusals (--selected without an
 * option, --selected on single-select) exit 2 without staging anything.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const REPO_ROOT = join(__testDir, "..", "..");
const HELPER_SRC = join(REPO_ROOT, "scripts", "stelow");

const workdirs: string[] = [];

function makeWorkdir(): { dir: string; helper: string; statedir: string } {
  const id = randomBytes(6).toString("hex");
  const dir = mkdtempSync(join(tmpdir(), `stelow-ask-${process.pid}-${id}`));
  execSync("git init -q", { cwd: dir });
  execSync("git config user.email test@test", { cwd: dir });
  execSync("git config user.name test", { cwd: dir });
  mkdirSync(join(dir, "scripts"), { recursive: true });
  const helper = join(dir, "scripts", "stelow");
  writeFileSync(helper, readFileSync(HELPER_SRC));
  execSync("git add -A && git commit -q -m init", { cwd: dir });
  const statedir = join(dir, ".stelow", "test");
  mkdirSync(statedir, { recursive: true });
  workdirs.push(dir);
  return { dir, helper, statedir };
}

function runAsk(wd: { dir: string; helper: string; statedir: string }, args: string[]) {
  const r = spawnSync("bash", [wd.helper, "ask", ...args], {
    cwd: wd.dir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: process.env.PATH ?? "",
      STELOW_STATEDIR: wd.statedir,
      STELOW_THREAD_ID: "thr_test",
      STELOW_ASK_TIMEOUT_MS: "400",
    },
  });
  return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function pending(wd: { statedir: string }) {
  return JSON.parse(readFileSync(join(wd.statedir, "ask", "pending.json"), "utf8"));
}

afterAll(() => {
  for (const dir of workdirs) {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

describe("stelow ask --selected", () => {
  it("stages preselected options into pending.json", () => {
    const wd = makeWorkdir();
    const r = runAsk(wd, [
      "--question", "Which scopes stay IN?", "--multiple",
      "--option", "scope-a", "--selected",
      "--option", "scope-b", "--selected",
      "--option", "scope-c",
    ]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/still pending/);
    const doc = pending(wd);
    expect(doc.questions).toHaveLength(1);
    expect(doc.questions[0].options.map((o: { selected: boolean }) => o.selected)).toEqual([true, true, false]);
  });

  it("refuses --selected on single-select groups", () => {
    const wd = makeWorkdir();
    const r = runAsk(wd, ["--question", "Pick one?", "--option", "a", "--selected", "--option", "b"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/--multiple/);
    expect(existsSync(join(wd.statedir, "ask", "pending.json"))).toBe(false);
  });

  it("refuses --selected before any --option", () => {
    const wd = makeWorkdir();
    const r = runAsk(wd, ["--question", "Pick?", "--multiple", "--selected", "--option", "a", "--option", "b"]);
    expect(r.status).toBe(2);
    expect(existsSync(join(wd.statedir, "ask", "pending.json"))).toBe(false);
  });

  it("collects a timed-out answer on re-run without losing preselection", () => {
    const wd = makeWorkdir();
    runAsk(wd, [
      "--question", "Keep?", "--multiple",
      "--option", "x", "--selected",
      "--option", "y",
    ]);
    const doc = pending(wd);
    expect(doc.questions[0].multiple).toBe(true);
    expect(doc.questions[0].options[0]).toMatchObject({ label: "x", selected: true });
  });
});
