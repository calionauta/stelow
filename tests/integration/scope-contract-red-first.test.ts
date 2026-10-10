/**
 * Scope-contract red-first (Fase 0 Contrato — P-1 fail-observed, AC-sem-teste=reject).
 *
 * Bug it catches: a scope contract that lists acceptance criteria with no
 * mapped test is accepted and executes against prose only. The validator in
 * production code (types/stages.ts) must reject it: every criterion must be
 * mapped in test_map, and freeze_sha / red_proof / baseline must be present.
 * A second bug it catches: schema/types parity drift — if types/stages.ts
 * requires a contract field, stelow.schema.json must require it too.
 *
 * No helpers defined here: all verdicts come from production code
 * (validateScopeContract / findUnmappedCriteria imported from types/stages.ts
 * plus the shipped stelow.schema.json). No .md keyword greps.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  validateScopeContract,
  findUnmappedCriteria,
  type ScopeContract,
} from "../../types/stages.js";

const ROOT = join(__dirname, "..", "..");

function loadSchemaScopeContract(): { properties: Record<string, unknown>; required?: string[] } {
  const schema = JSON.parse(readFileSync(join(ROOT, "stelow.schema.json"), "utf8"));
  return schema.definitions["scope-contract"];
}

const GOOD: ScopeContract = {
  acceptance_criteria: ["Login returns 200 with token", "Logout clears session"],
  verify_commands: ["npm test -- auth"],
  target_files: ["src/auth.ts"],
  test_map: {
    "tests/auth.test.ts": ["Login returns 200 with token", "Logout clears session"],
  },
  freeze_sha: "abc123",
  red_proof: { failed_command: "npm test -- auth", exit_code: 1 },
  baseline: { "npm test -- auth": 1 },
};

describe("scope contract red-first (P-1 fail-observed)", () => {
  it("accepts a fully mapped contract with freeze/red/baseline evidence", () => {
    expect(validateScopeContract(GOOD).ok).toBe(true);
    expect(findUnmappedCriteria(GOOD)).toEqual([]);
  });

  it("rejects AC-sem-teste: an unmapped criterion never executes", () => {
    const bad: ScopeContract = {
      ...GOOD,
      test_map: { "tests/auth.test.ts": ["Login returns 200 with token"] },
    };
    const verdict = validateScopeContract(bad);
    expect(verdict.ok).toBe(false);
    expect(verdict.unmapped).toContain("Logout clears session");
    expect(findUnmappedCriteria(bad)).toContain("Logout clears session");
  });

  it("rejects contracts missing freeze_sha / red_proof / baseline", () => {
    const { freeze_sha: _f, ...noFreeze } = GOOD;
    expect(validateScopeContract(noFreeze as ScopeContract).ok).toBe(false);
    expect(
      validateScopeContract({ ...GOOD, red_proof: { failed_command: "", exit_code: 0 } }).ok,
    ).toBe(false);
    expect(validateScopeContract({ ...GOOD, baseline: {} }).ok).toBe(false);
  });

  it("rejects a verify command with no baseline entry (never executed pre-change)", () => {
    // P-1 fail-observed: every verify_command must have been executed
    // pre-change and recorded in baseline. A command with no baseline
    // entry was never observed, so the contract must be rejected even
    // when red_proof.failed_command itself is covered. Uses only the
    // production verdict (validateScopeContract) — no helpers, no .md grep.
    const bad: ScopeContract = {
      ...GOOD,
      verify_commands: ["npm test -- auth", "npm run lint -- auth"],
    };
    const verdict = validateScopeContract(bad);
    expect(verdict.ok).toBe(false);
    expect(verdict.errors.join("\n")).toContain("npm run lint -- auth");
  });

  it("keeps schema and types in parity on required contract fields", () => {
    const def = loadSchemaScopeContract();
    for (const field of [
      "acceptance_criteria",
      "verify_commands",
      "test_map",
      "freeze_sha",
      "red_proof",
      "baseline",
    ]) {
      expect(def.properties[field], `schema property ${field}`).toBeTruthy();
      expect(def.required ?? [], `schema required ${field}`).toContain(field);
    }
  });
});
