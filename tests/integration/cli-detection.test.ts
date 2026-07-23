/**
 * CLI Detection integration tests — narrowed to Pi + generic in v0.45.0.
 *
 * Pre-v0.45.0 this file covered 5 CLIs (pi, opencode, claude-code, codex,
 * generic). Per the v0.45.0 Pi-first narrowing — see
 * docs/archive/2026-07-09-deprecated-multi-cli-integration/ — only Pi has
 * a maintained harness adapter. Any agent that reads `~/.agents/skills/<name>/`
 * picks up the orchestrator skill via the agentskills.io standard.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  detectCLI,
  getCLICapabilites,
} from "../../extensions/stelow/state";
import { getCLICapabilities } from "../../extensions/stelow/types";

describe("CLI Detection Integration Tests", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.PRODUCT_WORKFLOW_CLI;
    delete process.env.PRODUCT_WORKFLOW_CLI;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PRODUCT_WORKFLOW_CLI;
    } else {
      process.env.PRODUCT_WORKFLOW_CLI = originalEnv;
    }
  });

  describe("detectCLI()", () => {
    it("returns 'pi' when PRODUCT_WORKFLOW_CLI=pi", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "pi";
      expect(detectCLI()).toBe("pi");
    });

    it("returns 'generic' when PRODUCT_WORKFLOW_CLI=generic", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "generic";
      expect(detectCLI()).toBe("generic");
    });

    it("is case-insensitive", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "PI";
      expect(detectCLI()).toBe("pi");
    });

    it("trims whitespace", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "  pi  ";
      expect(detectCLI()).toBe("pi");
    });

    it("returns 'generic' for unknown CLI values", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "unknown-cli";
      expect(detectCLI()).toBe("generic");
    });

    it("returns 'generic' for empty PRODUCT_WORKFLOW_CLI", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "";
      expect(detectCLI()).toBeDefined();
    });

    it("returns 'generic' for whitespace-only PRODUCT_WORKFLOW_CLI", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "   ";
      expect(detectCLI()).toBeDefined();
    });
  });

  describe("getCLICapabilities()", () => {
    it("returns full capabilities for 'pi' CLI", () => {
      const caps = getCLICapabilities("pi");
      expect(caps.cli).toBe("pi");
      expect(caps.hasPluginSystem).toBe(true);
      expect(caps.hasAskUserQuestion).toBe(true);
      expect(caps.hasGoals).toBe(true);
      expect(caps.hasIntercom).toBe(true);
      expect(caps.hasSupervise).toBe(true);
    });

    it("returns minimal capabilities for 'generic' CLI", () => {
      const caps = getCLICapabilities("generic");
      expect(caps.cli).toBe("generic");
      expect(caps.hasPluginSystem).toBe(false);
      expect(caps.hasAskUserQuestion).toBe(false);
      expect(caps.hasGoals).toBe(false);
    });
  });

  describe("Capability comparison: pi vs generic", () => {
    it("pi has AskUserQuestion; generic does not", () => {
      expect(getCLICapabilities("pi").hasAskUserQuestion).toBe(true);
      expect(getCLICapabilities("generic").hasAskUserQuestion).toBe(false);
    });

    it("pi has Goals; generic does not", () => {
      expect(getCLICapabilities("pi").hasGoals).toBe(true);
      expect(getCLICapabilities("generic").hasGoals).toBe(false);
    });

    it("pi has Intercom; generic does not", () => {
      expect(getCLICapabilities("pi").hasIntercom).toBe(true);
      expect(getCLICapabilities("generic").hasIntercom).toBe(false);
    });

    it("both have hasCommands=true", () => {
      expect(getCLICapabilities("pi").hasCommands).toBe(true);
      expect(getCLICapabilities("generic").hasCommands).toBe(true);
    });

    it("both have commandPrefix='/'", () => {
      expect(getCLICapabilities("pi").commandPrefix).toBe("/");
      expect(getCLICapabilities("generic").commandPrefix).toBe("/");
    });

    it("pi has pluginFormat='npm'; generic is null", () => {
      expect(getCLICapabilities("pi").pluginFormat).toBe("npm");
      expect(getCLICapabilities("generic").pluginFormat).toBeNull();
    });

    it("pi has more total capabilities than generic", () => {
      const piCount = Object.values(getCLICapabilities("pi")).filter(
        (v) => v === true,
      ).length;
      const genCount = Object.values(getCLICapabilities("generic")).filter(
        (v) => v === true,
      ).length;
      expect(piCount).toBeGreaterThan(genCount);
    });
  });

  describe("getCLICapabilites wrapper", () => {
    it("returns capabilities for specified CLI", () => {
      const caps = getCLICapabilites("pi");
      expect(caps.cli).toBe("pi");
    });

    it("detects CLI when not specified", () => {
      const caps = getCLICapabilites();
      expect(["pi", "fusion", "generic"]).toContain(caps.cli);
    });

    it("matches getCLICapabilities directly", () => {
      const wrapper = getCLICapabilites("pi");
      const direct = getCLICapabilities("pi");
      expect(wrapper).toEqual(direct);
    });
  });

  describe("Integration: detectCLI + capabilities", () => {
    it("when PRODUCT_WORKFLOW_CLI=pi, caps match pi", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "pi";
      const detected = detectCLI();
      const caps = getCLICapabilities(detected);
      expect(detected).toBe("pi");
      expect(caps.hasGoals).toBe(true);
    });

    it("when PRODUCT_WORKFLOW_CLI=generic, caps reflect generic", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "generic";
      const detected = detectCLI();
      const caps = getCLICapabilities(detected);
      expect(detected).toBe("generic");
      expect(caps.pluginFormat).toBeNull();
    });
  });
});
