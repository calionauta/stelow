// ── Constants ────────────────────────────────────────────────────────

export const WORKFLOW_DIR = ".stelow";
export const TRACKING_FILE = "stelow.json";
export const GLOBAL_TRACKING_FILE = ".stelow-global.json";
export const SCHEMA_URL =
  "https://raw.githubusercontent.com/renatocaliari/stelow/main/stelow.schema.json";

export const PHASE_NAMES = [
  "Triage",      // 0 — Phase 0: Inbox Triage
  "ItemSelect",  // 1 — Phase 1: Item Selection
  "Setup",       // 2 — Phase 2: Project Setup
  "Context",     // 3 — Phase 3: Strategic Context
  "Shape",       // 4 — Phase 4: Shape Up Planning
  "Critique",    // 5 — Phase 5: Plan Critique
  "Gate",        // 6 — Phase 6: Review Gate
  "Scope",       // 7 — Phase 7: Scope Adjustment
  "Interface",   // 8 — Phase 8: Interface Alternatives
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

export interface StageState {
  /** Current stage slug (e.g., "shape", "planning") */
  current_stage: string;
  /** Previous stage slug, or null for first transition */
  previous_stage: string | null;
  /** ISO timestamp of last transition */
  transitioned_at: string;
  /** Ordered history of all stage transitions */
  history: Array<{
    stage: string;
    entered_at: string;
    exited_at: string | null;
  }>;
  /** Plannotator gates passed by name */
  gates_passed: string[];
  /** Whether supervisor is active in current stage */
  supervisor_active: boolean;
}

/**
 * Global index entry — catalog only, no mutable state.
 * The canonical workflow state is always read from the project's
 * own stelow.json (or index files in
 * .stelow directories).
 */
export interface GlobalIndexEntry {
  name: string;
  cwd?: string;
  dirHash?: string;
  created: string;
  updated: string;
}

/**
 * Intent category — detected at /sw-start from draft text.
 * Determines which stages run and which are skipped.
 */
export type WorkflowIntent = 'new-product' | 'feature' | 'bugfix' | 'refactor' | 'investigate' | 'unknown';

/**
 * Map intent to the initial PHASE_NAMES index where the workflow should start.
 * Stages before this index are marked completed (skipped).
 *
 * NOTE: ALL intents start at Setup (2) because later stages (Planning, Execution)
 * expect artifacts (spec-product.md, scopes) that don't exist without Setup.
 * The intent is passed via the activation message so the LLM adjusts stage
 * selection during Setup accordingly. Do NOT route directly to Planning/Execution
 * — it breaks artifact dependencies.
 */
export const INTENT_PHASE: Record<WorkflowIntent, number> = {
  'new-product': 2, // Setup — full pipeline
  'feature':      2, // Setup — standard pipeline
  'bugfix':       2, // Setup — LLM picks Tech Planning only in stage selection
  'refactor':     2, // Setup — LLM picks Tech Planning only in stage selection
  'investigate':  2, // Setup — LLM skips shape/interface in stage selection
  'unknown':      2, // Setup — full pipeline, LLM clarifies
};

/**
 * Intent labels for display to the user.
 */
export const INTENT_LABELS: Record<WorkflowIntent, string> = {
  'new-product': '🆕 New Product',
  'feature':     '✨ Feature',
  'bugfix':      '🐛 Bugfix',
  'refactor':    '🔧 Refactor',
  'investigate': '🔍 Investigate',
  'unknown':     '❓ Unknown',
};

/**
 * Intent descriptions for display to the user.
 */
export const INTENT_DESCRIPTIONS: Record<WorkflowIntent, string> = {
  'new-product': 'Greenfield product — full pipeline: Shape Up, Interface, Planning, Execution',
  'feature':     'Add new capability — standard pipeline: Shape Up, Planning, Execution',
  'bugfix':      'Fix broken behavior — minimal: Planning → Execution (skip Shape/Interface/Gates)',
  'refactor':    'Simplify, optimize or restructure — minimal: Planning → Execution',
  'investigate': 'Research, spike, learn — flexible: spike scope only',
  'unknown':     'Could not determine type — will ask during setup',
};

export type ScopeStatus = 'pending' | 'in-progress' | 'completed' | 'escalated' | 'failed';

export interface Scope {
  id: string;           // e.g. "scope-1", "scope-2"
  name: string;         // e.g. "Auth Foundation"
  type: string;         // e.g. "feature", "optimization", "spike", "test-unit"
  status: ScopeStatus;
  blockedBy?: string[];  // Scope IDs that must complete first. Omitted/[] = no deps. Parsed from "Dependencies: [SCOPE-1]" in spec-tech.md.
  iteration?: number;   // current iteration count (for feature scopes)
  maxIterations?: number; // from [MAX_ITERATIONS]
  source?: string;      // e.g. "spec-tech" | "audit-gap" — where this scope originated
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
  // ── Workflow state machine ──
  //
  //                    /sw-start
  //                       │
  //                       ▼
  //                  ┌──────────┐
  //                  │  (none)  │  (initial state — no workflow exists)
  //                  └──────────┘
  //                       │
  //                       │ /sw-start (creates)
  //                       ▼
  //                  ┌──────────┐         /sw-complete
  //   ┌─────────────│ in-pro-  │───────────────────────┐
  //   │ /sw-pause    │ gress    │  /sw-abort            │
  //   │              └──────────┘                       ▼
  //   ▼                  ▲                       ┌──────────┐
  // ┌────────┐ /sw-resume│                       │ completed│
  // │paused │────────────┘                       └──────────┘
  // └────────┘
  //   │
  //   │ /sw-archive
  //   ▼
  // ┌──────────┐
  // │archived │  (terminal — recoverable via /sw-unarchive)
  // └──────────┘
  //
  // Transitions:
  //   (none)     → in-progress : /sw-start
  //   in-progress → paused     : /sw-pause OR auto-pause on /sw-start (v0.36.3+)
  //   paused     → in-progress : /sw-resume
  //   in-progress → completed  : /sw-complete OR /sw-next on phase 14
  //   in-progress → archived   : /sw-archive
  //   paused     → archived   : /sw-archive
  //   completed  → archived   : /sw-archive
  //   archived   → in-progress: /sw-unarchive (rare)
  //
  // See /sw-start (start.ts) for the auto-pause logic added in v0.36.3.
  status: string;      // in-progress | paused | completed | archived
  currentPhase: number;
  phases: Phase[];
  /** Unified stage tracking — replaces external current-stage.json */
  stage: StageState;
  created: string;
  updated: string;
  cwd?: string;
  worktreePath?: string;  // Path to git worktree if created for execution
  dirHash?: string;       // Stable directory name (e.g., pw-ollc-whkaxv) — REQUIRED for rename/archive operations
  detectedCLI?: string;   // CLI harness detected at workflow creation
  intent?: WorkflowIntent; // Intent category detected at /sw-start
  scopes?: Scope[];       // Tech plan scopes — populated during Execution phase
}

export interface TrackingData {
  $schema: string;
  version: string;
  created: string;
  updated: string;
  workflows: Workflow[];
}
