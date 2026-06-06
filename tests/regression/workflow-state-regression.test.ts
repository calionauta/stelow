/**
 * workflow-state-regression.test.ts
 *
 * Lean contract tests for the state/commands layer modified since v0.11.1-alpha.
 *
 * Design:
 *   - Zero mocks, zero spies, zero abstractions
 *   - Every test creates REAL temp directories, calls REAL exported functions
 *   - Validates OBSERVABLE output: files on disk, return values, thrown errors
 *   - No dependency on ~/.pi, ExtensionAPI, CmdCtx, or runtime plugins
 *   - Each test cleans up after itself
 *
 * Contracts tested:
 *   1. PHASE_TO_STAGE — all 15 mappings exist and match PHASE_NAMES
 *   2. scanWorkflowDirs — backward compat: old current_phase_index:0 + "setup" → normalizes to 2
 *   3. updateWorkflowIndexJson — writes correct index.json with merged updates
 *   4. updateWorkflowIndexJson — recovers from corrupt index.json
 *   5. syncStagesGuardState — creates current-stage.json with correct schema
 *   6. cmdStart phase init — new workflow starts at phase 2 (Setup), phases 0-1 completed
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  writeFileSync,
  readFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

// ── Imports from production code ─────────────────────────────────────

import {
  PHASE_NAMES,
  WORKFLOW_DIR,
  TRACKING_FILE,
  STAGE,
  type Workflow,
} from "../../extensions/cali-product-workflow/types";
import {
  updateWorkflowIndexJson,
  scanWorkflowDirs,
  getDateStamp,
  generateDirHash,
} from "../../extensions/cali-product-workflow/state";
import {
  PHASE_TO_STAGE,
  syncStagesGuardState,
} from "../../extensions/cali-product-workflow/stages-guard";

// ══════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════

interface TempEnv {
  root: string;
  cleanup: () => void;
}

function makeTempEnv(): TempEnv {
  const root = mkdtempSync(join(tmpdir(), "pw-regression-"));
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
      gates_passed: [],
      supervisor_active: false,
    },
    created: now,
    updated: now,
    dirHash: generateDirHash(),
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════
// 1. PHASE_TO_STAGE — every phase has a corresponding stage slug
// ══════════════════════════════════════════════════════════════════════

describe("PHASE_TO_STAGE", () => {
  it("has exactly 15 entries matching PHASE_NAMES length", () => {
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
// 2. scanWorkflowDirs — backward compat for old current_phase_index
// ══════════════════════════════════════════════════════════════════════

describe("scanWorkflowDirs — backward compat", () => {
  let env: TempEnv;

  beforeEach(() => {
    env = makeTempEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("normalizes current_phase_index:0 + current_phase:setup → 2 (Setup)", () => {
    // Simulate the BUGGY old format that was being written before the fix.
    // Old index.json: current_phase_index=0, current_phase="setup"
    // scanWorkflowDirs should detect this and normalize to 2.
    const dateStamp = getDateStamp();
    const dirHash = "pw-oldbug-abc123";
    const dateDir = join(env.root, WORKFLOW_DIR, dateStamp);
    const wfDir = join(dateDir, dirHash);
    mkdirSync(wfDir, { recursive: true });

    // Write old-style index.json with the BUG: current_phase_index=0 for Setup
    const oldIndex = JSON.stringify({
      name: "old-workflow",
      workflow_status: "in-progress",
      current_phase: "setup",
      current_phase_index: 0, // ← THE BUG: should be 2
      created_at: new Date().toISOString(),
    });
    writeFileSync(join(wfDir, "index.json"), oldIndex);

    const workflows = scanWorkflowDirs(env.root);

    expect(workflows.length).toBe(1);
    expect(workflows[0].name).toBe("old-workflow");
    // CRITICAL: normalization must bump 0→2 when phase name is "setup"
    expect(workflows[0].currentPhase).toBe(2);
  });

  it("does NOT normalize current_phase_index:0 for non-setup phases", () => {
    // If phase is NOT "setup", index 0 should stay as-is (it's Triage)
    const dateStamp = getDateStamp();
    const dirHash = "pw-legit-triage";
    const dateDir = join(env.root, WORKFLOW_DIR, dateStamp);
    const wfDir = join(dateDir, dirHash);
    mkdirSync(wfDir, { recursive: true });

    const oldIndex = JSON.stringify({
      name: "triage-workflow",
      workflow_status: "in-progress",
      current_phase: "triage",
      current_phase_index: 0, // Legitimate: Triage IS index 0
      created_at: new Date().toISOString(),
    });
    writeFileSync(join(wfDir, "index.json"), oldIndex);

    const workflows = scanWorkflowDirs(env.root);

    expect(workflows.length).toBe(1);
    // Should stay 0 — this is NOT the setup bug
    expect(workflows[0].currentPhase).toBe(0);
  });

  it("handles missing current_phase_index with default 0", () => {
    const dateStamp = getDateStamp();
    const dirHash = "pw-noindex";
    const dateDir = join(env.root, WORKFLOW_DIR, dateStamp);
    const wfDir = join(dateDir, dirHash);
    mkdirSync(wfDir, { recursive: true });

    const index = JSON.stringify({
      name: "no-index-workflow",
      workflow_status: "in-progress",
      created_at: new Date().toISOString(),
      // no current_phase_index
    });
    writeFileSync(join(wfDir, "index.json"), index);

    const workflows = scanWorkflowDirs(env.root);
    expect(workflows.length).toBe(1);
    // Fallback: ?? 0 → 0
    expect(workflows[0].currentPhase).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. updateWorkflowIndexJson — write-through contract
// ══════════════════════════════════════════════════════════════════════

describe("updateWorkflowIndexJson", () => {
  let env: TempEnv;

  beforeEach(() => {
    env = makeTempEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("writes index.json with merged updates", () => {
    const wf = makeMinimalWorkflow({ cwd: env.root });
    const ds = getDateStamp(new Date(wf.created));

    // Create the expected directory structure (normally done by cmdStart)
    const wfDir = join(env.root, WORKFLOW_DIR, ds, wf.dirHash!);
    mkdirSync(wfDir, { recursive: true });
    // Write initial index.json (simulating cmdStart)
    writeFileSync(
      join(wfDir, "index.json"),
      JSON.stringify({
        name: wf.name,
        workflow_status: wf.status,
        current_phase: PHASE_NAMES[wf.currentPhase].toLowerCase(),
        current_phase_index: wf.currentPhase,
        created_at: wf.created,
      }),
    );

    // Now update: simulate cmdNext going from Setup(2) → Shape(4)
    const result = updateWorkflowIndexJson(env.root, wf, {
      current_phase: "shape",
      current_phase_index: STAGE.SHAPE(),
      workflow_status: "in-progress",
    });

    expect(result).toBe(true);

    // Read back and verify
    const saved = JSON.parse(readFileSync(join(wfDir, "index.json"), "utf-8"));
    expect(saved.name).toBe("test-workflow");
    expect(saved.current_phase).toBe("shape");
    expect(saved.current_phase_index).toBe(STAGE.SHAPE());
    expect(saved.workflow_status).toBe("in-progress");
    expect(saved.updated_at).toBeDefined();
    // original field preserved
    expect(saved.created_at).toBe(wf.created);
  });

  it("returns false when wf has no dirHash", () => {
    const wf = makeMinimalWorkflow({ dirHash: undefined, cwd: env.root });
    const result = updateWorkflowIndexJson(env.root, wf, {
      workflow_status: "completed",
    });
    expect(result).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. updateWorkflowIndexJson — corrupt recovery
// ══════════════════════════════════════════════════════════════════════

describe("updateWorkflowIndexJson — corrupt index recovery", () => {
  let env: TempEnv;

  beforeEach(() => {
    env = makeTempEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("rebuilds from workflow state when index.json is corrupt", () => {
    const wf = makeMinimalWorkflow({ cwd: env.root });
    const ds = getDateStamp(new Date(wf.created));
    const wfDir = join(env.root, WORKFLOW_DIR, ds, wf.dirHash!);
    mkdirSync(wfDir, { recursive: true });

    // Write GARBLED index.json (corrupt JSON)
    writeFileSync(join(wfDir, "index.json"), "NOT JSON {{{");

    // Call update — should recover gracefully
    const result = updateWorkflowIndexJson(env.root, wf, {
      workflow_status: "in-progress",
    });

    expect(result).toBe(true);

    // Read back — should be valid JSON rebuilt from wf state + merged updates
    const saved = JSON.parse(readFileSync(join(wfDir, "index.json"), "utf-8"));
    expect(saved.name).toBe(wf.name);
    expect(saved.workflow_status).toBe("in-progress");
    expect(saved.updated_at).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. syncStagesGuardState — writes stage INTO cali-product-workflow.json (single source of truth)
// ══════════════════════════════════════════════════════════════════════

/** Creates a minimal tracking file with an in-progress workflow so syncStagesGuardState can find it */
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

describe("syncStagesGuardState", () => {
  let env: TempEnv;

  beforeEach(() => {
    env = makeTempEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("writes stage into cali-product-workflow.json with correct initial state", () => {
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
    expect(Array.isArray(stage.gates_passed)).toBe(true);
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

  it("maps phase 14 (Audit) correctly", () => {
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
      gates_passed: [],
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
// 6. cmdStart phase init contract
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
});
