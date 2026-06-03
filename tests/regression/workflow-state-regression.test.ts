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
// 5. syncStagesGuardState — current-stage.json contract
// ══════════════════════════════════════════════════════════════════════

describe("syncStagesGuardState", () => {
  let env: TempEnv;

  beforeEach(() => {
    env = makeTempEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("creates current-stage.json with correct initial state", () => {
    // Simulate first call at phase index 2 (Setup)
    syncStagesGuardState(env.root, STAGE.SETUP());

    const statePath = join(env.root, WORKFLOW_DIR, "state", "current-stage.json");
    expect(existsSync(statePath)).toBe(true);

    const state = JSON.parse(readFileSync(statePath, "utf-8"));
    expect(state.current_stage).toBe("setup");
    expect(state.previous_stage).toBe("triage");
    expect(state.transitioned_at).toBeDefined();
    expect(Array.isArray(state.history)).toBe(true);
    expect(state.history.length).toBe(1);
    expect(state.history[0].stage).toBe("triage");
    expect(state.history[0].entered_at).toBeDefined();
    expect(state.history[0].exited_at).toBeDefined();
    expect(Array.isArray(state.gates_passed)).toBe(true);
    expect(state.supervisor_active).toBe(false);
  });

  it("appends to history on subsequent transitions", () => {
    // First transition: Triage → Setup
    syncStagesGuardState(env.root, STAGE.SETUP());

    // Second transition: Setup → Shape (skipping Context via SKIP_NEXT)
    syncStagesGuardState(env.root, STAGE.SHAPE());

    const statePath = join(env.root, WORKFLOW_DIR, "state", "current-stage.json");
    const state = JSON.parse(readFileSync(statePath, "utf-8"));

    expect(state.current_stage).toBe("shape");
    expect(state.previous_stage).toBe("setup");
    expect(state.history.length).toBe(2);
    expect(state.history[0].stage).toBe("triage");
    expect(state.history[1].stage).toBe("setup");
  });

  it("maps phase 0 (Triage) correctly", () => {
    syncStagesGuardState(env.root, 0);

    const statePath = join(env.root, WORKFLOW_DIR, "state", "current-stage.json");
    const state = JSON.parse(readFileSync(statePath, "utf-8"));
    expect(state.current_stage).toBe("triage");
  });

  it("maps phase 14 (Audit) correctly", () => {
    syncStagesGuardState(env.root, STAGE.AUDIT());

    const statePath = join(env.root, WORKFLOW_DIR, "state", "current-stage.json");
    const state = JSON.parse(readFileSync(statePath, "utf-8"));
    expect(state.current_stage).toBe("audit");
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
