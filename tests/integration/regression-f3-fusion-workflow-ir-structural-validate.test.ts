import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildFusionWorkflowIR,
  validateFusionWorkflowIR,
} from "../../extensions/stelow/adapters/commands/fusion-artifacts";
import { generateFusionCommands } from "../../scripts/generate-cli-commands";

function validWorkflow(): Record<string, unknown> {
  return {
    version: "v2",
    name: "Regression workflow",
    columns: [
      { id: "todo", name: "Todo", traits: [{ trait: "intake" }] },
      { id: "done", name: "Done", traits: [{ trait: "complete" }] },
    ],
    nodes: [
      { id: "start", kind: "start", column: "todo" },
      { id: "work", kind: "prompt", column: "todo" },
      { id: "end", kind: "end", column: "done" },
    ],
    edges: [
      { from: "start", to: "work" },
      { from: "work", to: "end" },
    ],
    settings: [{
      id: "skill",
      name: "Skill",
      type: "string",
      default: "stelow-product-orchestrator",
      description: "Skill to load",
    }],
  };
}

function cloneWorkflow(): Record<string, unknown> {
  return structuredClone(validWorkflow());
}

describe("F3 regression: Fusion workflow IR structural validation", () => {
  it("accepts the emitted v2 IR and valid disconnected prompt nodes", () => {
    expect(validateFusionWorkflowIR(buildFusionWorkflowIR(process.cwd()))).toEqual({ ok: true });
    const workflow = cloneWorkflow();
    (workflow.nodes as unknown[]).push({ id: "disconnected", kind: "prompt", column: "done" });
    expect(validateFusionWorkflowIR(workflow)).toEqual({ ok: true });
  });

  it.each([
    ["malformed root", null, "workflow must be an object"],
    ["missing arrays", { version: "v2", name: "x" }, "workflow.columns must be an array"],
    ["empty columns", { ...validWorkflow(), columns: [] }, "at least one column"],
    ["malformed column element", { ...validWorkflow(), columns: [null] }, "columns[0] must be an object"],
    ["malformed node element", { ...validWorkflow(), nodes: [null, {}] }, "nodes[0] must be an object"],
    ["malformed edge element", { ...validWorkflow(), edges: [null] }, "edges[0] must be an object"],
  ])("rejects %s without throwing", (_label, input, message) => {
    expect(validateFusionWorkflowIR(input)).toEqual({ ok: false, error: expect.stringContaining(message) });
  });

  it("rejects duplicate column IDs with first-error semantics", () => {
    const workflow = cloneWorkflow();
    (workflow.columns as unknown[]).push({ id: "todo", name: "Duplicate", traits: [] });
    expect(validateFusionWorkflowIR(workflow)).toEqual({
      ok: false,
      error: "duplicate column id 'todo'",
    });
  });

  it("rejects duplicate node IDs", () => {
    const workflow = cloneWorkflow();
    (workflow.nodes as unknown[]).push({ id: "work", kind: "prompt", column: "done" });
    expect(validateFusionWorkflowIR(workflow)).toEqual({ ok: false, error: "duplicate node id 'work'" });
  });

  it.each([
    ["from", { from: "missing", to: "end" }],
    ["to", { from: "start", to: "missing" }],
  ])("rejects a dangling edge %s endpoint", (_endpoint, edge) => {
    const workflow = cloneWorkflow();
    workflow.edges = [edge];
    expect(validateFusionWorkflowIR(workflow)).toEqual({
      ok: false,
      error: expect.stringContaining("references unknown node 'missing'"),
    });
  });

  it("rejects an unreferenced column", () => {
    const workflow = cloneWorkflow();
    (workflow.columns as unknown[]).push({ id: "empty", name: "Empty", traits: [] });
    expect(validateFusionWorkflowIR(workflow)).toEqual({
      ok: false,
      error: "column 'empty' is not referenced by any node",
    });
  });

  it.each([
    ["start", "prompt", "exactly one start node"],
    ["end", "prompt", "exactly one end node"],
  ])("requires exactly one %s node", (nodeId, replacementKind, message) => {
    const workflow = cloneWorkflow();
    const nodes = workflow.nodes as Array<Record<string, unknown>>;
    const node = nodes.find(({ id }) => id === nodeId);
    if (node) node.kind = replacementKind;
    expect(validateFusionWorkflowIR(workflow)).toEqual({
      ok: false,
      error: expect.stringContaining(message),
    });
  });

  it("parses and validates serialized artifacts with byte-stable reruns", () => {
    const root = mkdtempSync(join(tmpdir(), "stelow-f3-serialized-"));
    try {
      const first = generateFusionCommands(root);
      const firstBytes = new Map(first.map((path) => [path, readFileSync(path, "utf8")]));
      const settingsPath = join(root, ".fusion", "settings.json");
      const workflowPath = join(root, ".fusion", "workflows", "stelow-v2.json");
      const settings = JSON.parse(readFileSync(settingsPath, "utf8")) as { stelow: { pluginId: string } };
      const workflow: unknown = JSON.parse(readFileSync(workflowPath, "utf8"));
      expect(settings.stelow.pluginId).toBe("fusion-plugin-stelow");
      expect(validateFusionWorkflowIR(workflow)).toEqual({ ok: true });
      expect([...firstBytes.values()].join("\n")).not.toContain("through the host adapter");

      const second = generateFusionCommands(root);
      expect(second).toEqual(first);
      for (const [path, bytes] of firstBytes) expect(readFileSync(path, "utf8")).toBe(bytes);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each([
    ["settings", { settings: { stelow: { pluginId: "wrong" } }, workflow: validWorkflow() }],
    ["workflow", { settings: undefined, workflow: { ...validWorkflow(), nodes: [] } }],
  ])("writes no artifacts when parsed %s validation rejects", (_label, overrides) => {
    const root = mkdtempSync(join(tmpdir(), "stelow-f3-no-partial-"));
    try {
      expect(() => generateFusionCommands(root, process.cwd(), overrides)).toThrow(/Invalid Fusion/);
      expect(existsSync(join(root, ".fusion"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
