/**
 * Integration Tests: Command Dispatcher
 *
 * Tests for WORKFLOW_COMMANDS array and getCommandSystem():
 * - WORKFLOW_COMMANDS array structure and content
 * - getCommandSystem() for "pi" (native) and "generic" (no-op)
 * - Command registration system interface compliance
 * - Command file generation (pi: none, generic: none)
 *
 * **v0.45.0 narrowing:** per-harness command-file generators for
 * opencode/claude-code/codex were removed when those harness directories
 * were deleted. Only the pi + generic code paths are exercised here.
 * See `docs/archive/2026-07-09-deprecated-multi-cli-integration/README.md`
 * for the historical surface and migration notes.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CLI } from "../../extensions/stelow/types";
import {
  WORKFLOW_COMMANDS,
  getCommandSystem,
  type CommandRegistrationSystem,
} from "../../extensions/stelow/adapters/commands";

describe("Command Dispatcher Integration Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PRODUCT_WORKFLOW_CLI;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ── WORKFLOW_COMMANDS Array Tests ───────────────────────────────────

  describe("WORKFLOW_COMMANDS array", () => {
    it("is an array of command descriptors", () => {
      expect(Array.isArray(WORKFLOW_COMMANDS)).toBe(true);
      expect(WORKFLOW_COMMANDS.length).toBeGreaterThan(0);
    });

    it("each command has required properties", () => {
      for (const cmd of WORKFLOW_COMMANDS) {
        expect(cmd).toHaveProperty("name");
        expect(cmd).toHaveProperty("description");
        expect(typeof cmd.name).toBe("string");
        expect(typeof cmd.description).toBe("string");
      }
    });

    it("all commands start with 'sw-' prefix", () => {
      for (const cmd of WORKFLOW_COMMANDS) {
        expect(cmd.name.startsWith("sw-")).toBe(true);
      }
    });

    it("contains the expected commands", () => {
      const names = WORKFLOW_COMMANDS.map((cmd) => cmd.name);
      for (const expected of [
        "sw-start",
        "sw-abort",
        "sw-pause",
        "sw-resume",
        "sw-status",
        "sw-ls",
        "sw-setphase",
        "sw-next",
        "sw-complete",
        "sw-info",
        "sw-rename",
        "sw-doctor",
        "sw-inbox",
        "sw-archive",
        "sw-unarchive",
      ]) {
        expect(names).toContain(expected);
      }
    });

    it("each command has a unique name", () => {
      const names = WORKFLOW_COMMANDS.map((cmd) => cmd.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(WORKFLOW_COMMANDS.length);
    });

    it("optional usage field is a string when present", () => {
      for (const cmd of WORKFLOW_COMMANDS) {
        if (cmd.usage !== undefined) {
          expect(typeof cmd.usage).toBe("string");
        }
      }
    });
  });

  // ── getCommandSystem() Tests ────────────────────────────────────────

  describe("getCommandSystem()", () => {
    it("returns a pi command system when cli='pi'", () => {
      const system = getCommandSystem("pi");
      expect(system).toBeDefined();
      expect(system.cli).toBe("pi");
    });

    it("returns a generic command system when cli='generic'", () => {
      const system = getCommandSystem("generic");
      expect(system).toBeDefined();
      expect(system.cli).toBe("generic");
    });

    it("returns a command system whose cli matches the explicit arg", () => {
      const clis: CLI[] = ["pi", "generic"];
      for (const cli of clis) {
        const system = getCommandSystem(cli);
        expect(system.cli).toBe(cli);
      }
    });
  });

  // ── CommandRegistrationSystem Interface Compliance ──────────────────

  describe("CommandRegistrationSystem interface compliance", () => {
    const requiredMethods = [
      "supportsNativeCommands",
      "registerAll",
      "registerOne",
      "getCommandPrefix",
      "generateCommandFiles",
    ] as const;

    it("pi command system implements all required methods", () => {
      const system = getCommandSystem("pi");
      for (const method of requiredMethods) {
        expect(typeof system[method]).toBe("function");
      }
    });

    it("generic command system implements all required methods", () => {
      const system = getCommandSystem("generic");
      for (const method of requiredMethods) {
        expect(typeof system[method]).toBe("function");
      }
    });
  });

  // ── supportsNativeCommands() ────────────────────────────────────────

  describe("supportsNativeCommands()", () => {
    it("pi supports native commands (registerCommand via ExtensionAPI)", () => {
      const system = getCommandSystem("pi");
      expect(system.supportsNativeCommands()).toBe(true);
    });

    it("generic does not support native commands", () => {
      const system = getCommandSystem("generic");
      expect(system.supportsNativeCommands()).toBe(false);
    });
  });

  // ── registerAll() ───────────────────────────────────────────────────

  describe("registerAll()", () => {
    it("pi registerAll returns all workflow commands", () => {
      const system = getCommandSystem("pi");
      const commands = system.registerAll();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBe(WORKFLOW_COMMANDS.length);
    });

    it("generic registerAll returns an empty array", () => {
      const system = getCommandSystem("generic");
      const commands = system.registerAll();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBe(0);
    });
  });

  // ── registerOne() ───────────────────────────────────────────────────

  describe("registerOne()", () => {
    it("pi registerOne returns true for a valid command", () => {
      const system = getCommandSystem("pi");
      expect(system.registerOne(WORKFLOW_COMMANDS[0])).toBe(true);
    });

    it("generic registerOne returns false", () => {
      const system = getCommandSystem("generic");
      expect(system.registerOne(WORKFLOW_COMMANDS[0])).toBe(false);
    });
  });

  // ── getCommandPrefix() ──────────────────────────────────────────────

  describe("getCommandPrefix()", () => {
    it("returns '/' for both pi and generic", () => {
      for (const cli of ["pi", "generic"] as CLI[]) {
        expect(getCommandSystem(cli).getCommandPrefix()).toBe("/");
      }
    });
  });

  // ── generateCommandFiles() ──────────────────────────────────────────

  describe("generateCommandFiles()", () => {
    it("pi generates no command files (uses native registerCommand)", () => {
      const files = getCommandSystem("pi").generateCommandFiles();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });

    it("generic generates no command files (no skills/path to write to)", () => {
      const files = getCommandSystem("generic").generateCommandFiles();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });
  });

  // ── PRODUCT_WORKFLOW_CLI Override Tests ─────────────────────────────

  describe("PRODUCT_WORKFLOW_CLI override affects getCommandSystem()", () => {
    it("PRODUCT_WORKFLOW_CLI=pi uses the pi command system", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "pi";
      const system = getCommandSystem();
      expect(system.cli).toBe("pi");
    });

    it("PRODUCT_WORKFLOW_CLI=generic uses the generic command system", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "generic";
      const system = getCommandSystem();
      expect(system.cli).toBe("generic");
    });

    it("explicit CLI argument overrides PRODUCT_WORKFLOW_CLI", () => {
      process.env.PRODUCT_WORKFLOW_CLI = "generic";
      const system = getCommandSystem("pi");
      expect(system.cli).toBe("pi");
    });
  });

  // ── CLI-Specific Command System Differences ─────────────────────────

  describe("CLI-specific command system differences", () => {
    it("only pi uses native command registration", () => {
      expect(getCommandSystem("pi").supportsNativeCommands()).toBe(true);
      expect(getCommandSystem("generic").supportsNativeCommands()).toBe(false);
    });

    it("both pi and generic generate no command files (extension-side path)", () => {
      expect(getCommandSystem("pi").generateCommandFiles().length).toBe(0);
      expect(getCommandSystem("generic").generateCommandFiles().length).toBe(0);
    });

    it("pi and generic both return '/' as the command prefix", () => {
      const clis: CLI[] = ["pi", "generic"];
      for (const cli of clis) {
        expect(getCommandSystem(cli).getCommandPrefix()).toBe("/");
      }
    });
  });

  // ── Type-level Sanity ───────────────────────────────────────────────

  it("pi and generic systems satisfy the CommandRegistrationSystem type", () => {
    const pi: CommandRegistrationSystem = getCommandSystem("pi");
    const generic: CommandRegistrationSystem = getCommandSystem("generic");
    expect(pi).toBeDefined();
    expect(generic).toBeDefined();
  });
});
