/**
 * phase-consistency.test.ts
 *
 * Verifies that all phase/stage sources stay in sync.
 * These tests catch real drift: if someone adds a stage to types.ts
 * but forgets stages.yaml, the STAGE enum, a stage .md file, or the
 * OpenCode plugin sync, tests fail.
 *
 * NOT aesthetic — every assertion here guards a real silent breakage.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// ── Source of Truth ──────────────────────────────────────────────────

const TYPES_PATH = resolve(__dirname, "../extensions/stelow/types.ts");
const STAGES_YAML_PATH = resolve(__dirname, "../skills/stelow-product-orchestrator/stages.yaml");
const STAGES_DIR = resolve(__dirname, "../skills/stelow-product-orchestrator/stages");
const SKILL_MD_PATH = resolve(__dirname, "../skills/stelow-product-orchestrator/SKILL.md");
const PLUGIN_GENERATED_PATH = resolve(__dirname, "../cli-agents/opencode/plugin/src/phase-names.generated.ts");

// ── Helpers ──────────────────────────────────────────────────────────

/** Extract PHASE_NAMES array from types.ts */
function parsePhaseNames(): string[] {
  const content = readFileSync(TYPES_PATH, "utf-8");
  const match = content.match(/export const PHASE_NAMES\s*=\s*\[([\s\S]*?)\];/);
  if (!match) throw new Error("Could not find PHASE_NAMES in types.ts");
  const raw = match[1];
  const names: string[] = [];
  const re = /"([^"]+)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    names.push(m[1]);
  }
  return names;
}

/** Extract STAGE enum member names from types.ts */
function parseStageEnumMembers(): string[] {
  const content = readFileSync(TYPES_PATH, "utf-8");
  const match = content.match(/export const STAGE\s*=\s*\{([\s\S]*?)\}\s*as const/);
  if (!match) throw new Error("Could not find STAGE enum in types.ts");
  const raw = match[1];
  const names: string[] = [];
  const re = /^\s+(\w+):/gm;
  let m;
  while ((m = re.exec(raw)) !== null) {
    names.push(m[1]);
  }
  return names;
}

/** Extract stage IDs from stages.yaml */
function parseYamlStageIds(): string[] {
  const content = readFileSync(STAGES_YAML_PATH, "utf-8");
  const ids: string[] = [];
  const re = /^\s+-\s+name:\s+(\S+)$/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

/** Map PHASE_NAMES entry name to stages.yaml id */
const PHASE_TO_YAML_ID: Record<string, string> = {
  "Triage": "triage",
  "ItemSelect": "select",
  "Setup": "setup",
  "Context": "context",
  "Shape": "shape",
  "Critique": "critique",
  "Gate": "gate",
  "Scope": "scope",
  "Interface": "interface",
  "Int.Gate": "int-gate",
  "Selection": "selection",
  "Planning": "planning",
  "Execution": "execution",
  "Verification": "verification",
  "Audit": "audit",
};

/**
 * Not all PHASE_NAMES have a dedicated stage .md file.
 * Some stages are fully delegated to external skills (Shape, Interface, Planning).
 * Others share a file (ItemSelect + Selection = selection.md, Int.Gate + Gate = gate.md).
 * ask-patterns.md is a shared template reference, not a stage file.
 */
const PHASE_TO_MD_FILE: Record<string, string | null> = {
  "Triage": "triage.md",
  "ItemSelect": "selection.md",          // Shared: ItemSelect + Selection → selection.md
  "Setup": "setup.md",
  "Context": "context.md",
  "Shape": null,                          // Delegated to cali-product-shape-up skill
  "Critique": null,                       // Delegated to cali-product-plan-critique skill
  "Gate": "gate.md",                      // Shared: Gate + Int.Gate → gate.md
  "Scope": null,                          // Scope adjustment handled inline
  "Interface": null,                      // Delegated to cali-product-interface-alternatives skill
  "Int.Gate": "gate.md",                  // Shared: Gate + Int.Gate → gate.md
  "Selection": "selection.md",           // Shared: ItemSelect + Selection → selection.md
  "Planning": null,                       // Delegated to cali-product-tech-planning skill
  "Execution": "execution.md",
  "Verification": "verification.md",
  "Audit": "execution-critique.md",
};

/** PHASE_NAMES name → STAGE enum member (UPPER_SNAKE_CASE) */
function phaseNameToEnumMember(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/\./g, "_")
    .toUpperCase();
}

/** SKILL.md flow diagram uses display names, not the PHASE_NAMES slugs */
/** SKILL.md flow diagram now uses slug-based format: `slug — Display Name` */
const SLUG_NAMES: Record<string, string> = {
  "Triage": "triage",
  "ItemSelect": "select",
  "Setup": "setup",
  "Context": "context",
  "Shape": "shape",
  "Critique": "critique",
  "Gate": "gate",
  "Scope": "scope",
  "Interface": "interface",
  "Int.Gate": "int-gate",
  "Selection": "selection",
  "Planning": "planning",
  "Execution": "execution",
  "Verification": "verification",
  "Audit": "audit",
};

// ── Tests ────────────────────────────────────────────────────────────

describe("Phase Consistency", () => {
  const phaseNames = parsePhaseNames();
  const stageEnumMembers = parseStageEnumMembers();
  const yamlIds = parseYamlStageIds();
  const stageFiles = readdirSync(STAGES_DIR).filter(f => f.endsWith(".md"));

  describe("PHASE_NAMES (types.ts) completeness", () => {
    it("should have all 15 phases", () => {
      expect(phaseNames).toEqual([
        "Triage", "ItemSelect", "Setup", "Context", "Shape",
        "Critique", "Gate", "Scope", "Interface", "Int.Gate",
        "Selection", "Planning", "Execution", "Verification", "Audit"
      ]);
    });

    it("should have no duplicates", () => {
      expect(new Set(phaseNames).size).toBe(phaseNames.length);
    });
  });

  describe("STAGE enum matches PHASE_NAMES", () => {
    it("should have the same number of members as PHASE_NAMES", () => {
      expect(stageEnumMembers.length).toBe(phaseNames.length);
    });

    it("each PHASE_NAMES entry should have a corresponding STAGE member", () => {
      for (const name of phaseNames) {
        const expectedMember = phaseNameToEnumMember(name);
        expect(stageEnumMembers).toContain(expectedMember);
      }
    });
  });

  describe("stages.yaml matches PHASE_NAMES", () => {
    it("should have an entry for every PHASE_NAMES entry", () => {
      for (const name of phaseNames) {
        const expectedId = PHASE_TO_YAML_ID[name];
        expect(yamlIds).toContain(expectedId);
      }
    });

    it("should not have entries that don't map to a phase", () => {
      const validIds = Object.values(PHASE_TO_YAML_ID);
      for (const id of yamlIds) {
        expect(validIds).toContain(id);
      }
    });
  });

  describe("stage .md files cover all PHASE_NAMES", () => {
    it("every PHASE_NAMES entry should map to a file or be explicitly null (skill-delegated)", () => {
      for (const name of phaseNames) {
        expect(PHASE_TO_MD_FILE).toHaveProperty(name);
      }
    });

    it("every non-null .md file should exist on disk", () => {
      for (const [name, file] of Object.entries(PHASE_TO_MD_FILE)) {
        if (file === null) continue;
        expect(stageFiles, `${name} → ${file}`).toContain(file);
      }
    });

    it("should not have orphan stage .md files", () => {
      const validFiles = Object.values(PHASE_TO_MD_FILE).filter((f): f is string => f !== null);
      validFiles.push("ask-patterns.md"); // shared template, not a stage
      for (const file of stageFiles) {
        expect(validFiles, `orphan: ${file} not in mapping or ask-patterns.md`).toContain(file);
      }
    });

    it("stage .md files must not use old 'Stage N:' prefix in headers", () => {
      for (const file of stageFiles) {
        const content = readFileSync(resolve(STAGES_DIR, file), "utf-8");
        expect(content).not.toMatch(/^## Stage \d+: /m);
      }
    });
  });

  describe("SKILL.md flow diagram mentions all stages", () => {
    it("all PHASE_NAMES entries should be represented in the SKILL.md flow diagram", () => {
      const content = readFileSync(SKILL_MD_PATH, "utf-8");
      for (const name of phaseNames) {
        const slug = SLUG_NAMES[name];
        const pattern = new RegExp(`^${slug} —`, "m");
        expect(content, `SKILL.md missing slug ${slug} (from ${name})`).toMatch(pattern);
      }
    });
  });

  describe("OpenCode plugin generated file is in sync", () => {
    it("plugin should start at Setup and end at Audit (skip Triage/ItemSelect)", () => {
      const content = readFileSync(PLUGIN_GENERATED_PATH, "utf-8");
      expect(content).toContain('1: "Setup"');
      expect(content).toContain('13: "Audit"');
      expect(content).not.toMatch(/Triage/);
      expect(content).not.toMatch(/ItemSelect/);
    });

    it("plugin MAX_PHASE matches last key (13 = Audit)", () => {
      const content = readFileSync(PLUGIN_GENERATED_PATH, "utf-8");
      expect(content).toMatch(/export const MAX_PHASE = 13;/);
    });

    it("plugin has the same number of entries as PHASE_NAMES minus 2 (skipped)", () => {
      const content = readFileSync(PLUGIN_GENERATED_PATH, "utf-8");
      const entries = content.match(/"([^"]+)"/g);
      expect(entries?.length).toBe(phaseNames.length - 2);
    });
  });

  describe("STAGE comments in types.ts reference correct indices", () => {
    it("phase index comments should match array positions", () => {
      const content = readFileSync(TYPES_PATH, "utf-8");
      for (let i = 0; i < phaseNames.length; i++) {
        expect(content).toMatch(new RegExp(`Phase ${i}|${i} —`));
      }
    });
  });
});
