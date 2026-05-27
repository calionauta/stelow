// @ts-nocheck
//  - Optional peer dependency for Pi environment
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { WORKFLOW_DIR, PHASE_NAMES, SCHEMA_URL } from "./types";
import type { Workflow } from "./types";
import {
  parsedInputStore, readTracking, writeTracking,
  readGlobalTracking, writeGlobalTracking,
  getAllActiveWorkflows, resolveProjectDir,
  toSafeName, generateDirHash, hashToWorkflowId, getDateStamp,
  readSourceFile, truncateText, detectCLI
} from "./state";
import { updateFooter, showOrphanOverlay } from "./ui";

// Quick key=value parser for the args string
function parseArgs(raw: string): Record<string, string> & { _: string[] } {
  const result = { _: [] as string[] } as Record<string, string> & { _: string[] };
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
  const wd = resolveProjectDir(ctx.cwd);
  const parsed = parseArgs(rawArgs);
  // Cast to any since sessionId is provided at runtime but not in types
  const sessionId = (ctx as { sessionId?: string }).sessionId || "default";
  const storeParsed = parsedInputStore.get(sessionId) || { sources: [], draftText: "" };

  // Merge: explicit key=value args take priority over parsed input.
  // Positional tokens without "=" are joined as the draft description.
  const positionalDraft = parsed._.length > 0 ? parsed._.join(" ") : "";
  const draftText = parsed.description || positionalDraft || storeParsed.draftText;
  const sources = parsed.source ? [parsed.source] : storeParsed.sources;
  const userGivenName = parsed.name || null;

  // 1. Check for orphans
  const active = getAllActiveWorkflows(wd);
  if (active.length > 0) {
    const decision = await showOrphanOverlay(ctx, wd, active);
    if (decision === "cancelled") {
      ctx.ui?.notify("Start cancelled", "info");
      return;
    }
  }

  // 2. Generate dirHash FIRST (used for untitled ID and directory)
  const dirHash = generateDirHash();

  // 3. Determine display name (use hash for untitled)
  const displayName = userGivenName
    ? toSafeName(userGivenName)
    : draftText && draftText.length > 3
      ? toSafeName(draftText)
      : sources.length > 0
        ? toSafeName(basename(sources[0], extname(sources[0])))
        : null;

  const name = (displayName && displayName.length >= 2)
    ? displayName
    : hashToWorkflowId(dirHash); // untitled = hash-based ID

  // 4. Load sources
  let allSrc = "";
  for (const src of sources) {
    const content = readSourceFile(src);
    if (content) allSrc += `\n\n=== FILE: ${src} ===\n${content}\n`;
  }

  let fullDraft = draftText ? `### Initial Draft\n\n${draftText}\n\n` : "";
  if (allSrc) fullDraft += allSrc;

  // 5. Initialize tracking
  let tracking = readTracking(wd);
  if (!tracking) {
    tracking = {
      $schema: SCHEMA_URL, version: "1.0",
      created: new Date().toISOString(), updated: new Date().toISOString(),
      workflows: []
    };
  }

  const finalName = name; // hash-based untitled is already unique

  // 6. Build workflow object
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
    cwd: wd,
    dirHash,  // CRITICAL: needed for rename/archive operations
    detectedCLI: detectCLI(),  // CLI harness detected at workflow creation
  };

  tracking.workflows.push(wf);
  writeTracking(wd, tracking);

  // 6. Create directory (hash-based - stable)
  const ds = getDateStamp();
  const wfDir = join(wd, WORKFLOW_DIR, ds, dirHash);
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
    current_phase: "setup", current_phase_index: 0,
    artifacts: {}, approved: false, approved_at: null,
    draft: fullDraft ? truncateText(fullDraft, 10000) : undefined,
    sources,
    detected_cli: detectCLI(),
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
  updateFooter(ctx, wd);
  parsedInputStore.delete(sessionId);

  // 10. Output - use notify so user sees feedback immediately
  const isUnnamed = !displayName;
  const wfId = hashToWorkflowId(dirHash);
  const displayLabel = isUnnamed ? wfId : finalName;

  // Build folder path for display
  const dateStamp = getDateStamp();
  const folderPath = `${WORKFLOW_DIR}/${dateStamp}/${dirHash}`;

  const lines = [
    `[OK] Workflow '${displayLabel}' started!`,
    `[DIR] ${folderPath}`,
    `Stage: ${PHASE_NAMES[0]}`,
  ];
  if (draftText) {
    lines.push(`\n[DRAFT]:\n${draftText.slice(0, 300)}${draftText.length > 300 ? "..." : ""}`);
  }
  lines.push(
    "",
    "------------------------------------------------------------",
    "[BOT] Skill loaded automatically:",
    "",
    "  /skill:cali-product-workflow",
    "------------------------------------------------------------",
  );
  if (isUnnamed) {
    lines.push("", "[TIP] After Clarify, the workflow will be renamed automatically.");
  }

  reply(ctx, lines.join("\n"));

  pi.sendUserMessage("/skill:cali-product-workflow\n\n>>> WORKFLOW STARTED: '" + displayLabel + "' <<<\nALL prior work is PAUSED. Do NOT continue previous tasks.\nFollow the workflow one phase at a time via /pw-next.\nPhase 1: Setup/Clarify — ask questions, gather context.\nDo NOT implement anything until Phase 10 (Planning).", { deliverAs: "followUp" });
}