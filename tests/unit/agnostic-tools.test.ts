/**
 * Tests: CLI Tool Agnostic Name Mapping + Stages Guard Integration
 *
 * Tests the REAL adapters and the full chain:
 *   1. toAgnosticName() mapping per adapter (no mocks — real classes)
 *   2. Stages guard integration: CLI name → agnostic → guard match
 *   3. Auto mode enforcement: agnostic tool + review_mode blocking
 *
 * These catch regressions in the tool abstraction layer — without them,
 * a change to PiAdapter.toAgnosticName() could silently break stages guard
 * or Auto mode enforcement.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { parse as parseYAML } from "yaml";

// ── REAL adapter imports (no mocks) ────────────────────────────────
import { PiAdapter } from "../../extensions/stelow/adapters/pi/index";
import { OpenCodeAdapter } from "../../extensions/stelow/adapters/opencode/index";
import { ClaudeCodeAdapter } from "../../extensions/stelow/adapters/claude-code/index";
import { CodexAdapter } from "../../extensions/stelow/adapters/codex/index";
import { GenericAdapter } from "../../extensions/stelow/adapters/base";
import { createStagesGuard, loadStages } from "../../extensions/stelow/adapters/stages-guard";
import type { StagesConfig, StageState } from "../../extensions/stelow/adapters/stages-guard";

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, "..", "..");
const STAGES_YAML_PATH = join(PROJECT_ROOT, "skills/stelow-product-orchestrator/stages.yaml");

// Load REAL stages.yaml once for all guard tests
const stages: StagesConfig = loadStages(STAGES_YAML_PATH);

// ── Unit: toAgnosticName() per adapter ───────────────────────────

describe("toAgnosticName() per adapter", () => {
  // PiAdapter — instantiate real class (no pi object needed for this method)
  const pi = new PiAdapter();

  it("PiAdapter maps ask_user_question → ask", () => {
    expect(pi.toAgnosticName("ask_user_question")).toBe("ask");
  });

  it("PiAdapter maps plannotator → plannotator (identity)", () => {
    expect(pi.toAgnosticName("plannotator")).toBe("plannotator");
  });

  it("PiAdapter maps subagent → subagent (identity)", () => {
    expect(pi.toAgnosticName("subagent")).toBe("subagent");
  });

  it("PiAdapter maps goal → goal (identity)", () => {
    expect(pi.toAgnosticName("goal")).toBe("goal");
  });

  it("PiAdapter maps intercom → intercom (identity)", () => {
    expect(pi.toAgnosticName("intercom")).toBe("intercom");
  });

  it("PiAdapter maps supervise → supervise (identity)", () => {
    expect(pi.toAgnosticName("supervise")).toBe("supervise");
  });

  it("PiAdapter identity for built-in tools (read, write, bash, edit)", () => {
    expect(pi.toAgnosticName("read")).toBe("read");
    expect(pi.toAgnosticName("write")).toBe("write");
    expect(pi.toAgnosticName("bash")).toBe("bash");
    expect(pi.toAgnosticName("edit")).toBe("edit");
  });

  it("PiAdapter identity for unknown tool names", () => {
    expect(pi.toAgnosticName("some_random_tool")).toBe("some_random_tool");
  });

  // OpenCodeAdapter
  const opencode = new OpenCodeAdapter();

  it("OpenCodeAdapter maps Grep → grep", () => {
    expect(opencode.toAgnosticName("Grep")).toBe("grep");
  });

  it("OpenCodeAdapter maps Glob → ls", () => {
    expect(opencode.toAgnosticName("Glob")).toBe("ls");
  });

  it("OpenCodeAdapter maps WebSearch → web_search", () => {
    expect(opencode.toAgnosticName("WebSearch")).toBe("web_search");
  });

  it("OpenCodeAdapter identity for built-in tools", () => {
    expect(opencode.toAgnosticName("read")).toBe("read");
    expect(opencode.toAgnosticName("bash")).toBe("bash");
  });

  // ClaudeCodeAdapter
  const claude = new ClaudeCodeAdapter();

  it("ClaudeCodeAdapter maps Grep → grep", () => {
    expect(claude.toAgnosticName("Grep")).toBe("grep");
  });

  it("ClaudeCodeAdapter maps Glob → ls", () => {
    expect(claude.toAgnosticName("Glob")).toBe("ls");
  });

  it("ClaudeCodeAdapter identity for built-in tools", () => {
    expect(claude.toAgnosticName("read")).toBe("read");
    expect(claude.toAgnosticName("write")).toBe("write");
  });

  // CodexAdapter
  const codex = new CodexAdapter();

  it("CodexAdapter maps Grep → grep", () => {
    expect(codex.toAgnosticName("Grep")).toBe("grep");
  });

  it("CodexAdapter maps Glob → ls", () => {
    expect(codex.toAgnosticName("Glob")).toBe("ls");
  });

  it("CodexAdapter maps WebSearch → web_search", () => {
    expect(codex.toAgnosticName("WebSearch")).toBe("web_search");
  });

  // GenericAdapter — identity for everything
  const generic = new GenericAdapter();

  it("GenericAdapter returns identity for all tools", () => {
    expect(generic.toAgnosticName("ask")).toBe("ask");
    expect(generic.toAgnosticName("read")).toBe("read");
    expect(generic.toAgnosticName("anything")).toBe("anything");
  });
});

// ── Integration: CLI agnostic name → stages guard ───────────────

describe("Stages guard with agnostic tool names (regression: bug fix)", () => {
  // These tests verify the CORRECTED flow:
  //   cli tool name → toAgnosticName() → stages guard
  // Without the fix, "ask_user_question" was passed directly to the guard,
  // which never matched "ask" in stages.yaml — tools were never blocked.
  //
  // These tests use REAL stages.yaml and verify that agnostic names
  // correctly trigger the guard's blocked_tools / allowed_tools rules.

  const pi = new PiAdapter();

  // Simulate what the tool_call handler does:
  //   tool = event.toolName  →  agnosticTool = adapter.toAgnosticName(tool)
  function toAgnostic(cliName: string): string {
    return pi.toAgnosticName(cliName);
  }

  describe("Gate stage — blocked tools", () => {
    const gateState: StageState = {
      current_stage: "gate",
      previous_stage: "critique",
      transitioned_at: "2026-06-28T10:00:00Z",
      history: [],
      gates_passed: [],
      supervisor_active: false,
    };
    const guard = createStagesGuard(stages, gateState);

    it("blocks edit (Pi name = edit, agnostic = edit)", () => {
      // Pi tool_call gives "edit" → toAgnostic("edit") = "edit"
      expect(guard(toAgnostic("edit")).allowed).toBe(false);
    });

    it("blocks write (Pi name = write, agnostic = write)", () => {
      expect(guard(toAgnostic("write")).allowed).toBe(false);
    });

    it("blocks bash (Pi name = bash, agnostic = bash)", () => {
      expect(guard(toAgnostic("bash")).allowed).toBe(false);
    });

    it("ALLOWS ask (Pi name = ask_user_question → agnostic = ask)", () => {
      // THIS is the bug that was fixed: ask is allowed in gate stage
      expect(guard(toAgnostic("ask_user_question")).allowed).toBe(true);
    });

    it("ALLOWS read (Pi name = read, agnostic = read)", () => {
      expect(guard(toAgnostic("read")).allowed).toBe(true);
    });
  });

  describe("Setup stage — all tools allowed", () => {
    const setupState: StageState = {
      current_stage: "setup",
      previous_stage: "select",
      transitioned_at: "2026-06-28T10:00:00Z",
      history: [],
      gates_passed: [],
      supervisor_active: false,
    };
    const guard = createStagesGuard(stages, setupState);

    it("ALLOWS ask_user_question → ask in setup", () => {
      expect(guard(toAgnostic("ask_user_question")).allowed).toBe(true);
    });

    it("ALLOWS built-in tools in setup", () => {
      expect(guard(toAgnostic("read")).allowed).toBe(true);
      expect(guard(toAgnostic("write")).allowed).toBe(true);
      expect(guard(toAgnostic("bash")).allowed).toBe(true);
    });

    it("ALLOWS subagent (Pi name = subagent, agnostic = subagent)", () => {
      expect(guard(toAgnostic("subagent")).allowed).toBe(true);
    });
  });

  describe("Unknown CLI tool names — mapped via adapter then checked", () => {
    const triageState: StageState = {
      current_stage: "triage",
      previous_stage: null,
      transitioned_at: "2026-06-28T10:00:00Z",
      history: [],
      gates_passed: [],
      supervisor_active: false,
    };
    const guard = createStagesGuard(stages, triageState);

    it("handles any unknown tool name via identity mapping", () => {
      // Pi tool_call receives some tool not in the mapping
      // toAgnostic returns the same name (identity)
      expect(guard(toAgnostic("weird_extension_tool")).allowed).toBe(true);
    });
  });
});

// ── Integration: Auto mode enforcement ──────────────────────────

describe("Auto mode enforcement (tool-level blocking)", () => {
  // These tests replicate the logic from index.ts tool_call handler:
  //   agnosticTool in ["ask", "plannotator"] AND review_mode === "Auto" → BLOCK
  //
  // They read from a REAL index.json file (written during test setup)
  // to verify the full chain: file I/O → config → decision.

  const tmpBase = join(PROJECT_ROOT, ".tmp-auto-mode-test");
  const tmpWorkflowDir = join(tmpBase, "2026-06-28", "sw-test-auto");
  const indexPath = join(tmpWorkflowDir, "index.json");

  // Helper: simulate the tool_call handler's decision logic
  function shouldBlockInAutoMode(
    agnosticTool: string,
    indexJson: { config?: { review_mode?: string } } | null
  ): boolean {
    if (!indexJson) return false;  // no config → don't block
    const reviewMode = indexJson.config?.review_mode;
    if (reviewMode !== "Auto") return false;
    return agnosticTool === "ask" || agnosticTool === "plannotator";
  }

  beforeEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
    mkdirSync(tmpWorkflowDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it("blocks ask when review_mode=Auto", () => {
    writeFileSync(indexPath, JSON.stringify({
      config: { review_mode: "Auto", appetite: "Lean" },
      name: "test-wf",
      workflow_status: "in-progress",
    }));
    const idx = JSON.parse(readFileSync(indexPath, "utf-8"));
    expect(shouldBlockInAutoMode("ask", idx)).toBe(true);
  });

  it("blocks plannotator when review_mode=Auto", () => {
    writeFileSync(indexPath, JSON.stringify({
      config: { review_mode: "Auto" },
    }));
    const idx = JSON.parse(readFileSync(indexPath, "utf-8"));
    expect(shouldBlockInAutoMode("plannotator", idx)).toBe(true);
  });

  it("ALLOWS read when review_mode=Auto (not an interaction tool)", () => {
    writeFileSync(indexPath, JSON.stringify({
      config: { review_mode: "Auto" },
    }));
    const idx = JSON.parse(readFileSync(indexPath, "utf-8"));
    expect(shouldBlockInAutoMode("read", idx)).toBe(false);
  });

  it("ALLOWS ask when review_mode=Only Product Spec (not Auto)", () => {
    writeFileSync(indexPath, JSON.stringify({
      config: { review_mode: "Only Product Spec" },
    }));
    const idx = JSON.parse(readFileSync(indexPath, "utf-8"));
    expect(shouldBlockInAutoMode("ask", idx)).toBe(false);
  });

  it("ALLOWS ask when review_mode=All Above + Scopes In/Out", () => {
    writeFileSync(indexPath, JSON.stringify({
      config: { review_mode: "All Above + Scopes In/Out" },
    }));
    const idx = JSON.parse(readFileSync(indexPath, "utf-8"));
    expect(shouldBlockInAutoMode("ask", idx)).toBe(false);
  });

  it("does NOT block when index.json is missing/malformed", () => {
    expect(shouldBlockInAutoMode("ask", null)).toBe(false);
  });

  it("does NOT block when config block is missing from index.json", () => {
    writeFileSync(indexPath, JSON.stringify({
      name: "test-wf",
      workflow_status: "in-progress",
      // no config block
    }));
    const idx = JSON.parse(readFileSync(indexPath, "utf-8"));
    expect(shouldBlockInAutoMode("ask", idx)).toBe(false);
  });

  it("does NOT block when review_mode field is missing", () => {
    writeFileSync(indexPath, JSON.stringify({
      config: { appetite: "Lean" },  // no review_mode
    }));
    const idx = JSON.parse(readFileSync(indexPath, "utf-8"));
    expect(shouldBlockInAutoMode("ask", idx)).toBe(false);
  });

  // Full chain test: Pi tool name → toAgnostic → Auto mode check
  it("full chain: Pi ask_user_question → ask → blocked in Auto", () => {
    const pi = new PiAdapter();
    writeFileSync(indexPath, JSON.stringify({
      config: { review_mode: "Auto" },
    }));
    const idx = JSON.parse(readFileSync(indexPath, "utf-8"));
    const agnostic = pi.toAgnosticName("ask_user_question");
    expect(agnostic).toBe("ask");
    expect(shouldBlockInAutoMode(agnostic, idx)).toBe(true);
  });

  it("full chain: Pi plannotator → plannotator → blocked in Auto", () => {
    const pi = new PiAdapter();
    writeFileSync(indexPath, JSON.stringify({
      config: { review_mode: "Auto" },
    }));
    const idx = JSON.parse(readFileSync(indexPath, "utf-8"));
    const agnostic = pi.toAgnosticName("plannotator");
    expect(agnostic).toBe("plannotator");
    expect(shouldBlockInAutoMode(agnostic, idx)).toBe(true);
  });

  it("full chain: Pi bash → bash → NOT blocked in Auto", () => {
    const pi = new PiAdapter();
    writeFileSync(indexPath, JSON.stringify({
      config: { review_mode: "Auto" },
    }));
    const idx = JSON.parse(readFileSync(indexPath, "utf-8"));
    const agnostic = pi.toAgnosticName("bash");
    expect(agnostic).toBe("bash");
    expect(shouldBlockInAutoMode(agnostic, idx)).toBe(false);
  });

  // Future-proofing: if someone adds a new ask extension to Pi,
  // they just need to add the mapping in PiAdapter.toAgnosticName().
  // These tests verify that any tool mapped to "ask" is blocked.
  it("regression: any tool name mapped to ask is blocked in Auto", () => {
    const customPiName = "ask_human";  // hypothetical Pi extension
    // Simulate what would happen if mapping is added
    const pi = new PiAdapter();
    // Temporarily extend mapping (simulates future extension)
    const orig = pi.toAgnosticName.bind(pi);
    const extended = (name: string) => name === "ask_human" ? "ask" : orig(name);

    writeFileSync(indexPath, JSON.stringify({
      config: { review_mode: "Auto" },
    }));
    const idx = JSON.parse(readFileSync(indexPath, "utf-8"));
    const agnostic = extended("ask_human");
    expect(agnostic).toBe("ask");
    expect(shouldBlockInAutoMode(agnostic, idx)).toBe(true);
  });
});

// ── Regression: stages guard + agnostic names in all stages ────

describe("Stages guard allows ask in all stages (by design)", () => {
  // ask is listed in allowed_tools for all stages in stages.yaml.
  // This is by design — ask is a fundamental tool.
  // These tests verify that the guard doesn't accidentally block it
  // when the agnostic name "ask" is checked.

  const stageNames = [
    "triage", "select", "setup", "context", "shape",
    "critique", "gate", "scope", "interface", "int-gate",
    "selection", "planning", "execution", "verification", "audit",
  ];

  for (const stageName of stageNames) {
    it(`allows ask in ${stageName}`, () => {
      const state: StageState = {
        current_stage: stageName,
        previous_stage: null,
        transitioned_at: "2026-06-28T10:00:00Z",
        history: [],
        gates_passed: [],
        supervisor_active: false,
      };
      const guard = createStagesGuard(stages, state);
      expect(guard("ask").allowed).toBe(true);
    });
  }
});
