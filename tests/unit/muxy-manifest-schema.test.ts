import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Anti-regression: validates the muxy extension's package.json against
 * the official muxy manifest schema (pinned copy).
 *
 * Why hand-rolled: the project doesn't depend on ajv/jsonschema. The
 * schema is small enough to encode the critical rules inline, and any
 * schema change (additional permissions, new panel properties) will
 * require updating this test anyway.
 *
 * Schema source: https://raw.githubusercontent.com/muxy-app/muxy/main/docs/extensions/schema/manifest.schema.json
 * Pinned copy in: integrations/muxy/stelow-board/manifest.schema.json
 * Update the pinned copy manually when upstream schema changes.
 */

const ROOT = join(__dirname, "..", "..");
const SCHEMA_PATH = join(ROOT, "integrations/muxy/stelow-board/manifest.schema.json");
const PKG_PATH = join(ROOT, "integrations/muxy/stelow-board/package.json");

interface MuxyPkg {
  name: string;
  version: string;
  description?: string;
  displayName?: string;
  muxy: {
    $schema?: string;
    background?: string;
    events?: string[];
    permissions?: string[];
    tabTypes?: unknown[];
    panels?: Array<Record<string, unknown>>;
    popovers?: unknown[];
    commands?: unknown[];
    topbarItems?: unknown[];
    statusBarItems?: unknown[];
    settings?: unknown[];
    remoteMethods?: unknown[];
    marketplace?: unknown;
  };
}

function loadPkg(): MuxyPkg {
  return JSON.parse(readFileSync(PKG_PATH, "utf-8")) as MuxyPkg;
}

function loadSchema(): { $defs?: Record<string, { enum?: string[]; properties?: Record<string, unknown> }> } {
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
}

describe("muxy extension package.json schema validation", () => {
  test("schema file is present and valid JSON", () => {
    expect(() => JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"))).not.toThrow();
  });

  test("package.json is valid JSON with required top-level keys", () => {
    const pkg = loadPkg();
    expect(pkg.name).toBeTruthy();
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(pkg.muxy).toBeTruthy();
  });

  test("permissions only contain schema-allowed values (plus known-good additions)", () => {
    const schema = loadSchema();
    const schemaAllowed = schema.$defs?.permission?.enum ?? [];
    // The pinned schema is OUTDATED — it's missing `files:read` and `files:write`
    // which ARE valid permissions per the official Muxy docs:
    // https://muxy.app/docs/extensions/files (table under "Permissions")
    // The schema was fetched before Muxy added these to the enum.
    // Adding them here explicitly so the test passes while acknowledging
    // the schema gap. See AGENTS.md "Critical Muxy extension knowledge".
    const knownMissing: string[] = ["files:read", "files:write"];
    const allowed = [...schemaAllowed, ...knownMissing];
    const pkg = loadPkg();
    const declared = pkg.muxy.permissions ?? [];
    const invalid = declared.filter((p) => !allowed.includes(p));
    expect(invalid, `invalid permissions: ${invalid.join(", ")}`).toEqual([]);
  });

  test("no duplicate permissions", () => {
    const pkg = loadPkg();
    const declared = pkg.muxy.permissions ?? [];
    expect(new Set(declared).size).toBe(declared.length);
  });

  test("panel objects use only schema-allowed properties (catches 'width' regression)", () => {
    const schema = loadSchema();
    const allowed = Object.keys(schema.$defs?.panel?.properties ?? {});
    const pkg = loadPkg();
    const panels = pkg.muxy.panels ?? [];
    for (const [i, panel] of panels.entries()) {
      const extra = Object.keys(panel).filter((k) => !allowed.includes(k));
      expect(extra, `panels[${i}] has schema-disallowed keys: ${extra.join(", ")}`).toEqual([]);
    }
  });

  test("commands use only schema-allowed properties", () => {
    const schema = loadSchema();
    const allowed = Object.keys(schema.$defs?.command?.properties ?? {});
    const pkg = loadPkg();
    const commands = pkg.muxy.commands ?? [];
    for (const [i, cmd] of commands.entries()) {
      const extra = Object.keys(cmd as Record<string, unknown>).filter((k) => !allowed.includes(k));
      expect(extra, `commands[${i}] has schema-disallowed keys: ${extra.join(", ")}`).toEqual([]);
    }
  });

  test("panel mode is one of {pinned, floating}", () => {
    const pkg = loadPkg();
    for (const [i, panel] of (pkg.muxy.panels ?? []).entries()) {
      if ("mode" in panel) {
        expect(["pinned", "floating"], `panel[${i}].mode invalid`).toContain(panel.mode);
      }
    }
  });

  test("panel position is one of {right, bottom}", () => {
    const pkg = loadPkg();
    for (const [i, panel] of (pkg.muxy.panels ?? []).entries()) {
      if ("position" in panel) {
        expect(["right", "bottom"], `panel[${i}].position invalid`).toContain(panel.position);
      }
    }
  });
});