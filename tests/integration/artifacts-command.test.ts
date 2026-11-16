/**
 * `stelow artifacts add` — the manifest's one writer.
 *
 * The manifest had TWO writers: the helper wrote it in the state
 * front-matter, and a host prompt told the worker to append a block of its
 * own. Two formats, and the worker's append landed as a SECOND
 * `artifacts:` key — a duplicate key in YAML. The command makes the helper
 * the only writer: the host calls it, the shape is the helper's, and the
 * worker never edits YAML.
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

afterAll(() => {
  for (const dir of dirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
});

function makeWorkspace(): { dir: string; stateDir: string } {
  const dir = mkdtempSync(join(tmpdir(), "stelow-artifacts-"));
  dirs.push(dir);
  execSync("git init -q", { cwd: dir });
  const stateDir = join(dir, ".stelow", "2026-01-01", "sw-x");
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(
    join(stateDir, "state.md"),
    [
      "---",
      "name: t",
      "intent: research",
      "current_stage: research",
      "status: active",
      "config:",
      "  quality: production",
      "  exploration_count: 3",
      "  review_mode: Auto",
      "  product_type: software",
      "stages:",
      "  research: in-progress",
      "artifacts: []",
      "history: []",
      "---",
      "# t",
      "",
    ].join("\n"),
  );
  return { dir, stateDir };
}

function add(workspace: { dir: string; stateDir: string }, args: string[]) {
  return spawnSync("bash", [HELPER, "artifacts", "add", ...args], {
    cwd: workspace.dir,
    encoding: "utf8",
    env: { ...process.env, PATH: process.env.PATH ?? "", STELOW_STATEDIR: workspace.stateDir, STELOW_TRANSITIONS: TRANSITIONS },
  });
}

function manifest(workspace: { dir: string; stateDir: string }): string {
  const blob = readFileSync(join(workspace.stateDir, "state.md"), "utf8");
  return blob.split(/^artifacts:$/m)[1]?.split(/^\S/m)[0] ?? "";
}

describe("stelow artifacts add", () => {
  it("registers the artifact in the canonical shape", () => {
    const workspace = makeWorkspace();
    const file = join(workspace.stateDir, "research-index.md");
    writeFileSync(file, "# research\n");
    const r = add(workspace, ["--stage", "research", "--path", file, "--label", "Research index"]);
    expect(r.status, r.stderr).toBe(0);
    const block = manifest(workspace);
    expect(block).toMatch(/^\s*- stage: research$/m);
    expect(block).toMatch(/^\s*kind: document$/m);
    expect(block).toMatch(/^\s*label: Research index$/m);
    expect(block).toMatch(/^\s*path: .*research-index\.md$/m);
    expect(block).toMatch(/^\s*generated_at: \d{4}-\d{2}-\d{2}T/m);
  });

  it("the label defaults to the file name", () => {
    const workspace = makeWorkspace();
    const file = join(workspace.stateDir, "round-1.md");
    writeFileSync(file, "# round\n");
    expect(add(workspace, ["--stage", "research", "--path", file]).status).toBe(0);
    expect(manifest(workspace)).toMatch(/^\s*label: round-1\.md$/m);
  });

  it("registering the same path twice keeps ONE entry", () => {
    const workspace = makeWorkspace();
    const file = join(workspace.stateDir, "research-index.md");
    writeFileSync(file, "# research\n");
    expect(add(workspace, ["--stage", "research", "--path", file]).status).toBe(0);
    expect(add(workspace, ["--stage", "research", "--path", file]).status).toBe(0);
    const entries = manifest(workspace).match(/^\s*- stage:/gm) ?? [];
    expect(entries.length).toBe(1);
  });

  it("refuses a path that does not exist", () => {
    const workspace = makeWorkspace();
    const r = add(workspace, ["--stage", "research", "--path", join(workspace.stateDir, "nope.md")]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("no such file");
  });

  it("refuses a path outside the workspace", () => {
    const workspace = makeWorkspace();
    const outside = mkdtempSync(join(tmpdir(), "stelow-outside-"));
    dirs.push(outside);
    const file = join(outside, "elsewhere.md");
    writeFileSync(file, "# elsewhere\n");
    const r = add(workspace, ["--stage", "research", "--path", file]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("outside the workspace");
  });

  it("refuses a missing stage or path", () => {
    const workspace = makeWorkspace();
    expect(add(workspace, ["--path", "x.md"]).status).not.toBe(0);
    expect(add(workspace, ["--stage", "research"]).status).not.toBe(0);
  });

  it("the file carries exactly one artifacts key afterwards", () => {
    const workspace = makeWorkspace();
    const file = join(workspace.stateDir, "research-index.md");
    writeFileSync(file, "# research\n");
    add(workspace, ["--stage", "research", "--path", file]);
    const blob = readFileSync(join(workspace.stateDir, "state.md"), "utf8");
    expect((blob.match(/^artifacts:$/gm) ?? []).length).toBe(1);
  });
});
