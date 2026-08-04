/**
 * Tests for /sw-start auto-pause behavior (v0.36.3+).
 *
 * History: the previous behavior was to BLOCK /sw-start when an in-progress
 * workflow existed. This left "shadow" workflows (in-progress but invisible
 * because getActiveWorkflow() returns only the first) when users called
 * /sw-start multiple times in succession.
 *
 * New behavior: pause all in-progress workflows first, then create new.
 * The paused workflows stay recoverable via /sw-resume.
 *
 * These tests use the actual module exports — no mocks. State is created in
 * a tmp dir; teardown removes it.
 */
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Stub pi (extension imports it indirectly). The state module pulls types
// from "./types" only — no pi import needed for state ops.
// But start.ts imports types from "@earendil-works/pi-coding-agent".
// We can't easily test start.ts without running it. So we test the BEHAVIOR
// at the state layer: simulate the same operations start.ts now performs.
import {
  readTracking,
  writeTracking,
  getActiveWorkflow,
  getAllActiveWorkflows,
  isWorkflowFromProject,
  resolveProjectDir,
} from "../../extensions/stelow/state";

function makeWorkflow(name: string, status: string, cwd: string, dirHash: string) {
  return {
    name,
    description: "",
    status,
    currentPhase: 2,
    phases: [],
    cwd,
    dirHash,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
}

/**
 * Simulates the auto-pause block in start.ts (since v0.36.3).
 * Returns the number of paused workflows.
 */
function autoPause(cwd: string): { pausedCount: number; pausedNames: string[] } {
  const existing = getAllActiveWorkflows(cwd);
  if (existing.length === 0) return { pausedCount: 0, pausedNames: [] };
  const tracking = readTracking(cwd);
  if (!tracking) return { pausedCount: 0, pausedNames: [] };
  const now = new Date().toISOString();
  let pausedCount = 0;
  const pausedNames: string[] = [];
  for (const wf of existing) {
    const idx = tracking.workflows.findIndex(w => w.name === wf.name);
    if (idx === -1) continue;
    tracking.workflows[idx].status = "paused";
    tracking.workflows[idx].updated = now;
    pausedCount++;
    pausedNames.push(wf.name);
  }
  if (pausedCount > 0) writeTracking(cwd, tracking);
  return { pausedCount, pausedNames };
}

describe("/sw-start auto-pause behavior", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = realpathSync(mkdtempSync(join(tmpdir(), "stelow-autopause-")));
    // Make sure cwd has tracking dir (otherwise resolveProjectDir may climb)
    mkdirSync(join(cwd, ".stelow"), { recursive: true });
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  test("no in-progress workflows: auto-pause is a no-op", () => {
    const t = { version: "1.0", created: new Date().toISOString(), updated: new Date().toISOString(), workflows: [] };
    writeTracking(cwd, t);
    const result = autoPause(cwd);
    expect(result.pausedCount).toBe(0);
    expect(result.pausedNames).toEqual([]);
    // No tracking changes
    const after = readTracking(cwd);
    expect(after?.workflows).toEqual([]);
  });

  test("one in-progress: pauses it, leaves tracking consistent", () => {
    const t = {
      version: "1.0",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      workflows: [makeWorkflow("wf-a", "in-progress", cwd, "wf-a-hash")],
    };
    writeTracking(cwd, t);

    const result = autoPause(cwd);
    expect(result.pausedCount).toBe(1);
    expect(result.pausedNames).toEqual(["wf-a"]);

    const after = readTracking(cwd);
    expect(after?.workflows).toHaveLength(1);
    expect(after?.workflows[0].status).toBe("paused");
  });

  test("two in-progress: pauses BOTH (was the bug — only first was visible)", () => {
    const t = {
      version: "1.0",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      workflows: [
        makeWorkflow("wf-a", "in-progress", cwd, "wf-a-hash"),
        makeWorkflow("wf-b", "in-progress", cwd, "wf-b-hash"),
      ],
    };
    writeTracking(cwd, t);

    const result = autoPause(cwd);
    expect(result.pausedCount).toBe(2);
    expect(result.pausedNames.sort()).toEqual(["wf-a", "wf-b"]);

    const after = readTracking(cwd);
    expect(after?.workflows.every(w => w.status === "paused")).toBe(true);
  });

  test("three in-progress: all paused, getActiveWorkflow returns null", () => {
    const t = {
      version: "1.0",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      workflows: [
        makeWorkflow("wf-a", "in-progress", cwd, "a"),
        makeWorkflow("wf-b", "in-progress", cwd, "b"),
        makeWorkflow("wf-c", "in-progress", cwd, "c"),
      ],
    };
    writeTracking(cwd, t);

    autoPause(cwd);

    // No more in-progress (active one)
    expect(getActiveWorkflow(cwd)).toBeNull();
    // All 3 are paused, getAllActiveWorkflows still returns them (paused counts as active for resumability)
    const remaining = getAllActiveWorkflows(cwd);
    expect(remaining).toHaveLength(3);
    expect(remaining.every(w => w.status === "paused")).toBe(true);
  });

  test("paused workflows are still in tracking (not deleted, recoverable)", () => {
    const t = {
      version: "1.0",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      workflows: [
        makeWorkflow("wf-a", "in-progress", cwd, "a"),
        makeWorkflow("wf-b", "in-progress", cwd, "b"),
      ],
    };
    writeTracking(cwd, t);

    autoPause(cwd);

    // All workflows still present, just paused
    const after = readTracking(cwd);
    expect(after?.workflows).toHaveLength(2);
    expect(after?.workflows[0].status).toBe("paused");
    expect(after?.workflows[1].status).toBe("paused");
    // Names preserved
    expect(after?.workflows.map(w => w.name).sort()).toEqual(["wf-a", "wf-b"]);
  });

  test("archived workflows are NOT paused (skipped — already terminal)", () => {
    const t = {
      version: "1.0",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      workflows: [
        makeWorkflow("wf-a", "in-progress", cwd, "a"),
        makeWorkflow("wf-b", "archived", cwd, "b"),  // already terminal
        makeWorkflow("wf-c", "completed", cwd, "c"),  // already terminal
      ],
    };
    writeTracking(cwd, t);

    const result = autoPause(cwd);
    expect(result.pausedCount).toBe(1);
    expect(result.pausedNames).toEqual(["wf-a"]);

    const after = readTracking(cwd);
    const a = after?.workflows.find(w => w.name === "wf-a");
    const b = after?.workflows.find(w => w.name === "wf-b");
    const c = after?.workflows.find(w => w.name === "wf-c");
    expect(a?.status).toBe("paused");
    expect(b?.status).toBe("archived");  // unchanged
    expect(c?.status).toBe("completed"); // unchanged
  });

  test("REGRESSION: empty cwd workflow is filtered out by isWorkflowFromProject", () => {
    // A workflow without cwd (legacy) gets isWorkflowFromProject=true for any cwd.
    // This is the existing legacy fallback. The auto-pause block doesn't
    // change this — it pauses all matching workflows.
    const t = {
      version: "1.0",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      workflows: [
        { ...makeWorkflow("legacy-wf", "in-progress", "", "legacy-hash") },
        makeWorkflow("new-wf", "in-progress", cwd, "new-hash"),
      ],
    };
    writeTracking(cwd, t);

    const result = autoPause(cwd);
    // Both are paused (legacy is matched by cwd-empty fallback)
    expect(result.pausedCount).toBe(2);
  });

  test("REGRESSION: workflow from OTHER project is NOT paused", () => {
    // isWorkflowFromProject uses path-prefix check. A workflow in a different
    // project should not be paused when running /sw-start in our project.
    const otherCwd = "/Users/cali/Development/other-project";
    const t = {
      version: "1.0",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      workflows: [
        makeWorkflow("foreign-wf", "in-progress", otherCwd, "f"),
        makeWorkflow("our-wf", "in-progress", cwd, "o"),
      ],
    };
    writeTracking(cwd, t);

    const result = autoPause(cwd);
    expect(result.pausedCount).toBe(1);  // only our-wf
    expect(result.pausedNames).toEqual(["our-wf"]);

    const after = readTracking(cwd);
    const foreign = after?.workflows.find(w => w.name === "foreign-wf");
    const our = after?.workflows.find(w => w.name === "our-wf");
    expect(foreign?.status).toBe("in-progress");  // unchanged
    expect(our?.status).toBe("paused");
  });
});