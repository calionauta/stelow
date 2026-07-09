/**
 * Tests: Orchestrator subagents.md contract — narrowed to pi + generic in v0.45.0.
 *
 * Pre-v0.45.0 this file asserted that the orchestrator's `subagents.md`
 * reference file contained rows for each CLI harness. After narrowing,
 * only `pi` (with Pi-native path) and `generic` (the Universal Fallback)
 * remain.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUBAGENTS_MD = join(
  __dirname,
  "../../skills/stelow-product-orchestrator/references/cli-tools/subagents.md",
);

describe("subagent-context-contract", () => {
  const content = readFileSync(SUBAGENTS_MD, "utf-8");

  it("file exists and is non-empty", () => {
    expect(content.length).toBeGreaterThan(100);
  });

  it("has a row for pi", () => {
    expect(content).toMatch(/pi[\s\S]*?subagent/);
  });

  it("documents the Universal Fallback", () => {
    expect(content).toMatch(/Universal\s+Fallback/i);
  });

  it("documents the Pi-native path", () => {
    expect(content).toMatch(/Pi-?native path|Pi-?native\s+\(recommended\)/i);
  });

  it("requires explicit `context: \"fresh\"` for packaged agents", () => {
    // The contract: every subagent call must override packaged-agent defaults.
    // Same rule applies to v0.45.0 narrowing — we keep the explicit-fresh rule.
    expect(content).toMatch(/context:\s*"fresh"/);
  });

  it("does NOT mention opencode", () => {
    expect(content.toLowerCase()).not.toMatch(/opencode/);
  });

  it("does NOT mention claude-code", () => {
    expect(content.toLowerCase()).not.toMatch(/claude-code|claude code/);
  });

  it("does NOT mention codex", () => {
    expect(content.toLowerCase()).not.toMatch(/codex/);
  });
});
