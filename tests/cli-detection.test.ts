/**
 * CLI Detection tests — Pi + generic only as of v0.45.0.
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
} from "../extensions/stelow/state";
import { getCLICapabilities } from "../extensions/stelow/types";

describe("CLI Detection", () => {
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
    it("respects PRODUCT_WORKFLOW_CLI env var when set to 'pi'", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "pi";
      expect(detectCLI()).toBe("pi");
    });

    it("respects PRODUCT_WORKFLOW_CLI env var when set to 'generic'", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "generic";
      expect(detectCLI()).toBe("generic");
    });

    it("is case-insensitive for PRODUCT_WORKFLOW_CLI env var", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "PI";
      expect(detectCLI()).toBe("pi");
    });

    it("trims whitespace from PRODUCT_WORKFLOW_CLI", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "  pi  ";
      expect(detectCLI()).toBe("pi");
    });

    it("falls back to generic for unknown PRODUCT_WORKFLOW_CLI value", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "unknown-cli";
      expect(detectCLI()).toBe("generic");
    });

    it("falls back to generic when PRODUCT_WORKFLOW_CLI is empty", () => {
      expect(detectCLI()).toBeDefined();
    });

    it("falls back to generic when PRODUCT_WORKFLOW_CLI is whitespace-only", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "   ";
      expect(detectCLI()).toBeDefined();
    });
  });

  describe("getCLICapabilities() (from types.ts)", () => {
    it("returns full capabilities for 'pi' CLI", () => {
      const caps = getCLICapabilities("pi");
      expect(caps.cli).toBe("pi");
      expect(caps.hasPluginSystem).toBe(true);
      expect(caps.pluginFormat).toBe("npm");
      expect(caps.hasSessionStart).toBe(true);
      expect(caps.hasToolCall).toBe(true);
      expect(caps.hasTurnEnd).toBe(true);
      expect(caps.hasAskUserQuestion).toBe(true);
      expect(caps.hasGoals).toBe(true);
      expect(caps.hasIntercom).toBe(true);
      expect(caps.hasSupervise).toBe(true);
      expect(caps.hasTUI).toBe(true);
      expect(caps.hasNotifications).toBe(true);
      expect(caps.hasSelectList).toBe(true);
      expect(caps.hasStatusLine).toBe(true);
      expect(caps.hasMCPSupport).toBe(true);
    });

    it("returns minimal capabilities for 'generic' CLI", () => {
      const caps = getCLICapabilities("generic");
      expect(caps.cli).toBe("generic");
      expect(caps.hasPluginSystem).toBe(false);
      expect(caps.pluginFormat).toBeNull();
      expect(caps.hasAskUserQuestion).toBe(false);
      expect(caps.hasGoals).toBe(false);
      expect(caps.hasIntercom).toBe(false);
      expect(caps.hasSupervise).toBe(false);
      expect(caps.hasTUI).toBe(false);
      expect(caps.hasNotifications).toBe(false);
      expect(caps.hasSelectList).toBe(false);
      expect(caps.hasStatusLine).toBe(false);
    });

    it("hasCommands is true for both pi and generic", () => {
      for (const cli of ["pi", "fusion", "generic"]) {
        expect(getCLICapabilities(cli).hasCommands).toBe(true);
      }
    });

    it("commandPrefix is '/' for both pi and generic", () => {
      for (const cli of ["pi", "fusion", "generic"]) {
        expect(getCLICapabilities(cli).commandPrefix).toBe("/");
      }
    });

    it("returns distinct capabilities between pi and generic", () => {
      const capsMap = ["pi", "fusion", "generic"].map((cli) =>
        JSON.stringify(getCLICapabilities(cli)),
      );
      const uniqueCaps = new Set(capsMap);
      expect(uniqueCaps.size).toBe(3);
    });
  });

  describe("getCLICapabilites() (wrapper from state.ts)", () => {
    it("returns capabilities for specified CLI", () => {
      const caps = getCLICapabilites("pi");
      expect(caps.cli).toBe("pi");
    });

    it("detects CLI when not specified", () => {
      const caps = getCLICapabilites();
      expect(["pi", "fusion", "generic"]).toContain(caps.cli);
    });

    it("returns same result as direct getCLICapabilities call", () => {
      const capsFromWrapper = getCLICapabilites("pi");
      const capsFromDirect = getCLICapabilities("pi");
      expect(capsFromWrapper).toEqual(capsFromDirect);
    });
  });

  describe("Capability comparisons", () => {
    it("pi has the most capabilities", () => {
      const piCaps = getCLICapabilities("pi");
      const genericCaps = getCLICapabilities("generic");
      const piCount = Object.values(piCaps).filter((v) => v === true).length;
      const genericCount = Object.values(genericCaps).filter(
        (v) => v === true,
      ).length;
      expect(piCount).toBeGreaterThan(genericCount);
    });

    it("only pi has ask_user_question capability", () => {
      expect(getCLICapabilities("pi").hasAskUserQuestion).toBe(true);
      expect(getCLICapabilities("generic").hasAskUserQuestion).toBe(false);
    });

    it("only pi has intercom capability", () => {
      expect(getCLICapabilities("pi").hasIntercom).toBe(true);
      expect(getCLICapabilities("generic").hasIntercom).toBe(false);
    });

    it("pluginFormat varies by CLI", () => {
      expect(getCLICapabilities("pi").pluginFormat).toBe("npm");
      expect(getCLICapabilities("generic").pluginFormat).toBeNull();
    });
  });

  describe("Integration: detectCLI + getCLICapabilities", () => {
    it("when PRODUCT_WORKFLOW_CLI=pi, detectCLI returns pi and caps match", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "pi";
      const detected = detectCLI();
      const caps = getCLICapabilities(detected);
      expect(detected).toBe("pi");
      expect(caps.cli).toBe("pi");
      expect(caps.hasGoals).toBe(true);
    });

    it("when PRODUCT_WORKFLOW_CLI=generic, capabilities reflect generic", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "generic";
      const detected = detectCLI();
      const caps = getCLICapabilities(detected);
      expect(detected).toBe("generic");
      expect(caps.pluginFormat).toBeNull();
    });
  });
});
