import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeTracking } from "../../extensions/stelow/state";
import type { TrackingData, Workflow } from "../../extensions/stelow/types";

const workflow = (): Workflow => ({
  name: "host-contract", description: "", status: "in-progress", currentPhase: 0,
  phases: [], stage: { current_stage: "setup", previous_stage: null, transitioned_at: new Date().toISOString(), history: [], supervisor_active: false },
  created: new Date().toISOString(), updated: new Date().toISOString(),
});
const tracking = (wf: Workflow): TrackingData => ({
  $schema: "", version: "1.0", created: new Date().toISOString(), updated: new Date().toISOString(), workflows: [wf],
});

describe("Workflow.host schema", () => {
  it("is optional and constrains complete host registrations", () => {
    const schema = JSON.parse(readFileSync(join(process.cwd(), "stelow.schema.json"), "utf8"));
    expect(schema.definitions.workflow.required).not.toContain("host");
    expect(schema.definitions.workflow.properties.host).toEqual(expect.objectContaining({
      type: "object", required: ["name", "version", "registeredAt"], additionalProperties: false,
    }));
    expect(schema.definitions.workflow.properties.host.properties.name.enum).toEqual(["pi", "fusion", "generic"]);
  });

  it("writeTracking registers host once and preserves it", () => {
    const cwd = mkdtempSync(join(tmpdir(), "stelow-host-"));
    const previous = process.env.STELOW_HOST;
    try {
      process.env.STELOW_HOST = "generic";
      const data = tracking(workflow());
      writeTracking(cwd, data);
      const registered = data.workflows[0].host;
      expect(registered).toEqual({ name: "generic", version: "unknown", registeredAt: expect.any(String) });
      process.env.STELOW_HOST = "pi";
      writeTracking(cwd, data);
      expect(data.workflows[0].host).toEqual(registered);
    } finally {
      if (previous === undefined) delete process.env.STELOW_HOST; else process.env.STELOW_HOST = previous;
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
