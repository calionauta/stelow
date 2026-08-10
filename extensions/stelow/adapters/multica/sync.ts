import type { TrackingData, Workflow } from "../../types";
import { MulticaAdapter } from "./index";

export interface MulticaSyncResult {
  synced: boolean;
  error?: string;
}

/**
 * Best-effort host projection invoked only after stelow.json is durable.
 * Local state remains authoritative if the remote host is unavailable.
 */
export async function syncTrackingToMultica(data: TrackingData): Promise<MulticaSyncResult> {
  if (process.env.STELOW_MULTICA_HOST !== "1") return { synced: false };

  const workflow = selectWorkflow(data.workflows);
  if (!workflow?.stage?.current_stage) return { synced: false };

  const issueId = process.env.STELOW_WORKFLOW_ID;
  if (!issueId) return { synced: false };

  try {
    const adapter = new MulticaAdapter(issueId);
    await adapter.syncStageTransition(issueId, workflow.stage.current_stage, {
      workflowId: workflow.dirHash ?? workflow.name,
      appetite: workflow.config?.appetite as "Lean" | "Core" | "Complete" | undefined,
      reviewMode: workflow.config?.review_mode,
      version: data.version,
    });
    return { synced: true };  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[stelow] Multica projection failed after local persistence: ${message}`);
    return { synced: false, error: message };
  }
}

function selectWorkflow(workflows: Workflow[]): Workflow | undefined {
  return workflows.find((workflow) => workflow.status === "in-progress")
    ?? workflows.find((workflow) => workflow.status === "completed")
    ?? workflows.find((workflow) => workflow.status === "paused");
}
