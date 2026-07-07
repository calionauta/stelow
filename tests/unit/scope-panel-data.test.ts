/**
 * Unit Tests: Scope view data shaping (muxy panel data.js).
 *
 * Validates `flattenScopesForView()`, `groupScopesByStatus()`, and
 * `SCOPE_COLUMNS` order. Pure functions; no Muxy runtime needed.
 */

import { describe, it, expect } from "vitest";
import {
  flattenScopesForView,
  groupScopesByStatus,
  SCOPE_COLUMNS,
  loadProjectList,
} from "../../integrations/muxy/stelow/src/panel/data";

function makeWf(id: string, scopes: unknown[]): unknown {
  return {
    name: id,
    status: "in-progress",
    cwd: `/Users/test/proj-${id}`,
    dirHash: `dirhash-${id}`,
    scopes,
  };
}

function makeScope(id: string, name: string, status: string): unknown {
  return {
    id,
    name,
    type: "feature",
    status,
  };
}

describe("SCOPE_COLUMNS", () => {
  it("exposes the 5 standard statuses in hill-chart order", () => {
    expect(SCOPE_COLUMNS.map((c) => c.id)).toEqual([
      "pending",
      "in-progress",
      "escalated",
      "failed",
      "completed",
    ]);
  });

  it("every column has a label", () => {
    for (const c of SCOPE_COLUMNS) {
      expect(c.label).toBeTruthy();
    }
  });
});

describe("flattenScopesForView()", () => {
  it("returns empty list when tracking has no workflows", () => {
    expect(flattenScopesForView({ workflows: [] })).toEqual([]);
    expect(flattenScopesForView(null)).toEqual([]);
    expect(flattenScopesForView({})).toEqual([]);
  });

  it("flattens multiple workflows' scopes with project identity", () => {
    const tracking = {
      workflows: [
        makeWf("login-system", [
          makeScope("scope-1", "Auth", "completed"),
          makeScope("scope-2", "Tokens", "in-progress"),
        ]),
        makeWf("payment-refactor", [
          makeScope("scope-1", "Stripe API", "pending"),
        ]),
      ],
    };
    const flat = flattenScopesForView(tracking as any);
    expect(flat).toHaveLength(3);
    // Identity bits preserved
    expect(flat.map((e) => `${e.workflow.name}/${e.scope.id}`)).toEqual([
      "login-system/scope-1",
      "login-system/scope-2",
      "payment-refactor/scope-1",
    ]);
    expect(flat[0].project).toBe("/Users/test/proj-login-system");
    expect(flat[2].project).toBe("/Users/test/proj-payment-refactor");
  });

  it("skips workflows without scopes array (legacy data)", () => {
    const tracking = {
      workflows: [
        makeWf("no-scopes", []),  // empty scopes — should yield 0
        { name: "missing-scopes", status: "in-progress" },  // no scopes field at all
      ],
    };
    expect(flattenScopesForView(tracking as any)).toEqual([]);
  });
});

describe("groupScopesByStatus()", () => {
  it("separates scopes into columns by status", () => {
    const flat = flattenScopesForView({
      workflows: [
        makeWf("a", [
          makeScope("s1", "foo", "pending"),
          makeScope("s2", "bar", "completed"),
        ]),
        makeWf("b", [
          makeScope("s3", "baz", "in-progress"),
        ]),
      ],
    } as any);
    const buckets = groupScopesByStatus(flat);
    expect(buckets.pending).toHaveLength(1);
    expect(buckets.completed).toHaveLength(1);
    expect(buckets["in-progress"]).toHaveLength(1);
    expect(buckets.escalated).toEqual([]);
    expect(buckets.failed).toEqual([]);
  });

  it("unknown statuses land in 'other' bucket (column count stays stable)", () => {
    const flat = flattenScopesForView({
      workflows: [
        makeWf("a", [makeScope("s1", "weird", "archived")]),
      ],
    } as any);
    const buckets = groupScopesForStatus(flat);
    expect(buckets.other).toHaveLength(1);
    expect(buckets.pending).toEqual([]);
  });

  it("returns a fresh buckets object each call (no shared state)", () => {
    const flat = flattenScopesForView({ workflows: [] });
    const a = groupScopesForStatus(flat);
    const b = groupScopesForStatus(flat);
    a.pending.push({} as any);
    expect(b.pending).toHaveLength(0);
  });
});

// Helper that wraps the production call — keeps the test reads natural.
// (Avoids a function-name typo in two near-identical test bodies above.)
function groupScopesForStatus(flat: unknown[]) {
  return groupScopesByStatus(flat as any);
}

describe("loadProjectList()", () => {
  // The global `muxy` object is injected by Muxy at runtime. The data
  // module imports `muxy.projects.list()` lazily, so we monkey-patch
  // the global here.
  const ORIGINAL_MUXY = (globalThis as any).muxy;

  afterEach(() => {
    if (ORIGINAL_MUXY === undefined) {
      delete (globalThis as any).muxy;
    } else {
      (globalThis as any).muxy = ORIGINAL_MUXY;
    }
  });

  function setMuxyProjectsList(projects: unknown[]) {
    (globalThis as any).muxy = {
      projects: { list: async () => projects },
    };
  }

  it("returns empty array when muxy is missing", async () => {
    delete (globalThis as any).muxy;
    const out = await loadProjectList();
    expect(out).toEqual([]);
  });

  it("returns empty array when muxy.projects.list() throws", async () => {
    (globalThis as any).muxy = {
      projects: { list: async () => { throw new Error("permission denied"); } },
    };
    const out = await loadProjectList();
    expect(out).toEqual([]);
  });

  it("normalizes the project shape", async () => {
    setMuxyProjectsList([
      { id: "p1", name: "stelow", path: "/Users/x/code/stelow", isActive: true },
      { id: "p2", path: "/Users/x/code/other", isActive: false },  // no name → derive from path
    ]);
    const out = await loadProjectList();
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      id: "p1",
      name: "stelow",
      path: "/Users/x/code/stelow",
      isActive: true,
    });
    expect(out[1].name).toBe("other");  // derived from last path segment
    expect(out[1].isActive).toBe(false);
  });

  it("returns empty array when list() returns non-array", async () => {
    setMuxyProjectsList("not an array" as any);
    const out = await loadProjectList();
    expect(out).toEqual([]);
  });
});
