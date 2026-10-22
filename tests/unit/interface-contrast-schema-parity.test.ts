/**
 * The published contrast schema must state the same required fields the host
 * validator enforces at runtime.
 *
 * These two were independent sources of truth, and the schema was the loose
 * one: `items: {type: "object"}` accepts ANY object, while the host rejects a
 * receipt whose `fixedConstraints[]` lacks `source` or whose `evidence[]`
 * lacks `claim` as `artifact-malformed`. A worker that followed the published
 * schema produced receipts the host refused, burning an entire run on a
 * contract that had never been contradicted — the card showed "Working"
 * forever and the decision question was lost.
 *
 * It failed twice the same way: once fixed in the host's vendored copy, which
 * the next asset sync overwrote (it is synced, not owned), and once here in
 * the schema, which is the only place a fix can survive.
 *
 * The required sets below are duplicated from the host validator on purpose.
 * That is the contract: if the validator tightens, this fails and names it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const schema = JSON.parse(readFileSync(join(REPO_ROOT, "schemas", "interface-contrast.json"), "utf8"));

const itemRequired = (name: string): string[] => schema.properties[name].items.required ?? [];

describe("interface-contrast schema", () => {
  it("names the required fields instead of accepting any object", () => {
    for (const name of ["fixedConstraints", "evidence", "options"]) {
      expect(schema.properties[name].items.type, `${name} items`).toBe("object");
      expect(
        Array.isArray(itemRequired(name)) && itemRequired(name).length > 0,
        `${name}.items.required is declared, not omitted — an omitted "required" is what let any object through`,
      ).toBe(true);
    }
  });

  it("requires the same trios the host validator checks", () => {
    expect(itemRequired("fixedConstraints")).toEqual(["name", "value", "source"]);
    expect(itemRequired("evidence")).toEqual(["source", "reference", "claim"]);
    // The option set carries the wireframe as a FOURTH required field: the
    // interface gate is a VISUAL review, and an option with no sketch cannot
    // be looked at. This file is the contract a WORKER follows. The host's
    // runtime validator still enforces only the original trio — its vendored
    // copy of this schema is synced from a pinned commit, and its own parity
    // test is what fails, loudly, the moment that pin advances. Tightening
    // here first is the safe direction: a worker that follows this schema
    // writes a receipt the looser validator accepts.
    expect(itemRequired("options")).toEqual(["id", "primaryValue", "compatibility", "wireframe"]);
  });

  it("closes the value sets the validator closes", () => {
    expect(schema.properties.evidence.items.properties.source.enum).toEqual([
      "fixture", "scenario", "simulation", "measured", "human",
    ]);
    expect(schema.properties.options.items.properties.compatibility.const).toBe("valid");
  });

  it("requires a non-empty wireframe on every option", () => {
    // An empty string would satisfy a bare "required" while still giving the
    // gate nothing to look at — the same failure as a missing field.
    const wireframe = schema.properties.options.items.properties.wireframe;
    expect(wireframe.type).toBe("string");
    expect(wireframe.minLength).toBe(1);
  });

  it("still describes the arrays as arrays of those items", () => {
    for (const name of ["fixedConstraints", "evidence", "options", "criteria"]) {
      expect(schema.properties[name].type, `${name} is an array`).toBe("array");
    }
  });

  it("carries optional per-scope coverage on options without widening required", () => {
    const coverage = schema.properties.options.items.properties.scopeCoverage;
    expect(coverage.type, "scopeCoverage is an array").toBe("array");
    expect(coverage.items.required).toEqual(["scopeId", "effect"]);
    expect(coverage.items.properties.effect.enum).toEqual(["served", "friction"]);
    expect(coverage.items.properties.scopeId.type).toBe("string");
  });
});
