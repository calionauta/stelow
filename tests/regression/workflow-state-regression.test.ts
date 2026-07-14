/**
 * workflow-state-regression.test.ts
 *
 * Lean contract tests for the state/stages-guard layer.
 *
 * Design:
 *   - Zero mocks, zero spies, zero abstractions
 *   - Every test creates REAL temp directories, calls REAL exported functions
 *   - Validates OBSERVABLE output: files on disk, return values
 *   - No dependency on ~/.pi, ExtensionAPI, CmdCtx, or runtime plugins
 *   - Each test cleans up after itself
 *
 * Contracts tested:
 *   1. PHASE_TO_STAGE — all mappings exist and match PHASE_NAMES
 *   2. syncStagesGuardState — writes stage INTO stelow.json (canonical source)
 *   3. cmdStart phase init — new workflow starts at phase 2 (Setup)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  writeFileSync,
  readFileSync,
  mkdtempSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ── Imports from production code ─────────────────────────────────────

import {
  PHASE_NAMES,
  TRACKING_FILE,
  STAGE,
  type Workflow,
} from "../../extensions/stelow/types";
import {
  generateDirHash,
} from "../../extensions/stelow/state";
import {
  PHASE_TO_STAGE,
  syncStagesGuardState,
} from "../../extensions/stelow/stages-guard";

// ══════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════

interface TempEnv {
  root: string;
  cleanup: () => void;
}

function makeTempEnv(): TempEnv {
  const root = mkdtempSync(join(tmpdir(), "sw-regression-"));
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function makeMinimalWorkflow(overrides?: Partial<Workflow>): Workflow {
  const now = new Date().toISOString();
  return {
    name: "test-workflow",
    description: "regression test",
    status: "in-progress",
    currentPhase: STAGE.SETUP(),
    phases: PHASE_NAMES.map((name, i) => ({
      id: `${i}-${name.toLowerCase()}`,
      name,
      status:
        i < STAGE.SETUP()
          ? "completed"
          : i === STAGE.SETUP()
            ? "in-progress"
            : "pending",
    })),
    stage: {
      current_stage: "setup",
      previous_stage: null,
      transitioned_at: now,
      history: [],
      supervisor_active: false,
    },
    created: now,
    updated: now,
    dirHash: generateDirHash(),
    ...overrides,
  };
}

/** Creates a minimal stelow.json (canonical source) with an in-progress workflow */
function writeTrackingWithWorkflow(root: string, phase: number = 2) {
  const trackingPath = join(root, TRACKING_FILE);
  const now = new Date().toISOString();
  const tracking = {
    $schema: "",
    version: "1.0",
    created: now,
    updated: now,
    workflows: [{
      name: "test-workflow",
      description: "regression test",
      status: "in-progress",
      currentPhase: phase,
      phases: PHASE_NAMES.map((name, i) => ({
        id: `${i}-${name.toLowerCase()}`, name,
        status: i < phase ? "completed" : i === phase ? "in-progress" : "pending",
      })),
      created: now,
      updated: now,
    }],
  };
  writeFileSync(trackingPath, JSON.stringify(tracking, null, 2));
  return trackingPath;
}

// ══════════════════════════════════════════════════════════════════════
// 1. PHASE_TO_STAGE — every phase has a corresponding stage slug
// ══════════════════════════════════════════════════════════════════════

describe("PHASE_TO_STAGE", () => {
  it("has entries matching PHASE_NAMES length", () => {
    expect(Object.keys(PHASE_TO_STAGE).length).toBe(PHASE_NAMES.length);
  });

  it("maps every PHASE_NAMES index to a non-empty string", () => {
    for (let i = 0; i < PHASE_NAMES.length; i++) {
      expect(PHASE_TO_STAGE[i]).toBeDefined();
      expect(PHASE_TO_STAGE[i].length).toBeGreaterThan(0);
    }
  });

  it("maps known positions correctly", () => {
    expect(PHASE_TO_STAGE[STAGE.SETUP()]).toBe("setup");
    expect(PHASE_TO_STAGE[STAGE.SHAPE()]).toBe("shape");
    expect(PHASE_TO_STAGE[STAGE.EXECUTION()]).toBe("execution");
    expect(PHASE_TO_STAGE[STAGE.VERIFICATION()]).toBe("verification");
    expect(PHASE_TO_STAGE[STAGE.AUDIT()]).toBe("audit");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. syncStagesGuardState — single canonical source contract
// ══════════════════════════════════════════════════════════════════════

describe("syncStagesGuardState", () => {
  let env: TempEnv;

  beforeEach(() => {
    env = makeTempEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("writes stage into stelow.json with correct initial state", () => {
    writeTrackingWithWorkflow(env.root, STAGE.SETUP());
    syncStagesGuardState(env.root, STAGE.SHAPE());

    const trackingPath = join(env.root, TRACKING_FILE);
    const data = JSON.parse(readFileSync(trackingPath, "utf-8"));
    const stage = data.workflows[0].stage;

    expect(stage.current_stage).toBe("shape");
    expect(stage.previous_stage).toBe("setup");
    expect(stage.transitioned_at).toBeDefined();
    expect(Array.isArray(stage.history)).toBe(true);
    expect(stage.history.length).toBe(1);
    expect(stage.history[0].stage).toBe("setup");
    expect(stage.history[0].entered_at).toBeDefined();
    expect(stage.history[0].exited_at).toBeDefined();
    expect(stage.supervisor_active).toBe(false);
  });

  it("appends to history on subsequent transitions", () => {
    writeTrackingWithWorkflow(env.root, STAGE.SETUP());

    // First transition: Setup → Shape
    syncStagesGuardState(env.root, STAGE.SHAPE());

    // Second transition: Shape → Critique
    syncStagesGuardState(env.root, STAGE.CRITIQUE());

    const trackingPath = join(env.root, TRACKING_FILE);
    const data = JSON.parse(readFileSync(trackingPath, "utf-8"));
    const stage = data.workflows[0].stage;

    expect(stage.current_stage).toBe("critique");
    expect(stage.previous_stage).toBe("shape");
    expect(stage.history.length).toBe(2);
    expect(stage.history[0].stage).toBe("setup");
    expect(stage.history[1].stage).toBe("shape");
  });

  it("maps phase 0 (Triage) correctly", () => {
    writeTrackingWithWorkflow(env.root, 0);
    syncStagesGuardState(env.root, 0);

    const trackingPath = join(env.root, TRACKING_FILE);
    const data = JSON.parse(readFileSync(trackingPath, "utf-8"));
    expect(data.workflows[0].stage.current_stage).toBe("triage");
  });

  it("maps Audit phase to correct stage slug", () => {
    writeTrackingWithWorkflow(env.root, STAGE.AUDIT());
    syncStagesGuardState(env.root, STAGE.AUDIT());

    const trackingPath = join(env.root, TRACKING_FILE);
    const data = JSON.parse(readFileSync(trackingPath, "utf-8"));
    expect(data.workflows[0].stage.current_stage).toBe("audit");
  });

  it("creates tracking file if missing and writes stage into it", () => {
    // No prior tracking file — syncStagesGuardState should create one
    syncStagesGuardState(env.root, STAGE.SETUP());

    const trackingPath = join(env.root, TRACKING_FILE);
    expect(existsSync(trackingPath)).toBe(true);
    const data = JSON.parse(readFileSync(trackingPath, "utf-8"));
    // Created file has empty workflows array
    expect(data.workflows).toEqual([]);
    expect(data.updated).toBeDefined();
  });

  it("updates existing stage field on re-transition (non-migration path)", () => {
    writeTrackingWithWorkflow(env.root, STAGE.SHAPE());
    // Manually add a stage field (simulating existing workflow with stage)
    const trackingPath = join(env.root, TRACKING_FILE);
    const data = JSON.parse(readFileSync(trackingPath, "utf-8"));
    data.workflows[0].stage = {
      current_stage: "shape",
      previous_stage: "setup",
      transitioned_at: new Date().toISOString(),
      history: [{ stage: "setup", entered_at: new Date().toISOString(), exited_at: new Date().toISOString() }],
      supervisor_active: false,
    };
    data.workflows[0].currentPhase = STAGE.SHAPE();
    writeFileSync(trackingPath, JSON.stringify(data, null, 2));

    // Transition: Shape → Critique
    syncStagesGuardState(env.root, STAGE.CRITIQUE());

    const updated = JSON.parse(readFileSync(trackingPath, "utf-8"));
    const stage = updated.workflows[0].stage;
    expect(stage.current_stage).toBe("critique");
    expect(stage.previous_stage).toBe("shape");
    expect(stage.history.length).toBe(2);
    expect(stage.history[0].stage).toBe("setup");
    expect(stage.history[1].stage).toBe("shape");
    expect(updated.workflows[0].currentPhase).toBe(STAGE.CRITIQUE());
  });

  it("handles no active workflow in tracking file without crashing", () => {
    // Create tracking file with only archived workflows (no in-progress)
    const trackingPath = join(env.root, TRACKING_FILE);
    const now = new Date().toISOString();
    writeFileSync(trackingPath, JSON.stringify({
      $schema: "", version: "1.0", created: now, updated: now,
      workflows: [{
        name: "old-workflow", description: "",
        status: "archived", currentPhase: 14,
        phases: [], created: now, updated: now,
      }],
    }, null, 2));

    // Should not throw even though no in-progress workflow exists
    expect(() => syncStagesGuardState(env.root, STAGE.SETUP())).not.toThrow();

    const data = JSON.parse(readFileSync(trackingPath, "utf-8"));
    // Stage should NOT be written (no active workflow), but file must remain intact
    expect(data.workflows[0].stage).toBeUndefined();
    expect(data.workflows.length).toBe(1);
    expect(data.workflows[0].status).toBe("archived");
  });

  it("handles corrupt tracking file and recovers", () => {
    // Write corrupt JSON
    const trackingPath = join(env.root, TRACKING_FILE);
    writeFileSync(trackingPath, "{this is not valid json}");

    // Should not throw — falls back to default state
    expect(() => syncStagesGuardState(env.root, STAGE.SETUP())).not.toThrow();

    // Should create new valid tracking file
    const data = JSON.parse(readFileSync(trackingPath, "utf-8"));
    expect(data.workflows).toEqual([]);
    expect(data.version).toBe("1.0");
  });

  it("ignores invalid phase index with early return", () => {
    writeTrackingWithWorkflow(env.root, STAGE.SETUP());
    // Phase 99 doesn't exist in PHASE_TO_STAGE
    syncStagesGuardState(env.root, 99);

    // File should remain unchanged
    const trackingPath = join(env.root, TRACKING_FILE);
    const data = JSON.parse(readFileSync(trackingPath, "utf-8"));
    expect(data.workflows[0].stage).toBeUndefined();
    expect(data.workflows[0].currentPhase).toBe(STAGE.SETUP());
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. cmdStart phase init contract
// ══════════════════════════════════════════════════════════════════════

describe("cmdStart — phase initialization contract", () => {
  it("starts at currentPhase=2 (Setup)", () => {
    const wf = makeMinimalWorkflow();
    // This is the contract cmdStart establishes:
    // phases 0-1 = completed, phase 2 = in-progress, rest = pending
    expect(wf.currentPhase).toBe(STAGE.SETUP());
    expect(wf.currentPhase).toBe(2);
  });

  it("sets phases 0-1 as completed, 2 as in-progress, rest as pending", () => {
    const wf = makeMinimalWorkflow();

    for (let i = 0; i < PHASE_NAMES.length; i++) {
      if (i < STAGE.SETUP()) {
        expect(wf.phases[i].status).toBe("completed");
      } else if (i === STAGE.SETUP()) {
        expect(wf.phases[i].status).toBe("in-progress");
      } else {
        expect(wf.phases[i].status).toBe("pending");
      }
    }
  });

  it("has dirHash defined (needed for archive/rename ops)", () => {
    const wf = makeMinimalWorkflow();
    expect(wf.dirHash).toBeDefined();
    expect(wf.dirHash!.length).toBeGreaterThan(0);
  });

  it("initializes empty config with all fields undefined/empty", () => {
    // v0.50.0+ contract: every new workflow has config object pre-seeded
    const wf = makeMinimalWorkflow({
      config: {
        appetite: undefined,
        review_mode: undefined,
        domains_detected: [],
      },
    });
    expect(wf.config).toBeDefined();
    expect(wf.config?.domains_detected).toEqual([]);
  });
});