/**
 * The breadboard contract, executed.
 *
 * The failure this guards: a map that renders beautifully and violates the
 * schema it claims to follow — a typo'd `wiresout`, an id that is not a
 * place, an affordance with no trigger. The renderer used to accept all
 * three, because nothing ran the contract. The diagram then presented a map
 * nobody could query, and the checks silently skipped the rows they could
 * not read.
 *
 * The second guard is on the validator itself: it must be schema-DRIVEN and
 * fail-closed. A validator that ignores a keyword the schema gained reports
 * "valid" for a map the contract rejects, which is worse than no validator.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertSupported, contractProblems, loadSchema } from "../../scripts/breadboard-contract.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCHEMA_PATH = join(REPO_ROOT, "schemas", "breadboard.json");

const VALID = {
  schemaVersion: 1,
  interfaceId: "A",
  selectedBy: "human",
  scopeCoverage: [{ scopeId: "S1", effect: "served", note: "first slice" }],
  places: [{ id: "P1", name: "Inbox" }, { id: "P2", name: "Editor", mode: "Edit Mode" }],
  affordances: [
    { id: "U1", kind: "ui", name: "New Idea button", place: "P1", control: "click", wiresOut: ["P2"] },
    { id: "U2", kind: "ui", name: "Problem input", place: "P2", control: "type", returnsTo: ["S1"] },
    { id: "N1", kind: "code", name: "saveIdea()", place: "P2", control: "call", wiresOut: ["N2"], returnsTo: ["S2"] },
    { id: "N2", kind: "code", name: "ideaRepo.save()", place: "P2", control: "call" },
    { id: "S1", kind: "store", name: "draftIdea", place: "P2", control: "write", returnsTo: ["U2"] },
    { id: "S2", kind: "store", name: "savedIdea", place: "P2", control: "write" },
  ],
};

function messages(problems: { path: string; message: string }[]): string {
  return problems.map((problem) => `${problem.path}: ${problem.message}`).join("\n");
}

describe("a map that follows the contract", () => {
  it("has no contract problems", () => {
    expect(contractProblems(VALID)).toEqual([]);
  });

  it("validates against the published schema file, not a copy", () => {
    // The schema this module reads is the one a worker reads. If the path
    // drifted, every other assertion here would be about a schema nobody
    // ships.
    expect(JSON.parse(readFileSync(SCHEMA_PATH, "utf8"))).toEqual(loadSchema());
  });
});

describe("what the contract catches", () => {
  it("names a typo'd property instead of ignoring it", () => {
    // `wiresout` silently passing is how a map loses its wiring while the
    // author sees no error at all.
    const map = structuredClone(VALID);
    map.affordances[0].wiresout = ["P2"];
    const problems = contractProblems(map);
    expect(messages(problems)).toContain('affordances[0]: unknown property "wiresout"');
    expect(messages(problems)).toContain("declared:");
  });

  it("requires a control on every affordance", () => {
    // A display is recognised by control=render. An affordance with no
    // trigger is a row the checks cannot classify and the reader cannot
    // place.
    const map = structuredClone(VALID);
    delete map.affordances[2].control;
    expect(messages(contractProblems(map))).toContain('affordances[2]: missing required property "control"');
  });

  it("rejects an id that is not an affordance id", () => {
    const map = structuredClone(VALID);
    map.affordances[0].id = "button1";
    expect(messages(contractProblems(map))).toContain("affordances[0].id");
  });

  it("accepts a place reference as a UI affordance", () => {
    // Singer's `_letter-browser` convention: a reference marks where a
    // detached place renders. The serializer has always mapped it; the
    // contract used to reject it.
    const map = structuredClone(VALID);
    map.affordances.push({ id: "_letter-browser", kind: "ui", name: "Letter browser", place: "P1", control: "render", wiresOut: ["P2"] });
    expect(contractProblems(map)).toEqual([]);
  });

  it("rejects a kind outside the closed set", () => {
    const map = structuredClone(VALID);
    map.affordances[1].kind = "database";
    expect(messages(contractProblems(map))).toContain("affordances[1].kind");
  });

  it("rejects a coverage effect outside served/friction", () => {
    const map = structuredClone(VALID);
    map.scopeCoverage[0].effect = "maybe";
    expect(messages(contractProblems(map))).toContain("scopeCoverage[0].effect");
  });

  it("rejects an empty interface id — a map must say which interface it maps", () => {
    const map = structuredClone(VALID);
    map.interfaceId = "";
    expect(messages(contractProblems(map))).toContain("interfaceId");
  });
});

describe("the validator is schema-driven and fail-closed", () => {
  it("follows a change to the schema instead of a hardcoded rule", () => {
    // Mutating the schema must change the verdict. If it does not, the
    // validator is enforcing its own opinion of the contract, and the file
    // it claims to run is decoration.
    const schema = structuredClone(loadSchema());
    schema.properties.affordances.items.properties.id.pattern = "^Z[0-9]+$";
    expect(contractProblems(VALID, schema).some((problem) => problem.path === "$.affordances[0].id")).toBe(true);
  });

  it("refuses a schema keyword it cannot enforce", () => {
    // Silently ignoring `oneOf` would report "valid" for a map the real
    // contract rejects — the exact false confidence this module exists to
    // prevent.
    const schema = structuredClone(loadSchema());
    schema.oneOf = [];
    expect(() => contractProblems(VALID, schema)).toThrow(/does not implement/);
    expect(() => assertSupported({ not: {} })).toThrow(/not/);
  });

  it("fails closed even for a keyword nested inside a property", () => {
    const schema = structuredClone(loadSchema());
    schema.properties.places.items.properties.id.format = "uri";
    expect(() => contractProblems(VALID, schema)).toThrow(/format/);
  });
});
