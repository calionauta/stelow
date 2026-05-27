// @ts-nocheck
import { describe, it, expect } from "vitest";
import { parse as parseYAML } from "yaml";

// Type-only imports for tests (we test the standalone functions)
import type { Stage, StagesConfig, StageState } from "../../types/stages";

// Helper: parse YAML inline for testing
function parseStages(content: string): StagesConfig {
  return parseYAML(content) as StagesConfig;
}

// The guard logic (simplified for test — mirrors stages-guard.ts)
interface GuardResult {
  allowed: boolean;
  reason?: string;
  allowedTools?: string[];
}

function createTestGuard(stages: StagesConfig, state: StageState) {
  const stageMap = new Map<string, Stage>();
  for (const s of stages.stages) {
    stageMap.set(s.name, s);
  }

  return function checkTool(toolName: string): GuardResult {
    const stageName = state.current_stage;
    const stage = stageMap.get(stageName);

    if (!stage) {
      return { allowed: true };
    }

    if (stage.blocked_tools.includes(toolName)) {
      return {
        allowed: false,
        reason: `Tool '${toolName}' is blocked in '${stageName}' stage`,
        allowedTools: stage.allowed_tools,
      };
    }

    return { allowed: true };
  };
}

const stagesYAML = `
stages:
  - name: triage
    order: 10
    blocked_tools: [edit, write, bash, subagent, agent_browser]
    allowed_tools: [ask, read, grep, ls]
    transitions:
      next: [setup]
  - name: execution
    order: 120
    blocked_tools: []
    allowed_tools: [edit, write, bash, read, grep, ls]
    supervisor: true
    transitions:
      next: [audit]
  - name: gate
    order: 60
    blocked_tools: [edit, write, bash, subagent, agent_browser]
    allowed_tools: [read, ls, grep, ask]
    requires_approval: true
    transitions:
      next: [execution]
`;

const stages = parseStages(stagesYAML);

const triageState: StageState = {
  current_stage: "triage",
  previous_stage: null,
  transitioned_at: "2026-05-26T10:00:00Z",
  history: [{ stage: "triage", entered_at: "2026-05-26T10:00:00Z", exited_at: null }],
  gates_passed: [],
  supervisor_active: false,
};

const executionState: StageState = {
  current_stage: "execution",
  previous_stage: "gate",
  transitioned_at: "2026-05-26T10:30:00Z",
  history: [
    { stage: "triage", entered_at: "2026-05-26T10:00:00Z", exited_at: "2026-05-26T10:05:00Z" },
    { stage: "execution", entered_at: "2026-05-26T10:30:00Z", exited_at: null },
  ],
  gates_passed: ["gate"],
  supervisor_active: true,
};

describe("Stages Guard", () => {
  it("blocks tools in triage blocked list", () => {
    const guard = createTestGuard(stages, triageState);
    expect(guard("edit").allowed).toBe(false);
    expect(guard("write").allowed).toBe(false);
    expect(guard("bash").allowed).toBe(false);
    expect(guard("subagent").allowed).toBe(false);
    expect(guard("agent_browser").allowed).toBe(false);
  });

  it("allows tools not in triage blocked list", () => {
    const guard = createTestGuard(stages, triageState);
    expect(guard("ask").allowed).toBe(true);
    expect(guard("read").allowed).toBe(true);
    expect(guard("grep").allowed).toBe(true);
  });

  it("returns allowedTools in rejection reason", () => {
    const guard = createTestGuard(stages, triageState);
    const result = guard("bash");
    expect(result.allowed).toBe(false);
    expect(result.allowedTools).toEqual(["ask", "read", "grep", "ls"]);
  });

  it("allows all tools in execution stage", () => {
    const guard = createTestGuard(stages, executionState);
    expect(guard("edit").allowed).toBe(true);
    expect(guard("bash").allowed).toBe(true);
    expect(guard("write").allowed).toBe(true);
    expect(guard("agent_browser").allowed).toBe(true);
  });

  it("blocks tools in gate stage", () => {
    const gateState: StageState = {
      current_stage: "gate",
      previous_stage: null,
      transitioned_at: "2026-05-26T10:20:00Z",
      history: [],
      gates_passed: [],
      supervisor_active: false,
    };
    const guard = createTestGuard(stages, gateState);
    expect(guard("edit").allowed).toBe(false);
    expect(guard("bash").allowed).toBe(false);
    expect(guard("subagent").allowed).toBe(false);
    expect(guard("read").allowed).toBe(true);
    expect(guard("grep").allowed).toBe(true);
  });

  it("falls back to allowed=true for unknown stage", () => {
    const unknownState: StageState = {
      current_stage: "unknown",
      previous_stage: null,
      transitioned_at: "2026-05-26T10:00:00Z",
      history: [],
      gates_passed: [],
      supervisor_active: false,
    };
    const guard = createTestGuard(stages, unknownState);
    expect(guard("bash").allowed).toBe(true);
  });

  it("handles empty state gracefully", () => {
    const emptyState: StageState = {
      current_stage: "",
      previous_stage: null,
      transitioned_at: "",
      history: [],
      gates_passed: [],
      supervisor_active: false,
    };
    // Guard returns true for unknown stage (fallback)
    const guard = createTestGuard(stages, emptyState);
    expect(guard("bash").allowed).toBe(true);
  });

  it("provides descriptive rejection reason", () => {
    const guard = createTestGuard(stages, triageState);
    const result = guard("edit");
    expect(result.reason).toMatch(/Tool 'edit' is blocked in 'triage' stage/);
  });
});
