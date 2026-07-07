/**
 * Integration Tests: Scope Overlap 4-Class Classification
 *
 * Validates `classifyOverlap()` and `matchesDeclaredGlob()` from
 * `extensions/stelow/state.ts`. These drive the post-execution overlap
 * report in `cali-product-scope-executor` SKILL Step 8.
 *
 * Test coverage:
 *   - Glob match: trailing `/**`, trailing `/*`, exact
 *   - Class (a) undeclared writes: contract drift detected
 *   - Class (b) real overlaps: parallel writes detected
 *   - Class (c) stale locks: file system observation
 *   - Class (d) clean: scopes that touched nothing
 *   - Combinations: a single scope in multiple classes
 *
 * Reference: docs/scope-execution-strategy.md
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { classifyOverlap, matchesDeclaredGlob } from "../../extensions/stelow/state";
import type { Scope } from "../../extensions/stelow/types";

function makeScope(over: Partial<Scope>): Scope {
  return {
    id: "scope-x",
    name: "Test Scope",
    type: "feature",
    status: "completed",
    ...over,
  };
}

describe("matchesDeclaredGlob", () => {
  it("matches `dir/**` as prefix", () => {
    expect(matchesDeclaredGlob("src/auth/foo.ts", "src/auth/**")).toBe(true);
    expect(matchesDeclaredGlob("src/auth/sub/bar.ts", "src/auth/**")).toBe(true);
    expect(matchesDeclaredGlob("src/middleware/foo.ts", "src/auth/**")).toBe(false);
    // edge: prefix must align at a path segment
    expect(matchesDeclaredGlob("src/authx/foo.ts", "src/auth/**")).toBe(false);
  });

  it("matches `dir/*` as single-level only", () => {
    expect(matchesDeclaredGlob("src/auth/foo.ts", "src/auth/*")).toBe(true);
    expect(matchesDeclaredGlob("src/auth/sub/bar.ts", "src/auth/*")).toBe(false);
    expect(matchesDeclaredGlob("src/authz/foo.ts", "src/auth/*")).toBe(false);
    expect(matchesDeclaredGlob("src/middleware/foo.ts", "src/auth/*")).toBe(false);
  });

  it("matches exact path exactly", () => {
    expect(matchesDeclaredGlob("src/middleware/auth.ts", "src/middleware/auth.ts")).toBe(true);
    expect(matchesDeclaredGlob("src/middleware/login.ts", "src/middleware/auth.ts")).toBe(false);
  });

  it("brace expansion `{a,b}` matches either alternative", () => {
    expect(matchesDeclaredGlob("src/auth/foo.ts", "src/**/*.{ts,tsx}")).toBe(true);
    expect(matchesDeclaredGlob("src/auth/foo.tsx", "src/**/*.{ts,tsx}")).toBe(true);
    expect(matchesDeclaredGlob("src/auth/foo.js", "src/**/*.{ts,tsx}")).toBe(false);
    expect(matchesDeclaredGlob("src/auth/foo", "src/**/*.{ts,tsx}")).toBe(false);
  });

  it("brace expansion with more than two alternatives", () => {
    expect(matchesDeclaredGlob("a/x.ts", "a/*.{ts,tsx,js,jsx}")).toBe(true);
    expect(matchesDeclaredGlob("a/x.jsx", "a/*.{ts,tsx,js,jsx}")).toBe(true);
    expect(matchesDeclaredGlob("a/x.vue", "a/*.{ts,tsx,js,jsx}")).toBe(false);
  });

  it("brace expansion combined with trailing /**", () => {
    expect(matchesDeclaredGlob("src/auth/sub/foo.ts", "src/**/*.{ts,tsx}")).toBe(true);
    expect(matchesDeclaredGlob("src/auth/sub/foo.tsx", "src/**/*.{ts,tsx}")).toBe(true);
    expect(matchesDeclaredGlob("src/middleware/foo.ts", "src/**/*.{ts,tsx}")).toBe(true);
    expect(matchesDeclaredGlob("other/foo.ts", "src/**/*.{ts,tsx}")).toBe(false);
  });

  it("empty alternatives in brace group are skipped (not match-everything)", () => {
    // `{a,}` would expand to ["a"] only — empty trailing alt dropped.
    expect(matchesDeclaredGlob("foo/a", "foo/{a,}")).toBe(true);
    expect(matchesDeclaredGlob("foo/", "foo/{a,}")).toBe(false);
    // `{a,,b}` — middle empty dropped, leaves {a,b}
    expect(matchesDeclaredGlob("foo/a", "foo/{a,,b}")).toBe(true);
    expect(matchesDeclaredGlob("foo/b", "foo/{a,,b}")).toBe(true);
  });

  it("unclosed brace treated as literal (does not throw)", () => {
    expect(matchesDeclaredGlob("src/foo/{a,b", "src/foo/{a,b")).toBe(true);
    expect(matchesDeclaredGlob("src/foo/a", "src/foo/{a,b")).toBe(false);
  });

  it("in-segment `*` matches any non-slash chars within one segment", () => {
    expect(matchesDeclaredGlob("src/auth/foo.ts", "src/auth/*.ts")).toBe(true);
    expect(matchesDeclaredGlob("src/auth/foo-bar.ts", "src/auth/*.ts")).toBe(true);
    expect(matchesDeclaredGlob("src/auth/foo.ts.bak", "src/auth/*.ts")).toBe(false);
    expect(matchesDeclaredGlob("src/auth/sub/foo.ts", "src/auth/*.ts")).toBe(false);
    expect(matchesDeclaredGlob("src/auth/foo.js", "src/auth/*.ts")).toBe(false);
  });

  it("`**` as a whole segment matches zero or more segments", () => {
    // Leading ** with nothing after = match anything
    expect(matchesDeclaredGlob("a", "**")).toBe(true);
    expect(matchesDeclaredGlob("a/b", "**")).toBe(true);
    expect(matchesDeclaredGlob("a/b/c", "**")).toBe(true);
    // src/** = src + any depth under it
    expect(matchesDeclaredGlob("src/foo.ts", "src/**")).toBe(true);
    expect(matchesDeclaredGlob("src/a/foo.ts", "src/**")).toBe(true);
    expect(matchesDeclaredGlob("src/a/b/foo.ts", "src/**")).toBe(true);
    expect(matchesDeclaredGlob("other/foo.ts", "src/**")).toBe(false);
    // **/suffix matches any depth with that suffix
    expect(matchesDeclaredGlob("foo.ts", "**/*.ts")).toBe(true);
    expect(matchesDeclaredGlob("a/foo.ts", "**/*.ts")).toBe(true);
    expect(matchesDeclaredGlob("a/b/foo.ts", "**/*.ts")).toBe(true);
    expect(matchesDeclaredGlob("a/foo.js", "**/*.ts")).toBe(false);
    // ** must be its own segment, not embedded in a segment
    expect(matchesDeclaredGlob("src/foo.ts", "src/**.ts")).toBe(false);
  });
});

describe("classifyOverlap — 4-class report", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "stelow-overlap-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("class (d): clean scopes are detected", () => {
    const scopes: Scope[] = [
      makeScope({ id: "scope-1", targetFiles: ["src/a/**"], actualFiles: ["src/a/foo.ts"] }),
      makeScope({ id: "scope-2", targetFiles: ["src/b/**"], actualFiles: ["src/b/bar.ts"] }),
    ];
    const report = classifyOverlap(scopes, tmpDir);
    expect(report.undeclared).toEqual([]);
    expect(report.overlaps).toEqual([]);
    expect(report.staleLocks).toEqual([]);
    expect(report.clean).toEqual(["scope-1", "scope-2"]);
  });

  it("class (a): undeclared writes flagged", () => {
    const scopes: Scope[] = [
      makeScope({
        id: "scope-1",
        targetFiles: ["src/auth/**"],
        actualFiles: ["src/auth/login.ts", "src/db/users.ts"], // db/users.ts is undeclared
      }),
    ];
    const report = classifyOverlap(scopes, tmpDir);
    expect(report.undeclared).toHaveLength(1);
    expect(report.undeclared[0].id).toBe("scope-1");
    expect(report.undeclared[0].undeclaredWrites).toEqual(["src/db/users.ts"]);
    expect(report.clean).toEqual([]); // scope-1 is tainted by its own undeclared writes
  });

  it("class (b): real inter-scope overlap detected", () => {
    const scopes: Scope[] = [
      makeScope({ id: "scope-1", actualFiles: ["src/middleware.ts", "src/auth.ts"] }),
      makeScope({ id: "scope-2", actualFiles: ["src/auth.ts", "src/login.ts"] }),
    ];
    const report = classifyOverlap(scopes, tmpDir);
    expect(report.overlaps).toHaveLength(1);
    expect(report.overlaps[0]).toEqual({
      a: "scope-1",
      b: "scope-2",
      shared: ["src/auth.ts"],
    });
    expect(report.clean).toEqual([]); // both are tainted
  });

  it("class (c): stale locks flagged via filesystem", () => {
    // Write a lock file with expires_at in the past
    const lockPath = join(tmpDir, "abc123def456.lock");
    writeFileSync(
      lockPath,
      JSON.stringify({
        scope_id: "scope-old",
        file: "src/legacy.ts",
        acquired_at: "2026-07-01T10:00:00Z",
        expires_at: "2026-07-01T10:30:00Z", // in the past
        ttl_seconds: 1800,
      })
    );
    const scopes: Scope[] = [
      makeScope({ id: "scope-1", actualFiles: ["src/foo.ts"] }),
    ];
    const report = classifyOverlap(scopes, tmpDir);
    expect(report.staleLocks).toHaveLength(1);
    expect(report.staleLocks[0].file).toBe("src/legacy.ts");
    expect(report.staleLocks[0].scope).toBe("scope-old");
    // scope-1 itself is still clean (stale lock is orphan, not on its path)
    expect(report.clean).toEqual(["scope-1"]);
  });

  it("class (c): fresh locks NOT flagged as stale", () => {
    const lockPath = join(tmpDir, "fresh.lock");
    // expires_at 1 hour in the future
    const future = new Date(Date.now() + 3600_000).toISOString();
    writeFileSync(
      lockPath,
      JSON.stringify({
        scope_id: "scope-active",
        file: "src/active.ts",
        acquired_at: new Date().toISOString(),
        expires_at: future,
        ttl_seconds: 3600,
      })
    );
    const scopes: Scope[] = [makeScope({ id: "scope-x", actualFiles: ["src/foo.ts"] })];
    const report = classifyOverlap(scopes, tmpDir);
    expect(report.staleLocks).toEqual([]);
  });

  it("malformed lock files are skipped silently", () => {
    writeFileSync(join(tmpDir, "bad.lock"), "{ not json");
    const scopes: Scope[] = [makeScope({ id: "scope-x", actualFiles: ["src/foo.ts"] })];
    const report = classifyOverlap(scopes, tmpDir);
    expect(report.staleLocks).toEqual([]);
    expect(report.clean).toEqual(["scope-x"]);
  });

  it("missing lockDir is treated as 'no locks' (not an error)", () => {
    const scopes: Scope[] = [makeScope({ id: "scope-x", actualFiles: ["src/foo.ts"] })];
    const report = classifyOverlap(scopes, "/nonexistent/path/to/locks");
    expect(report.staleLocks).toEqual([]);
    expect(report.clean).toEqual(["scope-x"]);
  });

  it("combined: one scope in multiple classes", () => {
    const scopes: Scope[] = [
      makeScope({
        id: "scope-1",
        targetFiles: ["src/a/**"],
        actualFiles: [
          "src/a/foo.ts", // declared match
          "src/auth.ts",   // undeclared (class a)
          "src/db.ts",     // undeclared (class a)
        ],
      }),
      makeScope({
        id: "scope-2",
        // no targetFiles — contract-less; no class (a) but participates in (b)
        actualFiles: [
          "src/a/foo.ts", // shared with scope-1 (class b)
          "src/baz.ts",   // only in scope-2
        ],
      }),
    ];
    const report = classifyOverlap(scopes, tmpDir);
    expect(report.undeclared).toHaveLength(1);
    expect(report.undeclared[0].id).toBe("scope-1");
    expect(report.undeclared[0].undeclaredWrites.sort()).toEqual(
      ["src/auth.ts", "src/db.ts"].sort()
    );
    expect(report.overlaps).toHaveLength(1);
    expect(report.overlaps[0]).toEqual({
      a: "scope-1",
      b: "scope-2",
      shared: ["src/a/foo.ts"],
    });
    expect(report.clean).toEqual([]); // both are tainted
  });

  it("scopes without actualFiles are excluded from report", () => {
    const scopes: Scope[] = [
      makeScope({ id: "scope-pending", status: "pending", actualFiles: undefined }),
      makeScope({ id: "scope-done", actualFiles: ["src/foo.ts"] }),
    ];
    const report = classifyOverlap(scopes, tmpDir);
    // pending scope had no capture; should not appear anywhere
    expect(report.undeclared.find((u) => u.id === "scope-pending")).toBeUndefined();
    expect(report.overlaps.flatMap((o) => [o.a, o.b])).not.toContain("scope-pending");
    expect(report.clean).toEqual(["scope-done"]);
  });

  it("empty scope list yields empty report", () => {
    const report = classifyOverlap([], tmpDir);
    expect(report).toEqual({ undeclared: [], overlaps: [], staleLocks: [], clean: [] });
  });
});
