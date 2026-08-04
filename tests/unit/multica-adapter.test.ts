import { describe, expect, it } from "vitest";
import type { Workflow } from "../../extensions/stelow/types";
import { MulticaAdapter, type MulticaCommandRunner } from "../../extensions/stelow/adapters/multica/index";
import { MULTICA_STAGE_STATUS, projectWorkflowToMultica } from "../../extensions/stelow/adapters/multica/types";

function workflow(stage: string, reviewMode = "Product Spec Gate"): Workflow {
  return {
    name: "adapter-test",
    status: "in-progress",
    currentPhase: 4,
    phases: [],
    stage: {
      current_stage: stage,
      previous_stage: "context",
      transitioned_at: "2026-08-04T12:00:00.000Z",
      history: [],
      supervisor_active: false,
    },
    created: "2026-08-04T11:00:00.000Z",
    updated: "2026-08-04T12:00:00.000Z",
    dirHash: "adapter-test",
    config: { appetite: "Core", review_mode: reviewMode, domains_detected: [] },
  };
}

class RecordingRunner implements MulticaCommandRunner {
  readonly calls: string[][] = [];
  run(args: readonly string[]): string {
    this.calls.push([...args]);
    if (args[0] === "issue" && args[1] === "metadata" && args[2] === "list") {
      return "{}";
    }
    if (args[0] === "label" && args[1] === "list") {
      return JSON.stringify([
        { id: "old-label", name: "stelow:shape" },
        { id: "gate-label", name: "stelow:gate" },
      ]);
    }
    if (args[0] === "label" && args[1] === "create") {
      return JSON.stringify({ id: "created-label", name: args[3] });
    }
    return "";
  }
}

describe("Multica adapter", () => {
  it("maps every canonical stage to a native issue status", () => {
    expect(Object.entries(MULTICA_STAGE_STATUS)).toEqual([
      ["triage", "todo"], ["select", "todo"], ["setup", "in_progress"],
      ["context", "in_progress"], ["shape", "in_progress"], ["critique", "in_progress"],
      ["gate", "in_review"], ["scope", "in_progress"], ["interface", "in_progress"],
      ["int-gate", "in_review"], ["selection", "in_progress"], ["planning", "in_progress"],
      ["plan-gate", "in_review"], ["execution", "in_progress"], ["verification", "in_progress"],
      ["diff-gate", "in_review"], ["audit", "done"],
    ]);
  });

  it("projects only index metadata while preserving local workflow authority", () => {
    expect(projectWorkflowToMultica(workflow("shape"), "0.56.0", "wf-123")).toEqual({
      status: "in_progress",
      stageLabel: "stelow:shape",
      metadata: {
        workflow_id: "wf-123",
        current_stage: "shape",
        appetite: "Core",
        review_mode: "Product Spec Gate",
        stelow_version: "0.56.0",
        last_transition_at: "2026-08-04T12:00:00.000Z",
      },
    });
  });

  it("rejects non-canonical stages instead of silently desynchronizing", () => {
    expect(() => projectWorkflowToMultica(workflow("unknown"), "0.56.0", "wf-123"))
      .toThrow("Cannot project unknown Stelow stage: unknown");
  });

  it("syncs metadata before changing the issue status", () => {
    const runner = new RecordingRunner();
    const adapter = new MulticaAdapter({ issueId: "issue-123", stelowVersion: "0.56.0", runner });

    adapter.syncToHost(workflow("gate"), "wf-123");

    expect(runner.calls.at(-1)).toEqual(["issue", "status", "issue-123", "in_review"]);
    expect(runner.calls).toContainEqual([
      "issue", "label", "remove", "issue-123", "old-label", "--output", "json",
    ]);
    expect(runner.calls).toContainEqual([
      "issue", "label", "add", "issue-123", "gate-label", "--output", "json",
    ]);
    expect(runner.calls.slice(0, -1)).toContainEqual([
      "issue", "metadata", "set", "issue-123", "--key", "current_stage", "--value", "gate", "--type", "string",
    ]);
  });

  it("creates a missing stage label before attaching it", () => {
    const runner: MulticaCommandRunner & { calls: string[][] } = {
      calls: [],
      run(args) {
        this.calls.push([...args]);
        if (args[0] === "label" && args[1] === "list") return "[]";
        if (args[0] === "label" && args[1] === "create") return '{"id":"new-label","name":"stelow:planning"}';
        return "";
      },
    };
    const adapter = new MulticaAdapter({ issueId: "issue-123", runner });
    adapter.setStageLabel("planning");
    expect(runner.calls).toContainEqual([
      "label", "create", "--name", "stelow:planning", "--color", "#6366f1", "--output", "json",
    ]);
    expect(runner.calls.at(-1)).toEqual([
      "issue", "label", "add", "issue-123", "new-label", "--output", "json",
    ]);
  });

  it("records gate approval and blocked reasons with native status", () => {
    const runner = new RecordingRunner();
    const adapter = new MulticaAdapter({ issueId: "issue-123", runner });
    adapter.approveGate("int-gate", "2026-08-04T15:00:00.000Z");
    adapter.markBlocked("waiting for approval");
    expect(runner.calls).toContainEqual([
      "issue", "metadata", "set", "issue-123", "--key", "int_gate_approved_at", "--value", "2026-08-04T15:00:00.000Z", "--type", "string",
    ]);
    expect(runner.calls.at(-1)).toEqual(["issue", "status", "issue-123", "blocked"]);
  });
});
