/** Fusion settings/workflow artifact builders grounded in the v2 IR contract. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export const STELOW_PLUGIN_ID = "fusion-plugin-stelow";

interface StageConfig {
  name: string;
  description: string;
  order: number;
  requires_approval?: boolean;
}

export interface FusionWorkflowIR {
  version: "v2";
  name: string;
  columns: Array<{ id: string; name: string; traits: Array<{ trait: string; config?: Record<string, string> }> }>;
  nodes: Array<{ id: string; kind: "start" | "prompt" | "end"; column: string; config?: Record<string, string> }>;
  edges: Array<{ from: string; to: string; condition?: string }>;
  settings: Array<{ id: string; name: string; type: "string"; default: string; description: string }>;
}

export function readPackageMetadata(repoRoot: string): { name: string; version: string } {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    name?: string;
    version?: string;
  };
  return { name: pkg.name ?? "@calionauta/stelow", version: pkg.version ?? "0.0.0" };
}

export function readStagesConfig(repoRoot: string): { stages: StageConfig[] } {
  const parsed = parseYaml(
    readFileSync(join(repoRoot, "skills", "stelow-product-orchestrator", "stages.yaml"), "utf8"),
  ) as {
    stages?: StageConfig[];
  };
  return { stages: parsed.stages ?? [] };
}

/** Project settings overlay consumed by Fusion's project settings resolver. */
export function buildFusionSettings(repoRoot: string): Record<string, unknown> {
  const metadata = readPackageMetadata(repoRoot);
  return {
    stelow: {
      pluginId: STELOW_PLUGIN_ID,
      package: metadata.name,
      version: metadata.version,
      workflowArtifact: ".fusion/workflows/stelow-v2.json",
    },
    plugins: {
      [STELOW_PLUGIN_ID]: {
        enabled: true,
        package: metadata.name,
        version: metadata.version,
        workflowArtifact: ".fusion/workflows/stelow-v2.json",
      },
    },
  };
}

/**
 * Produce a complete, host-validatable v2 workflow IR. Each Stelow stage is
 * an executable prompt node rather than a decorative column: Fusion can run
 * the artifact after an operator validates and creates it with
 * `fn_workflow_validate` / `fn_workflow_create`.
 */
export function buildFusionWorkflowIR(repoRoot: string): FusionWorkflowIR {
  const { stages } = readStagesConfig(repoRoot);
  if (stages.length === 0) throw new Error("stages.yaml contains no stages");

  const columns = stages.map((stage, index) => ({
    id: stage.name,
    name: stage.name,
    traits: index === 0
      ? [{ trait: "intake" }]
      : index === stages.length - 1
        ? [{ trait: "complete" }]
        : [{ trait: "wip" }],
  }));

  const stageNodes = stages.map((stage) => ({
    id: `stage-${stage.name}`,
    kind: "prompt" as const,
    column: stage.name,
    config: {
      name: `Stelow: ${stage.name}`,
      description: stage.description,
      prompt: stage.requires_approval
        ? `Load the stelow-product-orchestrator skill and execute only the ${stage.name} stage. Fusion has no native visual_review tool: complete the canonical fallback by writing .stelow/approvals/{dirHash}/{file}.approved.md before advancing. Follow stages.yaml and persist progress in stelow.json.`
        : `Load the stelow-product-orchestrator skill and execute only the ${stage.name} stage. Follow stages.yaml and persist progress in stelow.json.`,
    },
  }));
  const nodes: FusionWorkflowIR["nodes"] = [
    { id: "start", kind: "start", column: stages[0].name },
    ...stageNodes,
    { id: "end", kind: "end", column: stages.at(-1)!.name },
  ];
  const chain = nodes.map((node) => node.id);
  const edges = chain.slice(0, -1).map((from, index) => ({
    from,
    to: chain[index + 1],
    condition: index === 0 ? undefined : "success",
  }));

  return {
    version: "v2",
    name: "Stelow product planning",
    columns,
    nodes,
    edges,
    settings: [{
      id: "skillName",
      name: "Orchestrator skill",
      type: "string",
      default: "stelow-product-orchestrator",
      description: "Agent Skill loaded by every Stelow stage node.",
    }],
  };
}

export type FusionValidationResult = { ok: true } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Validate the exact v2 subset emitted by Stelow, returning the first error. */
export function validateFusionWorkflowIR(ir: unknown): FusionValidationResult {
  if (!isRecord(ir)) return { ok: false, error: "workflow must be an object" };
  if (ir.version !== "v2") return { ok: false, error: "workflow.version must be 'v2'" };
  if (!isNonEmptyString(ir.name)) return { ok: false, error: "workflow.name must be a non-empty string" };
  if (!Array.isArray(ir.columns)) return { ok: false, error: "workflow.columns must be an array" };
  if (!Array.isArray(ir.nodes)) return { ok: false, error: "workflow.nodes must be an array" };
  if (!Array.isArray(ir.edges)) return { ok: false, error: "workflow.edges must be an array" };
  if (!Array.isArray(ir.settings)) return { ok: false, error: "workflow.settings must be an array" };
  if (ir.columns.length === 0) return { ok: false, error: "workflow.columns must contain at least one column" };
  if (ir.nodes.length < 2) return { ok: false, error: "workflow.nodes must contain at least two nodes" };

  const columnIds = new Set<string>();
  for (let index = 0; index < ir.columns.length; index++) {
    const column = ir.columns[index];
    if (!isRecord(column)) return { ok: false, error: `columns[${index}] must be an object` };
    if (!isNonEmptyString(column.id)) return { ok: false, error: `columns[${index}].id must be a non-empty string` };
    if (columnIds.has(column.id)) return { ok: false, error: `duplicate column id '${column.id}'` };
    if (!isNonEmptyString(column.name)) return { ok: false, error: `columns[${index}].name must be a non-empty string` };
    if (!Array.isArray(column.traits)) return { ok: false, error: `columns[${index}].traits must be an array` };
    for (let traitIndex = 0; traitIndex < column.traits.length; traitIndex++) {
      const trait = column.traits[traitIndex];
      if (!isRecord(trait) || !isNonEmptyString(trait.trait)) {
        return { ok: false, error: `columns[${index}].traits[${traitIndex}].trait must be a non-empty string` };
      }
    }
    columnIds.add(column.id);
  }

  const nodeIds = new Set<string>();
  const referencedColumns = new Set<string>();
  let startCount = 0;
  let endCount = 0;
  for (let index = 0; index < ir.nodes.length; index++) {
    const node = ir.nodes[index];
    if (!isRecord(node)) return { ok: false, error: `nodes[${index}] must be an object` };
    if (!isNonEmptyString(node.id)) return { ok: false, error: `nodes[${index}].id must be a non-empty string` };
    if (nodeIds.has(node.id)) return { ok: false, error: `duplicate node id '${node.id}'` };
    if (node.kind !== "start" && node.kind !== "prompt" && node.kind !== "end") {
      return { ok: false, error: `nodes[${index}].kind must be start, prompt, or end` };
    }
    if (!isNonEmptyString(node.column)) return { ok: false, error: `nodes[${index}].column must be a non-empty string` };
    if (!columnIds.has(node.column)) return { ok: false, error: `nodes[${index}].column references unknown column '${node.column}'` };
    if (node.kind === "start") startCount++;
    if (node.kind === "end") endCount++;
    nodeIds.add(node.id);
    referencedColumns.add(node.column);
  }
  if (startCount !== 1) return { ok: false, error: `workflow must contain exactly one start node (found ${startCount})` };
  if (endCount !== 1) return { ok: false, error: `workflow must contain exactly one end node (found ${endCount})` };

  for (const columnId of columnIds) {
    if (!referencedColumns.has(columnId)) return { ok: false, error: `column '${columnId}' is not referenced by any node` };
  }

  for (let index = 0; index < ir.edges.length; index++) {
    const edge = ir.edges[index];
    if (!isRecord(edge)) return { ok: false, error: `edges[${index}] must be an object` };
    if (!isNonEmptyString(edge.from)) return { ok: false, error: `edges[${index}].from must be a non-empty string` };
    if (!isNonEmptyString(edge.to)) return { ok: false, error: `edges[${index}].to must be a non-empty string` };
    if (!nodeIds.has(edge.from)) return { ok: false, error: `edges[${index}].from references unknown node '${edge.from}'` };
    if (!nodeIds.has(edge.to)) return { ok: false, error: `edges[${index}].to references unknown node '${edge.to}'` };
  }

  for (let index = 0; index < ir.settings.length; index++) {
    const setting = ir.settings[index];
    if (!isRecord(setting)) return { ok: false, error: `settings[${index}] must be an object` };
    for (const field of ["id", "name", "type", "default", "description"] as const) {
      if (!isNonEmptyString(setting[field])) {
        return { ok: false, error: `settings[${index}].${field} must be a non-empty string` };
      }
    }
    if (setting.type !== "string") return { ok: false, error: `settings[${index}].type must be 'string'` };
  }

  return { ok: true };
}

export function validateFusionSettings(settings: unknown): FusionValidationResult {
  if (!isRecord(settings)) return { ok: false, error: "settings must be an object" };
  if (!isRecord(settings.stelow)) return { ok: false, error: "settings.stelow must be an object" };
  if (settings.stelow.pluginId !== STELOW_PLUGIN_ID) {
    return { ok: false, error: `settings.stelow.pluginId must be '${STELOW_PLUGIN_ID}'` };
  }
  return { ok: true };
}

export function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
