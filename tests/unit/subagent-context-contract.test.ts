/**
 * Tests: Orchestrator subagents.md contract — capability-first.
 *
 * subagents.md documents dispatch by harness CAPABILITY
 * (acceptance-native / isolated / headless / generic), never by harness
 * brand. No harness-specific install commands, package names, or
 * config paths may appear: the orchestrator probes the tool registry
 * top-down instead.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUBAGENTS_MD = join(
  __dirname,
  "../../skills/stelow-workflow-orchestrator/references/cli-tools/subagents.md",
);

describe("subagent-context-contract", () => {
  const content = readFileSync(SUBAGENTS_MD, "utf-8");

  it("file exists and is non-empty", () => {
    expect(content.length).toBeGreaterThan(100);
  });

  it("documents the capability tiers", () => {
    for (const tier of ["acceptance-native", "isolated", "headless", "generic"]) {
      expect(content, `expected capability tier: ${tier}`).toMatch(
        new RegExp(tier, "i"),
      );
    }
  });

  it("documents the Universal Fallback", () => {
    expect(content).toMatch(/Universal\s+Fallback/i);
  });

  it("requires fresh context for every subagent call", () => {
    expect(content).toMatch(/FRESH/i);
    expect(content).toMatch(/Fresh is non-negotiable/);
  });

  it("has no harness package install commands", () => {
    expect(content).not.toMatch(/npm ls /);
    expect(content).not.toMatch(/\bpi install\b/i);
    expect(content).not.toMatch(/npx skills add/);
  });

  it("has no harness-specific package or path references", () => {
    expect(content).not.toMatch(/tintinweb/i);
    expect(content).not.toMatch(/nicobailon/i);
    expect(content).not.toMatch(/pi-subagents/);
    expect(content).not.toMatch(/~\/.pi\//);
    expect(content).not.toMatch(/@earendil-works/);
  });

  it("probes capabilities instead of package managers", () => {
    expect(content).toMatch(/Probe the harness|probe/i);
  });
});
