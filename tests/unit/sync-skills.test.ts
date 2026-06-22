/**
 * sync-skills.test.ts — Unit tests for the extracted sync helpers.
 *
 * Tests getRetiredSkillNames() against filesystem fixtures created in
 * a tempdir. Verifies:
 *  - returns empty set when retired-skills.yaml is missing
 *  - returns empty set when the YAML is malformed
 *  - returns the names from a well-formed file
 *  - tolerates extra/missing optional fields (retired_at, reason, etc.)
 *  - ignores entries without a name
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getRetiredSkillNames } from "../../extensions/stelow/sync-skills";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "stelow-pw-sync-test-"));
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

const retiredFilePath = () =>
  join(tmpRoot, "retired-skills.yaml");

describe("getRetiredSkillNames", () => {
  it("returns empty set when retired-skills.yaml is missing", () => {
    // Sanity: file is not written
    expect(() => rmSync(retiredFilePath(), { force: true })).not.toThrow();
    const names = getRetiredSkillNames(tmpRoot);
    expect(names).toBeInstanceOf(Set);
    expect(names.size).toBe(0);
  });

  it("returns the names from a well-formed file", () => {
    writeFileSync(
      retiredFilePath(),
      [
        "version: 1",
        "retired:",
        "  - name: cali-product-critique",
        "    retired_at: 2026-05-29",
        "    reason: superseded",
        "    superseded_by:",
        "      - cali-product-plan-critique",
        "      - cali-product-codebase-critique",
        "  - name: cali-product-old-thing",
        "    retired_at: 2025-12-01",
        "    reason: deleted",
        "",
      ].join("\n")
    );

    const names = getRetiredSkillNames(tmpRoot);
    expect(names).toEqual(
      new Set(["cali-product-critique", "cali-product-old-thing"])
    );
  });

  it("tolerates entries with only a name (all other fields optional)", () => {
    writeFileSync(
      retiredFilePath(),
      [
        "retired:",
        "  - name: cali-product-minimal",
        "",
      ].join("\n")
    );

    const names = getRetiredSkillNames(tmpRoot);
    expect(names).toEqual(new Set(["cali-product-minimal"]));
  });

  it("returns empty set when the YAML is malformed (does not throw)", () => {
    writeFileSync(
      retiredFilePath(),
      // Indentation error — yaml parser will reject this
      ["retired:", " - name: broken", "  - name: also-broken", ""].join("\n")
    );

    const names = getRetiredSkillNames(tmpRoot);
    expect(names.size).toBe(0);
  });

  it("returns empty set when the file is empty", () => {
    writeFileSync(retiredFilePath(), "");
    const names = getRetiredSkillNames(tmpRoot);
    expect(names.size).toBe(0);
  });

  it("ignores entries that have no name", () => {
    writeFileSync(
      retiredFilePath(),
      [
        "retired:",
        "  - name: cali-product-valid",
        "  - retired_at: 2026-01-01", // no name → ignored
        "  - name: ''", // empty name → ignored
        "  - name: 42", // non-string name → ignored
        "",
      ].join("\n")
    );

    const names = getRetiredSkillNames(tmpRoot);
    expect(names).toEqual(new Set(["cali-product-valid"]));
  });

  it("works when retired is an empty array", () => {
    writeFileSync(
      retiredFilePath(),
      ["version: 1", "retired: []", ""].join("\n")
    );

    const names = getRetiredSkillNames(tmpRoot);
    expect(names.size).toBe(0);
  });

  it("returns names from multiple entries with mixed reasons (superseded + renamed)", () => {
    // Real-world scenario: one skill split into N (superseded) and one
    // renamed (renamed). Both should land in the allow-list regardless
    // of their `reason` value — the parser must not discriminate.
    writeFileSync(
      retiredFilePath(),
      [
        "version: 1",
        "retired:",
        "  - name: cali-product-critique",
        "    retired_at: 2026-05-29",
        "    reason: superseded",
        "    superseded_by:",
        "      - cali-product-plan-critique",
        "      - cali-product-codebase-critique",
        "  - name: cali-product-interface-brainstorm",
        "    retired_at: 2026-05-31",
        "    reason: renamed",
        "    superseded_by:",
        "      - cali-product-interface-alternatives",
        "",
      ].join("\n")
    );

    const names = getRetiredSkillNames(tmpRoot);
    expect(names).toEqual(
      new Set([
        "cali-product-critique",
        "cali-product-interface-brainstorm",
      ])
    );
  });
});
