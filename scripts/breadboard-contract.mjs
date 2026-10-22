/**
 * The breadboard contract, executed.
 *
 * `schemas/breadboard.json` is the contract the map is written against, but a
 * schema nobody runs is documentation. This module runs it: it interprets the
 * subset of JSON Schema that the breadboard schema actually uses, and it is
 * fail-closed — an unknown keyword is an error, not a silently skipped rule.
 *
 * Fail-closed matters more than coverage here. A validator that ignores the
 * one keyword the schema just gained would report "valid" for a map the
 * contract rejects, which is worse than having no validator at all. So a
 * schema this module cannot fully interpret is refused loudly, and the fix is
 * to teach it the keyword.
 *
 * Why not a JSON Schema library: stelow ships without runtime npm
 * dependencies, and the renderer degrades rather than blocks. The interpreter
 * is deliberately small enough to read in one sitting and is pinned against
 * the schema it interprets by `tests/unit/breadboard-contract.test.ts`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(MODULE_DIR, "..", "schemas", "breadboard.json");

/** Keywords this interpreter enforces or deliberately ignores. */
const SUPPORTED = new Set([
  // annotations — carried for humans and tooling, no validation semantics
  "$schema", "$id", "title", "description",
  // assertions
  "type", "required", "properties", "additionalProperties",
  "items", "minItems", "minLength", "pattern", "enum", "const",
]);

/**
 * Read the published schema. Exported so a caller (or a test) can name the
 * exact file it validates against.
 */
export function loadSchema(path = SCHEMA_PATH) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Walk a schema and refuse anything this interpreter cannot enforce.
 *
 * Called once per validation run rather than once per value: a schema is
 * small, and a wrong answer from a half-interpreted schema is the one failure
 * mode worth paying for.
 */
export function assertSupported(schema, path = "$") {
  if (schema === null || typeof schema !== "object") return;
  for (const keyword of Object.keys(schema)) {
    if (!SUPPORTED.has(keyword)) {
      throw new Error(
        `breadboard schema uses "${keyword}" at ${path}, which this validator does not implement — teach scripts/breadboard-contract.mjs the keyword instead of letting the rule go unchecked`,
      );
    }
  }
  if (schema.properties) {
    for (const [name, child] of Object.entries(schema.properties)) {
      assertSupported(child, `${path}.properties.${name}`);
    }
  }
  if (schema.items) assertSupported(schema.items, `${path}.items`);
  if (typeof schema.additionalProperties === "object" && schema.additionalProperties !== null) {
    assertSupported(schema.additionalProperties, `${path}.additionalProperties`);
  }
}

function typeOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function valueTypeMatches(value, expected) {
  if (expected === "integer") return Number.isInteger(value);
  return typeOf(value) === expected;
}

function describe(schema) {
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (Array.isArray(schema.enum)) return schema.enum.map((item) => JSON.stringify(item)).join(" | ");
  if (schema.type) return schema.type;
  return "a valid value";
}

/**
 * Validate one value against one schema node, collecting problems.
 *
 * @param {unknown} value the value
 * @param {object} schema the schema node
 * @param {string} path where the value lives, for the message
 * @param {{path: string, message: string}[]} problems accumulator
 */
function validateValue(value, schema, path, problems) {
  if (schema.const !== undefined && value !== schema.const) {
    problems.push({ path, message: `${JSON.stringify(value)} is not ${describe(schema)}` });
    return;
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    problems.push({ path, message: `${JSON.stringify(value)} is not one of ${describe(schema)}` });
    return;
  }
  if (schema.type && !valueTypeMatches(value, schema.type)) {
    problems.push({ path, message: `${typeOf(value)} where the contract declares ${schema.type}` });
    return;
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      problems.push({ path, message: `empty string where the contract requires at least ${schema.minLength} character(s)` });
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      problems.push({ path, message: `${JSON.stringify(value)} does not match ${schema.pattern}` });
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      problems.push({ path, message: `[] where the contract requires at least ${schema.minItems} item(s)` });
    }
    if (schema.items) {
      for (const [index, item] of value.entries()) validateValue(item, schema.items, `${path}[${index}]`, problems);
    }
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const name of schema.required ?? []) {
      if (!(name in value)) problems.push({ path, message: `missing required property "${name}"` });
    }
    const declared = schema.properties ?? {};
    for (const [name, child] of Object.entries(value)) {
      if (declared[name]) {
        validateValue(child, declared[name], `${path}.${name}`, problems);
      } else if (schema.additionalProperties === false) {
        const allowed = Object.keys(declared);
        problems.push({
          path,
          message: `unknown property "${name}"${allowed.length ? ` (declared: ${allowed.join(", ")})` : ""}`,
        });
      }
    }
  }
}

/**
 * Everything in the map that contradicts `schemas/breadboard.json`.
 *
 * @param {object} map the parsed breadboard
 * @param {object} [schema] the schema to enforce (defaults to the published file)
 * @returns {{path: string, message: string}[]} empty when the map satisfies the contract
 */
export function contractProblems(map, schema = loadSchema()) {
  assertSupported(schema);
  const problems = [];
  validateValue(map, schema, "$", problems);
  return problems;
}
