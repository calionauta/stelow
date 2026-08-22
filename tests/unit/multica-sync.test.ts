import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrackingData, Workflow } from "../../extensions/stelow/types";

const syncStageTransition = vi.fn();
vi.mock("../../extensions/stelow/adapters/multica/index", () => ({
  MulticaAdapter: class { syncStageTransition = syncStageTransition; },
}));

import { syncTrackingToMultica } from "../../extensions/stelow/adapters/multica/sync";

function workflow(status: string): Workflow {
  return {
    name: "sync-test", status, currentPhase: 4, phases: [],
    stage: {
      current_stage: "shape", previous_stage: "context",
      transitioned_at: "2026-08-04T12:00:00.000Z", history: [], supervisor_active: false,
    },
    created: "2026-08-04T11:00:00.000Z", updated: "2026-08-04T12:00:00.000Z", dirHash: "sync-test",
  };
}

function tracking(workflows: Workflow[]): TrackingData {
  return { $schema: "test", version: "1", created: "now", updated: "now", workflows };
}

describe("Multica tracking sync", () => {
  afterEach(() => {
    delete process.env.STELOW_MULTICA_HOST;
    delete process.env.STELOW_WORKFLOW_ID;
    syncStageTransition.mockReset();
  });

  it("is inert unless explicitly enabled", async () => {
    await expect(syncTrackingToMultica(tracking([workflow("in-progress")]))).resolves.toEqual({ synced: false });
    expect(syncStageTransition).not.toHaveBeenCalled();
  });

  it("projects the active workflow and stable workflow id", async () => {
    process.env.STELOW_MULTICA_HOST = "1";
    process.env.STELOW_WORKFLOW_ID = "wf-123";
    await expect(syncTrackingToMultica(tracking([workflow("paused"), workflow("in-progress")]))).resolves.toEqual({ synced: true });
    expect(syncStageTransition).toHaveBeenCalledWith(
      "wf-123",
      "shape",
      expect.objectContaining({ workflowId: "sync-test" }),
    );
  });

  it("does not invalidate local persistence when host projection fails", async () => {
    process.env.STELOW_MULTICA_HOST = "1";
    process.env.STELOW_WORKFLOW_ID = "wf-123";
    syncStageTransition.mockImplementationOnce(() => { throw new Error("host unavailable"); });
    await expect(syncTrackingToMultica(tracking([workflow("completed")]))).resolves.toEqual({ synced: false, error: "host unavailable" });
  });
});
