import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { loadStages, resolveTool } from "../../extensions/stelow/adapters/stages-loader";

const configPath = join(process.cwd(), "skills/stelow-product-orchestrator/stages.yaml");

describe("canonical stages tool mapping", () => {
  it("resolves every stage tool for every supported host", () => {
    const config = loadStages(configPath);
    const names = new Set<string>();
    for (const stage of config.stages) {
      for (const field of [stage.allowed_tools, stage.blocked_tools, stage.preferred_tools, stage.primary_actions]) {
        for (const name of field ?? []) names.add(name);
      }
      if (stage.approval_tool) names.add(stage.approval_tool);
    }
    expect([...names].sort()).toEqual(["agent_browser", "ask_user_question", "bash", "edit", "grep", "ls", "read", "subagent", "visual_review", "write"]);
    for (const name of names) {
      expect(config.tools).toHaveProperty(name);
      for (const host of ["pi", "fusion", "generic"] as const) {
        expect(["string", "object"]).toContain(typeof resolveTool(name, host, configPath));
      }
    }
  });

  it("uses identity for unknown canonical names and null for missing host implementation", () => {
    expect(resolveTool("future_tool", "fusion", configPath)).toBe("future_tool");
    expect(resolveTool("visual_review", "fusion", configPath)).toBeNull();
    expect(resolveTool("visual_review", "pi", configPath)).toBe("plannotator");
  });
});
