import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { findProjectWorkflowRoot } from "../../extensions/stelow/workflow-root";

/**
 * Tests for findProjectWorkflowRoot.
 *
 * The function used to climb up to any parent that had .stelow/ or stelow.json.
 * The bug: a sibling project (no git relationship) under a shared parent
 * got falsely attributed to the parent's workflow state. Fix: only climb
 * up when the parent is the git toplevel of the cwd.
 *
 * We create a temp directory per test and run `git init` to control whether
 * a cwd is inside a git repo.
 */
function gitInit(dir: string): void {
  execSync("git init -q", { cwd: dir, stdio: "ignore" });
  // Need a commit so rev-parse works (some git versions require it).
  execSync("git config user.email test@test && git config user.name test && git commit --allow-empty -m init -q", {
    cwd: dir,
    stdio: "ignore",
  });
}

function touchTracking(projectDir: string): void {
  mkdirSync(join(projectDir, ".stelow"), { recursive: true });
  writeFileSync(join(projectDir, ".stelow", "marker"), "");
}

describe("findProjectWorkflowRoot", () => {
  let tmp: string;
  beforeEach(() => {
    // realpathSync to normalize macOS /var → /private/var symlink target.
    tmp = realpathSync(mkdtempSync(join(tmpdir(), "stelow-wfr-")));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns cwd when cwd has its own tracking", () => {
    const proj = join(tmp, "project");
    mkdirSync(proj);
    touchTracking(proj);

    expect(findProjectWorkflowRoot(proj)).toBe(proj);
  });

  it("returns cwd when cwd has no tracking and no git repo", () => {
    const lonely = join(tmp, "lonely");
    mkdirSync(lonely);

    expect(findProjectWorkflowRoot(lonely)).toBe(lonely);
  });

  it("returns git-root when cwd is a subdir of a git repo with tracking at root", () => {
    // Simulates "user is in src/ of a git repo, tracking lives at repo root".
    const repo = join(tmp, "repo");
    mkdirSync(repo);
    gitInit(repo);
    touchTracking(repo);
    const subdir = join(repo, "src", "lib");
    mkdirSync(subdir, { recursive: true });

    expect(findProjectWorkflowRoot(subdir)).toBe(repo);
  });

  it("REGRESSION: returns cwd (NOT parent) for sibling project under shared parent", () => {
    // This is the bug the user reported.
    // /Users/cali/Development/STELOW-PROJECT has .stelow/ with an active wf.
    // /Users/cali/Development/OTHER-PROJECT is a separate project (not a git
    // subdir of STELOW-PROJECT) and has no .stelow/. When the user runs
    // /sw-start from OTHER-PROJECT, the resolver used to climb up to
    // /Users/cali/Development and falsely report an active workflow.
    const shared = join(tmp, "Development");
    mkdirSync(shared);

    const stelowProject = join(shared, "stelow-project");
    mkdirSync(stelowProject);
    gitInit(stelowProject);
    touchTracking(stelowProject);

    const otherProject = join(shared, "other-project");
    mkdirSync(otherProject);
    // No git init — other-project is NOT inside stelow-project's git repo.

    expect(findProjectWorkflowRoot(otherProject)).toBe(otherProject);
  });

  it("returns cwd when cwd has no tracking AND parent has no tracking either", () => {
    const orphan = join(tmp, "orphan", "deep", "nested");
    mkdirSync(orphan, { recursive: true });

    expect(findProjectWorkflowRoot(orphan)).toBe(orphan);
  });

  it("handles cwd with leading tilde — resolved to absolute", () => {
    // resolve() expands ~ on POSIX.
    const home = process.env.HOME ?? tmp;
    const result = findProjectWorkflowRoot("~/does-not-exist-stelow-test");
    // We just verify it returns an absolute path (does NOT throw on ~).
    expect(result.startsWith("/") || /^[A-Z]:/.test(result)).toBe(true);
    expect(result.startsWith(home)).toBe(true);
  });

  it("returns cwd when cwd is exactly the git toplevel and has no tracking yet", () => {
    const repo = join(tmp, "fresh-repo");
    mkdirSync(repo);
    gitInit(repo);
    // No .stelow/, no stelow.json — fresh project.

    expect(findProjectWorkflowRoot(repo)).toBe(repo);
  });

  it("git subdir with no tracking returns cwd (new project at subdir)", () => {
    const repo = join(tmp, "repo");
    mkdirSync(repo);
    gitInit(repo);
    // Tracking lives at repo root.
    touchTracking(repo);
    const subdir = join(repo, "never-created-this");
    mkdirSync(subdir);

    // subdir has no tracking → since parent (git root) has tracking, climb up.
    expect(findProjectWorkflowRoot(subdir)).toBe(repo);
  });

  it("git subdir with tracking deeper (not at root) returns subdir", () => {
    // If a subdir has its own .stelow, it's a project on its own
    // (even if parent is a git repo).
    const repo = join(tmp, "monorepo");
    mkdirSync(repo);
    gitInit(repo);
    const subProject = join(repo, "packages", "api");
    mkdirSync(subProject, { recursive: true });
    touchTracking(subProject);

    expect(findProjectWorkflowRoot(subProject)).toBe(subProject);
  });

  it("does NOT return non-git-toplevel parent that happens to have tracking", () => {
    // Regression: the OLD code climbed up any parent that had tracking.
    // Even if the parent is not a git ancestor.
    const temp = realpathSync(mkdtempSync(join(tmpdir(), "stelow-wfr2-")));
    try {
      const fakeParent = join(temp, "parent");
      mkdirSync(fakeParent);
      touchTracking(fakeParent);

      const fakeChild = join(temp, "parent", "child");
      mkdirSync(fakeChild);
      // No git init — child is not inside a git repo at all.

      // child has no tracking, parent has tracking but is not git ancestor.
      // Result: child is its own project.
      expect(findProjectWorkflowRoot(fakeChild)).toBe(fakeChild);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});