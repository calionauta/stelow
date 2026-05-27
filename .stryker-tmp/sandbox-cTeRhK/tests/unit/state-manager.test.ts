// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import type { StageState, StagesConfig } from "../../types/stages";

function loadState(path: string): StageState {
  if (!existsSync(path)) {
    return {
      current_stage: "triage",
      previous_stage: null,
      transitioned_at: new Date().toISOString(),
      history: [],
      gates_passed: [],
      supervisor_active: false,
    };
  }
  return JSON.parse(require("fs").readFileSync(path, "utf-8"));
}

function saveState(path: string, state: StageState): void {
  require("fs").writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");
}

function transition(
  statePath: string,
  toStage: string,
  stages: StagesConfig,
  _transitionType: string = "next"
): StageState {
  const state = loadState(statePath);
  const stage = stages.stages.find((s) => s.name === toStage);
  const now = new Date().toISOString();

  if (state.history.length > 0) {
    const last = state.history[state.history.length - 1];
    if (last && !last.exited_at) {
      last.exited_at = now;
    }
  }

  state.history.push({
    stage: toStage,
    entered_at: now,
    exited_at: null,
  });

  state.previous_stage = state.current_stage;
  state.current_stage = toStage;
  state.transitioned_at = now;
  state.supervisor_active = stage?.supervisor ?? false;
  saveState(statePath, state);
  return state;
}

const testStages: StagesConfig = {
  stages: [
    { name: "triage", order: 10, description: "", blocked_tools: [], allowed_tools: [], preferred_tools: [], primary_actions: [], transitions: {} },
    { name: "setup", order: 20, description: "", blocked_tools: [], allowed_tools: [], preferred_tools: [], primary_actions: [], transitions: {} },
    { name: "execution", order: 120, description: "", blocked_tools: [], allowed_tools: [], preferred_tools: [], primary_actions: [], transitions: {}, supervisor: true },
  ],
};

describe("State Manager", () => {
  const testDir = join(tmpdir(), "pw-state-test");
  const statePath = join(testDir, "current-stage.json");

  beforeEach(() => {
    try { mkdirSync(testDir, { recursive: true }); } catch { /* ok */ }
    try { unlinkSync(statePath); } catch { /* ok */ }
  });

  afterEach(() => {
    try { unlinkSync(statePath); } catch { /* ok */ }
  });

  it("loads default state when file missing", () => {
    const state = loadState(statePath);
    expect(state.current_stage).toBe("triage");
    expect(state.previous_stage).toBeNull();
    expect(state.supervisor_active).toBe(false);
  });

  it("transitions to next stage and updates history", () => {
    const state = transition(statePath, "setup", testStages);
    expect(state.current_stage).toBe("setup");
    expect(state.previous_stage).toBe("triage");
    expect(state.history).toHaveLength(1);
    expect(state.history[0].stage).toBe("setup");
    expect(state.history[0].exited_at).toBeNull();
  });

  it("closes previous entry on second transition", () => {
    transition(statePath, "setup", testStages);
    const state = transition(statePath, "execution", testStages);
    expect(state.history).toHaveLength(2);
    expect(state.history[0].exited_at).not.toBeNull();
    expect(state.history[0].stage).toBe("setup");
    expect(state.history[1].stage).toBe("execution");
  });

  it("activates supervisor on execution stage", () => {
    transition(statePath, "setup", testStages);
    const state = transition(statePath, "execution", testStages);
    expect(state.current_stage).toBe("execution");
    expect(state.supervisor_active).toBe(true);
  });

  it("saves state to disk persistently", () => {
    transition(statePath, "setup", testStages);
    const reloaded = loadState(statePath);
    expect(reloaded.current_stage).toBe("setup");
  });

  it("handles multiple transitions", () => {
    transition(statePath, "setup", testStages);
    transition(statePath, "execution", testStages);
    const state = transition(statePath, "triage", testStages);
    expect(state.history).toHaveLength(3);
    expect(state.current_stage).toBe("triage");
    expect(state.previous_stage).toBe("execution");
  });
});
