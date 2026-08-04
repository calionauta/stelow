import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { CLI } from "../../types";
import { GenericAdapter } from "../generic";
import type { Workflow } from "../../types";
import {
  projectWorkflowToMultica,
  type MulticaIssueStatus,
  type MulticaMetadata,
  type MulticaStage,
  type MulticaWorkflowProjection,
} from "./types";

export interface MulticaCommandRunner {
  run(args: readonly string[]): string;
}

export interface MulticaAdapterOptions {
  issueId?: string;
  stelowVersion?: string;
  runner?: MulticaCommandRunner;
}

class ExecFileMulticaRunner implements MulticaCommandRunner {
  private readonly options: ExecFileSyncOptionsWithStringEncoding = {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  };

  run(args: readonly string[]): string {
    return execFileSync("multica", [...args], this.options).trim();
  }
}

/** Native projection bridge between authoritative Stelow files and a Multica issue. */
export class MulticaAdapter extends GenericAdapter {
  readonly name: CLI = "multica";

  private readonly issueId: string;
  private readonly stelowVersion: string;
  private readonly runner: MulticaCommandRunner;

  constructor(options: MulticaAdapterOptions = {}) {
    super();
    this._capabilities = { ...this._capabilities, cli: "multica" };
    this.issueId = options.issueId ?? resolveMulticaIssueId();
    this.stelowVersion = options.stelowVersion ?? process.env.STELOW_VERSION ?? "development";
    this.runner = options.runner ?? new ExecFileMulticaRunner();
  }

  syncToHost(workflow: Workflow, existingWorkflowId?: string): MulticaWorkflowProjection {
    const projection = projectWorkflowToMultica(workflow, this.stelowVersion, existingWorkflowId);
    this.setMetadata(projection.metadata);
    this.setStageLabel(projection.metadata.current_stage);
    this.setIssueStatus(projection.status);
    return projection;
  }

  setMetadata(metadata: Partial<MulticaMetadata>): void {
    for (const [key, value] of Object.entries(metadata)) {
      if (value === undefined) continue;
      const type = typeof value === "boolean" ? "bool" : typeof value === "number" ? "number" : "string";
      this.runner.run([
        "issue", "metadata", "set", this.issueId,
        "--key", key,
        "--value", String(value),
        "--type", type,
      ]);
    }
  }

  setIssueStatus(status: MulticaIssueStatus): void {
    this.runner.run(["issue", "status", this.issueId, status]);
  }

  setStageLabel(stage: MulticaStage): void {
    const labels = parseJsonArray(this.runner.run(["label", "list", "--output", "json"]));
    for (const label of labels) {
      if (typeof label.name !== "string" || !label.name.startsWith("stelow:")) continue;
      if (label.name !== `stelow:${stage}` && typeof label.id === "string") {
        this.runner.run(["issue", "label", "remove", this.issueId, label.id, "--output", "json"]);
      }
    }

    let current = labels.find((label) => label.name === `stelow:${stage}`);
    if (!current) {
      const created = parseJsonObject(this.runner.run([
        "label", "create", "--name", `stelow:${stage}`, "--color", "#6366f1", "--output", "json",
      ]));
      current = created;
    }
    if (typeof current.id !== "string") {
      throw new Error(`Multica label response missing id for stelow:${stage}`);
    }
    this.runner.run(["issue", "label", "add", this.issueId, current.id, "--output", "json"]);
  }

  markBlocked(reason: string): void {
    this.setMetadata({ blocked_reason: reason });
    this.setIssueStatus("blocked");
  }

  approveGate(gate: "gate" | "int-gate" | "plan-gate" | "diff-gate", approvedAt = new Date().toISOString()): void {
    const key = `${gate.replaceAll("-", "_")}_approved_at` as keyof MulticaMetadata;
    this.setMetadata({ [key]: approvedAt });
  }

  attachArtifact(filePath: string, message?: string, parentId?: string): void {
    const absolutePath = resolve(filePath);
    if (!existsSync(absolutePath)) {
      throw new Error(`Cannot attach missing artifact: ${absolutePath}`);
    }

    const fingerprint = createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
    const metadataKey = `artifact_${fingerprint.slice(0, 16)}`;
    const existing = parseJsonObject(this.runner.run([
      "issue", "metadata", "list", this.issueId, "--output", "json",
    ]));
    if (existing[metadataKey] === true || existing[metadataKey] === "true") return;

    const args = ["issue", "comment", "add", this.issueId];
    if (message) args.push("--content", message);
    if (parentId) args.push("--parent", parentId);
    args.push("--attachment", realpathSync(absolutePath));
    this.runner.run(args);
    this.runner.run([
      "issue", "metadata", "set", this.issueId,
      "--key", metadataKey, "--value", "true", "--type", "bool",
    ]);
  }

  async visualReview(filePath: string, ctx: { cwd: string; dirHash?: string }): Promise<{ decision: string; feedback?: string }> {
    this.attachArtifact(filePath, `Review requested for ${basename(filePath)}.`);
    this.setIssueStatus("in_review");
    return { decision: "pending", feedback: "Awaiting approval on the Multica issue." };
  }
}

function resolveMulticaIssueId(): string {
  const issueId = process.env.MULTICA_ISSUE_ID ?? process.env.MULTICA_TASK_ID;
  if (!issueId?.trim()) {
    throw new Error("MULTICA_ISSUE_ID (or MULTICA_TASK_ID) is required for MulticaAdapter");
  }
  return issueId.trim();
}

export function createMulticaAdapter(options?: MulticaAdapterOptions): MulticaAdapter {
  return new MulticaAdapter(options);
}

function parseJsonArray(output: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(output) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Expected Multica CLI to return a JSON array");
  return parsed.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
}

function parseJsonObject(output: string): Record<string, unknown> {
  const parsed = JSON.parse(output) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected Multica CLI to return a JSON object");
  }
  return parsed as Record<string, unknown>;
}
