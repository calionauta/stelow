/**
 * Integration tests: Audit Trail
 *
 * Tests the /sw-audit command's ability to:
 * - Read audit-trail.md from a workflow directory
 * - Convert to JSON format
 * - Filter by scope
 * - Handle missing audit trail gracefully
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
import { escapeRegex, convertAuditTrailToJson } from "../../extensions/stelow/audit-trail";

const WORKFLOW_DIR = ".stelow";

// ── Test Fixture: Realistic Audit Trail ──────────────────────────────

const SAMPLE_AUDIT_TRAIL = `# Audit Trail: passwordless-auth

**Generated:** 2026-07-11T14:30:00Z
**Appetite:** Core
**Review Mode:** Product Spec + Interface + Tech Review
**Intent:** feature

---

## 1. Origin — "Why does this exist?"

- **Intent:** feature
  → [specs/spec-product_v1.md](specs/spec-product_v1.md) frontmatter
- **Appetite:** Core (declared by human)
  → [specs/spec-product_v1.md](specs/spec-product_v1.md) \`appetite: Core\`
- **Review Mode:** Product Spec + Interface + Tech Review
  → [index.json](index.json) \`config.review_mode\`
- **Domains detected:** auth, security
  → [specs/spec-product_v1.md](specs/spec-product_v1.md) \`domains_detected\`
- **Lessons injected:** 2 patterns from previous cycles
  → [lessons-learned/](lessons-learned/)

## 2. Design — "What was decided and why?"

- **IN:** Passwordless login, rate limiting, OAuth scope validation
  → [specs/spec-product_v1.md](specs/spec-product_v1.md) \`## IN\`
- **OUT:** Biometric auth, SSO federation
  → [specs/spec-product_v1.md](specs/spec-product_v1.md) \`## OUT\`
- **Appetite fit:** fits
  → [specs/spec-product_v1.md](specs/spec-product_v1.md) \`appetite_fit: fits\`
- **Interface selected:** Proposal C — progressive enhancement
  → [interfaces/interfaces_v1.md](interfaces/interfaces_v1.md)
- **Critique resolved:** 2 gaps → 1 FIXED, 1 DOCUMENTED
  → [critiques/critique-report.md](critiques/critique-report.md)

## 3. Planning — "What was committed?"

- **Scopes:** 3 typed scopes (2 feature, 1 test-security)
  → [plans/spec-tech_v1.md](plans/spec-tech_v1.md)
- **Gates fired:**
  - ✅ gate (Product Spec + Interface + Tech Review) — approved via plannotator, 2026-07-10T09:15:00Z
    → [.plannotator/approvals/sw-abc123/gate-approved.md](.plannotator/approvals/sw-abc123/gate-approved.md)
  - ✅ int-gate — approved via plannotator, 2026-07-10T11:30:00Z
    → [.plannotator/approvals/sw-abc123/int-gate-approved.md](.plannotator/approvals/sw-abc123/int-gate-approved.md)
  - 🚫 diff-gate (skipped — review_mode does not include Code Diff)

### Scope: scope-1
| Field | Value | Artifact |
|-------|-------|----------|
| Type | feature | [spec-tech_v1.md](plans/spec-tech_v1.md) \`[TYPE]\` |
| Dependencies | — | [spec-tech_v1.md](plans/spec-tech_v1.md) \`Dependencies: None\` |
| Target files | \`src/auth/**\` | [spec-tech_v1.md](plans/spec-tech_v1.md) \`[TARGET_FILES]\` |
| Max iterations | 5 | [spec-tech_v1.md](plans/spec-tech_v1.md) \`[MAX_ITERATIONS]\` |
| Tasks planned | 5 | [spec-tech_v1.md](plans/spec-tech_v1.md) Tasks table |

### Scope: scope-2
| Field | Value | Artifact |
|-------|-------|----------|
| Type | feature | [spec-tech_v1.md](plans/spec-tech_v1.md) \`[TYPE]\` |
| Dependencies | scope-1 | [spec-tech_v1.md](plans/spec-tech_v1.md) \`Dependencies: [SCOPE-1]\` |
| Target files | \`src/rate-limit/**\` | [spec-tech_v1.md](plans/spec-tech_v1.md) \`[TARGET_FILES]\` |
| Max iterations | 3 | [spec-tech_v1.md](plans/spec-tech_v1.md) \`[MAX_ITERATIONS]\` |
| Tasks planned | 3 | [spec-tech_v1.md](plans/spec-tech_v1.md) Tasks table |

### Scope: scope-3
| Field | Value | Artifact |
|-------|-------|----------|
| Type | test-security | [spec-tech_v1.md](plans/spec-tech_v1.md) \`[TYPE]\` |
| Dependencies | scope-1, scope-2 | [spec-tech_v1.md](plans/spec-tech_v1.md) \`Dependencies: [SCOPE-1, SCOPE-2]\` |
| Target files | \`tests/security/**\` | [spec-tech_v1.md](plans/spec-tech_v1.md) \`[TARGET_FILES]\` |
| Max iterations | 3 | [spec-tech_v1.md](plans/spec-tech_v1.md) \`[MAX_ITERATIONS]\` |
| Tasks planned | 3 | [spec-tech_v1.md](plans/spec-tech_v1.md) Tasks table |

## 4. Execution — "What actually happened?"

### Scope: scope-1 ✅
| Field | Value | Artifact |
|-------|-------|----------|
| Status | completed | [stelow.json](stelow.json) |
| Iterations | 2/5 | [stelow.json](stelow.json) |
| Actual files | \`src/auth/login.ts\`, \`src/auth/jwt.ts\` | [stelow.json](stelow.json) |
| Start SHA | a1b2c3d4 | [stelow.json](stelow.json) |
| Tasks planned | 5 done | [stelow.json](stelow.json) |
| Tasks discovered | 1: "Add token refresh" (trigger: JWT expiry test failure) | [stelow.json](stelow.json) |
| Record | 2 files, 4 commands, verified ✅ | [stelow.json](stelow.json) |
| Event log | delegate → verify(fail) → delegate → verify(pass) → completed | [events.jsonl](execution/scope-1/events.jsonl) |

### Scope: scope-2 ✅
| Field | Value | Artifact |
|-------|-------|----------|
| Status | completed | [stelow.json](stelow.json) |
| Iterations | 1/3 | [stelow.json](stelow.json) |
| Actual files | \`src/rate-limit/limiter.ts\` | [stelow.json](stelow.json) |
| Start SHA | b2c3d4e5 | [stelow.json](stelow.json) |
| Tasks planned | 3 done | [stelow.json](stelow.json) |
| Tasks discovered | 0 | [stelow.json](stelow.json) |
| Record | 1 file, 2 commands, verified ✅ | [stelow.json](stelow.json) |
| Event log | delegate → verify(pass) → completed | [events.jsonl](execution/scope-2/events.jsonl) |

### Scope: scope-3 ✅
| Field | Value | Artifact |
|-------|-------|----------|
| Status | completed | [stelow.json](stelow.json) |
| Iterations | 1/3 | [stelow.json](stelow.json) |
| Actual files | \`tests/security/auth.test.ts\` | [stelow.json](stelow.json) |
| Start SHA | c3d4e5f6 | [stelow.json](stelow.json) |
| Tasks planned | 3 done | [stelow.json](stelow.json) |
| Tasks discovered | 0 | [stelow.json](stelow.json) |
| Record | 1 file, 3 commands, verified ✅ | [stelow.json](stelow.json) |

## 5. Verification — "How was it validated?"

| Check | Result | Artifact |
|-------|--------|----------|
| Test suite | ✅ 30/30 pass | — |
| Code review | ✅ 2 reviewers, 0 P0, 0 P1 | — |
| UI audit | N/A (no UI) | — |
| Code quality gate | ✅ lint + typecheck clean | [verification/code-quality-review.md](verification/code-quality-review.md) |
| Invisible 20% | ✅ error handling, security, rollback | — |
| Execution critique | 1 FIXED, 1 DOCUMENTED, 0 ESCALATED | — |
`;

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

function writeTracking(baseDir: string, data: unknown) {
  const trackingDir = join(baseDir, WORKFLOW_DIR);
  mkdirSync(trackingDir, { recursive: true });
  writeFileSync(
    join(trackingDir, "stelow.json"),
    JSON.stringify(data, null, 2),
  );
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
      const workflowDir = createWorkflowDir(
        tempDir,
        "test-workflow",
        "pw-test-abc",
      );
      const auditPath = join(workflowDir, "audit-trail.md");
      writeFileSync(auditPath, SAMPLE_AUDIT_TRAIL);

      expect(existsSync(auditPath)).toBe(true);
      const content = readFileSync(auditPath, "utf-8");
      expect(content).toContain("# Audit Trail: passwordless-auth");
      expect(content).toContain("## 1. Origin");
      expect(content).toContain("## 5. Verification");
    });

    it("should contain all 5 lineage sections", () => {
      const workflowDir = createWorkflowDir(
        tempDir,
        "test-workflow",
        "pw-test-abc",
      );
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(
        join(workflowDir, "audit-trail.md"),
        "utf-8",
      );
      expect(content).toContain("## 1. Origin");
      expect(content).toContain("## 2. Design");
      expect(content).toContain("## 3. Planning");
      expect(content).toContain("## 4. Execution");
      expect(content).toContain("## 5. Verification");
    });

    it("should contain artifact links for each section", () => {
      const workflowDir = createWorkflowDir(
        tempDir,
        "test-workflow",
        "pw-test-abc",
      );
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(
        join(workflowDir, "audit-trail.md"),
        "utf-8",
      );
      // Origin links
      expect(content).toContain("[specs/spec-product_v1.md]");
      // Design links
      expect(content).toContain("[interfaces/interfaces_v1.md]");
      // Planning links
      expect(content).toContain("[plans/spec-tech_v1.md]");
      // Execution links
      expect(content).toContain("[stelow.json]");
      // Verification links
      expect(content).toContain("[verification/code-quality-review.md]");
    });
  });

  describe("JSON conversion from file", () => {
    it("should convert audit-trail.md to valid JSON", () => {
      const workflowDir = createWorkflowDir(
        tempDir,
        "test-workflow",
        "pw-test-abc",
      );
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(
        join(workflowDir, "audit-trail.md"),
        "utf-8",
      );
      const result = convertAuditTrailToJson(content);
      const json = JSON.stringify(result);

      expect(() => JSON.parse(json)).not.toThrow();
      expect(result.workflow).toBe("passwordless-auth");
      expect(result.appetite).toBe("Core");
      expect(result.review_mode).toBe("Product Spec + Interface + Tech Review");
      expect(result.intent).toBe("feature");
    });

    it("should extract scopes from file (at least 3 scope blocks)", () => {
      const workflowDir = createWorkflowDir(
        tempDir,
        "test-workflow",
        "pw-test-abc",
      );
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(
        join(workflowDir, "audit-trail.md"),
        "utf-8",
      );
      const result = convertAuditTrailToJson(content);
      const scopes = result.scopes as Array<{
        name: string;
        fields: Record<string, string>;
      }>;

      // At least the 3 explicit "### Scope:" blocks are extracted
      expect(scopes.length).toBeGreaterThanOrEqual(3);
      expect(scopes[0].name).toBe("scope-1");
      expect(scopes[1].name).toBe("scope-2");
      expect(scopes[2].name).toBe("scope-3");
    });

    it("should extract gates from file", () => {
      const workflowDir = createWorkflowDir(
        tempDir,
        "test-workflow",
        "pw-test-abc",
      );
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(
        join(workflowDir, "audit-trail.md"),
        "utf-8",
      );
      const result = convertAuditTrailToJson(content);
      const gates = result.gates as { fired: string[]; skipped: string[] };

      expect(gates.fired).toHaveLength(2);
      expect(gates.skipped).toHaveLength(1);
      expect(gates.skipped[0]).toContain("diff-gate");
    });

    it("should extract verification results from file", () => {
      const workflowDir = createWorkflowDir(
        tempDir,
        "test-workflow",
        "pw-test-abc",
      );
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(
        join(workflowDir, "audit-trail.md"),
        "utf-8",
      );
      const result = convertAuditTrailToJson(content);
      const verification = result.verification as Record<string, string>;

      expect(verification["Test suite"]).toContain("✅");
      expect(verification["Code review"]).toContain("✅");
      expect(verification["Code quality gate"]).toContain("✅");
    });
  });

  describe("scope filtering", () => {
    it("should filter to single scope when --scope is provided", () => {
      const workflowDir = createWorkflowDir(
        tempDir,
        "test-workflow",
        "pw-test-abc",
      );
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(
        join(workflowDir, "audit-trail.md"),
        "utf-8",
      );
      const result = convertAuditTrailToJson(content, "scope-2");
      const scopes = result.scopes as Array<{ name: string }>;

      expect(scopes).toHaveLength(1);
      expect(scopes[0].name).toBe("scope-2");
    });

    it("should return no scopes when filter matches nothing", () => {
      const workflowDir = createWorkflowDir(
        tempDir,
        "test-workflow",
        "pw-test-abc",
      );
      writeFileSync(join(workflowDir, "audit-trail.md"), SAMPLE_AUDIT_TRAIL);

      const content = readFileSync(
        join(workflowDir, "audit-trail.md"),
        "utf-8",
      );
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
  });

  describe("grep stability patterns", () => {
    it("workflow name regex matches standard format", () => {
      const regex = /^# Audit Trail: (.+)$/m;
      expect("# Audit Trail: my-workflow".match(regex)?.[1]).toBe(
        "my-workflow",
      );
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
      expect("### Scope: Auth Foundation".match(regex)?.[1]).toBe(
        "Auth Foundation",
      );
    });

    it("gate fired regex matches standard format", () => {
      const regex = /^  - ✅ (.+)$/gm;
      const text =
        "  - ✅ gate (Product Spec) — approved\n  - ✅ int-gate — approved";
      const matches = [...text.matchAll(regex)];
      expect(matches).toHaveLength(2);
    });

    it("gate skipped regex matches standard format", () => {
      const regex = /^  - 🚫 (.+)$/gm;
      const text = "  - 🚫 diff-gate (skipped)";
      const matches = [...text.matchAll(regex)];
      expect(matches).toHaveLength(1);
    });
  });
});
