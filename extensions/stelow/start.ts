// @ts-ignore - Optional peer dependency for Pi environment
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { WORKFLOW_DIR, PHASE_NAMES, SCHEMA_URL } from "./types";
import type { Workflow, WorkflowIntent } from "./types";
import {
  parsedInputStore, readTracking, writeTracking,
  readGlobalTracking, writeGlobalTracking,
  getActiveWorkflow, resolveProjectDir,
  toSafeName, generateDirHash, hashToWorkflowId, getDateStamp,
  readSourceFile, truncateText, detectCLI
} from "./state";
import { updateFooter, getUIAdapter, initUIAdapter } from "./ui";
import { buildSkillActivationMessage } from "./start-message";

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

  // 1. Block if an active workflow already exists in this project.
  //    Multiple in-progress in the same worktree causes ambiguous state
  //    and potential file conflicts between workflows.
  const active = getActiveWorkflow(wd);
  if (active) {
    ctx.ui?.notify(
      `⚠️ There is already an active workflow in this project: "${active.name}". ` +
      `Pause, archive, complete or abort it before starting another.`,
      "warning"
    );
    return;
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

  // 5. Intent is deferred to the skill (LLM). The activation message tells
  //     the skill to classify the brief during setup. Always start at Setup.
  const selectedIntent: WorkflowIntent = "unknown";
  const initialPhase = 2; // Setup

  // 6. Initialize tracking
  let tracking = readTracking(wd);
  if (!tracking) {
    tracking = {
      $schema: SCHEMA_URL, version: "1.0",
      created: new Date().toISOString(), updated: new Date().toISOString(),
      workflows: []
    };
  }

  const finalName = name; // hash-based untitled is already unique

  // 7. Build workflow object
  const stageSlug = PHASE_NAMES[initialPhase]?.toLowerCase() || "setup";
  const wf: Workflow = {
    name: finalName,
    description: truncateText(draftText, 500) || "",
    draftContent: fullDraft ? truncateText(fullDraft, 50000) : undefined,
    source: sources.length > 0 ? sources[0] : undefined,
    status: "in-progress",
    currentPhase: initialPhase,
    phases: PHASE_NAMES.map((name, i) => ({
      id: `${i}-${name.toLowerCase()}`, name,
      status: i < initialPhase ? "completed" : i === initialPhase ? "in-progress" : "pending"
    })),
    stage: {
      current_stage: stageSlug,
      previous_stage: null,
      transitioned_at: new Date().toISOString(),
      history: [],
      gates_passed: [],
      supervisor_active: false,
    },
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    cwd: wd,
    dirHash,
    detectedCLI: detectCLI(),
    intent: selectedIntent,
  };

  tracking.workflows.push(wf);
  writeTracking(wd, tracking);

  // 8. Create directory (hash-based - stable)
  const ds = getDateStamp();
  const wfDir = join(wd, WORKFLOW_DIR, ds, dirHash);
  mkdirSync(wfDir, { recursive: true });
  for (const sub of ["specs", "interfaces", "plans/scopes", "critiques", "approvals", "sessions"]) {
    mkdirSync(join(wfDir, sub), { recursive: true });
  }

  // 9. index.json
  writeFileSync(join(wfDir, "index.json"), JSON.stringify({
    version: "1.0", created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    name: finalName, _dir: dirHash,
    workflow_status: "in-progress",
    status: "in-progress",
    current_phase: stageSlug, current_phase_index: initialPhase,
    intent: selectedIntent,
    artifacts: {}, approved: false, approved_at: null,
    draft: fullDraft ? truncateText(fullDraft, 50000) : undefined,
    sources,
    detected_cli: detectCLI(),
  }, null, 2));

  // 10. Global tracking
  const gt = readGlobalTracking() || {
    $schema: SCHEMA_URL, version: "1.0",
    created: new Date().toISOString(), updated: new Date().toISOString(),
    workflows: []
  };
  gt.workflows.push(wf);
  writeGlobalTracking(gt);

  // 11. UI
  updateFooter(ctx, wd);
  parsedInputStore.delete(sessionId);

  // 12. Output - use notify so user sees feedback immediately
  const isUnnamed = !displayName;
  const wfId = hashToWorkflowId(dirHash);
  const displayLabel = isUnnamed ? wfId : finalName;

  // Build folder path for display
  const dateStamp = getDateStamp();
  const folderPath = `${WORKFLOW_DIR}/${dateStamp}/${dirHash}`;

  const lines = [
    `[OK] Workflow '${displayLabel}' started!`,
    `[DIR] ${folderPath}`,
    `Stage: ${PHASE_NAMES[wf.currentPhase]}`,
    `Intent: ${selectedIntent}`,
  ];
  if (draftText) {
    lines.push(`\n[DRAFT]:\n${draftText.slice(0, 300)}${draftText.length > 300 ? "..." : ""}`);
  }
  lines.push(
    "",
    "------------------------------------------------------------",
    "[BOT] Skill loaded automatically:",
    "",
    "  /skill:stelow-product-orchestrator",
    "------------------------------------------------------------",
  );
  if (isUnnamed) {
    lines.push("", "[TIP] After Clarify, the workflow will be renamed automatically.");
  }

  reply(ctx, lines.join("\n"));

  pi.sendUserMessage(buildSkillActivationMessage(displayLabel, draftText, allSrc, selectedIntent, initialPhase), { deliverAs: "followUp" });
}