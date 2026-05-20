// ── Constants ────────────────────────────────────────────────────────

export const WORKFLOW_DIR = ".cali-product-workflow";
export const TRACKING_FILE = "cali-product-workflow.json";
export const GLOBAL_TRACKING_FILE = ".cali-product-workflow-global.json";
export const SCHEMA_URL =
  "https://raw.githubusercontent.com/renatocaliari/pi-product-workflow/main/cali-product-workflow.schema.json";

export const PHASE_NAMES = [
  "Setup",     // 0 — Phase 1: Project Setup
  "Context",   // 1 — Phase 2: Strategic Context
  "Shape",     // 2 — Phase 3: Shape Up Planning
  "Critique",  // 3 — Phase 4: Plan Critique
  "Gate",      // 4 — Phase 5: Review Gate
  "Scope",     // 5 — Phase 6: Scope Adjustment
  "Interface", // 6 — Phase 7: Interface Brainstorming
  "Int.Gate", // 7 — Phase 8: Interface Gate
  "Selection",// 8 — Phase 9: Interface Selection
  "Planning",  // 9 — Phase 10: Tech Planning
  "Execution"  // 10 — Phase 11: Execution
];

/** Display hints shown in compact TUI per phase */
export const PHASE_HINTS: Record<number, string> = {
  0: "setup",
  1: "context",
  2: "shape",
  3: "critique",
  4: "gate",
  5: "scope",
  6: "interface",
  7: "int.gate",
  8: "selection",
  9: "planning",
  10: "execution"
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
  worktreePath?: string;  // Path to git worktree if created for execution
  dirHash?: string;       // Stable directory name (e.g., pw-ollc-whkaxv) — REQUIRED for rename/archive operations
  detectedCLI?: string;   // CLI harness detected at workflow creation
}

export interface TrackingData {
  $schema: string;
  version: string;
  created: string;
  updated: string;
  workflows: Workflow[];
}
