// ── Constants ────────────────────────────────────────────────────────

export const WORKFLOW_DIR = ".cali-product-workflow";
export const TRACKING_FILE = "cali-product-workflow.json";
export const GLOBAL_TRACKING_FILE = ".cali-pw-global.json";
export const SCHEMA_URL =
  "https://raw.githubusercontent.com/renatocaliari/cali-product-workflow/main/cali-product-workflow.schema.json";

export const PHASE_NAMES = [
  "Triage",      // 0 — Phase 0: Inbox Triage
  "ItemSelect",  // 1 — Phase 1: Item Selection
  "Setup",       // 2 — Phase 2: Project Setup
  "Context",     // 3 — Phase 3: Strategic Context
  "Shape",       // 4 — Phase 4: Shape Up Planning
  "Critique",    // 5 — Phase 5: Plan Critique
  "Gate",        // 6 — Phase 6: Review Gate
  "Scope",       // 7 — Phase 7: Scope Adjustment
  "Interface",   // 8 — Phase 8: Interface Brainstorming
  "Int.Gate",    // 9 — Phase 9: Interface Gate
  "Selection",   // 10 — Phase 10: Interface Selection
  "Planning",    // 11 — Phase 11: Tech Planning
  "Execution",   // 12 — Phase 12: Execution
  "Verification",// 13 — Phase 13: Verification (test suite, review, UI audit)
  "Audit"        // 14 — Phase 14: Execution Critique
];

// ── Stage Aliasing ────────────────────────────────────────────────────

/**
 * Resolve stage index by name. Throws if unknown.
 * All code should reference stages by name, not hardcoded number.
 */
export function getStageIndex(name: string): number {
  const idx = PHASE_NAMES.indexOf(name);
  if (idx === -1) throw new Error(`Unknown stage name: "${name}"`);
  return idx;
}

/** Safely resolve stage name by index. Returns "unknown" if out of range. */
export function getStageName(index: number): string {
  return PHASE_NAMES[index] || "unknown";
}

/**
 * STAGE enum — always resolves via PHASE_NAMES lookup.
 * Insert/reorder stages in PHASE_NAMES and STAGE auto-adjusts.
 * Use: wf.currentPhase < STAGE.EXECUTION()
 */
export const STAGE = {
  TRIAGE:      () => PHASE_NAMES.indexOf("Triage"),
  ITEM_SELECT: () => PHASE_NAMES.indexOf("ItemSelect"),
  SETUP:       () => PHASE_NAMES.indexOf("Setup"),
  CONTEXT:     () => PHASE_NAMES.indexOf("Context"),
  SHAPE:       () => PHASE_NAMES.indexOf("Shape"),
  CRITIQUE:    () => PHASE_NAMES.indexOf("Critique"),
  GATE:        () => PHASE_NAMES.indexOf("Gate"),
  SCOPE:       () => PHASE_NAMES.indexOf("Scope"),
  INTERFACE:   () => PHASE_NAMES.indexOf("Interface"),
  INT_GATE:    () => PHASE_NAMES.indexOf("Int.Gate"),
  SELECTION:   () => PHASE_NAMES.indexOf("Selection"),
  PLANNING:    () => PHASE_NAMES.indexOf("Planning"),
  EXECUTION:   () => PHASE_NAMES.indexOf("Execution"),
  VERIFICATION:() => PHASE_NAMES.indexOf("Verification"),
  AUDIT:       () => PHASE_NAMES.indexOf("Audit"),
} as const;

// ── CLI Types ─────────────────────────────────────────────────────

export type CLI = "pi" | "opencode" | "claude-code" | "codex" | "generic";

/**
 * Capabilities supported by each CLI harness.
 * Used to determine which features are available.
 */
export interface CLICapabilities {
  /** CLI identifier */
  cli: CLI;
  
  /** Plugin system */
  hasPluginSystem: boolean;
  pluginFormat: "npm" | "json" | "marketplace" | null;
  
  /** Commands */
  hasCommands: boolean;
  commandPrefix: string;  // e.g., "/" for slash commands
  
  /** Events */
  hasSessionStart: boolean;
  hasToolCall: boolean;
  hasTurnEnd: boolean;
  hasPreCompact: boolean;
  
  /** Tools */
  hasSubagent: boolean;
  hasAskUserQuestion: boolean;
  hasGoals: boolean;
  hasIntercom: boolean;
  hasSupervise: boolean;
  
  /** UI */
  hasTUI: boolean;
  hasNotifications: boolean;
  hasSelectList: boolean;
  hasStatusLine: boolean;
  
  /** MCP */
  hasMCPSupport: boolean;
}

/**
 * Get capabilities for a CLI.
 */
export function getCLICapabilities(cli: CLI): CLICapabilities {
  const base: CLICapabilities = {
    cli,
    hasPluginSystem: false,
    pluginFormat: null,
    hasCommands: true,
    commandPrefix: "/",
    hasSessionStart: false,
    hasToolCall: false,
    hasTurnEnd: false,
    hasPreCompact: false,
    hasSubagent: true,
    hasAskUserQuestion: false,
    hasGoals: false,
    hasIntercom: false,
    hasSupervise: false,
    hasTUI: false,
    hasNotifications: false,
    hasSelectList: false,
    hasStatusLine: false,
    hasMCPSupport: false,
  };

  const overrides: Record<CLI, Partial<CLICapabilities>> = {
    "pi": {
      hasPluginSystem: true,
      pluginFormat: "npm",
      hasSessionStart: true,
      hasToolCall: true,
      hasTurnEnd: true,
      hasPreCompact: false,
      hasSubagent: true,
      hasAskUserQuestion: true,
      hasGoals: true,
      hasIntercom: true,
      hasSupervise: true,
      hasTUI: true,
      hasNotifications: true,
      hasSelectList: true,
      hasStatusLine: true,
      hasMCPSupport: true,
    },
    "opencode": {
      hasPluginSystem: true,
      pluginFormat: "npm",
      hasSessionStart: true,
      hasToolCall: true,
      hasTurnEnd: true,
      hasPreCompact: true,
      hasSubagent: true,
      hasAskUserQuestion: false,
      hasGoals: false,
      hasIntercom: false,
      hasSupervise: false,
      hasTUI: true,
      hasNotifications: true,
      hasSelectList: false,
      hasStatusLine: false,
      hasMCPSupport: true,
    },
    "claude-code": {
      hasPluginSystem: true,
      pluginFormat: "marketplace",
      hasSessionStart: true,
      hasToolCall: true,
      hasTurnEnd: true,
      hasPreCompact: true,
      hasSubagent: true,
      hasAskUserQuestion: false,
      hasGoals: false,
      hasIntercom: false,
      hasSupervise: false,
      hasTUI: true,
      hasNotifications: true,
      hasSelectList: false,
      hasStatusLine: false,
      hasMCPSupport: true,
    },
    "codex": {
      hasPluginSystem: true,
      pluginFormat: "json",
      hasSessionStart: true,
      hasToolCall: true,
      hasTurnEnd: true,
      hasPreCompact: true,
      hasSubagent: true,
      hasAskUserQuestion: false,
      hasGoals: false,
      hasIntercom: false,
      hasSupervise: false,
      hasTUI: true,
      hasNotifications: false,
      hasSelectList: false,
      hasStatusLine: false,
      hasMCPSupport: true,
    },
    "generic": {},
  };

  return { ...base, ...overrides[cli] };
}

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
