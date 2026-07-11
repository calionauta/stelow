/**
 * audit-trail.test.ts
 *
 * Tests for the /sw-audit command's JSON conversion logic and edge cases.
 * The cmdAudit function itself reads from disk and calls reply() which
 * requires the Pi runtime — those integration aspects are tested via
 * the integration test suite. This file tests the pure functions.
 */

import { describe, it, expect } from "vitest";
import { escapeRegex, convertAuditTrailToJson } from "../../extensions/stelow/audit-trail";

// ── Test fixture: a realistic audit trail ────────────────────────────

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

## 2. Design — "What was decided and why?"

- **IN:** Passwordless login, rate limiting
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

- **Scopes:** 2 typed scopes (feature)
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
| Tasks planned | 3 | [spec-tech_v1.md](plans/spec-tech_v1.md) Tasks table |

### Scope: scope-2
| Field | Value | Artifact |
|-------|-------|----------|
| Type | feature | [spec-tech_v1.md](plans/spec-tech_v1.md) \`[TYPE]\` |
| Dependencies | scope-1 | [spec-tech_v1.md](plans/spec-tech_v1.md) \`Dependencies: [SCOPE-1]\` |
| Target files | \`src/rate-limit/**\` | [spec-tech_v1.md](plans/spec-tech_v1.md) \`[TARGET_FILES]\` |
| Max iterations | 3 | [spec-tech_v1.md](plans/spec-tech_v1.md) \`[MAX_ITERATIONS]\` |
| Tasks planned | 2 | [spec-tech_v1.md](plans/spec-tech_v1.md) Tasks table |

## 4. Execution — "What actually happened?"

### Scope: scope-1 ✅
| Field | Value | Artifact |
|-------|-------|----------|
| Status | completed | [stelow.json](stelow.json) |
| Iterations | 2/5 | [stelow.json](stelow.json) |
| Actual files | \`src/auth/login.ts\`, \`src/middleware/auth.ts\` | [stelow.json](stelow.json) |
| Start SHA | a1b2c3d4 | [stelow.json](stelow.json) |
| Tasks planned | 3 done | [stelow.json](stelow.json) |
| Tasks discovered | 1: "Add token refresh" (trigger: JWT expiry test failure) | [stelow.json](stelow.json) |
| Record | 2 files, 3 commands, verified ✅ | [stelow.json](stelow.json) |
| Event log | delegate → verify → completed | [events.jsonl](execution/scope-1/events.jsonl) |

### Scope: scope-2 ✅
| Field | Value | Artifact |
|-------|-------|----------|
| Status | completed | [stelow.json](stelow.json) |
| Iterations | 1/3 | [stelow.json](stelow.json) |
| Actual files | \`src/rate-limit/limiter.ts\` | [stelow.json](stelow.json) |
| Start SHA | b2c3d4e5 | [stelow.json](stelow.json) |
| Tasks planned | 2 done | [stelow.json](stelow.json) |
| Tasks discovered | 0 | [stelow.json](stelow.json) |
| Record | 1 file, 2 commands, verified ✅ | [stelow.json](stelow.json) |
| Event log | delegate → verify → completed | [events.jsonl](execution/scope-2/events.jsonl) |

## 5. Verification — "How was it validated?"

| Check | Result | Artifact |
|-------|--------|----------|
| Test suite | ✅ 25/25 pass | — |
| Code review | ✅ 2 reviewers, 0 P0, 0 P1 | — |
| UI audit | N/A (no UI) | — |
| Code quality gate | ✅ lint + typecheck clean | [verification/code-quality-review.md](verification/code-quality-review.md) |
| Invisible 20% | ✅ error handling, security | — |
| Execution critique | 1 FIXED, 1 DOCUMENTED, 0 ESCALATED | — |
`;



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

    it("extracts scopes with fields", () => {
      const result = convertAuditTrailToJson(SAMPLE_AUDIT_TRAIL);
      expect(result.scopes).toBeDefined();
      const scopes = result.scopes as Array<{ name: string; fields: Record<string, string> }>;
      // Sample has 2 "### Scope:" blocks; each block's table rows are captured
      expect(scopes.length).toBeGreaterThanOrEqual(2);
      expect(scopes[0].name).toBe("scope-1");
      expect(scopes[0].fields["Type"]).toBe("feature");
      // Status is in Execution section table, not Scope section — verify field exists
      expect(scopes[0].fields["Type"]).toBeDefined();
      expect(scopes[1].name).toBe("scope-2");
    });

    it("filters by scope when --scope is provided", () => {
      const result = convertAuditTrailToJson(SAMPLE_AUDIT_TRAIL, "scope-1");
      const scopes = result.scopes as Array<{ name: string }>;
      expect(scopes).toHaveLength(1);
      expect(scopes[0].name).toBe("scope-1");
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
      // When filterScope is set but no match, scopes is empty → not added to sections
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
