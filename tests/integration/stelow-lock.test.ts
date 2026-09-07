/**
 * File-reservation locks: deterministic `stelow lock` subcommands that
 * replace the old LLM-run bash snippets (no jq, no GNU date).
 *
 * Covers: multi-file acquire, foreign-holder conflict (exit 1, names
 * holder), owner re-acquire, stale steal, release, check (text + JSON),
 * usage errors (exit 2), and a parallel race (exactly one winner).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { execFileSync, spawnSync, execSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const HELPER = join(__dirname, "..", "..", "scripts", "stelow");

function workdir(): { dir: string; statedir: string } {
  const dir = mkdtempSync(join(tmpdir(), `stelow-lock-${process.pid}-${randomBytes(4).toString("hex")}`));
  execSync("git init -q", { cwd: dir });
  execSync("git config user.email t@t", { cwd: dir });
  execSync("git config user.name t", { cwd: dir });
  const statedir = join(dir, ".stelow", "2026-09-07", "pw-test");
  return { dir, statedir };
}

function run(
  dir: string, statedir: string, args: string[], extraEnv: Record<string, string> = {},
): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(HELPER, args, {
      cwd: dir, env: { ...process.env, STELOW_STATEDIR: statedir, ...extraEnv }, encoding: "utf8",
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err: any) {
    return {
      status: typeof err.status === "number" ? err.status : 1,
      stdout: String(err.stdout ?? ""),
      stderr: String(err.stderr ?? ""),
    };
  }
}

function lockFile(statedir: string, name: string): string {
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  return join(statedir, "locks", createHash("sha1").update(name).digest("hex").slice(0, 12) + ".lock");
}

describe("stelow lock", () => {
  let dir: string;
  let statedir: string;

  beforeEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    ({ dir, statedir } = workdir());
  });

  it("acquires multiple files with one call", () => {
    const r = run(dir, statedir, ["lock", "acquire", "--scope", "scope-1", "--file", "a.ts", "--file", "b.ts"]);
    expect(r.status).toBe(0);
    expect(existsSync(lockFile(statedir, "a.ts"))).toBe(true);
    expect(existsSync(lockFile(statedir, "b.ts"))).toBe(true);
    const entry = JSON.parse(readFileSync(lockFile(statedir, "a.ts"), "utf8"));
    expect(entry).toMatchObject({ scope_id: "scope-1", file: "a.ts", ttl_seconds: 1800 });
  });

  it("refuses a live foreign lock with exit 1 and names the holder", () => {
    expect(run(dir, statedir, ["lock", "acquire", "--scope", "s1", "--file", "a.ts"]).status).toBe(0);
    const r = run(dir, statedir, ["lock", "acquire", "--scope", "s2", "--file", "a.ts"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/LOCK CONFLICT: a\.ts held by s1/);
  });

  it("owner re-acquire is idempotent", () => {
    expect(run(dir, statedir, ["lock", "acquire", "--scope", "s1", "--file", "a.ts"]).status).toBe(0);
    expect(run(dir, statedir, ["lock", "acquire", "--scope", "s1", "--file", "a.ts"]).status).toBe(0);
  });

  it("steals expired locks", () => {
    expect(run(dir, statedir, ["lock", "acquire", "--scope", "s1", "--file", "a.ts", "--ttl", "60"]).status).toBe(0);
    const path = lockFile(statedir, "a.ts");
    const entry = JSON.parse(readFileSync(path, "utf8"));
    entry.expires_at = "2000-01-01T00:00:00+00:00";
    writeFileSync(path, JSON.stringify(entry));
    const r = run(dir, statedir, ["lock", "acquire", "--scope", "s2", "--file", "a.ts"]);
    expect(r.status).toBe(0);
    expect(JSON.parse(readFileSync(path, "utf8")).scope_id).toBe("s2");
  });

  it("release frees, check reports foreign holds as JSON", () => {
    expect(run(dir, statedir, ["lock", "acquire", "--scope", "s1", "--file", "a.ts"]).status).toBe(0);
    const held = run(dir, statedir, ["lock", "check", "--scope", "s2", "--file", "a.ts", "--json"]);
    expect(held.status).toBe(0);
    expect(JSON.parse(held.stdout).locks).toHaveLength(1);
    expect(JSON.parse(held.stdout).locks[0]).toMatchObject({ file: "a.ts", held_by: "s1" });
    expect(run(dir, statedir, ["lock", "release", "--scope", "s1", "--file", "a.ts"]).status).toBe(0);
    expect(existsSync(lockFile(statedir, "a.ts"))).toBe(false);
    const free = run(dir, statedir, ["lock", "check", "--scope", "s2", "--json"]);
    expect(JSON.parse(free.stdout).locks).toEqual([]);
  });

  it("usage errors exit 2", () => {
    expect(run(dir, statedir, ["lock"]).status).toBe(2);
    expect(run(dir, statedir, ["lock", "acquire", "--scope", "s1"]).status).toBe(2);
    expect(run(dir, statedir, ["lock", "acquire", "--scope", "s1", "--file", "a.ts", "--ttl", "nope"]).status).toBe(2);
  });

  it("parallel race: exactly one acquirer wins", () => {
    const env = (s: string) => ({ ...process.env, STELOW_STATEDIR: statedir });
    const procs = ["r1", "r2", "r3", "r4"].map((s) =>
      spawnSync(HELPER, ["lock", "acquire", "--scope", s, "--file", "race.ts"], { cwd: dir, env: env(s) }),
    );
    const winners = procs.filter((p) => p.status === 0);
    expect(winners).toHaveLength(1);
    const holder = JSON.parse(readFileSync(lockFile(statedir, "race.ts"), "utf8")).scope_id;
    expect(["r1", "r2", "r3", "r4"]).toContain(holder);
  });
});
