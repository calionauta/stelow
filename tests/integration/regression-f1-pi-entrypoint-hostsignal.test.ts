import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import stelowExtension, { resolveExtensionHost } from "../../extensions/stelow/index";
import { createAdapter } from "../../extensions/stelow/adapters";

const DETECTION_ENV = [
  "HOME",
  "FUSION_HOST",
  "STELOW_HOST",
  "PRODUCT_WORKFLOW_CLI",
  "PATH",
] as const;

describe("F1 regression: Pi extension API overrides installation probes", () => {
  let home: string;
  let originalEnv: Record<(typeof DETECTION_ENV)[number], string | undefined>;

  beforeEach(() => {
    originalEnv = Object.fromEntries(
      DETECTION_ENV.map((name) => [name, process.env[name]]),
    ) as Record<(typeof DETECTION_ENV)[number], string | undefined>;
    home = mkdtempSync(join(tmpdir(), "stelow-f1-pi-boundary-"));
    process.env.HOME = home;
    delete process.env.FUSION_HOST;
    delete process.env.STELOW_HOST;
    delete process.env.PRODUCT_WORKFLOW_CLI;
  });

  afterEach(() => {
    for (const name of DETECTION_ENV) {
      const value = originalEnv[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    rmSync(home, { recursive: true, force: true });
  });

  it("selects Pi and registers its observable surface when .pi and .fusion coexist", () => {
    mkdirSync(join(home, ".pi"));
    mkdirSync(join(home, ".fusion"));

    const piApi = {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
      on: vi.fn(),
    };

    expect(resolveExtensionHost(piApi)).toBe("pi");
    expect(createAdapter(resolveExtensionHost(piApi)).name).toBe("pi");

    expect(stelowExtension(piApi)).toBeUndefined();
    expect(piApi.registerCommand).toHaveBeenCalled();
    expect(piApi.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: "plannotator" }),
    );
    expect(piApi.on).toHaveBeenCalledWith("session_start", expect.any(Function));

    expect(resolveExtensionHost(undefined)).toBe("fusion");
  });

  it("treats a Pi API object as authoritative before explicit host signals", () => {
    process.env.FUSION_HOST = "1";
    process.env.STELOW_HOST = "fusion";
    process.env.PRODUCT_WORKFLOW_CLI = "fusion";

    expect(resolveExtensionHost({})).toBe("pi");
    expect(resolveExtensionHost(null)).toBe("fusion");
    expect(resolveExtensionHost(undefined)).toBe("fusion");
  });

  it("keeps empty overrides inert when neither installation probe exists", () => {
    process.env.FUSION_HOST = "";
    process.env.STELOW_HOST = "";
    process.env.PRODUCT_WORKFLOW_CLI = "";
    process.env.PATH = home;

    expect(resolveExtensionHost({ registerCommand: vi.fn() })).toBe("pi");
    expect(resolveExtensionHost(undefined)).toBe("generic");
  });
});
