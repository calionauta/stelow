/**
 * audit-trail.test.ts
 *
 * Unit tests for the shared audit trail module (escapeRegex + convertAuditTrailToJson).
 * Fixture loaded from tests/fixtures/audit-trail/sample-audit-trail.md.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { escapeRegex, convertAuditTrailToJson } from "../../extensions/stelow/audit-trail";

const FIXTURE_PATH = join(
  import.meta.dirname ?? __dirname,
  "../fixtures/audit-trail/sample-audit-trail.md",
);

let SAMPLE_AUDIT_TRAIL: string;
try {
  SAMPLE_AUDIT_TRAIL = readFileSync(FIXTURE_PATH, "utf-8");
} catch {
  // Fallback for environments where import.meta.dirname is not available
  SAMPLE_AUDIT_TRAIL = "";
}

// ── Tests ────────────────────────────────────────────────────────────

describe("audit-trail", () => {
  describe("convertAuditTrailToJson", () => {
    it("extracts workflow name", () => {
      const result = convertAuditTrailToJson(SAMPLE_AUDIT_TRAIL);
      expect(result.workflow).toBe("passwordless-auth");
    });

    it("extracts appetite", () => {
      const result = convertAuditTrailToJson(SAMPLE_AUDIT_TRAIL);
      expect(result.appetite).toBe("Core");
    });

    it("extracts review mode", () => {
      const result = convertAuditTrailToJson(SAMPLE_AUDIT_TRAIL);
      expect(result.review_mode).toBe("Product Spec + Interface + Tech Review");
    });

    it("extracts intent", () => {
      const result = convertAuditTrailToJson(SAMPLE_AUDIT_TRAIL);
      expect(result.intent).toBe("feature");
    });

    it("extracts scopes with correct field counts", () => {
      const result = convertAuditTrailToJson(SAMPLE_AUDIT_TRAIL);
      expect(result.scopes).toBeDefined();
      const scopes = result.scopes as Array<{
        name: string;
        fields: Record<string, string>;
      }>;
      expect(scopes).toHaveLength(3);
      expect(scopes[0].name).toBe("scope-1");
      expect(scopes[0].fields["Type"]).toBe("feature");
      expect(scopes[0].fields["Dependencies"]).toBe("—");
      expect(scopes[0].fields["Target files"]).toBe("`src/auth/**`");
      expect(scopes[0].fields["Max iterations"]).toBe("5");
      expect(scopes[0].fields["Tasks planned"]).toBe("5");
      // Should NOT contain Execution/Verification rows
      expect(scopes[0].fields["Status"]).toBeUndefined();
      expect(scopes[0].fields["Iterations"]).toBeUndefined();
      expect(scopes[1].name).toBe("scope-2");
      expect(scopes[2].name).toBe("scope-3");
    });

    it("filters by scope when --scope is provided", () => {
      const result = convertAuditTrailToJson(SAMPLE_AUDIT_TRAIL, "scope-2");
      const scopes = result.scopes as Array<{ name: string }>;
      expect(scopes).toHaveLength(1);
      expect(scopes[0].name).toBe("scope-2");
    });

    it("extracts gates fired and skipped", () => {
      const result = convertAuditTrailToJson(SAMPLE_AUDIT_TRAIL);
      const gates = result.gates as { fired: string[]; skipped: string[] };
      expect(gates.fired).toHaveLength(2);
      expect(gates.fired[0]).toContain("gate");
      expect(gates.skipped).toHaveLength(1);
      expect(gates.skipped[0]).toContain("diff-gate");
    });

    it("extracts verification results", () => {
      const result = convertAuditTrailToJson(SAMPLE_AUDIT_TRAIL);
      const verification = result.verification as Record<string, string>;
      expect(verification["Test suite"]).toContain("✅");
      expect(verification["Code review"]).toContain("✅");
      expect(verification["Code quality gate"]).toContain("✅");
    });

    it("sets audit_version", () => {
      const result = convertAuditTrailToJson(SAMPLE_AUDIT_TRAIL);
      expect(result.audit_version).toBe(1);
    });
  });

  describe("escapeRegex", () => {
    it("escapes special regex characters", () => {
      expect(escapeRegex("scope-1")).toBe("scope-1");
      expect(escapeRegex("scope.1")).toBe("scope\\.1");
      expect(escapeRegex("scope(1)")).toBe("scope\\(1\\)");
      expect(escapeRegex("scope[1]")).toBe("scope\\[1\\]");
      expect(escapeRegex("scope+1")).toBe("scope\\+1");
      expect(escapeRegex("scope*1")).toBe("scope\\*1");
    });
  });

  describe("edge cases", () => {
    it("handles empty audit trail", () => {
      const result = convertAuditTrailToJson("");
      expect(result.audit_version).toBe(1);
      expect(result.scopes).toBeUndefined();
      expect(result.gates).toBeUndefined();
      expect(result.verification).toBeUndefined();
    });

    it("handles audit trail with no scopes", () => {
      const minimal = `# Audit Trail: test-workflow\n\n**Appetite:** Lean\n`;
      const result = convertAuditTrailToJson(minimal);
      expect(result.workflow).toBe("test-workflow");
      expect(result.appetite).toBe("Lean");
      expect(result.scopes).toBeUndefined();
    });

    it("handles audit trail with no gates", () => {
      const noGates = `# Audit Trail: test\n\nNo gates fired.\n`;
      const result = convertAuditTrailToJson(noGates);
      expect(result.gates).toBeUndefined();
    });

    it("returns no scopes when filter matches nothing", () => {
      const result = convertAuditTrailToJson(SAMPLE_AUDIT_TRAIL, "nonexistent-scope");
      expect(result.scopes).toBeUndefined();
    });
  });

  describe("grep stability patterns", () => {
    it("workflow name regex matches standard format", () => {
      const regex = /^# Audit Trail: (.+)$/m;
      expect("# Audit Trail: my-workflow".match(regex)?.[1]).toBe("my-workflow");
      expect("# Audit Trail: passwordless-auth".match(regex)?.[1]).toBe("passwordless-auth");
    });

    it("appetite regex matches standard format", () => {
      const regex = /\*\*Appetite:\*\* (.+)$/m;
      expect("**Appetite:** Core".match(regex)?.[1]).toBe("Core");
      expect("**Appetite:** Lean".match(regex)?.[1]).toBe("Lean");
      expect("**Appetite:** Complete".match(regex)?.[1]).toBe("Complete");
    });

    it("scope header regex matches standard format", () => {
      const regex = /^### Scope: (.+)$/m;
      expect("### Scope: scope-1".match(regex)?.[1]).toBe("scope-1");
      expect("### Scope: Auth Foundation".match(regex)?.[1]).toBe("Auth Foundation");
    });

    it("gate fired regex matches standard format", () => {
      const regex = /^  - ✅ (.+)$/gm;
      const text = "  - ✅ gate (Product Spec) — approved\n  - ✅ int-gate — approved";
      const matches = [...text.matchAll(regex)];
      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toContain("gate");
    });

    it("gate skipped regex matches standard format", () => {
      const regex = /^  - 🚫 (.+)$/gm;
      const text = "  - 🚫 diff-gate (skipped)";
      const matches = [...text.matchAll(regex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toContain("diff-gate");
    });
  });
});
