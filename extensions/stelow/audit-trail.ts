/**
 * Audit Trail — shared pure functions for /sw-audit command.
 *
 * Extracted from commands.ts to enable DRY testing and reuse.
 * The cmdAudit handler in commands.ts calls these functions.
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Escape regex special characters. */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── JSON Conversion ──────────────────────────────────────────────────

/**
 * Convert audit trail Markdown to a structured JSON object.
 *
 * Extracts: workflow name, appetite, review mode, intent, scopes with
 * fields, gates (fired/skipped), and verification results.
 *
 * @param content     — raw Markdown from audit-trail.md
 * @param filterScope — optional scope name to filter (e.g. "scope-1")
 * @returns structured object ready for JSON.stringify
 */
export function convertAuditTrailToJson(
  content: string,
  filterScope?: string,
): Record<string, unknown> {
  const sections: Record<string, unknown> = {
    audit_version: 1,
    generated_at: new Date().toISOString(),
  };

  // ── Header fields ────────────────────────────────────────────
  const nameMatch = content.match(/^# Audit Trail: (.+)$/m);
  if (nameMatch) sections.workflow = nameMatch[1].trim();

  const appetiteMatch = content.match(/\*\*Appetite:\*\* (.+)$/m);
  if (appetiteMatch) sections.appetite = appetiteMatch[1].trim();

  const reviewMatch = content.match(/\*\*Review Mode:\*\* (.+)$/m);
  if (reviewMatch) sections.review_mode = reviewMatch[1].trim();

  const intentMatch = content.match(/\*\*Intent:\*\* (.+)$/m);
  if (intentMatch) sections.intent = intentMatch[1].trim();

  // ── Scope sections ───────────────────────────────────────────
  // Only extract scopes from the Planning section (## 3.) — NOT Execution (## 4.).
  const planningStart = content.indexOf("## 3. Planning");
  const executionStart = content.indexOf("## 4. Execution");
  let planningSection = "";
  if (planningStart >= 0 && executionStart > planningStart) {
    planningSection = content.slice(planningStart, executionStart);
  } else if (planningStart >= 0) {
    planningSection = content.slice(planningStart);
  }
  const scopeBlocks = planningSection.split(/^### Scope: /m).slice(1);
  const scopes: Record<string, unknown>[] = [];
  const SKIP_FIELDS = new Set(["Field", "Class", "Check"]);

  for (const block of scopeBlocks) {
    const name = block.split(/\n/)[0].trim();
    if (filterScope && name !== filterScope) continue;

    // Slice to the table area only (before next ### or ## heading)
    const blockEnd = block.search(/^### |^## /m);
    const scopedBlock = blockEnd >= 0 ? block.slice(0, blockEnd) : block;

    const rows: Record<string, string> = {};
    // Match rows with at least 3 pipes (| Field | Value | Artifact |)
    const tableRows = scopedBlock.match(/^\| .+? \| .+? \|/gm) || [];
    for (const row of tableRows) {
      const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 2 && !SKIP_FIELDS.has(cells[0])) {
        rows[cells[0]] = cells[1];
      }
    }
    scopes.push({ name, fields: rows });
  }
  if (scopes.length > 0) sections.scopes = scopes;

  // ── Gates ────────────────────────────────────────────────────
  const gatesFired = (content.match(/^  - ✅ (.+)$/gm) || []).map((m) =>
    m.replace(/^  - ✅ /, ""),
  );
  const gatesSkipped = (content.match(/^  - 🚫 (.+)$/gm) || []).map((m) =>
    m.replace(/^  - 🚫 /, ""),
  );
  if (gatesFired.length > 0 || gatesSkipped.length > 0) {
    sections.gates = { fired: gatesFired, skipped: gatesSkipped };
  }

  // ── Verification ─────────────────────────────────────────────
  // Only extract rows from the Verification section (## 5.)
  const verificationStart = content.indexOf("## 5. Verification");
  if (verificationStart >= 0) {
    const verificationSection = content.slice(verificationStart);
    const verificationChecks = [
      "Test suite",
      "Code review",
      "UI audit",
      "Code quality gate",
      "Invisible 20%",
      "Execution critique",
    ];
    const verificationRows =
      verificationSection.match(/\| (.+?) \| (.+?) \|/g) || [];
    const verification: Record<string, string> = {};
    for (const row of verificationRows) {
      const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 2 && verificationChecks.includes(cells[0])) {
        verification[cells[0]] = cells[1];
      }
    }
    if (Object.keys(verification).length > 0) {
      sections.verification = verification;
    }
  }

  return sections;
}
