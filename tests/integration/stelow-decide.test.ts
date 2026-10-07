// tests/integration/stelow-decide.test.ts
//
// Integration tests for `scripts/stelow decide`. Real subprocess, real
// filesystem, no mocks: record a selection, revive a rejected option
// (refused), name the challenge (recorded), supersede (chain), bump the
// Shape version (stale routes to reconfirmation, not challenge).
// The store file is the same `decision-receipts.json` the BB plugin reads
// and writes — a schema drift on either side fails here.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HELPER_SRC = join(REPO_ROOT, "scripts", "stelow");

let dir = "";
let statedir = "";
let helper = "";

function run(args: string[], env = {}): { code: number | null; stdout: string; stderr: string } {
  const proc = spawnSync(helper, args, {
    cwd: dir,
    env: { ...process.env, STELOW_STATEDIR: statedir, ...env },
    encoding: "utf8",
  });
  return { code: proc.status, stdout: proc.stdout ?? "", stderr: proc.stderr ?? "" };
}

function receipts(): any[] {
  return JSON.parse(readFileSync(join(statedir, "decision-receipts.json"), "utf8")).receipts;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), `stelow-decide-${process.pid}-`));
  statedir = join(dir, ".stelow", "w1");
  mkdirSync(statedir, { recursive: true });
  mkdirSync(join(dir, "scripts"), { recursive: true });
  helper = join(dir, "scripts", "stelow");
  writeFileSync(helper, readFileSync(HELPER_SRC));
  execFileSync("chmod", ["+x", helper]);
  writeFileSync(join(statedir, "state.md"), "---\nshape_version: v7\n---\n");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("stelow decide", () => {
  it("records a selection with winner, losers, scopes, and authorized versions", () => {
    const out = run(["decide", "--selected", "opt-5", "--rejected", "opt-3", "--scopes", "s1"]);
    expect(out.code).toBe(0);
    expect(out.stdout).toMatch(/Decision recorded: \S+ selects opt-5/);
    const [receipt] = receipts();
    expect(receipt.schemaVersion).toBe(1);
    expect(receipt.kind).toBe("selection");
    expect(receipt.selectedId).toBe("opt-5");
    expect(receipt.rejectedOptionIds).toEqual(["opt-3"]);
    expect(receipt.scopeIds).toEqual(["s1"]);
    expect(receipt.authorizesVersions).toEqual({ shape_version: "v7" });
    expect(receipt.approvedBy).toBe("operator");
  });

  it("refuses a rejected revival without --challenge, naming the exit", () => {
    expect(run(["decide", "--selected", "opt-5", "--rejected", "opt-3", "--scopes", "s1"]).code).toBe(0);
    const [first] = receipts();
    const out = run(["decide", "--selected", "opt-3", "--scopes", "s1"]);
    expect(out.code).toBe(1);
    expect(out.stderr).toMatch(new RegExp(`--challenge ${first.id}`));
    expect(receipts()).toHaveLength(1);
  });

  it("records with --challenge and supersedes the old receipt by id", () => {
    run(["decide", "--selected", "opt-5", "--rejected", "opt-3", "--scopes", "s1"]);
    const [first] = receipts();
    const out = run(["decide", "--selected", "opt-3", "--scopes", "s1", "--challenge", first.id, "--supersedes", first.id]);
    expect(out.code).toBe(0);
    const all = receipts();
    expect(all).toHaveLength(2);
    expect(all.find((r) => r.id === first.id).supersededBy).toBe(all.find((r) => r.id !== first.id).id);
  });

  it("treats a version-moved receipt as stale: no challenge required", () => {
    run(["decide", "--selected", "opt-5", "--rejected", "opt-3", "--scopes", "s1"]);
    writeFileSync(join(statedir, "state.md"), "---\nshape_version: v8\n---\n");
    const out = run(["decide", "--selected", "opt-3", "--scopes", "s1"]);
    expect(out.code).toBe(0);
  });

  it("fails usage without --selected and on a winner-also-rejected", () => {
    expect(run(["decide", "--scopes", "s1"]).code).toBe(2);
    expect(run(["decide", "--selected", "a", "--rejected", "a"]).code).toBe(2);
    expect(existsSync(join(statedir, "decision-receipts.json"))).toBe(false);
  });

  it("is listed in schema and --help", () => {
    const out = run(["schema", "decide"]);
    expect(out.code).toBe(0);
    const schema = JSON.parse(out.stdout);
    expect(schema.flags).toContain("--challenge");
    expect(run(["--help"]).stdout).toMatch(/decide --selected/);
  });
});
