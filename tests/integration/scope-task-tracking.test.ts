/**
 * Integration Tests: Scope Task Tracking — seed → stelow.json → Muxy display.
 *
 * Simulates the executor bash `node -e` snippets that seed/append tasks
 * into stelow.json, then validates against schema-record.ts validators and
 * Muxy data helpers. Covers:
 *
 *   - Seed planned tasks from spec-tech.md Tasks table (Step 3c)
 *   - Re-sync guard: empty/bad table caught (process.exit(1))
 *   - Shape validation: invalid source/status caught
 *   - Append discovered task with note guard
 *   - Discovered task without note rejected
 *   - discovered_tasks_count increment
 *   - Mark task done/skipped
 *   - Muxy getScopeProgress reads taskDone/taskTotal/withDiscovered
 *   - Muxy getTaskSummaryText formats correctly
 *   - discovered_tasks_count fallback when count field drifts
 *
 * Does NOT execute real bash — emulates the node -e logic inline.
 * The bash snippets in SKILL.md are the reference; this test verifies
 * the same invariants the snippets enforce at runtime.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { validateScopeTask, validateScopeTasks } from "../../extensions/stelow/schema-record";
import type { Scope, ScopeTask, Workflow, TrackingData } from "../../extensions/stelow/types";

// ── Helpers: emulate the executor bash snippets ─────────────────────

function makeTracking(scopes: Scope[]): TrackingData {
  return {
    $schema: "",
    version: "0.43.1",
    created: "2026-07-07T10:00:00Z",
    updated: "2026-07-07T10:00:00Z",
    workflows: [
      {
        name: "test-wf",
        description: "test",
        status: "in-progress",
        currentPhase: 13, // Execution
        phases: [],
        stage: {
          current_stage: "execution",
          previous_stage: null,
          transitioned_at: "2026-07-07T10:00:00Z",
          history: [],
          supervisor_active: false,
        },
        created: "2026-07-07T10:00:00Z",
        updated: "2026-07-07T10:00:00Z",
        scopes,
      },
    ],
  };
}

function writeStelowJson(dir: string, data: TrackingData): string {
  const path = join(dir, "stelow.json");
  writeFileSync(path, JSON.stringify(data, null, 2));
  return path;
}

function readStelowJson(dir: string): TrackingData {
  return JSON.parse(readFileSync(join(dir, "stelow.json"), "utf8"));
}

function findScope(tracking: TrackingData, id: string): Scope | undefined {
  return tracking.workflows[0]?.scopes?.find((s) => s.id === id);
}

// ── Emulated executor snippets (mirrors SKILL.md Step 3c / 3e-ter) ──

/** Emulate `node -e` seed snippet + re-sync guard inline. */
function emulatedSeedTasks(
  tracking: TrackingData,
  scopeId: string,
  tasks: ScopeTask[],
): TrackingData {
  const wf = tracking.workflows.find((w) => w.status === "in-progress");
  if (!wf?.scopes) return tracking;

  const scope = wf.scopes.find((s) => s.id === scopeId);
  if (!scope) return tracking;

  scope.status = "in-progress";
  scope.startSha = "abc123";

  // --- re-sync guard inline (same logic as SKILL.md seed) ---
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error(`[Seed guard] ${scopeId}: tasks empty or not an array.`);
  }
  const VALID_SOURCES = new Set(["planned", "discovered"]);
  const VALID_STATUSES = new Set(["pending", "done", "skipped"]);
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (!t.id || !t.name) {
      throw new Error(`[Seed guard] ${scopeId}: task[${i}] missing id or name`);
    }
    if (!VALID_SOURCES.has(t.source)) {
      throw new Error(`[Seed guard] ${scopeId}: task[${i}] invalid source: ${t.source}`);
    }
    if (!VALID_STATUSES.has(t.status)) {
      throw new Error(`[Seed guard] ${scopeId}: task[${i}] invalid status: ${t.status}`);
    }
  }
  // --- end guard ---

  scope.tasks = tasks;
  wf.updated = new Date().toISOString();
  return tracking;
}

/** Emulate `node -e` discovered append snippet. */
function emulatedAppendDiscovered(
  tracking: TrackingData,
  scopeId: string,
  task: ScopeTask,
): TrackingData {
  const wf = tracking.workflows.find((w) => w.status === "in-progress");
  if (!wf?.scopes) return tracking;

  const scope = wf.scopes.find((s) => s.id === scopeId);
  if (!scope) return tracking;

  if (!scope.tasks) scope.tasks = [];

  // --- append guard (same logic as SKILL.md append) ---
  if (!task.note) {
    throw new Error(`[Append guard] ${scopeId}: discovered task missing note`);
  }
  if (task.source !== "discovered") {
    throw new Error(`[Append guard] ${scopeId}: task must have source='discovered', got ${task.source}`);
  }
  // --- end guard ---

  scope.tasks.push(task);
  scope.discovered_tasks_count = (scope.discovered_tasks_count ?? 0) + 1;
  wf.updated = new Date().toISOString();
  return tracking;
}

/** Emulate `node -e` mark done/skipped snippet. */
function emulatedMarkTask(
  tracking: TrackingData,
  scopeId: string,
  taskId: string,
  newStatus: "done" | "skipped",
): TrackingData {
  const wf = tracking.workflows.find((w) => w.status === "in-progress");
  if (!wf?.scopes) return tracking;

  const scope = wf.scopes.find((s) => s.id === scopeId);
  if (!scope?.tasks) return tracking;

  const t = scope.tasks.find((t) => t.id === taskId);
  if (t) t.status = newStatus;
  wf.updated = new Date().toISOString();
  return tracking;
}

// ── Test data ────────────────────────────────────────────────────────

const PLANNED_TASKS: ScopeTask[] = [
  { id: "1.1", name: "SQLite migration", source: "planned", status: "pending", risk: 2, components: ["db"] },
  { id: "1.2", name: "User CRUD", source: "planned", status: "pending", risk: 4, components: ["api", "db"] },
  { id: "1.3", name: "E2E test", source: "planned", status: "pending", risk: 1, components: ["test"] },
];

const DISCOVERED_TASK: ScopeTask = {
  id: "1.4",
  name: "Index on users.email",
  source: "discovered",
  status: "pending",
  discovered_in_iter: 2,
  note: "P95 query time 380ms without index; AC requires 50ms",
  components: ["db"],
};

// ── Imports from Muxy data helpers ──────────────────────────────────

// We inline simplified versions of the Muxy getScopeProgress /
// getTaskSummaryText logic to avoid importing ESM modules
// that require vite/browser context.
function getScopeProgress(wf: { scopes?: Scope[] }): {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  failed: number;
  declaredFilesCount: number;
  taskDone: number;
  taskTotal: number;
  withDiscovered: number;
} | null {
  const scopes = wf.scopes;
  if (!scopes || scopes.length === 0) return null;
  const total = scopes.length;
  const completed = scopes.filter((s) => s.status === "completed").length;
  const inProgress = scopes.filter((s) => s.status === "in-progress").length;
  const failed = scopes.filter((s) => s.status === "escalated" || s.status === "failed").length;
  const pending = Math.max(total - completed - inProgress - failed, 0);
  const declaredFilesCount = scopes.reduce(
    (sum, s) => sum + (Array.isArray((s as any).target_files) ? (s as any).target_files.length : 0),
    0,
  );
  const taskDone = scopes.reduce((sum, s) => {
    if (!Array.isArray(s.tasks)) return sum;
    return sum + s.tasks.filter((t) => t.status === "done").length;
  }, 0);
  const taskTotal = scopes.reduce((sum, s) => {
    if (!Array.isArray(s.tasks)) return sum;
    return sum + s.tasks.length;
  }, 0);
  const withDiscovered = scopes.filter((s) => {
    if (!Array.isArray(s.tasks)) return false;
    return s.tasks.some((t) => t.source === "discovered");
  }).length;
  return { total, completed, inProgress, pending, failed, declaredFilesCount, taskDone, taskTotal, withDiscovered };
}

function getTaskSummaryText(wf: { scopes?: Scope[] }): string {
  const progress = getScopeProgress(wf);
  if (!progress) return "";
  if (progress.taskTotal === 0) return "";
  const parts = [`tasks ${progress.taskDone}/${progress.taskTotal}`];
  if (progress.withDiscovered > 0) {
    let discoveredCount = 0;
    const scopes = wf.scopes;
    if (Array.isArray(scopes)) {
      for (const s of scopes) {
        if (!Array.isArray(s.tasks)) continue;
        discoveredCount += s.tasks.filter((t) => t.source === "discovered").length;
      }
    }
    parts.push(`+${discoveredCount} discovered`);
  }
  return parts.join(" · ");
}

// ── Tests ────────────────────────────────────────────────────────────

describe("Task tracking: seed → stelow.json → Muxy", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sw-task-track-"));
  });

  it("seeds planned tasks from spec-tech.md into stelow.json", () => {
    const tracking = makeTracking([
      { id: "scope-1", name: "Auth Foundation", type: "feature", status: "pending" },
    ]);

    const updated = emulatedSeedTasks(tracking, "scope-1", PLANNED_TASKS);

    const scope = findScope(updated, "scope-1");
    expect(scope?.tasks).toHaveLength(3);
    expect(scope?.tasks?.[0].name).toBe("SQLite migration");
    expect(scope?.tasks?.[0].source).toBe("planned");
    expect(scope?.tasks?.[0].status).toBe("pending");
    expect(scope?.tasks?.[1].name).toBe("User CRUD");
    expect(scope?.tasks?.[2].name).toBe("E2E test");

    // Status updated to in-progress
    expect(scope?.status).toBe("in-progress");
  });

  it("validates each task via schema-record.ts after seed", () => {
    const tracking = makeTracking([
      { id: "scope-1", name: "Auth Foundation", type: "feature", status: "pending" },
    ]);

    // Simulate what writeTracking() does: validateScopeTasks before write
    const updated = emulatedSeedTasks(tracking, "scope-1", PLANNED_TASKS);
    const scope = findScope(updated, "scope-1");
    expect(() => validateScopeTasks(scope?.tasks ?? [])).not.toThrow();
  });

  it("re-sync guard rejects empty tasks array (malformed spec-tech)", () => {
    const tracking = makeTracking([
      { id: "scope-1", name: "Auth Foundation", type: "feature", status: "pending" },
    ]);

    expect(() => emulatedSeedTasks(tracking, "scope-1", [])).toThrow(
      /tasks empty or not an array/,
    );
  });

  it("shape validation rejects invalid source", () => {
    const tracking = makeTracking([
      { id: "scope-1", name: "Auth Foundation", type: "feature", status: "pending" },
    ]);

    const badTasks: ScopeTask[] = [
      { id: "1.1", name: "Task", source: "invalid_source" as any, status: "pending" },
    ];

    expect(() => emulatedSeedTasks(tracking, "scope-1", badTasks)).toThrow(
      /invalid source/,
    );
  });

  it("shape validation rejects invalid status", () => {
    const tracking = makeTracking([
      { id: "scope-1", name: "Auth Foundation", type: "feature", status: "pending" },
    ]);

    const badTasks: ScopeTask[] = [
      { id: "1.1", name: "Task", source: "planned", status: "invalid_status" as any },
    ];

    expect(() => emulatedSeedTasks(tracking, "scope-1", badTasks)).toThrow(
      /invalid status/,
    );
  });

  it("shape validation rejects task missing id", () => {
    const tracking = makeTracking([
      { id: "scope-1", name: "Auth Foundation", type: "feature", status: "pending" },
    ]);

    const badTasks = [{ name: "No id task", source: "planned", status: "pending" }] as ScopeTask[];

    expect(() => emulatedSeedTasks(tracking, "scope-1", badTasks)).toThrow(
      /missing id or name/,
    );
  });

  it("appends discovered task with note and increments counter", () => {
    const tracking = makeTracking([
      { id: "scope-1", name: "Auth Foundation", type: "feature", status: "pending", tasks: [...PLANNED_TASKS] },
    ]);

    const updated = emulatedAppendDiscovered(tracking, "scope-1", DISCOVERED_TASK);

    const scope = findScope(updated, "scope-1");
    expect(scope?.tasks).toHaveLength(4);
    expect(scope?.tasks?.[3].source).toBe("discovered");
    expect(scope?.tasks?.[3].note).toBeTruthy();
    expect(scope?.discovered_tasks_count).toBe(1);

    // validateScopeTask accepts it
    const lastTask = scope?.tasks?.[scope.tasks.length - 1];
    expect(() => validateScopeTask(lastTask!)).not.toThrow();
  });

  it("rejects discovered task without note (append guard)", () => {
    const tracking = makeTracking([
      { id: "scope-1", name: "Auth Foundation", type: "feature", status: "pending", tasks: [...PLANNED_TASKS] },
    ]);

    const badTask: ScopeTask = {
      id: "1.5",
      name: "Mystery fix",
      source: "discovered",
      status: "pending",
      // no note
    };

    expect(() => emulatedAppendDiscovered(tracking, "scope-1", badTask)).toThrow(
      /missing note/,
    );
  });

  it("marks task done", () => {
    const tracking = makeTracking([
      { id: "scope-1", name: "Auth Foundation", type: "feature", status: "in-progress", tasks: [...PLANNED_TASKS] },
    ]);

    const updated = emulatedMarkTask(tracking, "scope-1", "1.1", "done");

    const scope = findScope(updated, "scope-1");
    expect(scope?.tasks?.[0].status).toBe("done");
    expect(scope?.tasks?.[1].status).toBe("pending");
  });

  it("marks task skipped", () => {
    const tracking = makeTracking([
      { id: "scope-1", name: "Auth Foundation", type: "feature", status: "in-progress", tasks: [...PLANNED_TASKS] },
    ]);

    const updated = emulatedMarkTask(tracking, "scope-1", "1.3", "skipped");

    const scope = findScope(updated, "scope-1");
    expect(scope?.tasks?.[2].status).toBe("skipped");
  });

  it("multiple discovered appends increment counter correctly", () => {
    const tracking = makeTracking([
      { id: "scope-1", name: "Auth Foundation", type: "feature", status: "pending", tasks: [...PLANNED_TASKS] },
    ]);

    const t2: ScopeTask = { id: "1.5", name: "Fix test flake", source: "discovered", status: "pending", discovered_in_iter: 3, note: "CI flaky on Node 22" };
    const t3: ScopeTask = { id: "1.6", name: "Add logging", source: "discovered", status: "pending", discovered_in_iter: 4, note: "Debugging prod issue" };

    let updated = emulatedAppendDiscovered(tracking, "scope-1", DISCOVERED_TASK);
    updated = emulatedAppendDiscovered(updated, "scope-1", t2);
    updated = emulatedAppendDiscovered(updated, "scope-1", t3);

    const scope = findScope(updated, "scope-1");
    expect(scope?.tasks).toHaveLength(6); // 3 planned + 3 discovered
    expect(scope?.discovered_tasks_count).toBe(3);
  });

  it("appends discovered task even when scope has no tasks yet (edge case)", () => {
    const tracking = makeTracking([
      { id: "scope-1", name: "Auth Foundation", type: "feature", status: "pending" }, // no tasks[]
    ]);

    const updated = emulatedAppendDiscovered(tracking, "scope-1", DISCOVERED_TASK);

    const scope = findScope(updated, "scope-1");
    expect(scope?.tasks).toHaveLength(1);
    expect(scope?.tasks?.[0].source).toBe("discovered");
  });

  describe("Muxy data helpers read seeded tasks", () => {
    it("getScopeProgress aggregates task counts across scopes", () => {
      const scopes: Scope[] = [
        {
          id: "scope-1", name: "Auth", type: "feature", status: "in-progress",
          tasks: [
            { id: "1.1", name: "t1", source: "planned", status: "done" },
            { id: "1.2", name: "t2", source: "planned", status: "pending" },
          ],
        },
        {
          id: "scope-2", name: "DB", type: "feature", status: "completed",
          tasks: [
            { id: "2.1", name: "t3", source: "planned", status: "done" },
            { id: "2.2", name: "t4", source: "planned", status: "done" },
          ],
        },
        {
          id: "scope-3", name: "Cache", type: "optimization", status: "pending",
          // no tasks — scope without task tracking
        },
      ];

      const progress = getScopeProgress({ scopes });
      expect(progress).not.toBeNull();
      expect(progress!.taskTotal).toBe(4); // scope-1(2) + scope-2(2)
      expect(progress!.taskDone).toBe(3);   // 1.1 + 2.1 + 2.2
      expect(progress!.withDiscovered).toBe(0);
    });

    it("getScopeProgress counts discovered scopes", () => {
      const scopes: Scope[] = [
        {
          id: "scope-1", name: "Auth", type: "feature", status: "in-progress",
          tasks: [
            { id: "1.1", name: "t1", source: "planned", status: "done" },
            { id: "1.2", name: "t2", source: "discovered", status: "pending", note: "found during work" },
          ],
        },
      ];

      const progress = getScopeProgress({ scopes });
      expect(progress!.withDiscovered).toBe(1);
    });

    it("getTaskSummaryText formats pipeline card text", () => {
      const scopes: Scope[] = [
        {
          id: "scope-1", name: "Auth", type: "feature", status: "in-progress",
          tasks: [
            { id: "1.1", name: "t1", source: "planned", status: "done" },
            { id: "1.2", name: "t2", source: "planned", status: "pending" },
            { id: "1.3", name: "t3", source: "discovered", status: "pending", note: "flake" },
          ],
        },
      ];

      const text = getTaskSummaryText({ scopes });
      expect(text).toMatch(/tasks 1\/3/);
      expect(text).toMatch(/\+1 discovered/);
    });

    it("getTaskSummaryText returns empty when no tasks exist", () => {
      const scopes: Scope[] = [
        { id: "scope-1", name: "Auth", type: "feature", status: "pending" },
      ];

      expect(getTaskSummaryText({ scopes })).toBe("");
    });

    it("Muxy discovered_tasks_count fallback works when count field drifts", () => {
      // Simulate a scope where bash forgot to increment discovered_tasks_count
      // but tasks[] has discovered entries. Muxy fallback:
      //   discoveredCount = scope.discovered_tasks_count ?? tasks.filter(...)
      const scope: Scope = {
        id: "scope-1", name: "Auth", type: "feature", status: "in-progress",
        // discovered_tasks_count undefined (bash forgot to set it)
        tasks: [
          { id: "1.1", name: "t1", source: "planned", status: "done" },
          { id: "1.2", name: "t2", source: "discovered", status: "pending", note: "found" },
        ],
      };

      // Emulate the Muxy app.js logic
      const hasDiscovered = (scope.discovered_tasks_count ?? 0) > 0 ||
        (Array.isArray(scope.tasks) && scope.tasks.some(t => t.source === "discovered"));
      const discoveredCount = scope.discovered_tasks_count ??
        (Array.isArray(scope.tasks) ? scope.tasks.filter(t => t.source === "discovered").length : 0);

      expect(hasDiscovered).toBe(true); // fallback catches via tasks[]
      expect(discoveredCount).toBe(1);  // fallback counts correctly
    });

    it("full pipeline: seed → mark done → Muxy reads progress", () => {
      let tracking = makeTracking([
        { id: "scope-1", name: "Auth", type: "feature", status: "pending" },
      ]);

      // Step 1: seed planned tasks
      tracking = emulatedSeedTasks(tracking, "scope-1", PLANNED_TASKS);

      // Step 2: mark one done
      tracking = emulatedMarkTask(tracking, "scope-1", "1.1", "done");

      // Step 3: discover a task mid-execution
      tracking = emulatedAppendDiscovered(tracking, "scope-1", DISCOVERED_TASK);

      // Muxy reads
      const wf = tracking.workflows[0];
      const progress = getScopeProgress(wf);
      expect(progress).not.toBeNull();
      expect(progress!.taskTotal).toBe(4);   // 3 planned + 1 discovered
      expect(progress!.taskDone).toBe(1);    // only 1.1 done
      expect(progress!.withDiscovered).toBe(1);

      const text = getTaskSummaryText(wf);
      expect(text).toBe("tasks 1/4 · +1 discovered");

      // schema-record.ts validates all tasks
      const scope = findScope(tracking, "scope-1");
      expect(() => validateScopeTasks(scope?.tasks ?? [])).not.toThrow();
    });
  });
});
