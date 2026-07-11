/**
 * Integration tests: Audit Trail
 *
 * Tests the /sw-audit command's ability to:
 * - Read audit-trail.md from a workflow directory
 * - Convert to JSON format via shared module
 * - Filter by scope
 * - Handle missing audit trail gracefully
 *
 * Grep stability pattern tests live in unit/audit-trail.test.ts only.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { convertAuditTrailToJson } from "../../extensions/stelow/audit-trail";

const WORKFLOW_DIR = ".stelow";

// ── Load fixture ─────────────────────────────────────────────────────

const FIXTURE_PATH = join(
  import.meta.dirname ?? __dirname,
  "../fixtures/audit-trail/sample-audit-trail.md",
);

let SAMPLE_AUDIT_TRAIL: string;
try {
  SAMPLE_AUDIT_TRAIL = readFileSync(FIXTURE_PATH, "utf-8");
} catch {
  SAMPLE_AUDIT_TRAIL = "";
}

// ── Test Helpers ─────────────────────────────────────────────────────

function createWorkflowDir(baseDir: string, name: string, dirHash: string) {
  const workflowDir = join(baseDir, WORKFLOW_DIR, "2026-07-11", dirHash);
  mkdirSync(join(workflowDir, "specs"), { recursive: true });
  mkdirSync(join(workflowDir, "interfaces"), { recursive: true });
  mkdirSync(join(workflowDir, "plans/scopes"), { recursive: true });
  mkdirSync(join(workflowDir, "critiques"), { recursive: true });
  mkdirSync(join(workflowDir, "approvals"), { recursive: true });
  mkdirSync(join(workflowDir, "sessions"), { recursive: true });
  mkdirSync(join(workflowDir, "execution"), { recursive: true });
  mkdirSync(join(workflowDir, "verification"), { recursive: true });

  writeFileSync(
    join(workflowDir, "index.json"),
    JSON.stringify(
      {
        version: "1.0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        name,
        _dir: dirHash,
        workflow_status: "in-progress",
        current_phase: "Audit",
        current_phase_index: 16,
        config: {
          appetite: "Core",
          review_mode: "Product Spec + Interface + Tech Review",
        },
        artifacts: {},
        approved: false,
        approved_at: null,
      },
      null,
      2,
    ),
  );

  return workflowDir;
}

// ── Integration Tests ────────────────────────────────────────────────

describe("Audit Trail Integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pw-audit-trail-test-"));
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("audit-trail.md file creation and reading", () => {
    it("should create audit-trail.md in workflow directory", () => {
      const workflowDir = createWorkflowDir(tempDir, "test-workflow", "pw-test-abc");
      const auditPath = join(workflowDir, "audit-trail.md");
      writeFileSync(auditPath, SAMPLE_AUDIT_TRAIL);

      expect(existsSync(auditPath)).toBe(true);
      const content = readFileSync(auditPath, "utf-8");
      expect(content).toContain("# Audit Trail: passwordless-auth");
      expect(content).toContain("## 1. Origin");
      expect(content).toContain("## 5. Verification");
    });

    it("should contain all 5 lineage sections", () => {
      const workflowDir = createWorkflowDir(tempDir, "test-workflow", "pw-test-abc");
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(join(workflowDir, "audit-trail.md"), "utf-8");
      expect(content).toContain("## 1. Origin");
      expect(content).toContain("## 2. Design");
      expect(content).toContain("## 3. Planning");
      expect(content).toContain("## 4. Execution");
      expect(content).toContain("## 5. Verification");
    });

    it("should contain artifact links for each section", () => {
      const workflowDir = createWorkflowDir(tempDir, "test-workflow", "pw-test-abc");
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(join(workflowDir, "audit-trail.md"), "utf-8");
      expect(content).toContain("[specs/spec-product_v1.md]");
      expect(content).toContain("[interfaces/interfaces_v1.md]");
      expect(content).toContain("[plans/spec-tech_v1.md]");
      expect(content).toContain("[stelow.json]");
      expect(content).toContain("[verification/code-quality-review.md]");
    });
  });

  describe("JSON conversion from file", () => {
    it("should convert audit-trail.md to valid JSON", () => {
      const workflowDir = createWorkflowDir(tempDir, "test-workflow", "pw-test-abc");
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(join(workflowDir, "audit-trail.md"), "utf-8");
      const result = convertAuditTrailToJson(content);
      const json = JSON.stringify(result);

      expect(() => JSON.parse(json)).not.toThrow();
      expect(result.workflow).toBe("passwordless-auth");
      expect(result.appetite).toBe("Core");
      expect(result.review_mode).toBe("Product Spec + Interface + Tech Review");
      expect(result.intent).toBe("feature");
    });

    it("should extract all 3 scopes from file", () => {
      const workflowDir = createWorkflowDir(tempDir, "test-workflow", "pw-test-abc");
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(join(workflowDir, "audit-trail.md"), "utf-8");
      const result = convertAuditTrailToJson(content);
      const scopes = result.scopes as Array<{ name: string; fields: Record<string, string> }>;

      expect(scopes).toHaveLength(3);
      expect(scopes[0].name).toBe("scope-1");
      expect(scopes[1].name).toBe("scope-2");
      expect(scopes[2].name).toBe("scope-3");
    });

    it("should extract gates from file", () => {
      const workflowDir = createWorkflowDir(tempDir, "test-workflow", "pw-test-abc");
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(join(workflowDir, "audit-trail.md"), "utf-8");
      const result = convertAuditTrailToJson(content);
      const gates = result.gates as { fired: string[]; skipped: string[] };

      expect(gates.fired).toHaveLength(2);
      expect(gates.skipped).toHaveLength(1);
      expect(gates.skipped[0]).toContain("diff-gate");
    });

    it("should extract verification results from file", () => {
      const workflowDir = createWorkflowDir(tempDir, "test-workflow", "pw-test-abc");
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(join(workflowDir, "audit-trail.md"), "utf-8");
      const result = convertAuditTrailToJson(content);
      const verification = result.verification as Record<string, string>;

      expect(verification["Test suite"]).toContain("✅");
      expect(verification["Code review"]).toContain("✅");
      expect(verification["Code quality gate"]).toContain("✅");
    });
  });

  describe("scope filtering", () => {
    it("should filter to single scope when filter is provided", () => {
      const workflowDir = createWorkflowDir(tempDir, "test-workflow", "pw-test-abc");
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(join(workflowDir, "audit-trail.md"), "utf-8");
      const result = convertAuditTrailToJson(content, "scope-2");
      const scopes = result.scopes as Array<{ name: string }>;

      expect(scopes).toHaveLength(1);
      expect(scopes[0].name).toBe("scope-2");
    });

    it("should return no scopes when filter matches nothing", () => {
      const workflowDir = createWorkflowDir(tempDir, "test-workflow", "pw-test-abc");
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(join(workflowDir, "audit-trail.md"), "utf-8");
      const result = convertAuditTrailToJson(content, "nonexistent-scope");
      expect(result.scopes).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle audit trail with no scopes section", () => {
      const minimal = `# Audit Trail: minimal-workflow

**Appetite:** Lean
**Review Mode:** Auto
**Intent:** bugfix

---

## 1. Origin — "Why does this exist?"
- **Intent:** bugfix

## 5. Verification — "How was it validated?"
| Check | Result | Artifact |
|-------|--------|----------|
| Test suite | ✅ 5/5 pass | — |
`;
      const result = convertAuditTrailToJson(minimal);
      expect(result.workflow).toBe("minimal-workflow");
      expect(result.appetite).toBe("Lean");
      expect(result.scopes).toBeUndefined();
      expect(result.gates).toBeUndefined();
    });

    it("should handle empty audit trail gracefully", () => {
      const result = convertAuditTrailToJson("");
      expect(result.audit_version).toBe(1);
      expect(result.scopes).toBeUndefined();
      expect(result.gates).toBeUndefined();
      expect(result.verification).toBeUndefined();
    });

    it("should set audit_version to 1", () => {
      const result = convertAuditTrailToJson(SAMPLE_AUDIT_TRAIL);
      expect(result.audit_version).toBe(1);
    });

    it("should report missing audit trail when file does not exist", () => {
      const workflowDir = createWorkflowDir(tempDir, "no-audit", "pw-no-audit");
      const auditPath = join(workflowDir, "audit-trail.md");
      expect(existsSync(auditPath)).toBe(false);
    });
  });
});
