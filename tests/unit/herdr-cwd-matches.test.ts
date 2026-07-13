import { describe, test, expect } from "vitest";

/**
 * Mirror the Rust `cwd_matches` function from
 * integrations/herdr/stelow/src/main.rs.
 *
 * IMPORTANT: this test exists because of the bug where the herdr plugin
 * returned false for `cwd_matches("", project)`, hiding workflows whose
 * `cwd` field was never written by the extension. The fix was to mirror
 * muxy's `isWorkflowCwdCompatible` exactly — no early return on empty.
 *
 * If you change one of these functions, change the other.
 */

function normalizePath(p: string): string {
  return (p ?? "").replace(/\/+/g, "/").replace(/\/$/, "");
}

function cwdMatches(workflowCwd: string, projectPath: string): boolean {
  const w = normalizePath(workflowCwd);
  const p = normalizePath(projectPath);
  return (
    w === p ||
    w.startsWith(`${p}/`) ||
    p.startsWith(`${w}/`)
  );
}

describe("herdr plugin cwd_matches (mirrors Rust implementation)", () => {
  const PROJECT = "/Users/cali/Development/poc-game-jogo-velha";

  test("empty workflow cwd is compatible with any project (regression test)", () => {
    // This is the bug we hit: extension writes workflows with cwd=""
    // because it doesn't track cwd in stelow.json. Plugin must accept
    // these workflows as belonging to the project.
    expect(cwdMatches("", PROJECT)).toBe(true);
  });

  test("exact match is compatible", () => {
    expect(cwdMatches(PROJECT, PROJECT)).toBe(true);
  });

  test("workflow cwd inside project is compatible", () => {
    expect(
      cwdMatches(`${PROJECT}/cmd`, PROJECT)
    ).toBe(true);
  });

  test("workflow cwd as project parent is compatible (worktree relationship)", () => {
    expect(
      cwdMatches("/Users/cali/Development", PROJECT)
    ).toBe(true);
  });

  test("sibling project is not compatible", () => {
    expect(
      cwdMatches("/Users/cali/Development/stelow-product-workflow", PROJECT)
    ).toBe(false);
  });

  test("completely unrelated path is not compatible", () => {
    expect(cwdMatches("/tmp/foo", PROJECT)).toBe(false);
  });

  test("normalizes multiple slashes", () => {
    expect(cwdMatches("/Users//cali/Development", PROJECT)).toBe(true);
  });

  test("normalizes trailing slashes", () => {
    expect(cwdMatches(`${PROJECT}/`, PROJECT)).toBe(true);
  });

  test("empty project path with empty workflow cwd is true (both empty)", () => {
    expect(cwdMatches("", "")).toBe(true);
  });

  test("empty project path treats as root, any non-empty workflow cwd matches", () => {
    // Edge case documented: format!("{}/", "") = "/" so the prefix
    // check becomes `a.startsWith("/")` which is always true for absolute paths.
    // This is a quirk of the Rust/JS parity; in practice herdr always
    // passes a non-empty workspace_cwd so this branch is rarely hit.
    expect(cwdMatches("/Users/cali", "")).toBe(true);
  });
});