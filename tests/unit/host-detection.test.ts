import { describe, it, expect, afterEach } from "vitest";
import { detectHost } from "../../extensions/stelow/state";

describe("detectHost", () => {
  const original = { fusion: process.env.FUSION_HOST, host: process.env.STELOW_HOST, cli: process.env.PRODUCT_WORKFLOW_CLI };
  afterEach(() => {
    for (const [key, value] of Object.entries({ FUSION_HOST: original.fusion, STELOW_HOST: original.host, PRODUCT_WORKFLOW_CLI: original.cli })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  it.each([
    ["pi", "pi"], ["fusion", "fusion"], ["generic", "generic"],
  ])("honors explicit %s host", (value, expected) => {
    delete process.env.FUSION_HOST;
    process.env.STELOW_HOST = value;
    expect(detectHost()).toBe(expected);
  });
  it("prioritizes Fusion embedding signal over Pi selection", () => {
    process.env.FUSION_HOST = "1";
    process.env.STELOW_HOST = "pi";
    expect(detectHost()).toBe("fusion");
  });
  it("falls back safely for unknown explicit host", () => {
    delete process.env.FUSION_HOST;
    process.env.STELOW_HOST = "unknown-host";
    process.env.PRODUCT_WORKFLOW_CLI = "unknown-cli";
    expect(detectHost()).toBe("generic");
  });
});
