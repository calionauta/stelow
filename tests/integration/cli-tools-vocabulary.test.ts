/**
 * cli-tools-vocabulary.test.ts
 *
 * Locks the canonical tool vocabulary and reference doc surface:
 *
 *   1. `stages.yaml#tools` declares the canonical vocabulary
 *      (ask_user_question, visual_review, subagent, read, write, edit,
 *      bash, grep, ls, agent_browser).
 *   2. Every `stages[*].allowed_tools / preferred_tools / primary_actions /
 *      blocked_tools / approval_tool` reference resolves to a tool that
 *      exists in the canonical vocabulary.
 *   3. The orchestrator skill ships one `references/cli-tools/<tool>.md`
 *      per canonical tool (with the natural mapping: plannotator.md
 *      documents visual_review; ask.md documents ask_user_question).
 *   4. The visual_review reference doc explicitly documents both the
 *      Pi-native Plannotator implementation AND the universal
 *      `.stelow/approvals/{dirHash}/{file}.approved.md` fallback.
 *
 * These invariants gate SW-002's locked-in decision: "Tool names agnósticos
 * em `stages.yaml#tools` → convenção Anthropic-style".
 */
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadStages } from "../../extensions/stelow/adapters/stages-loader";

const CONFIG = join(process.cwd(), "skills/stelow-product-orchestrator/stages.yaml");
const CLI_TOOLS_DIR = join(process.cwd(), "skills/stelow-product-orchestrator/references/cli-tools");

// Canonical tool name → reference doc filename (without extension).
// `ask_user_question` ships as `ask.md`; `visual_review` ships as
// `plannotator.md` (Pi-native name is used because that's what the
// Pi plannotator extension invokes; the doc explains the agnostic mapping).
const TOOL_REFERENCE_DOCS: Record<string, string> = {
  ask_user_question: "ask.md",
  visual_review: "plannotator.md",
  subagent: "subagents.md",
  read: undefined,    // No dedicated doc — read is a host primitive.
  write: undefined,
  edit: undefined,
  bash: undefined,
  grep: undefined,
  ls: undefined,
  agent_browser: "agent_browser.md",
};

describe("cli-tools vocabulary contract", () => {
  it("stages.yaml declares the canonical 10-tool vocabulary", () => {
    const config = loadStages(CONFIG);
    const tools = Object.keys(config.tools).sort();
    expect(tools).toEqual([
      "agent_browser",
      "ask_user_question",
      "bash",
      "edit",
      "grep",
      "ls",
      "read",
      "subagent",
      "visual_review",
      "write",
    ]);
  });

  it("every stage's tool reference resolves to the canonical vocabulary", () => {
    const config = loadStages(CONFIG);
    const vocabulary = new Set(Object.keys(config.tools));
    for (const stage of config.stages) {
      for (const field of [
        stage.allowed_tools,
        stage.blocked_tools,
        stage.preferred_tools,
        stage.primary_actions,
      ] as Array<string[] | undefined>) {
        for (const name of field ?? []) {
          expect(vocabulary, `stage ${stage.name} references unknown tool ${name}`).toContain(name);
        }
      }
      if (stage.approval_tool) {
        expect(vocabulary, `stage ${stage.name} approval_tool ${stage.approval_tool} unknown`).toContain(stage.approval_tool);
      }
    }
  });

  it("each tool with a dedicated reference doc ships one", () => {
    const present = new Set(readdirSync(CLI_TOOLS_DIR));
    for (const [tool, doc] of Object.entries(TOOL_REFERENCE_DOCS)) {
      if (doc) {
        expect(present.has(doc), `cli-tools/${doc} missing for ${tool}`).toBe(true);
      }
    }
  });

  it("plannotator.md documents BOTH Pi-native and universal-fallback paths", () => {
    const path = join(CLI_TOOLS_DIR, "plannotator.md");
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, "utf8");
    // Pi implementation references the host-native Plannotator binary.
    expect(content).toMatch(/plannotator annotate/i);
    // Universal fallback references the canonical receipt path.
    expect(content).toMatch(/\.stelow\/approvals\/.+\/\{filename\}\.approved\.md|\.stelow\/approvals\/\{dirHash\}\/\{file\}\.approved\.md|\.stelow\/approvals/);
    // The doc is about the agnostic `visual_review` tool, not the
    // Pi-only `plannotator` CLI directly.
    expect(content).toMatch(/visual_review/);
  });

  it("ask.md documents the canonical ask_user_question name (not host-specific)", () => {
    const path = join(CLI_TOOLS_DIR, "ask.md");
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, "utf8");
    expect(content).toMatch(/ask_user_question/);
    expect(content).toMatch(/Fusion/i);
    expect(content).toMatch(/host-agnostic|agnostic|canonical/i);
  });

  it("subagents.md documents the canonical subagent tool across hosts", () => {
    const path = join(CLI_TOOLS_DIR, "subagents.md");
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, "utf8");
    // Universal fallback is documented.
    expect(content).toMatch(/Universal Fallback|generic/i);
    expect(content).toMatch(/subagent/i);
  });

  it("every host entry in stages.yaml#tools has a known host value or null", () => {
    const config = loadStages(CONFIG);
    const hosts = ["pi", "fusion", "generic"] as const;
    for (const [tool, mapping] of Object.entries(config.tools)) {
      for (const host of hosts) {
        const value = (mapping as Record<string, unknown>)[host];
        // Value must be either a string (host-native tool name) or null
        // (use stelow's safe fallback).
        expect(["string", "object"], `${tool}.${host} value`).toContain(typeof value);
        if (typeof value === "string") {
          expect(value.length, `${tool}.${host} host-native name`).toBeGreaterThan(0);
        }
      }
    }
  });
});