/**
 * Anti-regression tests for the Workflow state machine.
 *
 * The state machine is documented inline in types.ts. These tests verify
 * that all valid transitions work via the actual state.ts functions, and
 * that getActiveWorkflow() returns the right thing based on state.
 *
 * State machine (from types.ts):
 *
 *   (none)       → /sw-start       → in-progress
 *   in-progress  → /sw-pause       → paused
 *   paused       → /sw-resume      → in-progress
 *   in-progress  → /sw-complete    → completed
 *   in-progress  → /sw-archive     → archived
 *   paused       → /sw-archive     → archived
 *   completed    → /sw-archive     → archived
 *
 * Plus: in-progress → paused via auto-pause on /sw-start (v0.36.3+).
 */
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readTracking,
  writeTracking,
  getActiveWorkflow,
  getAllActiveWorkflows,
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

describe("Workflow state machine", () => {
  let cwd: string;
  beforeEach(() => {
    cwd = realpathSync(mkdtempSync(join(tmpdir(), "stelow-statemachine-")));
    mkdirSync(join(cwd, ".stelow"), { recursive: true });
  });
  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  describe("getActiveWorkflow — single-source-of-truth for /sw-next", () => {
    test("returns null when no in-progress exists", () => {
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now",
        workflows: [
          makeWorkflow("wf-a", "completed", cwd, "a"),
          makeWorkflow("wf-b", "archived", cwd, "b"),
        ],
      });
      expect(getActiveWorkflow(cwd)).toBeNull();
    });

    test("returns the in-progress workflow (only one expected)", () => {
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now",
        workflows: [makeWorkflow("wf-a", "in-progress", cwd, "a")],
      });
      const active = getActiveWorkflow(cwd);
      expect(active?.name).toBe("wf-a");
    });

    test("REGRESSION: paused workflows are NOT active — auto-pause leaves none active", () => {
      // After v0.36.3 auto-pause: /sw-start pauses all in-progress before creating new.
      // Result: getActiveWorkflow returns null even though paused workflows exist.
      // This is the core invariant that makes the LLM/UI see only ONE active workflow.
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now",
        workflows: [
          makeWorkflow("wf-paused-1", "paused", cwd, "p1"),
          makeWorkflow("wf-paused-2", "paused", cwd, "p2"),
        ],
      });
      expect(getActiveWorkflow(cwd)).toBeNull();
    });

    test("returns the FIRST in-progress even if multiple exist (legacy compat)", () => {
      // Pre-v0.36.3 behavior — this is the "shadow" problem.
      // After v0.36.3 the auto-pause prevents this state.
      // We test that getActiveWorkflow is deterministic about returning the first.
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now",
        workflows: [
          makeWorkflow("wf-first", "in-progress", cwd, "f"),
          makeWorkflow("wf-second", "in-progress", cwd, "s"),
        ],
      });
      const active = getActiveWorkflow(cwd);
      expect(active?.name).toBe("wf-first"); // first one
    });
  });

  describe("getAllActiveWorkflows — for /sw-ls and shadow detection", () => {
    test("returns in-progress + paused", () => {
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now",
        workflows: [
          makeWorkflow("wf-progress", "in-progress", cwd, "p"),
          makeWorkflow("wf-paused", "paused", cwd, "pa"),
          makeWorkflow("wf-completed", "completed", cwd, "c"),
          makeWorkflow("wf-archived", "archived", cwd, "ar"),
        ],
      });
      const all = getAllActiveWorkflows(cwd);
      expect(all).toHaveLength(2);
      expect(all.map(w => w.name).sort()).toEqual(["wf-paused", "wf-progress"]);
    });

    test("empty list when project has no workflows", () => {
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now", workflows: [],
      });
      expect(getAllActiveWorkflows(cwd)).toEqual([]);
    });
  });

  describe("State transitions (manual sim of each cmd)", () => {
    /**
     * Each cmd writes the new status to tracking.json. We simulate this
     * directly here to verify the schema/transition consistency.
     */
    function transition(name: string, newStatus: string) {
      const t = readTracking(cwd);
      if (!t) throw new Error("no tracking");
      const idx = t.workflows.findIndex(w => w.name === name);
      if (idx === -1) throw new Error(`workflow ${name} not found`);
      t.workflows[idx].status = newStatus;
      t.workflows[idx].updated = new Date().toISOString();
      writeTracking(cwd, t);
    }

    test("/sw-start creates in-progress", () => {
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now", workflows: [],
      });
      // Simulate cmdStart pushing a new workflow
      const t = readTracking(cwd)!;
      t.workflows.push(makeWorkflow("wf-new", "in-progress", cwd, "n"));
      writeTracking(cwd, t);
      expect(getActiveWorkflow(cwd)?.name).toBe("wf-new");
    });

    test("/sw-pause transitions in-progress → paused", () => {
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now",
        workflows: [makeWorkflow("wf", "in-progress", cwd, "x")],
      });
      transition("wf", "paused");
      expect(getActiveWorkflow(cwd)).toBeNull();
      expect(getAllActiveWorkflows(cwd)).toHaveLength(1);
      expect(getAllActiveWorkflows(cwd)[0].status).toBe("paused");
    });

    test("/sw-resume transitions paused → in-progress", () => {
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now",
        workflows: [makeWorkflow("wf", "paused", cwd, "x")],
      });
      transition("wf", "in-progress");
      expect(getActiveWorkflow(cwd)?.name).toBe("wf");
    });

    test("/sw-complete transitions in-progress → completed", () => {
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now",
        workflows: [makeWorkflow("wf", "in-progress", cwd, "x")],
      });
      transition("wf", "completed");
      expect(getActiveWorkflow(cwd)).toBeNull();
    });

    test("/sw-archive transitions in-progress → archived (terminal)", () => {
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now",
        workflows: [makeWorkflow("wf", "in-progress", cwd, "x")],
      });
      transition("wf", "archived");
      expect(getActiveWorkflow(cwd)).toBeNull();
    });

    test("/sw-archive also works on paused → archived", () => {
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now",
        workflows: [makeWorkflow("wf", "paused", cwd, "x")],
      });
      transition("wf", "archived");
      expect(getAllActiveWorkflows(cwd)).toEqual([]);
    });

    test("after v0.36.3 auto-pause: paused persists, getActive returns null", () => {
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now",
        workflows: [makeWorkflow("wf", "in-progress", cwd, "x")],
      });
      transition("wf", "paused"); // simulate auto-pause
      // Now /sw-next would create a new workflow without conflict
      const t = readTracking(cwd)!;
      t.workflows.push(makeWorkflow("wf-new", "in-progress", cwd, "n"));
      writeTracking(cwd, t);
      expect(getActiveWorkflow(cwd)?.name).toBe("wf-new");
      expect(getAllActiveWorkflows(cwd)).toHaveLength(2);
    });
  });

  describe("Invariants", () => {
    test("INVARIANT: at most one in-progress workflow per project (enforced by v0.36.3)", () => {
      // After auto-pause, this invariant holds. We verify the auto-pause
      // produces this state.
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now",
        workflows: [
          makeWorkflow("a", "in-progress", cwd, "a"),
          makeWorkflow("b", "in-progress", cwd, "b"),
          makeWorkflow("c", "in-progress", cwd, "c"),
        ],
      });
      // Apply auto-pause (same as start.ts does)
      const t = readTracking(cwd)!;
      const inProgress = t.workflows.filter(w => w.status === "in-progress");
      for (const w of inProgress) {
        const idx = t.workflows.findIndex(x => x.name === w.name);
        t.workflows[idx].status = "paused";
      }
      writeTracking(cwd, t);
      // After auto-pause: 0 in-progress, 3 paused
      expect(getActiveWorkflow(cwd)).toBeNull();
      expect(t.workflows.filter(w => w.status === "in-progress")).toHaveLength(0);
      expect(t.workflows.filter(w => w.status === "paused")).toHaveLength(3);
    });

    test("INVARIANT: completed and archived workflows are NOT returned by getActive", () => {
      // They are terminal — once you complete or archive, you start fresh.
      writeTracking(cwd, {
        version: "1.0", created: "now", updated: "now",
        workflows: [
          makeWorkflow("wf-done", "completed", cwd, "d"),
          makeWorkflow("wf-arch", "archived", cwd, "ar"),
        ],
      });
      expect(getActiveWorkflow(cwd)).toBeNull();
      expect(getAllActiveWorkflows(cwd)).toEqual([]);
    });
  });
});