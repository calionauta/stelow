/**
 * guard-judge CLI (fail-observed guard-quality tripwire).
 *
 * Bugs it catches:
 *  1. `guard-judge status` miscounts the Record.guard_verdicts log —
 *     human-review verdicts or pending entries leak into the rate, or only
 *     one overturn direction counts.
 *  2. `guard-judge check` exits 0 on a tripped window, or --apply fails to
 *     persist the strict→advisory downgrade to stelow.json + state.md.
 *  3. `config get/set guard_judge` and `seed --guard-judge` disagree with
 *     the documented precedence (env > stored > quality default).
 *
 * No verdict logic lives here: aggregation mirrors types/stages.ts
 * (guardOverturnStats); assertions cover exit codes, refusal text, --json
 * shapes, and persisted state. Real helper (scripts/stelow) executed
 * against temp git repos.
 */
import { describe, it, expect, afterAll } from "vitest";
import { spawnSync, execSync } from "node:child_process";
import {
  mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const REPO_ROOT = join(__dirname, "..", "..");
const HELPER_SRC = join(REPO_ROOT, "scripts", "stelow");
const TRANSITIONS_SRC = join(
  REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md",
);

interface Workdir { dir: string; helper: string; }
const workdirs: string[] = [];

function makeWorkdir(): Workdir {
  const id = randomBytes(6).toString("hex");
  const dir = mkdtempSync(join(tmpdir(), `stelow-guardjudge-${process.pid}-${id}`));
  execSync("git init -q", { cwd: dir });
  execSync("git config user.email test@test", { cwd: dir });
  execSync("git config user.name test", { cwd: dir });
  mkdirSync(join(dir, "skills", "stelow-workflow-orchestrator", "references"), { recursive: true });
  mkdirSync(join(dir, "scripts"), { recursive: true });
  writeFileSync(join(dir, "scripts", "stelow"), readFileSync(HELPER_SRC));
  execSync("chmod +x scripts/stelow", { cwd: dir });
  writeFileSync(
    join(dir, "skills", "stelow-workflow-orchestrator", "references", "transitions.md"),
    readFileSync(TRANSITIONS_SRC),
  );
  execSync("git add -A && git commit -q -m init", { cwd: dir });
  workdirs.push(dir);
  return { dir, helper: join(dir, "scripts", "stelow") };
}

function run(
  wd: Workdir, args: string[], env: Record<string, string> = {},
): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("bash", [wd.helper, ...args], {
    cwd: wd.dir, encoding: "utf8",
    env: { ...process.env, PATH: process.env.PATH ?? "", ...env },
  });
  return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

const SPEC = [
  "[SCOPE-1] Login",
  "[TYPE] feature",
  "Dependencies: none",
  "",
  "[SCOPE-2] Auth tests",
  "[TYPE] test-unit",
  "Dependencies: none",
  "",
].join("\n");

function seedScopes(wd: Workdir, name: string, extra: string[] = []): string {
  const seed = run(wd, ["seed", "--name", name, "--intent", "feature", "--json", ...extra]);
  expect(seed.status).toBe(0);
  const statedir = (JSON.parse(seed.stdout) as { statedir: string }).statedir;
  mkdirSync(join(statedir, "plans"), { recursive: true });
  writeFileSync(join(statedir, "plans", "spec-tech_v1.md"), SPEC);
  expect(run(wd, ["sync-scopes"], { STELOW_STATEDIR: statedir }).status).toBe(0);
  return statedir;
}

function trackingOf(wd: Workdir): { workflows: Array<{ config: Record<string, unknown>; scopes: Array<Record<string, unknown>> }> } {
  return JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8"));
}

function setRecord(wd: Workdir, id: string, record: unknown): void {
  const t = trackingOf(wd);
  const scope = t.workflows[0].scopes.find((s) => s["id"] === id);
  expect(scope).toBeTruthy();
  (scope as Record<string, unknown>)["record"] = record;
  writeFileSync(join(wd.dir, "stelow.json"), JSON.stringify(t, null, 2));
}

function verdict(verdict: string, human_decision?: string, guard = "tests/a.test.ts"): Record<string, unknown> {
  const e: Record<string, unknown> = { guard, test_sha: "sha-" + verdict, verdict };
  if (human_decision) e["human_decision"] = human_decision;
  return e;
}

afterAll(() => {
  for (const d of workdirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

describe("guard-judge status", () => {
  it("empty log: judged=0, not tripped, exit 0", () => {
    const wd = makeWorkdir();
    const statedir = seedScopes(wd, "gj-empty");
    const r = run(wd, ["guard-judge", "status", "--json"], { STELOW_STATEDIR: statedir });
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({ judged: 0, overturned: 0, tripped: false, window: 30 });
  });

  it("aggregates both overturn directions across scopes, excludes human-review and pending", () => {
    const wd = makeWorkdir();
    const statedir = seedScopes(wd, "gj-agg");
    const env = { STELOW_STATEDIR: statedir };
    setRecord(wd, "scope-1", { guard_verdicts: [
      verdict("needs-revision", "approved"),
      verdict("pass", "reworked"),
      verdict("human-review", "approved"),
      verdict("pass"),
    ] });
    setRecord(wd, "scope-2", { guard_verdicts: [verdict("pass", "approved")] });
    const r = run(wd, ["guard-judge", "status", "--json"], env);
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({ judged: 3, overturned: 2, tripped: false });
  });
});

describe("guard-judge check and tripwire downgrade", () => {
  function trippedWorkdir(name: string): { wd: Workdir; env: Record<string, string> } {
    const wd = makeWorkdir();
    const statedir = seedScopes(wd, name);
    const env = { STELOW_STATEDIR: statedir };
    // 4/30 overturned window across both scopes (rate 0.133 > 0.1).
    const mixed1 = [...Array.from({ length: 2 }, () => verdict("pass", "reworked")),
      ...Array.from({ length: 13 }, () => verdict("pass", "approved"))];
    const mixed2 = [...Array.from({ length: 2 }, () => verdict("needs-revision", "approved")),
      ...Array.from({ length: 13 }, () => verdict("pass", "approved"))];
    setRecord(wd, "scope-1", { guard_verdicts: mixed1 });
    setRecord(wd, "scope-2", { guard_verdicts: mixed2 });
    return { wd, env };
  }

  it("check exits 1 on a tripped window and names rate and window", () => {
    const { wd, env } = trippedWorkdir("gj-trip");
    const r = run(wd, ["guard-judge", "check", "--json"], env);
    expect(r.status).toBe(1);
    expect(JSON.parse(r.stdout)).toMatchObject({ judged: 30, overturned: 4, tripped: true });
    expect(r.stderr).toContain("0.133");
  });

  it("check --apply persists strict→advisory to stelow.json and state.md", () => {
    const { wd, env } = trippedWorkdir("gj-apply");
    const r = run(wd, ["guard-judge", "check", "--apply", "--json"], env);
    expect(r.status).toBe(0);
    const body = JSON.parse(r.stdout);
    expect(body).toMatchObject({ tripped: true, applied: true, mode: "advisory" });
    expect(trackingOf(wd).workflows[0].config["guard_judge"]).toBe("advisory");
    const state = readFileSync(join(env["STELOW_STATEDIR"], "state.md"), "utf8");
    expect(state).toMatch(/guard_judge:\s*advisory/);
    // red_first untouched by the downgrade write
    expect(state).toMatch(/red_first:\s*strict/);
  });

  it("check exits 0 on a clean window", () => {
    const wd = makeWorkdir();
    const statedir = seedScopes(wd, "gj-clean");
    const env = { STELOW_STATEDIR: statedir };
    setRecord(wd, "scope-1", { guard_verdicts: Array.from({ length: 30 }, () => verdict("pass", "approved")) });
    const r = run(wd, ["guard-judge", "check", "--json"], env);
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({ judged: 30, overturned: 0, tripped: false });
  });

  it("rejects usage with exit 2", () => {
    const wd = makeWorkdir();
    const statedir = seedScopes(wd, "gj-usage");
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["guard-judge", "bogus"], env).status).toBe(2);
    expect(run(wd, ["guard-judge", "status", "--apply"], env).status).toBe(2);
  });
});

describe("guard_judge knob symmetry (seed/config/env)", () => {
  it("seed --guard-judge persists; invalid value exits 2", () => {
    const wd = makeWorkdir();
    const statedir = seedScopes(wd, "gj-seed", ["--guard-judge", "off"]);
    expect(trackingOf(wd).workflows[0].config["guard_judge"]).toBe("off");
    expect(run(wd, ["seed", "--name", "bad", "--intent", "feature", "--guard-judge", "bogus"]).status).toBe(2);
    void statedir;
  });

  it("seed defaults strict on production, advisory on experimental", () => {
    const wd = makeWorkdir();
    const prod = seedScopes(wd, "gj-prod");
    expect(trackingOf(wd).workflows[0].config["guard_judge"]).toBe("strict");
    const wd2 = makeWorkdir();
    seedScopes(wd2, "gj-exp", ["--quality", "experimental"]);
    expect(trackingOf(wd2).workflows[0].config["guard_judge"]).toBe("advisory");
    void prod;
  });

  it("config get resolves env > stored > quality default; set persists both stores", () => {
    const wd = makeWorkdir();
    const statedir = seedScopes(wd, "gj-cfg");
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["config", "get", "guard_judge"], env).stdout.trim()).toBe("strict");
    expect(run(wd, ["config", "get", "guard_judge"], { ...env, STELOW_GUARD_JUDGE: "off" }).stdout.trim()).toBe("off");
    expect(run(wd, ["config", "set", "guard_judge", "advisory"], env).status).toBe(0);
    expect(run(wd, ["config", "get", "guard_judge"], env).stdout.trim()).toBe("advisory");
    expect(trackingOf(wd).workflows[0].config["guard_judge"]).toBe("advisory");
    const state = readFileSync(join(statedir, "state.md"), "utf8");
    expect(state).toMatch(/guard_judge:\s*advisory/);
    expect(state).toMatch(/red_first:\s*strict/);
    expect(run(wd, ["config", "set", "guard_judge", "bogus"], env).status).toBe(2);
  });
});
