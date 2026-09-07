/**
 * Host-lifecycle e2e: drives `scripts/stelow` exactly as a host
 * (bb-plugin, or any harness shelling out) would.
 *
 * Covers the subcommands the narrower e2e (`stelow-e2e.test.ts`,
 * shape→critique→gate only) does not: seed, full stage walk with gate
 * receipts, status/doctor --json shapes, fail-closed bogus advance,
 * --dry-run purity, ask waiting/usage paths, and schema introspection.
 *
 * Runs the real helper in a fixture git repo. Fast (<30s): no model calls.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync, execSync } from "node:child_process";
import {
  mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..", "..");
const HELPER_SRC = join(REPO_ROOT, "scripts", "stelow");
const TRANSITIONS_SRC = join(
  REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md",
);

interface Ctx {
  dir: string;
  helper: string;
  statedir: string;
  dirHash: string;
  statePath: string;
}

function run(
  helper: string, args: string[], cwd: string, env: Record<string, string> = {},
): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(helper, args, {
      cwd, env: { ...process.env, ...env }, encoding: "utf8", timeout: 30000,
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

let ctx: Ctx;

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), "stelow-host-e2e-"));
  execSync("git init -q", { cwd: dir });
  execSync("git config user.email t@t", { cwd: dir });
  execSync("git config user.name t", { cwd: dir });
  mkdirSync(join(dir, "skills", "stelow-workflow-orchestrator", "references"), { recursive: true });
  const helper = join(dir, "stelow");
  writeFileSync(helper, readFileSync(HELPER_SRC), { mode: 0o755 });
  writeFileSync(
    join(dir, "skills", "stelow-workflow-orchestrator", "references", "transitions.md"),
    readFileSync(TRANSITIONS_SRC),
  );
  const seed = run(helper, ["seed", "--name", "e2e-host", "--intent", "feature", "--json"], dir);
  expect(seed.status).toBe(0);
  const parsed = JSON.parse(seed.stdout);
  ctx = {
    dir, helper,
    statedir: parsed.statedir,
    dirHash: parsed.dirHash,
    statePath: parsed.state,
  };
  expect(existsSync(ctx.statePath)).toBe(true);
  expect(JSON.parse(readFileSync(join(dir, "stelow.json"), "utf8")).workflows.length).toBe(1);
});

afterAll(() => {
  rmSync(ctx.dir, { recursive: true, force: true });
});

function env(extra: Record<string, string> = {}): Record<string, string> {
  return { STELOW_STATEDIR: ctx.statedir, ...extra };
}

function currentStage(): string {
  const blob = readFileSync(ctx.statePath, "utf8");
  return blob.match(/^current_stage:\s*(\S+)/m)?.[1] ?? "";
}

function writeReceipt(name: string): void {
  // Approval receipts live under <root>/.stelow/approvals/{dirHash}/;
  // statedir is <root>/.stelow/<date>/<dirHash>.
  const dir = join(ctx.statedir, "..", "..", "approvals", ctx.dirHash);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), `# approved\n`);
}

describe("host lifecycle e2e", () => {
  it("seeds at setup for feature intent", () => {
    expect(currentStage()).toBe("setup");
  });

  it("walks setup → audit, honoring gate receipts", () => {
    const chain: Array<{ stage: string; receipt?: string }> = [
      { stage: "context" },
      { stage: "shape" },
      { stage: "critique" },
      { stage: "gate", receipt: "gate-approved.md" },
      { stage: "scope" },
      { stage: "interface" },
      { stage: "int-gate", receipt: "int-gate-approved.md" },
      { stage: "selection" },
      { stage: "planning" },
      // plan-gate is skipped in Auto review mode: refused, advance direct.
      { stage: "execution" },
      { stage: "verification" },
      // diff-gate is skipped in Auto review mode: advance direct to audit.
      { stage: "audit" },
    ];
    for (const { stage, receipt } of chain) {
      if (receipt) writeReceipt(receipt);
      const r = run(ctx.helper, ["advance", stage], ctx.dir, env());
      expect(r.status, `advance ${stage}: ${r.stderr}`).toBe(0);
      expect(currentStage()).toBe(stage);
    }
  });

  it("refuses plan-gate in Auto mode without mutating", () => {
    // Fresh workflow to revisit planning in Auto mode.
    const seed = run(ctx.helper, ["seed", "--name", "e2e-gate", "--intent", "feature", "--json"], ctx.dir);
    expect(seed.status).toBe(0);
    const other = JSON.parse(seed.stdout).statedir as string;
    const e2 = { STELOW_STATEDIR: other };
    for (const s of ["context", "shape", "critique", "gate", "scope", "interface", "int-gate", "selection", "planning"]) {
      const r = run(ctx.helper, ["advance", s], ctx.dir, e2);
      expect(r.status, `advance ${s}`).toBe(0);
    }
    const before = readFileSync(JSON.parse(seed.stdout).state, "utf8");
    const refused = run(ctx.helper, ["advance", "plan-gate"], ctx.dir, e2);
    expect(refused.status).not.toBe(0);
    expect(readFileSync(JSON.parse(seed.stdout).state, "utf8")).toBe(before);
  });

  it("sync-scopes populates wf.scopes[] the way a host would at execution setup", () => {
    const seed = run(ctx.helper, ["seed", "--name", "e2e-sync", "--intent", "feature", "--json"], ctx.dir);
    expect(seed.status).toBe(0);
    const parsed = JSON.parse(seed.stdout);
    const e2 = { STELOW_STATEDIR: parsed.statedir as string };
    mkdirSync(join(parsed.statedir as string, "plans"), { recursive: true });
    writeFileSync(
      join(parsed.statedir as string, "plans", "spec-tech_v1.md"),
      "[SCOPE-1] Login\n[TYPE] feature\nObjective: login\nDependencies: None\nDoD: works\n",
    );
    const sync = run(ctx.helper, ["sync-scopes", "--json"], ctx.dir, e2);
    expect(sync.status).toBe(0);
    expect(JSON.parse(sync.stdout).synced).toBe(1);
    const tracking = JSON.parse(readFileSync(join(ctx.dir, "stelow.json"), "utf8"));
    const wf = tracking.workflows.find((w: any) => w.name === "e2e-sync");
    expect(wf.scopes.map((s: any) => s.id)).toEqual(["scope-1"]);
    // Tracking stays valid for subsequent advances.
    expect(run(ctx.helper, ["advance", "context"], ctx.dir, e2).status).toBe(0);
  });

  it("status --json exposes the workflow contract shape", () => {
    const r = run(ctx.helper, ["status", "--json"], ctx.dir, env());
    expect(r.status).toBe(0);
    const body = JSON.parse(r.stdout);
    for (const key of ["workflow", "intent", "current_stage", "status", "config"]) {
      expect(body, `status key ${key}`).toHaveProperty(key);
    }
    expect(body.current_stage).toBe("audit");
  });

  it("doctor --json reports ok on a healthy tree", () => {
    const r = run(ctx.helper, ["doctor", "--json"], ctx.dir, env());
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).ok).toBe(true);
  });

  it("bogus advance fails closed (non-zero, byte-identical state)", () => {
    const before = readFileSync(ctx.statePath, "utf8");
    const r = run(ctx.helper, ["advance", "no-such-stage"], ctx.dir, env());
    expect(r.status).not.toBe(0);
    expect(readFileSync(ctx.statePath, "utf8")).toBe(before);
  });

  it("advance --dry-run validates without mutating", () => {
    const seed = run(ctx.helper, ["seed", "--name", "e2e-dry", "--intent", "feature", "--json"], ctx.dir);
    expect(seed.status).toBe(0);
    const parsed = JSON.parse(seed.stdout);
    const e2 = { STELOW_STATEDIR: parsed.statedir as string };
    const state = parsed.state as string;
    const r = run(ctx.helper, ["advance", "context", "--dry-run"], ctx.dir, e2);
    expect(r.status).toBe(0);
    expect(readFileSync(state, "utf8")).toMatch(/^current_stage:\s*setup/m);
  });

  it("ask without identity is a usage error (exit 2, no hang)", () => {
    const r = run(ctx.helper, ["ask", "--question", "Q?", "--option", "A", "--option", "B"], ctx.dir, env());
    expect(r.status).toBe(2);
  });

  it("ask with identity waits fast and persists pending.json", () => {
    const r = run(
      ctx.helper, ["ask", "--question", "Q?", "--option", "A", "--option", "B"],
      ctx.dir, env({ STELOW_THREAD_ID: "e2e-t1", STELOW_ASK_TIMEOUT_MS: "800" }),
    );
    expect(r.status).toBe(1);
    expect(existsSync(join(ctx.statedir, "ask", "pending.json"))).toBe(true);
  });

  it("schema documents every host-facing subcommand", () => {
    const r = run(ctx.helper, ["schema"], ctx.dir, env());
    expect(r.status).toBe(0);
    const body = JSON.parse(r.stdout);
    for (const cmd of ["status", "advance", "doctor", "seed", "ask"]) {
      expect(body, `schema documents ${cmd}`).toHaveProperty(cmd);
    }
  });
});
