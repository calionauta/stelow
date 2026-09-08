/**
 * Single-source invariant: shared cli-tools docs live ONLY in the
 * orchestrator skill. Sub-skills link them via sibling-relative paths
 * (`../stelow-workflow-orchestrator/references/cli-tools/X.md`) instead
 * of carrying copies — no sync script, no drift, no 18x duplication.
 *
 * Each non-orchestrator skill may keep its OWN cli-tools files
 * (content that exists nowhere in the orchestrator source).
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILLS_ROOT = join(process.cwd(), "skills");
const ORCH = "stelow-workflow-orchestrator";

function orchestratorFiles(): Set<string> {
  const dir = join(SKILLS_ROOT, ORCH, "references", "cli-tools");
  return new Set(
    readdirSync(dir).filter((f) => f.endsWith(".md") || f.endsWith(".sh")),
  );
}

function cliToolsDir(skill: string): string {
  return join(SKILLS_ROOT, skill, "references", "cli-tools");
}

describe("cli-tools single source", () => {
  it("no sub-skill carries a copy of an orchestrator cli-tools file", () => {
    const source = orchestratorFiles();
    expect(source.size).toBeGreaterThan(0);
    const copies: string[] = [];
    for (const skill of readdirSync(SKILLS_ROOT)) {
      if (skill === ORCH) continue;
      const dir = cliToolsDir(skill);
      let entries: string[] = [];
      try {
        entries = readdirSync(dir);
      } catch {
        continue;
      }
      for (const f of entries) {
        if ((f.endsWith(".md") || f.endsWith(".sh")) && source.has(f)) {
          copies.push(`${skill}/references/cli-tools/${f}`);
        }
      }
    }
    expect(copies, `synced copies (link the orchestrator source instead):\n${copies.join("\n")}`).toEqual([]);
  });

  it("orchestrator cli-tools table matches shipped files", () => {
    // cli-tools/README.md documents the shared surface; every row must
    // name a file that exists, so the table cannot rot independently.
    const readme = readFileSync(
      join(SKILLS_ROOT, ORCH, "references", "cli-tools", "README.md"), "utf8",
    );
    const source = orchestratorFiles();
    for (const m of readme.matchAll(/`([A-Za-z0-9_.-]+\.md)`/g)) {
      const name = m[1];
      if (["SKILL.md"].includes(name)) continue;
      expect(source.has(name), `README lists ${name} but it is not shipped`).toBe(true);
    }
  });
});
