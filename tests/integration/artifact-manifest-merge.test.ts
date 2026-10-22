/**
 * The `artifacts:` manifest must have ONE writer's shape.
 *
 * The helper writes the manifest in the state front-matter. A host prompt
 * also tells the worker to append a block of its own — the research and
 * explore tracks have no `stelow advance` to write it for them. Two
 * writers, two shapes, and the append landed AFTER the front-matter: a
 * second `artifacts:` key, which is a duplicate key in YAML.
 *
 * The helper read only the front-matter, so it never saw the worker's
 * entry. The next advance rewrote the front-matter from the helper's own
 * list, and the worker's artifact was silently dropped — the card lost it
 * with no error anywhere.
 *
 * These tests pin the merge: every block, wherever it is, becomes one
 * canonical list; and the file carries exactly one `artifacts:` key
 * afterwards.
 */
import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HELPER = join(REPO_ROOT, "scripts", "stelow");
const TRANSITIONS = join(REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md");

const dirs: string[] = [];

function gitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "stelow-manifest-"));
  execSync("git init -q", { cwd: dir });
  dirs.push(dir);
  return dir;
}

function stateWith(body: string, statedir: string): string {
  const path = join(statedir, "state.md");
  writeFileSync(
    path,
    [
      "---",
      "name: t",
      "intent: feature",
      "current_stage: shape",
      "status: active",
      "config:",
      "  quality: production",
      "  exploration_count: 3",
      "  review_mode: Auto",
      "  product_type: software",
      "stages:",
      "  shape: in-progress",
      "artifacts: []",
      "history: []",
      "---",
      "# t",
      body,
      "",
    ].join("\n"),
  );
  return path;
}

function run(dir: string, statedir: string, args: string[]) {
  return spawnSync("bash", [HELPER, ...args], {
    cwd: dir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: process.env.PATH ?? "",
      STELOW_STATEDIR: statedir,
      STELOW_TRANSITIONS: TRANSITIONS,
    },
  });
}

afterAll(() => {
  for (const dir of dirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
});

describe("the artifacts manifest has one writer's shape", () => {
  it("a block appended after the front-matter survives the next advance", () => {
    // The worker's own entry. The helper must fold it into the manifest it
    // writes back, or the artifact disappears from the card with no error.
    const dir = gitRepo();
    const statedir = join(dir, ".stelow", "2026-01-01", "sw-test");
    mkdirSync(join(statedir, "plans"), { recursive: true });
    writeFileSync(join(statedir, "plans", "spec-product_v1.md"), "# spec\n");
    writeFileSync(join(statedir, "research-index.md"), "# research\n");
    const path = stateWith(
      [
        "",
        "artifacts:",
        "  - stage: research",
        "    kind: document",
        "    path: .stelow/2026-01-01/sw-test/research-index.md",
        "    label: Research index",
      ].join("\n"),
      statedir,
    );
    const r = run(dir, statedir, ["advance", "critique"]);
    expect(r.status, r.stderr).toBe(0);
    const after = readFileSync(path, "utf8");
    expect(after).toContain("research-index.md");
    // And it is inside the manifest, not a stray block in the body.
    const front = after.split("\n---")[0];
    expect(front).toMatch(/artifacts:\n(?:.*\n)*?\s+- stage: research/);
  });

  it("the file carries exactly one artifacts key after the advance", () => {
    // A second `artifacts:` key in the front-matter is a DUPLICATE KEY in
    // YAML: a parser may take the first, the last, or refuse the file.
    const dir = gitRepo();
    const statedir = join(dir, ".stelow", "2026-01-01", "sw-test");
    mkdirSync(join(statedir, "plans"), { recursive: true });
    writeFileSync(join(statedir, "plans", "spec-product_v1.md"), "# spec\n");
    const path = join(statedir, "state.md");
    writeFileSync(
      path,
      [
        "---",
        "name: t",
        "intent: feature",
        "current_stage: shape",
        "status: active",
        "config:",
        "  quality: production",
        "  exploration_count: 3",
        "  review_mode: Auto",
        "  product_type: software",
        "stages:",
        "  shape: in-progress",
        "artifacts: []",
        "history: []",
        "artifacts:",
        "  - stage: research",
        "    kind: document",
        "    path: research-index.md",
        "    label: Research index",
        "---",
        "# t",
        "",
      ].join("\n"),
    );
    const r = run(dir, statedir, ["advance", "critique"]);
    expect(r.status, r.stderr).toBe(0);
    const after = readFileSync(path, "utf8");
    const keys = after.match(/^artifacts:/gm) ?? [];
    expect(keys.length, `the file must carry one artifacts key, found ${keys.length}`).toBe(1);
    expect(after).toContain("research-index.md");
  });

  it("an artifact the helper already registered is not registered twice", () => {
    const dir = gitRepo();
    const statedir = join(dir, ".stelow", "2026-01-01", "sw-test");
    mkdirSync(join(statedir, "plans"), { recursive: true });
    writeFileSync(join(statedir, "plans", "spec-product_v1.md"), "# spec\n");
    const path = stateWith(
      [
        "",
        "artifacts:",
        "  - stage: shape",
        "    kind: document",
        "    path: .stelow/2026-01-01/sw-test/plans/spec-product_v1.md",
        "    label: spec product v1",
      ].join("\n"),
      statedir,
    );
    const r = run(dir, statedir, ["advance", "critique"]);
    expect(r.status, r.stderr).toBe(0);
    const after = readFileSync(path, "utf8");
    const occurrences = after.split("spec-product_v1.md").length - 1;
    expect(occurrences, "the same path must be registered once").toBe(1);
  });
});
