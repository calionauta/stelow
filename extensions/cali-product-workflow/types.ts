// ── Constants ────────────────────────────────────────────────────────

export const WORKFLOW_DIR = ".cali-product-workflow";
export const TRACKING_FILE = "cali-product-workflow.json";
export const GLOBAL_TRACKING_FILE = ".cali-product-workflow-global.json";
export const SCHEMA_URL =
  "https://raw.githubusercontent.com/renatocaliari/cali-product-workflow/main/cali-product-workflow.schema.json";

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
