import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { WORKFLOW_DIR, PHASE_NAMES, SCHEMA_URL } from "./types";
import type { Workflow } from "./types";
import {
  parsedInputStore, readTracking, writeTracking,
  readGlobalTracking, writeGlobalTracking,
  getAllActiveWorkflows,
  toSafeName, generatePlaceholderName, generateDirHash, getDateStamp,
  readSourceFile, truncateText
} from "./state";
import { updateFooter, showOrphanOverlay } from "./ui";

// Quick key=value parser for the args string
function parseArgs(raw: string): Record<string, string> & { _: string[] } {
  const result: Record<string, string> & { _: string[] } = { _: [] };
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return result;

  const tokens: string[] = [];
  let buf = "";
  let inQ = false;
  for (const ch of trimmed) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === " " && !inQ) {
      if (buf) { tokens.push(buf); buf = ""; }
      continue;
    }
    buf += ch;
  }
  if (buf) tokens.push(buf);

  for (const tok of tokens) {
    const eq = tok.indexOf("=");
    if (eq > 0) {
      result[tok.slice(0, eq)] = tok.slice(eq + 1);
    } else {
      result._.push(tok);
    }
  }
  return result;
}

function reply(ctx: ExtensionCommandContext, text: string): void {
  ctx.ui?.notify(text, "info");
}

export default async function cmdStart(
  pi: ExtensionAPI, rawArgs: string, ctx: ExtensionCommandContext
): Promise<void> {
  const parsed = parseArgs(rawArgs);
  const sessionId = ctx.sessionId || "default";
  const storeParsed = parsedInputStore.get(sessionId) || { sources: [], draftText: "" };

  // Merge: explicit key=value args take priority over parsed input.
  // Positional tokens without "=" are joined as the draft description.
  const positionalDraft = parsed._.length > 0 ? parsed._.join(" ") : "";
  const draftText = parsed.description || positionalDraft || storeParsed.draftText;
  const sources = parsed.source ? [parsed.source] : storeParsed.sources;
  const userGivenName = parsed.name || null;

  // 1. Check for orphans
  const active = getAllActiveWorkflows(ctx.cwd);
  if (active.length > 0) {
    const decision = await showOrphanOverlay(ctx, ctx.cwd, active);
    if (decision === "cancelled") {
      ctx.ui?.notify("Start cancelled", "info");
      return;
    }
  }

  // 2. Determine display name and directory hash
  const displayName = userGivenName
    ? toSafeName(userGivenName)
    : draftText && draftText.length > 3
      ? toSafeName(draftText)
      : sources.length > 0
        ? toSafeName(basename(sources[0], extname(sources[0])))
        : null;

  const name = (displayName && displayName.length >= 2)
    ? displayName
    : generatePlaceholderName();
  const dirHash = generateDirHash();

  // 3. Load sources
  let allSrc = "";
  for (const src of sources) {
    const content = readSourceFile(src);
    if (content) allSrc += `\n\n=== FILE: ${src} ===\n${content}\n`;
  }

  let fullDraft = draftText ? `### Initial Draft\n\n${draftText}\n\n` : "";
  if (allSrc) fullDraft += allSrc;

  // 4. Initialize tracking
  let tracking = readTracking(ctx.cwd);
  if (!tracking) {
    tracking = {
      $schema: SCHEMA_URL, version: "1.0",
      created: new Date().toISOString(), updated: new Date().toISOString(),
      workflows: []
    };
  }

  const finalName = tracking.workflows.some(w => w.name === name)
    ? `${name}-${Date.now().toString(36).slice(-3)}`
    : name;

  // 5. Build workflow object
  const wf: Workflow = {
    name: finalName,
    description: truncateText(draftText, 500) || "",
    draftContent: fullDraft ? truncateText(fullDraft, 5000) : undefined,
    source: sources.length > 0 ? sources[0] : undefined,
    status: "in-progress",
    currentPhase: 0,
    phases: PHASE_NAMES.map((name, i) => ({
      id: `${i}-${name.toLowerCase()}`, name,
      status: i === 0 ? "in-progress" : "pending"
    })),
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    cwd: ctx.cwd,
  };

  tracking.workflows.push(wf);
  writeTracking(ctx.cwd, tracking);

  // 6. Create directory (hash-based — stable)
  const ds = getDateStamp();
  const wfDir = join(ctx.cwd, WORKFLOW_DIR, ds, dirHash);
  mkdirSync(wfDir, { recursive: true });
  for (const sub of ["specs", "interfaces", "plans/scopes", "critiques", "approvals", "sessions"]) {
    mkdirSync(join(wfDir, sub), { recursive: true });
  }

  // 7. index.json
  writeFileSync(join(wfDir, "index.json"), JSON.stringify({
    version: "1.0", created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    name: finalName, _dir: dirHash,
    workflow_status: "in-progress",
    current_phase: "clarify", current_phase_index: 0,
    artifacts: {}, approved: false, approved_at: null,
    draft: fullDraft ? truncateText(fullDraft, 10000) : undefined,
    sources,
  }, null, 2));

  // 8. Global tracking
  const gt = readGlobalTracking() || {
    $schema: SCHEMA_URL, version: "1.0",
    created: new Date().toISOString(), updated: new Date().toISOString(),
    workflows: []
  };
  gt.workflows.push(wf);
  writeGlobalTracking(gt);

  // 9. UI
  updateFooter(ctx, ctx.cwd);
  parsedInputStore.delete(sessionId);

  // 10. Output — use notify so user sees feedback immediately
  const lines = [
    `✅ Workflow '${finalName}' started!`,
    `Stage: ${PHASE_NAMES[0]}`,
    `Dir:   ${wfDir.replace(ctx.cwd + "/", "")}`,
  ];
  if (draftText) {
    lines.push(`\n📝 Draft:\n${draftText.slice(0, 300)}${draftText.length > 300 ? "..." : ""}`);
  }
  lines.push(
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "🤖 Skill loaded automatically:",
    "",
    "  /skill:cali-product-workflow",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  if (name.startsWith("untitled-") && draftText) {
    lines.push("", "💡 After Clarify, the workflow will be renamed automatically.");
  }

  reply(ctx, lines.join("\n"));

  pi.sendUserMessage("/skill:cali-product-workflow\n\n[Auto-Discovery: SKIP — workflow '" + finalName + "' recém-criado. Prossiga direto para Fase 1: Clarify.]", { deliverAs: "followUp" });
}
