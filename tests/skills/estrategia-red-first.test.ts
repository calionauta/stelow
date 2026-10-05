/**
 * Estrategia red-first (Fase 2 Estrategia de testes stelow).
 *
 * Bug it catches: the testing-strategy docs let a scope execute with no
 * acceptance test, accept a guard never observed failing, or close an
 * audit with empty baseline / missing red-proof / edited-after-freeze
 * tests. The strategy must route every one of those to a hard BLOCK and
 * to the scope-contract evidence fields (test_map / freeze_sha /
 * red_proof / baseline) whose verdict logic lives in production code.
 *
 * Red-first note: every verdict below imports production code from
 * types/stages.ts — no validation logic is reimplemented here and no
 * test reads skill .md files. The first block exercises the
 * scope-contract gate (validateScopeContract); the second block
 * exercises hand-mutation and audit behavior (fabricated-red-proof
 * rejection plus the baseline-empty / red-missing / frozen-edited
 * evidence flags from classifyRecordEvidence). Each failing-input test
 * starts from a passing contract and flips exactly one piece of
 * evidence — the observed ok:true → ok:false (or [] → flag)
 * transition is the hand-mutation.
 */
import { describe, it, expect } from "vitest";
import {
  validateScopeContract,
  classifyRecordEvidence,
  type ScopeContract,
} from "../../types/stages.js";

const GOOD: ScopeContract = {
  acceptance_criteria: ["Login returns 200 with token", "Logout clears session"],
  verify_commands: ["npm test -- auth"],
  test_map: {
    "tests/auth.test.ts": ["Login returns 200 with token", "Logout clears session"],
  },
  freeze_sha: "abc123",
  red_proof: { failed_command: "npm test -- auth", exit_code: 1 },
  baseline: { "npm test -- auth": 1 },
};

describe("estrategia red-first: contract verdicts (production code)", () => {
  it("BLOCKs missing-acceptance-test: an unmapped AC never executes", () => {
    const bad: ScopeContract = {
      ...GOOD,
      test_map: { "tests/auth.test.ts": ["Login returns 200 with token"] },
    };
    const verdict = validateScopeContract(bad);
    expect(verdict.ok).toBe(false);
    expect(verdict.unmapped).toContain("Logout clears session");
  });

  it("hand-mutation MUST FAIL: a guard never observed failing is rejected", () => {
    expect(
      validateScopeContract({
        ...GOOD,
        red_proof: { failed_command: "npm test -- auth", exit_code: 0 },
      }).ok,
    ).toBe(false);
    const { red_proof: _r, ...noRed } = GOOD;
    expect(validateScopeContract(noRed as ScopeContract).ok).toBe(false);
  });

  it("RED-REDPROOF-FREEZE-GREEN evidence: frozen sha and pre-change baseline are required", () => {
    const { freeze_sha: _f, ...noFreeze } = GOOD;
    expect(validateScopeContract(noFreeze as ScopeContract).ok).toBe(false);
    expect(validateScopeContract({ ...GOOD, baseline: {} }).ok).toBe(false);
  });
});

describe("estrategia red-first: gates decide BLOCK on mutated evidence (production code)", () => {
  it("BLOCKs a scope with no test mapping at all: every AC unmapped, AC-sem-teste refusal", () => {
    expect(validateScopeContract(GOOD).ok).toBe(true);
    const verdict = validateScopeContract({ ...GOOD, test_map: {} });
    expect(verdict.ok).toBe(false);
    expect(verdict.unmapped).toEqual(GOOD.acceptance_criteria);
    expect(verdict.errors.join("\n")).toContain("AC-sem-teste REJECT");
  });

  it("hand-mutation MUST FAIL: red_proof citing a command never run is rejected", () => {
    expect(validateScopeContract(GOOD).ok).toBe(true);
    const fabricated = validateScopeContract({
      ...GOOD,
      red_proof: { failed_command: "npm test -- never-ran", exit_code: 1 },
    });
    expect(fabricated.ok).toBe(false);
    expect(fabricated.errors.join("\n")).toContain("baseline");
  });

  it("audit flags baseline-empty / red-missing as warnings and frozen-edited as block", () => {
    const evidence = {
      verified: true,
      red_proof: { failed_command: "npm test -- auth", exit_code: 1 },
      freeze_sha: "abc123",
      baseline: { "npm test -- auth": 1 },
      test_sha: "abc123",
    };
    expect(classifyRecordEvidence(evidence)).toEqual([]);
    const codes = (record: Parameters<typeof classifyRecordEvidence>[0]): string[] =>
      classifyRecordEvidence(record).map((flag) => flag.code);
    expect(codes({ ...evidence, baseline: {} })).toContain("baseline-empty");
    expect(
      codes({
        ...evidence,
        red_proof: { failed_command: "npm test -- auth", exit_code: 0 },
      }),
    ).toContain("red-missing");
    const { red_proof: _dropped, ...noRed } = evidence;
    expect(codes(noRed)).toContain("red-missing");
    const frozen = classifyRecordEvidence({ ...evidence, test_sha: "def456" });
    expect(frozen.map((flag) => flag.code)).toContain("frozen-edited");
    expect(frozen.find((flag) => flag.code === "frozen-edited")?.severity).toBe("block");
  });
});
