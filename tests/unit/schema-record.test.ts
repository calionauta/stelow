/**
 * Unit Tests: Record v2 runtime validators.
 *
 * Validates `validateScopeRecord()`, `validateScopeTask()`, and
 * `validateScopeTasks()` from `extensions/stelow/schema-record.ts`.
 * Also tests the opt-in `STELOW_VALIDATE=1` integration via
 * `writeTracking()` in `extensions/stelow/state.ts`.
 *
 * Convention (v2 enforcement):
 *   - `record.verified` must be boolean.
 *   - `record.files_count` and `commands_count` must be non-negative ints.
 *   - `record.completed_at` must be string (ISO-8601 format check is
 *     a future hardening item — string check covers malformed types).
 *   - `record.suggested_commit` is optional.
 *   - Tasks: `source` ∈ {planned, discovered}, `status` ∈ {pending, done, skipped}.
 *   - Discovered tasks MUST carry a `note:`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  validateScopeRecord,
  validateScopeTask,
  validateScopeTasks,
  validateScopeAdditions,
  ScopeRecordValidationError,
  isRuntimeValidationEnabled,
} from "../../extensions/stelow/schema-record";
import { writeTracking, readTracking } from "../../extensions/stelow/state";
import type { TrackingData } from "../../extensions/stelow/types";

describe("validateScopeRecord()", () => {
  it("accepts a minimal valid record", () => {
    const rec = validateScopeRecord({
      completed_at: "2026-07-07T10:00:00Z",
      files_count: 0,
      commands_count: 0,
      verified: false,
    });
    expect(rec.completed_at).toBe("2026-07-07T10:00:00Z");
    expect(rec.verified).toBe(false);
  });

  it("accepts a fully-populated record", () => {
    const rec = validateScopeRecord({
      completed_at: "2026-07-07T10:00:00Z",
      files_count: 12,
      commands_count: 5,
      verified: true,
      suggested_commit: "feat(auth): add SQLite migration",
    });
    expect(rec.suggested_commit).toBe("feat(auth): add SQLite migration");
  });

  it("rejects non-objects", () => {
    expect(() => validateScopeRecord(null)).toThrow(ScopeRecordValidationError);
    expect(() => validateScopeRecord("string")).toThrow(ScopeRecordValidationError);
    expect(() => validateScopeRecord([])).toThrow(ScopeRecordValidationError);
    expect(() => validateScopeRecord(42)).toThrow(ScopeRecordValidationError);
  });

  it("rejects bad completed_at (non-string)", () => {
    expect(() =>
      validateScopeRecord({
        completed_at: 12345,
        files_count: 0,
        commands_count: 0,
        verified: false,
      })
    ).toThrow(/completed_at: expected string/);
  });

  it("rejects bad files_count (non-integer)", () => {
    expect(() =>
      validateScopeRecord({
        completed_at: "2026-07-07T10:00:00Z",
        files_count: 1.5,
        commands_count: 0,
        verified: false,
      })
    ).toThrow(/files_count: expected non-negative integer/);
  });

  it("rejects negative files_count", () => {
    expect(() =>
      validateScopeRecord({
        completed_at: "2026-07-07T10:00:00Z",
        files_count: -1,
        commands_count: 0,
        verified: false,
      })
    ).toThrow(/expected non-negative integer/);
  });

  it("rejects non-boolean verified", () => {
    expect(() =>
      validateScopeRecord({
        completed_at: "2026-07-07T10:00:00Z",
        files_count: 0,
        commands_count: 0,
        verified: "true", // string, not boolean
      })
    ).toThrow(/verified: expected boolean/);
  });

  it("rejects non-string suggested_commit", () => {
    expect(() =>
      validateScopeRecord({
        completed_at: "2026-07-07T10:00:00Z",
        files_count: 0,
        commands_count: 0,
        verified: true,
        suggested_commit: 42,
      })
    ).toThrow(/suggested_commit: expected string/);
  });

  it("error path is dot-separated (shell friendly)", () => {
    try {
      validateScopeRecord({
        completed_at: "x",
        files_count: -1,
        commands_count: 0,
        verified: true,
      });
    } catch (err) {
      expect((err as ScopeRecordValidationError).path).toBe("record.files_count");
      expect((err as Error).message).toMatch(/^record\.files_count:/);
    }
  });
});

describe("validateScopeTask()", () => {
  it("accepts a valid planned task", () => {
    const t = validateScopeTask({
      id: "3.1",
      name: "SQLite migration",
      source: "planned",
      status: "pending",
      risk: 2,
    });
    expect(t.id).toBe("3.1");
    expect(t.source).toBe("planned");
  });

  it("accepts a valid discovered task with note", () => {
    const t = validateScopeTask({
      id: "3.4",
      name: "Index on users.email",
      source: "discovered",
      status: "done",
      discovered_in_iter: 3,
      note: "P95 query time 380ms without index",
    });
    expect(t.source).toBe("discovered");
    expect(t.note).toBeTruthy();
  });

  it("rejects discovered task without note (anti-rationalization)", () => {
    expect(() =>
      validateScopeTask({
        id: "3.4",
        name: "Index on users.email",
        source: "discovered",
        status: "done",
      })
    ).toThrow(/note: required when source='discovered'/);
  });

  it("rejects unknown source value", () => {
    expect(() =>
      validateScopeTask({
        id: "3.1",
        name: "x",
        source: "inherited",
        status: "pending",
      })
    ).toThrow(/source: must be one of/);
  });

  it("rejects unknown status value", () => {
    expect(() =>
      validateScopeTask({
        id: "3.1",
        name: "x",
        source: "planned",
        status: "in-progress",
      })
    ).toThrow(/status: must be one of/);
  });

  it("rejects negative risk", () => {
    expect(() =>
      validateScopeTask({
        id: "3.1",
        name: "x",
        source: "planned",
        status: "pending",
        risk: -1,
      })
    ).toThrow(/risk: expected non-negative integer/);
  });

  it("includes task index in error path", () => {
    try {
      validateScopeTask(
        { id: "x", name: "x", source: "planned", status: "pending" },
        7,
      );
    } catch (err) {
      expect((err as Error).message).toMatch(/tasks\[7\]\.id/);
    }
  });
});

describe("validateScopeTasks() (array)", () => {
  it("accepts empty array", () => {
    expect(validateScopeTasks([])).toEqual([]);
  });

  it("rejects non-array", () => {
    expect(() => validateScopeTasks("string")).toThrow(/expected array/);
    expect(() => validateScopeTasks(null)).toThrow(/expected array/);
  });

  it("validates every entry", () => {
    const tasks = validateScopeTasks([
      { id: "1.1", name: "a", source: "planned", status: "pending" },
      { id: "1.2", name: "b", source: "planned", status: "done" },
    ]);
    expect(tasks).toHaveLength(2);
  });
});

describe("validateScopeAdditions() (combined)", () => {
  it("returns undefined for both when input is empty", () => {
    expect(validateScopeAdditions({})).toEqual({});
  });

  it("validates only what is provided", () => {
    const out = validateScopeAdditions({
      record: {
        completed_at: "2026-07-07T10:00:00Z",
        files_count: 0,
        commands_count: 0,
        verified: false,
      },
    });
    expect(out.record).toBeTruthy();
    expect(out.tasks).toBeUndefined();
  });
});

describe("isRuntimeValidationEnabled()", () => {
  const ORIGINAL_ENV = process.env.STELOW_VALIDATE;
  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.STELOW_VALIDATE;
    } else {
      process.env.STELOW_VALIDATE = ORIGINAL_ENV;
    }
  });

  it("returns false when env not set", () => {
    delete process.env.STELOW_VALIDATE;
    expect(isRuntimeValidationEnabled()).toBe(false);
  });

  it("returns true when STELOW_VALIDATE=1", () => {
    process.env.STELOW_VALIDATE = "1";
    expect(isRuntimeValidationEnabled()).toBe(true);
  });

  it("returns false for any other value (strict equality)", () => {
    process.env.STELOW_VALIDATE = "true";
    expect(isRuntimeValidationEnabled()).toBe(false);
    process.env.STELOW_VALIDATE = "0";
    expect(isRuntimeValidationEnabled()).toBe(false);
  });
});

describe("writeTracking() opt-in validation integration", () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "stelow-v2-test-"));
  });
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.STELOW_VALIDATE;
  });

  function makeTracking(scope: unknown): TrackingData {
    return {
      $schema: "https://example.invalid/stelow.schema.json",
      version: "1.0",
      created: "2026-07-07T10:00:00Z",
      updated: "2026-07-07T10:00:00Z",
      workflows: [
        {
          name: "test-wf",
          description: "test",
          status: "in-progress",
          currentPhase: 0,
          phases: [],
          stage: { stage: "scope", entered_at: "2026-07-07T10:00:00Z" },
          created: "2026-07-07T10:00:00Z",
          updated: "2026-07-07T10:00:00Z",
          scopes: [scope as any],
        },
      ],
    };
  }

  it("writes through silently when STELOW_VALIDATE is unset (default OFF)", () => {
    const data = makeTracking({
      id: "scope-1",
      name: "x",
      type: "feature",
      status: "completed",
      record: { completed_at: "x", files_count: -1, commands_count: 0, verified: "yes" }, // all bad
    });
    expect(() => writeTracking(tmpDir, data)).not.toThrow();
    const onDisk = JSON.parse(readFileSync(join(tmpDir, "stelow.json"), "utf-8"));
    expect(onDisk.workflows[0].scopes[0].record.files_count).toBe(-1); // unchanged
  });

  it("rejects bad records when STELOW_VALIDATE=1", () => {
    process.env.STELOW_VALIDATE = "1";
    const data = makeTracking({
      id: "scope-1",
      name: "x",
      type: "feature",
      status: "completed",
      record: { completed_at: "2026-07-07T10:00:00Z", files_count: -1, commands_count: 0, verified: false },
    });
    expect(() => writeTracking(tmpDir, data)).toThrow(/scope-1.*files_count/);
  });

  it("accepts good records when STELOW_VALIDATE=1", () => {
    process.env.STELOW_VALIDATE = "1";
    const data = makeTracking({
      id: "scope-1",
      name: "x",
      type: "feature",
      status: "completed",
      record: {
        completed_at: "2026-07-07T10:00:00Z",
        files_count: 5,
        commands_count: 3,
        verified: true,
      },
      tasks: [
        { id: "1.1", name: "a", source: "planned", status: "done" },
        { id: "1.2", name: "b", source: "discovered", status: "done", note: "spike" },
      ],
    });
    expect(() => writeTracking(tmpDir, data)).not.toThrow();
    expect(existsSync(join(tmpDir, "stelow.json"))).toBe(true);
  });

  it("rejects discovered task without note when STELOW_VALIDATE=1", () => {
    process.env.STELOW_VALIDATE = "1";
    const data = makeTracking({
      id: "scope-1",
      name: "x",
      type: "feature",
      status: "in-progress",
      tasks: [{ id: "1.1", name: "a", source: "discovered", status: "pending" }],
    });
    expect(() => writeTracking(tmpDir, data)).toThrow(/note: required when source='discovered'/);
  });
});