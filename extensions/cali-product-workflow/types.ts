// ── Constants ────────────────────────────────────────────────────────

export const WORKFLOW_DIR = "product-workflow";
export const TRACKING_FILE = "cali-product-workflow.json";
export const GLOBAL_TRACKING_FILE = ".cali-product-workflow-global.json";
export const SCHEMA_URL =
  "https://raw.githubusercontent.com/renatocaliari/pi-product-workflow/main/cali-product-workflow.schema.json";

export const PHASE_NAMES = [
  "Clarify",   // 0
  "Shape",     // 1
  "Interface", // 2
  "Critique",  // 3
  "Gate",      // 4
  "Planning",  // 5
  "Execution"  // 6
];

/** Display hints shown in compact TUI per phase — placeholder until real artifact counts exist */
export const PHASE_HINTS: Record<number, string> = {
  0: "questions",
  1: "scopes",
  2: "proposals",
  3: "gaps",
  4: "review",
  5: "DoDs",
  6: "done"
};

// ── Types ────────────────────────────────────────────────────────────

export interface ParsedInput {
  sources: string[];
  draftText: string;
}

export interface Phase {
  id: string;
  name: string;
  status: string;
  started?: string;
  completed?: string;
}

export interface Workflow {
  name: string;       // Human-readable display name (may change via rename)
  description: string;
  draftContent?: string;
  source?: string;
  status: string;      // in-progress | paused | completed | archived
  currentPhase: number;
  phases: Phase[];
  created: string;
  updated: string;
  cwd?: string;
}

export interface TrackingData {
  $schema: string;
  version: string;
  created: string;
  updated: string;
  workflows: Workflow[];
}
