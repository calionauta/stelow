/**
 * Scope-executor red-first (Phase 1, executor package).
 *
 * Bugs it catches:
 *  1. `scope done` closes a scope with no red-first evidence: it accepts a
 *     Record with verified:true but no red_proof / freeze_sha / baseline. The
 *     production CLI (scripts/stelow, `scope done`) must refuse with exit 1
 *     under red_first=strict, naming the missing fields.
 *  2. `scope done` closes a feature with an open test-*: test-* blocks a
 *     feature, so closing one with test-unit/integration/security/behavior
 *     pending must refuse with exit 1 under strict.
 *  3. `scripts/pre-commit-record.sh` lets a scope through as `done` (the
 *     status the CLI writes) without the three fields - the hook only looked
 *     at `completed` and only demanded verified.
 *
 * No verdict logic lives here: every verdict comes from the production code
 * (scripts/stelow and scripts/pre-commit-record.sh, run for real against
 * temporary git repos). Text assertions cover only refusals (the right reason
 * on stderr) plus exit codes and final state.
 * Structured red_proof per failure: {failed_command, exit_code,
 * output_excerpt} - the command that failed, its exit code and the stderr
 * excerpt.
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
const PRE_COMMIT_SRC = join(REPO_ROOT, "scripts", "pre-commit-record.sh");
const TRANSITIONS_SRC = join(
  REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md",
);

interface Workdir { dir: string; helper: string; }
const workdirs: string[] = [];

function makeWorkdir(): Workdir {
  const id = randomBytes(6).toString("hex");
  const dir = mkdtempSync(join(tmpdir(), `stelow-exec-redfirst-${process.pid}-${id}`));
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

const SPEC_SOLO = [
  "[SCOPE-1] Login",
  "[TYPE] feature",
  "Dependencies: none",
  "",
].join("\n");

const SPEC_WITH_TESTS = [
  "[SCOPE-1] Login",
  "[TYPE] feature",
  "Dependencies: none",
  "",
  "[SCOPE-2] Auth tests",
  "[TYPE] test-unit",
  "Dependencies: none",
  "",
].join("\n");

function seedScopes(
  wd: Workdir, name: string, spec: string, redFirst?: string,
): { wd: Workdir; statedir: string } {
  const extra = redFirst ? ["--red-first", redFirst] : [];
  const seed = run(wd, ["seed", "--name", name, "--intent", "feature", "--json", ...extra]);
  expect(seed.status).toBe(0);
  const statedir = (JSON.parse(seed.stdout) as { statedir: string }).statedir;
  mkdirSync(join(statedir, "plans"), { recursive: true });
  writeFileSync(join(statedir, "plans", "spec-tech_v1.md"), spec);
  expect(run(wd, ["sync-scopes"], { STELOW_STATEDIR: statedir }).status).toBe(0);
  return { wd, statedir };
}

function trackingOf(wd: Workdir): { workflows: Array<{ scopes: Array<Record<string, unknown>> }> } {
  return JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8"));
}

function setScope(wd: Workdir, id: string, fn: (s: Record<string, unknown>) => void): void {
  const t = trackingOf(wd);
  const scope = t.workflows[0].scopes.find((s) => s["id"] === id);
  expect(scope).toBeTruthy();
  fn(scope as Record<string, unknown>);
  writeFileSync(join(wd.dir, "stelow.json"), JSON.stringify(t, null, 2));
}

function statusOf(wd: Workdir, id: string): unknown {
  return trackingOf(wd).workflows[0].scopes.find((s) => s["id"] === id)?.["status"];
}

const FULL_RECORD = {
  verified: true,
  red_proof: { failed_command: "npm test -- auth", exit_code: 1 },
  freeze_sha: "abc123",
  baseline: { "npm test -- auth": 1 },
};

afterAll(() => {
  for (const d of workdirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

describe("scope done exige Record red-first (strict)", () => {
  it("recusa done com Record verificado mas sem red_proof/freeze_sha/baseline", () => {
    const { wd, statedir } = seedScopes(makeWorkdir(), "exec-red-missing", SPEC_SOLO);
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["scope", "start", "--scope", "scope-1"], env).status).toBe(0);
    setScope(wd, "scope-1", (s) => { s["record"] = { verified: true }; });
    // red_proof: {failed_command: "scope done --scope scope-1", exit_code: 1,
    //   output_excerpt: stderr nomeia red_proof + freeze_sha + baseline}
    const r = run(wd, ["scope", "done", "--scope", "scope-1"], env);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("red_proof");
    expect(r.stderr).toContain("freeze_sha");
    expect(r.stderr).toContain("baseline");
    expect(statusOf(wd, "scope-1")).toBe("in-progress");
  });

  it("recusa done sem Record algum em strict", () => {
    const { wd, statedir } = seedScopes(makeWorkdir(), "exec-red-norecord", SPEC_SOLO);
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["scope", "start", "--scope", "scope-1"], env).status).toBe(0);
    const r = run(wd, ["scope", "done", "--scope", "scope-1"], env);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("red_proof");
    expect(statusOf(wd, "scope-1")).toBe("in-progress");
  });

  it("aceita done com Record completo (verified + tres evidencias)", () => {
    const { wd, statedir } = seedScopes(makeWorkdir(), "exec-red-full", SPEC_SOLO);
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["scope", "start", "--scope", "scope-1"], env).status).toBe(0);
    setScope(wd, "scope-1", (s) => { s["record"] = { ...FULL_RECORD }; });
    const r = run(wd, ["scope", "done", "--scope", "scope-1"], env);
    expect(r.status).toBe(0);
    expect(statusOf(wd, "scope-1")).toBe("done");
  });
});

describe("test-* bloqueia feature no scope done (strict)", () => {
  it("recusa fechar feature com test-* aberto; libera apos fechar os testes", () => {
    const { wd, statedir } = seedScopes(makeWorkdir(), "exec-testgate", SPEC_WITH_TESTS);
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["scope", "start", "--scope", "scope-1"], env).status).toBe(0);
    expect(run(wd, ["scope", "start", "--scope", "scope-2"], env).status).toBe(0);
    setScope(wd, "scope-1", (s) => { s["record"] = { ...FULL_RECORD }; });
    // red_proof: {failed_command: "scope done --scope scope-1", exit_code: 1,
    //   output_excerpt: stderr nomeia o test scope aberto (scope-2)}
    const blocked = run(wd, ["scope", "done", "--scope", "scope-1"], env);
    expect(blocked.status).toBe(1);
    expect(blocked.stderr).toContain("scope-2");
    expect(statusOf(wd, "scope-1")).toBe("in-progress");
    setScope(wd, "scope-2", (s) => { s["record"] = { ...FULL_RECORD }; });
    expect(run(wd, ["scope", "done", "--scope", "scope-2"], env).status).toBe(0);
    expect(run(wd, ["scope", "done", "--scope", "scope-1"], env).status).toBe(0);
    expect(statusOf(wd, "scope-1")).toBe("done");
  });
});

describe("red_first advisory/off degradam para aviso", () => {
  it("advisory avisa e fecha sem os tres", () => {
    const { wd, statedir } = seedScopes(makeWorkdir(), "exec-advisory", SPEC_SOLO, "advisory");
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["scope", "start", "--scope", "scope-1"], env).status).toBe(0);
    setScope(wd, "scope-1", (s) => { s["record"] = { verified: true }; });
    expect(run(wd, ["scope", "done", "--scope", "scope-1"], env).status).toBe(0);
    expect(statusOf(wd, "scope-1")).toBe("done");
  });

  it("off fecha sem os tres", () => {
    const { wd, statedir } = seedScopes(makeWorkdir(), "exec-off", SPEC_SOLO, "off");
    const env = { STELOW_STATEDIR: statedir };
    expect(run(wd, ["scope", "start", "--scope", "scope-1"], env).status).toBe(0);
    expect(run(wd, ["scope", "done", "--scope", "scope-1"], env).status).toBe(0);
    expect(statusOf(wd, "scope-1")).toBe("done");
  });
});

describe("pre-commit-record bloqueia sem os tres", () => {
  function hook(cwd: string): { status: number; stdout: string; stderr: string } {
    const r = spawnSync("bash", [PRE_COMMIT_SRC], {
      cwd, encoding: "utf8",
      env: { ...process.env, PATH: process.env.PATH ?? "" },
    });
    return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
  }

  function fixture(record: unknown, status = "done"): string {
    const dir = mkdtempSync(join(tmpdir(), `stelow-precommit-${process.pid}-`));
    workdirs.push(dir);
    execSync("git init -q", { cwd: dir });
    writeFileSync(join(dir, "stelow.json"), JSON.stringify({
      workflows: [{ name: "w", status: "in-progress", scopes: [{ id: "scope-1", status, record }] }],
    }, null, 2));
    return dir;
  }

  it("bloqueia escopo done verificado mas sem red_proof/freeze_sha/baseline", () => {
    // red_proof: {failed_command: "pre-commit-record.sh", exit_code: 1,
    //   output_excerpt: "incomplete Records"}
    const r = hook(fixture({ verified: true }));
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain("Record");
  });

  it("libera escopo done com Record completo", () => {
    const r = hook(fixture({ ...FULL_RECORD }));
    expect(r.status).toBe(0);
  });
});
