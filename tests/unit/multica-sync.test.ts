import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrackingData, Workflow } from "../../extensions/stelow/types";

const syncToHost = vi.fn();
vi.mock("../../extensions/stelow/adapters/multica/index", () => ({
  MulticaAdapter: class { syncToHost = syncToHost; },
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
    syncToHost.mockReset();
  });

  it("is inert unless explicitly enabled", () => {
    expect(syncTrackingToMultica(tracking([workflow("in-progress")]))).toEqual({ synced: false });
    expect(syncToHost).not.toHaveBeenCalled();
  });

  it("projects the active workflow and stable workflow id", () => {
    process.env.STELOW_MULTICA_HOST = "1";
    process.env.STELOW_WORKFLOW_ID = "wf-123";
    expect(syncTrackingToMultica(tracking([workflow("paused"), workflow("in-progress")]))).toEqual({ synced: true });
    expect(syncToHost).toHaveBeenCalledWith(expect.objectContaining({ status: "in-progress" }), "wf-123");
  });

  it("does not invalidate local persistence when host projection fails", () => {
    process.env.STELOW_MULTICA_HOST = "1";
    syncToHost.mockImplementationOnce(() => { throw new Error("host unavailable"); });
    expect(syncTrackingToMultica(tracking([workflow("completed")]))).toEqual({ synced: false, error: "host unavailable" });
  });
});
