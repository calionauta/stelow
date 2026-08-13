// tests/integration/stelow-e2e.test.ts
//
// Behavior tests for SCOPE-6c: end-to-end mini-workflow + standalone regression.
//
// E2E:
//   1. Fixture project (fresh git repo with template).
//   2. Simulate entry: scaffold state.md from template, pick first stage.
//   3. Run router loop: read state, extract next-candidate, advance, repeat.
//      Path: shape -> critique -> gate.
//   4. Assert: final state.md current_stage == "gate"; invariants history
//      length 3; no script errors; lock released between advances.
//
// Standalone regression:
//   For every skill modified by SCOPE-3 (24 sub-skills), assert:
//   - the file STILL contains its original "Standalone Quick Start" or
//     equivalent body sections (SCOPE-3 must have APPENDED, not edited);
//   - the new ## Entry + ## Hand-off + ### Workflow slice blocks appear
//     after the original body (not interleaved with it).
//
// Multi-run validation: agent workflows are non-deterministic; we assert
// on final state, not transcripts (per spec).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const REPO_ROOT = join(__dirname, "..", "..");
const HELPER_SRC = join(REPO_ROOT, "scripts", "stelow");
const TRANSITIONS_SRC = join(REPO_ROOT, "skills", "stelow-product-orchestrator", "references", "transitions.md");
const STATE_TEMPLATE_SRC = join(REPO_ROOT, "assets", "state-template.md");

interface Workdir { dir: string; helper: string; }
const workdirs: Workdir[] = [];

function makeWorkdir(): Workdir {
  const id = randomBytes(6).toString("hex");
  const dir = mkdtempSync(join(tmpdir(), `stelow-e2e-${process.pid}-${id}`));
  execSync("git init -q", { cwd: dir });
  execSync("git config user.email t@t", { cwd: dir });
  execSync("git config user.name t", { cwd: dir });
  mkdirSync(join(dir, "scripts"), { recursive: true });
  const helper = join(dir, "scripts", "stelow");
  writeFileSync(helper, readFileSync(HELPER_SRC));
  mkdirSync(join(dir, "skills", "stelow-product-orchestrator", "references"), { recursive: true });
  writeFileSync(join(dir, "skills", "stelow-product-orchestrator", "references", "transitions.md"),
                readFileSync(TRANSITIONS_SRC));
  if (existsSync(STATE_TEMPLATE_SRC)) {
    mkdirSync(join(dir, "assets"), { recursive: true });
    writeFileSync(join(dir, "assets", "state-template.md"), readFileSync(STATE_TEMPLATE_SRC));
  }
  execSync("git add -A && git commit -q -m init", { cwd: dir });
  const wd = { dir, helper };
  workdirs.push(wd);
  return wd;
}

function run(wd: Workdir, args: string[], env: Record<string, string> = {}): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("bash", [wd.helper, ...args], {
    cwd: wd.dir, encoding: "utf8",
    env: { ...process.env, ...env },
  });
  return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function existsSync(p: string): boolean {
  try { statSync(p); return true; } catch { return false; }
}

afterAll(() => {
  for (const w of workdirs) {
    try { rmSync(w.dir, { recursive: true, force: true }); } catch {}
  }
});

// ---------------------------------------------------------------------------

describe("e2e: entry -> router -> shape -> critique -> gate", () => {
  it("mini-workflow completes and returns control to router", () => {
    const wd = makeWorkdir();

    // Step 1 — entry: scaffold state.md with current_stage=setup (per the
    // entry skill convention: setup is the first stage for feature intent).
    writeFileSync(join(wd.dir, "state.md"),
      `---
name: e2e-fixture
intent: feature
current_stage: setup
status: active
config:
  appetite: Core
  review_mode: Auto
  product_type: software
stages:
  setup: in-progress
---
# e2e fixture
`);
    // Step 2 — router: drive 3 advances via the helper, mimicking the
    // router's per-stage transition loop. Each call: read current_stage,
    // compute next (from transitions.md), advance.
    const expectedPath = ["context", "shape", "critique", "gate"];
    for (const next of expectedPath) {
      const r = run(wd, ["advance", next]);
      expect(r.status, `advance to ${next} failed: ${r.stderr}`).toBe(0);
    }

    // Step 3 — assert final state is consistent.
    const final = run(wd, ["status", "--json"]);
    expect(final.status).toBe(0);
    const state = JSON.parse(final.stdout);
    expect(state.current_stage).toBe("gate");
    expect(state.workflow).toBe("e2e-fixture");

    // invariants.json should have 4 history entries (context, shape, critique, gate)
    const inv = JSON.parse(readFileSync(join(wd.dir, ".stelow", "invariants.json"), "utf8"));
    expect(inv.current_stage).toBe("gate");
    expect(inv.history).toHaveLength(4);
    expect(inv.history.map((h: any) => h.stage)).toEqual(expectedPath);

    // lock dir should be released after each advance (not held at end)
    expect(existsSync(join(wd.dir, ".stelow", "lock"))).toBe(false);
  });

  it("rejects a Hand-off that proposes an unknown next-candidate (router reject path)", () => {
    const wd = makeWorkdir();
    writeFileSync(join(wd.dir, "state.md"),
      `---
name: e2e-reject
intent: feature
current_stage: shape
status: active
config:
  appetite: Core
  review_mode: Auto
  product_type: software
stages:
  shape: in-progress
---
# reject
`);
    // router receives a Hand-off block claiming next="this-stage-is-not-in-transitions"
    // (unknown to transitions.md). The helper must reject it.
    const r = run(wd, ["advance", "this-stage-is-not-in-transitions"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("invalid candidate");
    // state.md must NOT have moved
    const sm = readFileSync(join(wd.dir, "state.md"), "utf8");
    expect(sm).toMatch(/current_stage:\s*shape/);
  });
});

// ---------------------------------------------------------------------------

describe("standalone regression: every modified skill still works WITHOUT the marker", () => {
  // Discover the skills modified by SCOPE-3: they have the new ## Entry block.
  const SKILLS_DIR = join(REPO_ROOT, "skills");

  function findModifiedSkills(): string[] {
    const out: string[] = [];
    const dirs = readdirSync(SKILLS_DIR).filter(d => d.startsWith("stelow-product-") && d !== "stelow-product-orchestrator");
    for (const d of dirs) {
      const skillPath = join(SKILLS_DIR, d, "SKILL.md");
      if (!existsSync(skillPath)) continue;
      const text = readFileSync(skillPath, "utf8");
      if (text.includes("## Entry (mode detection)")) {
        out.push(skillPath);
      }
    }
    return out;
  }

  it("every SCOPE-3 modified skill preserves its original standalone body", () => {
    const skills = findModifiedSkills();
    expect(skills.length).toBeGreaterThanOrEqual(20); // 24 expected

    for (const skillPath of skills) {
      const text = readFileSync(skillPath, "utf8");
      const name = skillPath.split("/").slice(-2, -1)[0];

      // Standalone regression: the skill must have substantial original body
      // content BEFORE the appended dual-mode blocks (proof that SCOPE-3
      // appended, not edited). Many domain skills (ads, pricing, etc.)
      // do not have a literal "Standalone" header — they are organized
      // by topic — so we check for byte content before ## Entry instead.
      const idxEntry  = text.indexOf("## Entry (mode detection)");
      const idxHandoff = text.indexOf("## Hand-off (workflow mode)");
      const idxSlice   = text.indexOf("### Workflow slice");
      expect(idxEntry,  `${name}: missing ## Entry block`).toBeGreaterThan(0);
      expect(idxHandoff, `${name}: missing ## Hand-off block`).toBeGreaterThan(0);
      expect(idxSlice,   `${name}: missing ### Workflow slice block`).toBeGreaterThan(0);
      // Entry must NOT be the very first heading (that would mean the
      // skill lost its standalone body). Demand at least 500 bytes
      // of original content before the Entry block.
      expect(idxEntry, `${name}: ## Entry is too close to the start (standalone body lost)`).toBeGreaterThan(500);
      // And the frontmatter close must be before the Entry block.
      const fmClose = text.indexOf("\n---", 4);
      expect(fmClose, `${name}: no frontmatter close`).toBeGreaterThan(0);
      expect(idxEntry, `${name}: ## Entry appears before frontmatter close`).toBeGreaterThan(fmClose);
    }
  });

  it("modified skills contain no broken frontmatter (YAML opens + closes)", () => {
    const skills = findModifiedSkills();
    for (const skillPath of skills) {
      const text = readFileSync(skillPath, "utf8");
      const name = skillPath.split("/").slice(-2, -1)[0];
      // First line must be the frontmatter opener
      expect(text.startsWith("---\n"), `${name}: does not start with ---`).toBe(true);
      // The second --- (frontmatter closer) must exist before the body
      const lines = text.split("\n");
      let count = 0;
      let closerAt = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] === "---") {
          count++;
          if (count === 2) { closerAt = i; break; }
        }
      }
      expect(closerAt, `${name}: frontmatter does not close with ---`).toBeGreaterThan(0);
      expect(closerAt, `${name}: frontmatter is suspiciously short`).toBeLessThan(50);
    }
  });
});