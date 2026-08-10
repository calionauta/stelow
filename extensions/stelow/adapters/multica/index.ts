/**
 * Multica Native Host Adapter (`stelow-adapter-multica`)
 * 
 * Provides native integration between the Stelow workflow runtime and Multica.ai platform:
 * - Projections of state to KV Metadata (`syncToHost`)
 * - Native status transitions (`updateIssueStatus`)
 * - Artifact attachments via issue comments (`attachArtifact`)
 * - Structured audit-trail emission in chained comments (`postAuditTrailChain`)
 * - Decision gateway implementation for HITL gates & questions
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { BaseAdapter } from "../base";
import type { CLI } from "../../types";
import {
  type CanonicalStage,
  type MulticaIssueStatus,
  type MulticaMetadata,
  getMulticaStatusForStage,
} from "./types";
import { MulticaAdapter as HostDecisionAdapter } from "../host/multica-adapter";

export * from "./types";

/**
 * Execute multica CLI command returning stdout/stderr and exit code.
 */
export function runMulticaCommand(args: string[]): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("multica", args, {
    encoding: "utf-8",
    timeout: 30_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error != null) {
    return { ok: false, stdout: "", stderr: result.error.message };
  }
  const stdout = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();
  return {
    ok: result.status === 0,
    stdout,
    stderr: result.status !== 0 ? stderr || `exit code ${result.status}` : stderr,
  };
}

export class MulticaAdapter extends BaseAdapter {
  readonly name: CLI = "generic";
  readonly hostName = "multica";
  private decisionAdapter: HostDecisionAdapter;

  constructor(
    private readonly issueId?: string,
    workgroupConfig = null,
    stelowAgent = null
  ) {
    super("generic");
    this.decisionAdapter = new HostDecisionAdapter(workgroupConfig, issueId ?? null, stelowAgent);
  }

  // ── Sync State to Host KV Metadata ─────────────────────────────

  /**
   * Project workflow state to Multica KV Metadata (`syncToHost`).
   */
  async syncToHost(issueId: string, metadata: MulticaMetadata): Promise<boolean> {
    let allOk = true;
    for (const [key, val] of Object.entries(metadata)) {
      if (val === undefined || val === null) continue;
      const strVal = typeof val === "object" ? JSON.stringify(val) : String(val);
      const valType = typeof val === "boolean" ? "bool" : typeof val === "number" ? "number" : "string";

      const res = runMulticaCommand([
        "issue",
        "metadata",
        "set",
        issueId,
        "--key",
        key,
        "--value",
        strVal,
        "--type",
        valType,
      ]);

      if (!res.ok) {
        console.error(`[MulticaAdapter] Failed to set metadata key '${key}': ${res.stderr}`);
        allOk = false;
      }
    }
    return allOk;
  }

  // ── Update Issue Status ─────────────────────────────────────────

  /**
   * Transition Multica issue status natively (`multica issue status`).
   */
  async updateIssueStatus(issueId: string, status: MulticaIssueStatus): Promise<boolean> {
    const res = runMulticaCommand(["issue", "status", issueId, status]);
    if (!res.ok) {
      console.error(`[MulticaAdapter] Failed to update issue status to '${status}': ${res.stderr}`);
      return false;
    }
    return true;
  }

  /**
   * Sync stage transition: updates metadata and sets appropriate status based on mapping.
   */
  async syncStageTransition(
    issueId: string,
    stage: CanonicalStage | string,
    details: {
      workflowId?: string;
      appetite?: "Lean" | "Core" | "Complete";
      reviewMode?: string;
      version?: string;
      blockedReason?: string;
      strategicExploration?: boolean;
    } = {}
  ): Promise<boolean> {
    const status = details.blockedReason
      ? "blocked"
      : getMulticaStatusForStage(stage);

    const metadata: MulticaMetadata = {
      current_stage: stage,
      last_transition_at: new Date().toISOString(),
    };

    if (details.workflowId) metadata.workflow_id = details.workflowId;
    if (details.appetite) metadata.appetite = details.appetite;
    if (details.reviewMode) metadata.review_mode = details.reviewMode;
    if (details.version) metadata.stelow_version = details.version;
    if (details.strategicExploration !== undefined) {
      metadata.strategic_exploration = details.strategicExploration;
    }
    if (details.blockedReason) metadata.blocked_reason = details.blockedReason;

    if (stage.endsWith("-gate") || stage === "gate") {
      metadata[`${stage}_approved_at`] = new Date().toISOString();
    }

    const metaOk = await this.syncToHost(issueId, metadata);
    const statusOk = await this.updateIssueStatus(issueId, status);

    return metaOk && statusOk;
  }

  // ── Attach Artifact ─────────────────────────────────────────────

  /**
   * Attach physical artifact file to issue comment safely via `--content-file`.
   */
  async attachArtifact(
    issueId: string,
    filePath: string,
    commentText?: string,
    parentId?: string
  ): Promise<boolean> {
    if (!existsSync(filePath)) {
      console.error(`[MulticaAdapter] Artifact file not found: ${filePath}`);
      return false;
    }

    const bodyText = commentText || `### Artifact Delivered: \`${filePath.split("/").pop()}\``;
    const cwdTmp = join(process.cwd(), ".stelow", ".tmp");
    mkdirSync(cwdTmp, { recursive: true });
    const tmpBodyPath = join(cwdTmp, `comment-${Date.now()}-${Math.random().toString(36).slice(2)}.md`);

    try {
      writeFileSync(tmpBodyPath, bodyText, "utf-8");
      const args = [
        "issue",
        "comment",
        "add",
        issueId,
        "--content-file",
        tmpBodyPath,
        "--attachment",
        filePath,
      ];
      if (parentId) {
        args.push("--parent", parentId);
      }

      const res = runMulticaCommand(args);
      if (!res.ok) {
        console.error(`[MulticaAdapter] Failed to attach artifact comment: ${res.stderr}`);
        return false;
      }
      return true;
    } finally {
      try {
        if (existsSync(tmpBodyPath)) rmSync(tmpBodyPath);
      } catch {
        // best effort
      }
    }
  }

  // ── Audit-Trail Chained Comments ────────────────────────────────

  /**
   * Post audit trail divided into 5 structured layer comments.
   */
  async postAuditTrailChain(
    issueId: string,
    layers: Array<{ title: string; body: string }>
  ): Promise<string[]> {
    const commentIds: string[] = [];
    let rootParentId: string | undefined;

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const header = `### Audit Trail [${i + 1}/${layers.length}] — ${layer.title}\n\n`;
      const fullContent = header + layer.body;

      const cwdTmp = join(process.cwd(), ".stelow", ".tmp");
      mkdirSync(cwdTmp, { recursive: true });
      const tmpBodyPath = join(cwdTmp, `audit-layer-${i + 1}-${Date.now()}.md`);

      try {
        writeFileSync(tmpBodyPath, fullContent, "utf-8");
        const args = ["issue", "comment", "add", issueId, "--content-file", tmpBodyPath, "--output", "json"];
        if (rootParentId) {
          args.push("--parent", rootParentId);
        }

        const res = runMulticaCommand(args);
        if (res.ok && res.stdout) {
          try {
            const parsed = JSON.parse(res.stdout);
            const cid = parsed.id || parsed.comment_id;
            if (cid) {
              commentIds.push(cid);
              if (i === 0) rootParentId = cid;
            }
          } catch {
            // output was not JSON
          }
        }
      } finally {
        try {
          if (existsSync(tmpBodyPath)) rmSync(tmpBodyPath);
        } catch {
          // best effort
        }
      }
    }
    return commentIds;
  }

  // ── Decision Gateway Delegate ────────────────────────────────────

  getDecisionGateway(): HostDecisionAdapter {
    return this.decisionAdapter;
  }
}
