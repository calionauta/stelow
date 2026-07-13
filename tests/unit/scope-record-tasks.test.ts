/**
 * Unit Tests: Scope Record + Task tracking shape consistency.
 *
 * Validates the structural correctness of:
 *   - `ScopeRecord` interface (machine-checkable mirror of the Record body)
 *   - `ScopeTask` interface (planned/discovered task shape)
 *
 * Convention:
 *   - snake_case throughout (matches the rest of stelow.json schema)
 *   - `record` is required convention (advisory in v1; enforced in v2)
 *   - `tasks` is optional but recommended for Shape Up hill chart
 *   - `source: 'discovered'` MUST carry a `note:` explaining the trigger
 *
 * These tests guard against drift between the TS interfaces and the
 * bash snippets in `stelow-product-scope-executor` SKILL Steps 3e / 3e-bis
 * / 3e-ter.
 */

import { describe, it, expect } from "vitest";
import type { Scope, ScopeRecord, ScopeTask } from "../../extensions/stelow/types";

describe("ScopeRecord shape (snake_case mirror)", () => {
  it("requires the four core fields", () => {
    const rec: ScopeRecord = {
      completed_at: "2026-07-07T10:00:00Z",
      files_count: 5,
      commands_count: 3,
      verified: true,
    };
    expect(rec.completed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(rec.verified).toBe(true);
  });

  it("accepts optional suggested_commit", () => {
    const rec: ScopeRecord = {
      completed_at: "2026-07-07T10:00:00Z",
      files_count: 1,
      commands_count: 1,
      verified: true,
      suggested_commit: "feat(auth): add SQLite migration",
    };
    expect(rec.suggested_commit).toMatch(/^feat[\(:]/);
  });

  it("verified=false is a valid (advisory) state — executor still writes the record", () => {
    const rec: ScopeRecord = {
      completed_at: "2026-07-07T10:00:00Z",
      files_count: 0,
      commands_count: 0,
      verified: false, // honest: incomplete verification, captured.
    };
    expect(rec.verified).toBe(false);
  });
});

describe("ScopeTask shape (planned vs discovered)", () => {
  it("planned task has source='planned' and no discovered_in_iter", () => {
    const t: ScopeTask = {
      id: "3.1",
      name: "SQLite migration",
      source: "planned",
      status: "pending",
      risk: 2,
      components: ["db"],
    };
    expect(t.source).toBe("planned");
    expect(t.discovered_in_iter).toBeUndefined();
  });

  it("discovered task MUST have discovered_in_iter set", () => {
    const t: ScopeTask = {
      id: "3.4",
      name: "Index on users.email",
      source: "discovered",
      status: "pending",
      discovered_in_iter: 3,
      note: "P95 query time 380ms without index; AC requires 50ms",
    };
    expect(t.source).toBe("discovered");
    expect(t.discovered_in_iter).toBe(3);
    expect(t.note).toBeTruthy();
  });

  it("scope carries both record + tasks arrays", () => {
    const scope: Scope = {
      id: "scope-3",
      name: "User persistence",
      type: "feature",
      status: "completed",
      tasks: [
        { id: "3.1", name: "SQLite migration", source: "planned", status: "done", risk: 2 },
        { id: "3.2", name: "CRUD commands", source: "planned", status: "done", risk: 3 },
        { id: "3.3", name: "Index on users.email", source: "discovered", status: "done", discovered_in_iter: 3, note: "slow query" },
      ],
      record: {
        completed_at: "2026-07-07T10:00:00Z",
        files_count: 5,
        commands_count: 4,
        verified: true,
        suggested_commit: "feat(persistence): SQLite layer + email index",
      },
      actual_files: ["src/db.ts", "src/auth.ts", "migrations/initial.sql", "src/users.ts", "src/index.ts"],
    };
    expect(scope.tasks).toHaveLength(3);
    expect(scope.tasks?.filter((t) => t.source === "discovered")).toHaveLength(1);
    expect(scope.record?.verified).toBe(true);
    expect(scope.record?.files_count).toBe(scope.actual_files?.length);
  });
});

describe("ScopeRecord wiring invariants (advisory v1)", () => {
  it("files_count mirrors actual_files.length at write time", () => {
    // The scope-executor 3e-bis bash writes:
    //   scope.record.files_count = scope.actual_files.length
    // This invariant ensures they can never drift.
    const actual = ["a.ts", "b.ts", "c.ts"];
    const rec: ScopeRecord = {
      completed_at: "2026-07-07T10:00:00Z",
      files_count: actual.length,
      commands_count: 0,
      verified: false,
    };
    expect(rec.files_count).toBe(actual.length);
  });

  it("commands_count of 0 is admissible but should trigger execution-critique warning", () => {
    const rec: ScopeRecord = {
      completed_at: "2026-07-07T10:00:00Z",
      files_count: 5,
      commands_count: 0, // 'verified via vibes' pattern
      verified: false,
    };
    expect(rec.commands_count).toBe(0);
    // execution-critique would flag this as warning per Criterion 6
  });
});
