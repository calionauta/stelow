import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, basename, dirname, extname } from "node:path";

const WORKFLOW_DIR = "product-workflow";
const TRACKING_FILE = "cali-product-workflow.json";
const GLOBAL_TRACKING_FILE = ".cali-product-workflow-global.json";
const SCHEMA_URL = "https://raw.githubusercontent.com/renatocaliari/pi-product-workflow/main/cali-product-workflow.schema.json";

const PHASE_NAMES = ["Clarify", "Shape", "Bet", "Build", "Critique", "Gate"];

// Shared state for input parsing
interface ParsedInput {
  sources: string[];
  draftText: string;
}

const parsedInputStore: Map<string, ParsedInput> = new Map();

interface Phase {
  id: string;
  name: string;
  status: string;
  started?: string;
  completed?: string;
}

interface Workflow {
  slug: string;
  name: string;
  description: string;
  draftContent?: string;
  source?: string;
  status: string;
  currentPhase: number;
  phases: Phase[];
  created: string;
  updated: string;
  cwd?: string;
}

interface TrackingData {
  $schema: string;
  version: string;
  created: string;
  updated: string;
  workflows: Workflow[];
}

// ============ INPUT PARSING ============

const FILE_REF_REGEX = /@[\w\-\/\.]+(?::\d+(?::\d+)?)?/g;

function parseInputForWorkflow(input: string): { sources: string[], draftText: string } {
  const sources: string[] = [];
  
  const matches = input.match(FILE_REF_REGEX);
  if (matches) {
    for (const match of matches) {
      let filePath = match.slice(1).split(':')[0];
      if (!filePath.startsWith('./') && !filePath.startsWith('/')) {
        filePath = './' + filePath;
      }
      sources.push(filePath);
    }
  }
  
  let text = input
    .replace(FILE_REF_REGEX, ' ')
    .replace(/\/[a-z-]+(\s|$)/gi, ' ')
    .replace(/[a-z]+=[^\s]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return { sources, draftText: text };
}

// ============ STATE MANAGEMENT ============

function getTrackingPath(cwd: string): string {
  return join(cwd, TRACKING_FILE);
}

function getGlobalTrackingPath(): string {
  const home = process.env.HOME || dirname(process.cwd());
  return join(home, GLOBAL_TRACKING_FILE);
}

function readTracking(cwd: string): TrackingData | null {
  const path = getTrackingPath(cwd);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function readGlobalTracking(): TrackingData | null {
  const path = getGlobalTrackingPath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function writeTracking(cwd: string, data: TrackingData): void {
  writeFileSync(getTrackingPath(cwd), JSON.stringify(data, null, 2));
}

function writeGlobalTracking(data: TrackingData): void {
  writeFileSync(getGlobalTrackingPath(), JSON.stringify(data, null, 2));
}

function getActiveWorkflow(cwd: string): Workflow | null {
  const tracking = readTracking(cwd);
  if (!tracking) return null;
  return tracking.workflows.find(w => w.status === "in-progress") || null;
}

function getActiveWorkflowGlobal(): Workflow | null {
  const tracking = readGlobalTracking();
  if (!tracking) return null;
  return tracking.workflows.find(w => w.status === "in-progress") || null;
}

function generateSlug(): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6);
  return `workflow-${timestamp}-${random}`;
}

function readSourceFile(sourcePath: string): string | null {
  if (!sourcePath.startsWith('./') && !sourcePath.startsWith('/')) {
    sourcePath = './' + sourcePath;
  }
  if (!existsSync(sourcePath)) return null;
  try {
    const stat = statSync(sourcePath);
    if (stat.isDirectory()) return `Directory: ${sourcePath}`;
    return readFileSync(sourcePath, "utf-8").slice(0, 50000);
  } catch {
    return null;
  }
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 100) + "\n\n[... truncated ...]";
}

// ============ UI HELPERS ============

function getStatusText(workflow: Workflow): string {
  const phaseName = PHASE_NAMES[workflow.currentPhase] || "Unknown";
  const pct = Math.round(((workflow.currentPhase + 1) / PHASE_NAMES.length) * 100);
  return `${workflow.slug} [${phaseName} ${workflow.currentPhase + 1}/${PHASE_NAMES.length}] ${pct}%`;
}

function getProgressBar(workflow: Workflow, theme: any): string[] {
  const pct = Math.round(((workflow.currentPhase + 1) / PHASE_NAMES.length) * 100);
  const barLen = 20;
  const filled = Math.round((pct / 100) * barLen);
  const bar = "█".repeat(filled) + "░".repeat(barLen - filled);
  
  const lines = [
    theme.fg("accent", "🚀") + " " + theme.fg("text", workflow.slug),
    `[${bar}] ${pct}% — ${PHASE_NAMES[workflow.currentPhase]}`,
    ""
  ];
  
  const phaseLine = PHASE_NAMES.map((name, i) => {
    if (i < workflow.currentPhase) {
      return theme.fg("success", "●") + " " + theme.fg("muted", name);
    } else if (i === workflow.currentPhase) {
      return theme.fg("success", "▶") + " " + theme.fg("accent", name);
    } else {
      return theme.fg("dim", "○") + " " + theme.fg("dim", name);
    }
  }).join(" ");
  
  lines.push(phaseLine);
  return lines;
}

function updateWorkflowUI(ctx: ExtensionContext, cwd: string): void {
  if (!ctx.ui) return;
  
  const workflow = getActiveWorkflow(cwd);
  
  if (!workflow) {
    ctx.ui.setStatus("workflow", undefined);
    ctx.ui.setWidget("workflow-progress", undefined);
    return;
  }
  
  const statusText = getStatusText(workflow);
  ctx.ui.setStatus("workflow", ctx.ui.theme.fg("accent", "📍 " + statusText));
  
  ctx.ui.setWidget("workflow-progress", (_tui, theme) => ({
    render: (_width) => getProgressBar(workflow, theme),
    invalidate: () => {}
  }), { placement: "aboveEditor" });
}

function notifyPhaseChange(ctx: ExtensionContext, workflow: Workflow, oldPhase: number): void {
  if (!ctx.ui) return;
  if (oldPhase !== workflow.currentPhase) {
    const phaseName = PHASE_NAMES[workflow.currentPhase] || "Unknown";
    ctx.ui.notify(`📍 Phase ${workflow.currentPhase + 1}: ${phaseName}`, "info");
  }
}

// ============ COMMANDS ============

function registerCommands(pi: ExtensionAPI): void {
  
  // /product-workflow-start - Start a new workflow
  pi.registerCommand("product-workflow-start", {
    description: "Start a new product workflow. Auto-generates slug if not provided. Parses @filename references as source files and trailing text as draft content.",
    handler: async (args, ctx) => {
      const sessionId = ctx.sessionId || "default";
      const parsed = parsedInputStore.get(sessionId) || { sources: [], draftText: "" };
      
      let slug = args?.slug;
      const name = args?.name;
      const description = args?.description;
      const sources = args?.source ? [args.source] : parsed.sources;
      const draftText = args?.description || parsed.draftText;
      
      if (!slug) {
        if (draftText && draftText.length > 3) {
          slug = draftText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).slice(0, 3).join('-');
          slug = slug.replace(/[^a-z0-9-]/g, '').slice(0, 40);
          if (slug.length < 3) slug = generateSlug();
        } else if (sources.length > 0) {
          const srcName = basename(sources[0], extname(sources[0]));
          slug = srcName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40);
          if (slug.length < 3) slug = generateSlug();
        } else {
          slug = generateSlug();
        }
      }
      
      slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      
      let tracking = readTracking(ctx.cwd);
      if (!tracking) {
        tracking = { "$schema": SCHEMA_URL, "version": "1.0", "created": new Date().toISOString(), "updated": new Date().toISOString(), "workflows": [] };
      }
      
      if (tracking.workflows.some(w => w.slug === slug)) {
        return `Workflow '${slug}' already exists.\nUse /product-workflow-status to see it.`;
      }
      
      let allSourceContent = "";
      for (const src of sources) {
        const content = readSourceFile(src);
        if (content) allSourceContent += `\n\n=== FILE: ${src} ===\n${content}\n`;
      }
      
      let fullDraft = draftText ? `### Initial Draft\n\n${draftText}\n\n` : "";
      if (allSourceContent) fullDraft += allSourceContent;
      
      const workflow: Workflow = {
        slug, name: name || slug, description: truncateText(draftText, 500) || "",
        draftContent: fullDraft ? truncateText(fullDraft, 5000) : undefined,
        source: sources.length > 0 ? sources[0] : undefined,
        status: "in-progress", currentPhase: 0,
        phases: PHASE_NAMES.map((name, i) => ({ id: `${i}-${name.toLowerCase()}`, name, status: i === 0 ? "in-progress" : "pending" })),
        created: new Date().toISOString(), updated: new Date().toISOString(), cwd: ctx.cwd
      };
      
      tracking.workflows.push(workflow);
      writeTracking(ctx.cwd, tracking);
      
      const globalTracking = readGlobalTracking() || { "$schema": SCHEMA_URL, "version": "1.0", "created": new Date().toISOString(), "updated": new Date().toISOString(), "workflows": [] };
      globalTracking.workflows.push(workflow);
      writeGlobalTracking(globalTracking);
      
      updateWorkflowUI(ctx, ctx.cwd);
      parsedInputStore.delete(sessionId);
      
      const lines: string[] = [`✅ Workflow '${slug}' started!`, `Current phase: ${PHASE_NAMES[0]}`, `Project: ${ctx.cwd}`];
      if (sources.length > 0) lines.push(`📎 Sources: ${sources.join(', ')}`);
      if (draftText) lines.push(`\n📝 Draft:\n${draftText.slice(0, 300)}${draftText.length > 300 ? '...' : ''}`);
      if (allSourceContent) lines.push(`\n📄 Source content loaded (${allSourceContent.length} chars)`);
      lines.push("", `Run /skill:cali-product-workflow to begin planning.`);
      
      return lines.join("\n");
    }
  });
  
  // /product-workflow-stop - Stop and clear
  pi.registerCommand("product-workflow-stop", {
    description: "Stop the active workflow immediately, clear all UI elements, and abort any running work.",
    handler: async (args, ctx) => {
      const workflow = getActiveWorkflow(ctx.cwd);
      if (!workflow) {
        const global = getActiveWorkflowGlobal();
        if (global) {
          const globalTracking = readGlobalTracking();
          if (globalTracking) {
            globalTracking.workflows = globalTracking.workflows.filter(w => w.slug !== global.slug);
            writeGlobalTracking(globalTracking);
          }
          ctx.ui.setStatus("workflow", undefined);
          ctx.ui.setWidget("workflow-progress", undefined);
          ctx.ui.notify("Workflow stopped and cleared", "info");
          return `❌ Workflow '${global.slug}' stopped and cleared.\nUI has been reset.`;
        }
        return "No active workflow to stop.";
      }
      
      ctx.ui.setStatus("workflow", undefined);
      ctx.ui.setWidget("workflow-progress", undefined);
      
      const tracking = readTracking(ctx.cwd);
      if (tracking) {
        tracking.workflows = tracking.workflows.filter(w => w.slug !== workflow.slug);
        writeTracking(ctx.cwd, tracking);
      }
      
      const globalTracking = readGlobalTracking();
      if (globalTracking) {
        globalTracking.workflows = globalTracking.workflows.filter(w => w.slug !== workflow.slug);
        writeGlobalTracking(globalTracking);
      }
      
      ctx.ui.notify("Workflow stopped and cleared", "info");
      
      return `❌ Workflow '${workflow.slug}' stopped and cleared.\nUI has been reset.\nYou can start a new workflow with /product-workflow-start.`;
    }
  });
  
  // /product-workflow-pause - Pause
  pi.registerCommand("product-workflow-pause", {
    description: "Pause the active workflow (keeps state for later).",
    handler: async (args, ctx) => {
      const workflow = getActiveWorkflow(ctx.cwd);
      if (!workflow) return "No active workflow to pause.\nUse /product-workflow-list to see all workflows.";
      
      const tracking = readTracking(ctx.cwd);
      if (tracking) {
        const idx = tracking.workflows.findIndex(w => w.slug === workflow.slug);
        if (idx !== -1) tracking.workflows[idx].status = "paused";
        writeTracking(ctx.cwd, tracking);
      }
      
      const globalTracking = readGlobalTracking();
      if (globalTracking) {
        const idx = globalTracking.workflows.findIndex(w => w.slug === workflow.slug);
        if (idx !== -1) globalTracking.workflows[idx].status = "paused";
        writeGlobalTracking(globalTracking);
      }
      
      if (ctx.ui) ctx.ui.setStatus("workflow", ctx.ui.theme.fg("warning", "⏸ " + workflow.slug + " [PAUSED]"));
      
      return `⏸ Workflow '${workflow.slug}' paused.\nState preserved.\nResume with /product-workflow-resume`;
    }
  });
  
  // /product-workflow-resume - Resume
  pi.registerCommand("product-workflow-resume", {
    description: "Resume a paused workflow. Optionally specify slug.",
    handler: async (args, ctx) => {
      const slug = args?.slug;
      const tracking = readTracking(ctx.cwd);
      const globalTracking = readGlobalTracking();
      
      let paused = tracking?.workflows.find(w => w.status === "paused");
      if (!paused && globalTracking) paused = globalTracking.workflows.find(w => w.status === "paused");
      
      if (!paused) {
        return slug ? `Paused workflow '${slug}' not found.` : "No paused workflow found.\nUse /product-workflow-list to see all workflows.\nOr: /product-workflow-resume slug=my-feature";
      }
      
      const target = slug ? (tracking?.workflows.find(w => w.slug === slug && w.status === "paused") || globalTracking?.workflows.find(w => w.slug === slug && w.status === "paused")) : paused;
      if (!target) return `Paused workflow '${slug || "unknown"}' not found.`;
      
      if (tracking) {
        const idx = tracking.workflows.findIndex(w => w.slug === target.slug);
        if (idx !== -1) tracking.workflows[idx].status = "in-progress";
        writeTracking(ctx.cwd, tracking);
      }
      
      if (globalTracking) {
        const idx = globalTracking.workflows.findIndex(w => w.slug === target.slug);
        if (idx !== -1) globalTracking.workflows[idx].status = "in-progress";
        writeGlobalTracking(globalTracking);
      }
      
      updateWorkflowUI(ctx, ctx.cwd);
      
      return `▶️ Workflow '${target.slug}' resumed.\nCurrent phase: ${PHASE_NAMES[target.currentPhase]}\nProject: ${target.cwd || ctx.cwd}`;
    }
  });
  
  // /product-workflow-status - Show status
  pi.registerCommand("product-workflow-status", {
    description: "Show current workflow status with progress bar and phase details.",
    handler: async (args, ctx) => {
      const workflow = getActiveWorkflow(ctx.cwd);
      
      if (!workflow) {
        const global = getActiveWorkflowGlobal();
        if (global) {
          return `📍 Global workflow: ${global.slug}\nPhase: ${global.currentPhase + 1}/${PHASE_NAMES.length} — ${PHASE_NAMES[global.currentPhase]}\nProject: ${global.cwd}\nStatus: ${global.status}\n\nNavigate to project folder to continue: cd ${global.cwd}`;
        }
        
        return "No active workflow in this project.\n\nStart one with:\n  /product-workflow-start\n  /product-workflow-start @brief.md\n  /product-workflow-start @doc.md \"extra context here\"\n  /product-workflow-start slug=my-feature source=./brief.md\n\nOr check /product-workflow-list for other workflows.";
      }
      
      const pct = Math.round(((workflow.currentPhase + 1) / PHASE_NAMES.length) * 100);
      const barLen = 20;
      const filled = Math.round((pct / 100) * barLen);
      const bar = "█".repeat(filled) + "░".repeat(barLen - filled);
      
      const lines: string[] = [`📋 Workflow: ${workflow.slug}`, `Progress: [${bar}] ${pct}%`, `Phase: ${workflow.currentPhase + 1}/${PHASE_NAMES.length} — ${PHASE_NAMES[workflow.currentPhase]}`];
      if (workflow.name !== workflow.slug) lines.push(`Name: ${workflow.name}`);
      if (workflow.source) lines.push(`Source: ${workflow.source}`);
      if (workflow.draftContent) {
        lines.push("", `Draft Preview:`);
        lines.push(workflow.draftContent.slice(0, 500) + (workflow.draftContent.length > 500 ? '...' : ''));
      }
      
      lines.push("", "Phases:");
      workflow.phases.forEach((p, i) => {
        const icon = p.status === "completed" ? "✅" : p.status === "in-progress" ? "🔄" : "⬜";
        const prefix = i === workflow.currentPhase ? "▶ " : "  ";
        lines.push(`${prefix}${icon} ${i + 1}. ${p.name}`);
      });
      
      return lines.join("\n");
    }
  });
  
  // /product-workflow-list - List all
  pi.registerCommand("product-workflow-list", {
    description: "List all workflows in current project and global.",
    handler: async (args, ctx) => {
      const lines: string[] = [];
      const tracking = readTracking(ctx.cwd);
      
      if (tracking && tracking.workflows.length > 0) {
        lines.push("📁 Current Project:");
        for (const w of tracking.workflows) {
          const statusIcon = w.status === "in-progress" ? "🔄" : w.status === "paused" ? "⏸" : w.status === "completed" ? "✅" : "⬜";
          lines.push(`  ${statusIcon} ${w.slug} [${w.status}] — Phase ${w.currentPhase + 1}: ${PHASE_NAMES[w.currentPhase]}`);
        }
        lines.push("");
      }
      
      const globalTracking = readGlobalTracking();
      if (globalTracking && globalTracking.workflows.length > 0) {
        const globalOnly = globalTracking.workflows.filter(w => !tracking?.workflows.some(tw => tw.slug === w.slug));
        if (globalOnly.length > 0) {
          lines.push("🌐 Global (other projects):");
          for (const w of globalOnly) {
            const statusIcon = w.status === "in-progress" ? "🔄" : w.status === "paused" ? "⏸" : w.status === "completed" ? "✅" : "⬜";
            lines.push(`  ${statusIcon} ${w.slug} [${w.status}] — ${PHASE_NAMES[w.currentPhase]}`);
            lines.push(`     Project: ${w.cwd}`);
          }
        }
      }
      
      return lines.length === 0 ? "No workflows found.\nStart one with /product-workflow-start" : lines.join("\n");
    }
  });
  
  // /product-workflow-setphase - Set phase
  pi.registerCommand("product-workflow-setphase", {
    description: "Set the current phase of the active workflow. Phase is 0-5: 0=Clarify, 1=Shape, 2=Bet, 3=Build, 4=Critique, 5=Gate",
    handler: async (args, ctx) => {
      const phaseArg = args?.phase;
      const phaseName = args?.phasename;
      
      let phase: number | null = null;
      if (phaseArg !== undefined) {
        phase = parseInt(String(phaseArg));
      } else if (phaseName) {
        phase = PHASE_NAMES.findIndex(p => p.toLowerCase() === String(phaseName).toLowerCase());
      }
      
      if (phase === null || isNaN(phase) || phase < 0 || phase >= PHASE_NAMES.length) {
        return `Usage: /product-workflow-setphase phase=N  (N is 0-${PHASE_NAMES.length - 1})\nOr: /product-workflow-setphase phasename=Clarify\n\nAvailable phases:\n${PHASE_NAMES.map((name, i) => `  ${i}: ${name}`).join("\n")}`;
      }
      
      const workflow = getActiveWorkflow(ctx.cwd);
      if (!workflow) return "No active workflow.\nStart one with /product-workflow-start";
      
      const oldPhase = workflow.currentPhase;
      
      const tracking = readTracking(ctx.cwd);
      if (tracking) {
        const idx = tracking.workflows.findIndex(w => w.slug === workflow.slug);
        if (idx !== -1) {
          tracking.workflows[idx].currentPhase = phase;
          tracking.workflows[idx].phases.forEach((p, i) => {
            if (i < phase!) p.status = "completed";
            else if (i === phase!) p.status = "in-progress";
            else p.status = "pending";
          });
          tracking.workflows[idx].updated = new Date().toISOString();
          writeTracking(ctx.cwd, tracking);
          workflow.currentPhase = phase;
          workflow.phases = tracking.workflows[idx].phases;
        }
      }
      
      const globalTracking = readGlobalTracking();
      if (globalTracking) {
        const idx = globalTracking.workflows.findIndex(w => w.slug === workflow.slug);
        if (idx !== -1) globalTracking.workflows[idx].currentPhase = phase;
        writeGlobalTracking(globalTracking);
      }
      
      updateWorkflowUI(ctx, ctx.cwd);
      if (oldPhase !== phase) notifyPhaseChange(ctx, workflow, oldPhase);
      
      return `📍 Phase set to ${phase}: ${PHASE_NAMES[phase!]}\nProgress: ${phase! + 1}/${PHASE_NAMES.length}\nUI updated.`;
    }
  });
  
  // /product-workflow-next - Advance phase
  pi.registerCommand("product-workflow-next", {
    description: "Advance the active workflow to the next phase.",
    handler: async (args, ctx) => {
      const workflow = getActiveWorkflow(ctx.cwd);
      if (!workflow) return "No active workflow.\nStart one with /product-workflow-start";
      
      const nextPhase = workflow.currentPhase + 1;
      if (nextPhase >= PHASE_NAMES.length) {
        return `Workflow '${workflow.slug}' is already on the last phase: ${PHASE_NAMES[workflow.currentPhase]}\nUse /product-workflow-complete to mark as finished.`;
      }
      
      const tracking = readTracking(ctx.cwd);
      if (tracking) {
        const idx = tracking.workflows.findIndex(w => w.slug === workflow.slug);
        if (idx !== -1) {
          tracking.workflows[idx].currentPhase = nextPhase;
          tracking.workflows[idx].phases.forEach((p, i) => {
            if (i < nextPhase) p.status = "completed";
            else if (i === nextPhase) p.status = "in-progress";
            else p.status = "pending";
          });
          tracking.workflows[idx].updated = new Date().toISOString();
          writeTracking(ctx.cwd, tracking);
          workflow.currentPhase = nextPhase;
        }
      }
      
      const globalTracking = readGlobalTracking();
      if (globalTracking) {
        const idx = globalTracking.workflows.findIndex(w => w.slug === workflow.slug);
        if (idx !== -1) globalTracking.workflows[idx].currentPhase = nextPhase;
        writeGlobalTracking(globalTracking);
      }
      
      updateWorkflowUI(ctx, ctx.cwd);
      notifyPhaseChange(ctx, workflow, nextPhase - 1);
      
      return `✅ Advanced to Phase ${nextPhase + 1}: ${PHASE_NAMES[nextPhase]}\nWorkflow: ${workflow.slug}`;
    }
  });
  
  // /product-workflow-complete - Complete
  pi.registerCommand("product-workflow-complete", {
    description: "Mark the active workflow as completed.",
    handler: async (args, ctx) => {
      const workflow = getActiveWorkflow(ctx.cwd);
      if (!workflow) return "No active workflow to complete.";
      
      ctx.ui.setStatus("workflow", undefined);
      ctx.ui.setWidget("workflow-progress", undefined);
      
      const tracking = readTracking(ctx.cwd);
      if (tracking) {
        const idx = tracking.workflows.findIndex(w => w.slug === workflow.slug);
        if (idx !== -1) {
          tracking.workflows[idx].status = "completed";
          tracking.workflows[idx].updated = new Date().toISOString();
          writeTracking(ctx.cwd, tracking);
        }
      }
      
      const globalTracking = readGlobalTracking();
      if (globalTracking) {
        const idx = globalTracking.workflows.findIndex(w => w.slug === workflow.slug);
        if (idx !== -1) globalTracking.workflows[idx].status = "completed";
        writeGlobalTracking(globalTracking);
      }
      
      ctx.ui.notify(`🎉 Workflow '${workflow.slug}' completed!`, "info");
      
      return `🎉 Workflow '${workflow.slug}' completed!\nAll phases finished.\nProject: ${ctx.cwd}`;
    }
  });
  
  // /product-workflow-goto - Go to workflow in another project
  pi.registerCommand("product-workflow-goto", {
    description: "Switch to a workflow from another project. Shows instructions to navigate.",
    handler: async (args, ctx) => {
      const slug = args?.slug;
      const globalTracking = readGlobalTracking();
      if (!globalTracking) return "No global workflows found.";
      
      const workflow = slug ? globalTracking.workflows.find(w => w.slug === slug) : globalTracking.workflows.find(w => w.status === "in-progress");
      
      if (!workflow) return `Workflow '${slug || "active"}' not found.\nUse /product-workflow-list to see all workflows.`;
      
      return `📍 Workflow: ${workflow.slug}\nProject: ${workflow.cwd}\nPhase: ${PHASE_NAMES[workflow.currentPhase]}\n\nTo continue this workflow:\n  1. Navigate: cd ${workflow.cwd}\n  2. Resume: /product-workflow-resume slug=${workflow.slug}\n\nOr the LLM will auto-detect it when you open that project.`;
    }
  });
}

// ============ MAIN EXTENSION ============

export default function (pi: ExtensionAPI) {
  
  // 0. Parse input for @filename refs and draft text
  pi.on("input", async (event, ctx) => {
    if (!event.text.startsWith("/product-workflow-start")) return;
    
    const sessionId = ctx.sessionId || "default";
    const parsed = parseInputForWorkflow(event.text);
    
    if (parsed.sources.length > 0 || parsed.draftText) {
      parsedInputStore.set(sessionId, parsed);
    }
  });
  
  // 1. Scaffolding on session_start
  pi.on("session_start", async (_event, ctx) => {
    const workflowPath = join(ctx.cwd, WORKFLOW_DIR);
    mkdirSync(workflowPath, { recursive: true });
    
    const trackingPath = getTrackingPath(ctx.cwd);
    if (!existsSync(trackingPath)) {
      const template: TrackingData = { "$schema": SCHEMA_URL, "version": "1.0", "created": new Date().toISOString(), "updated": new Date().toISOString(), "workflows": [] };
      writeFileSync(trackingPath, JSON.stringify(template, null, 2));
    }
    
    registerCommands(pi);
    
    if (ctx.ui) {
      updateWorkflowUI(ctx, ctx.cwd);
      
      const workflow = getActiveWorkflow(ctx.cwd);
      if (workflow) {
        ctx.ui.notify(`📍 Resumed: ${workflow.slug} (Phase ${workflow.currentPhase + 1}: ${PHASE_NAMES[workflow.currentPhase]})`, "info");
      } else {
        const globalTracking = readGlobalTracking();
        if (globalTracking) {
          const projectWorkflow = globalTracking.workflows.find(w => w.cwd === ctx.cwd && w.status !== "completed");
          if (projectWorkflow) {
            const tracking = readTracking(ctx.cwd);
            if (tracking && !tracking.workflows.some(w => w.slug === projectWorkflow.slug)) {
              tracking.workflows.push(projectWorkflow);
              writeTracking(ctx.cwd, tracking);
            }
            updateWorkflowUI(ctx, ctx.cwd);
            ctx.ui.notify(`📍 Found workflow: ${projectWorkflow.slug} (Phase ${projectWorkflow.currentPhase + 1}: ${PHASE_NAMES[projectWorkflow.currentPhase]})`, "info");
          }
        }
      }
    }
  });
  
  // 2. Track phase changes
  pi.on("turn_end", async (_event, ctx) => {
    const workflow = getActiveWorkflow(ctx.cwd);
    if (!workflow || !ctx.ui) return;
    
    const tracking = readTracking(ctx.cwd);
    if (tracking) {
      const current = tracking.workflows.find(w => w.slug === workflow.slug);
      if (current && current.currentPhase !== workflow.currentPhase) {
        const oldPhase = workflow.currentPhase;
        workflow.currentPhase = current.currentPhase;
        updateWorkflowUI(ctx, ctx.cwd);
        notifyPhaseChange(ctx, workflow, oldPhase);
      }
    }
  });
  
  // 3. Update on agent_end
  pi.on("agent_end", async (_event, ctx) => {
    if (!ctx.ui) return;
    const currentWorkflow = getActiveWorkflow(ctx.cwd);
    if (currentWorkflow) updateWorkflowUI(ctx, ctx.cwd);
  });
}