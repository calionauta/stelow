// ── Constants ────────────────────────────────────────────────────────

export const WORKFLOW_DIR = ".stelow";
export const TRACKING_FILE = "stelow.json";
export const GLOBAL_TRACKING_FILE = ".stelow-global.json";
export const SCHEMA_URL =
  "https://raw.githubusercontent.com/calionauta/stelow/main/stelow.schema.json";

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
  "Plan.Gate",   // 12 — Phase 12: Tech Plan Gate
  "Execution",   // 13 — Phase 13: Execution
  "Verification",// 14 — Phase 14: Verification (test suite, review, UI audit)
  "Diff.Gate",   // 15 — Phase 15: Code Diff Review Gate
  "Audit"        // 16 — Phase 16: Execution Critique
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
  PLAN_GATE:   () => PHASE_NAMES.indexOf("Plan.Gate"),
  EXECUTION:   () => PHASE_NAMES.indexOf("Execution"),
  VERIFICATION:() => PHASE_NAMES.indexOf("Verification"),
  DIFF_GATE:   () => PHASE_NAMES.indexOf("Diff.Gate"),
  AUDIT:       () => PHASE_NAMES.indexOf("Audit"),
} as const;

// ── CLI Types ─────────────────────────────────────────────────────

export type CLI = "pi" | "opencode" | "claude-code" | "generic";

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

/**
 * Represents a single executable scope within a stelow workflow.
 *
 * A `Scope` is the runtime tracking record for what was declared in
 * `spec-tech.md` (parsed by the scope-executor skill) plus state captured
 * during execution. Fields marked `Optional` may be absent if the scope
 * was authored without the corresponding declaration; downstream code
 * MUST treat them as `undefined`.
 *
 * Lifecycle:
 *   1. Scope init (Step 2e of `cali-product-scope-executor`): `id`, `name`,
 *      `type`, `status: 'pending'`, plus optional `targetFiles` from the
 *      `[TARGET_FILES]` block in spec-tech.md.
 *   2. Scope start (Step 3c): `status -> 'in-progress'`, `startSha` captured
 *      via `git rev-parse HEAD`.
 *   3. Scope finish (Step 3e): `status -> 'completed'|'escalated'`, iteration
 *      count finalised, `actualFiles` captured via `git diff --name-only
 *      ${startSha}..HEAD`.
 *   4. Post-execution report (Step 8): pairwise overlap computed from
 *      `actualFiles` (4-class report).
 *
 * @example
 * ```ts
 * const scope: Scope = {
 *   id: 'scope-1',
 *   name: 'Auth Foundation',
 *   type: 'feature',
 *   status: 'completed',
 *   blockedBy: [],
 *   iteration: 2,
 *   maxIterations: 3,
 *   source: 'spec-tech',
 *   targetFiles: ['src/auth/**', 'src/middleware/auth.ts'],
 *   actualFiles: ['src/auth/login.ts', 'src/middleware/auth.ts'],
 *   startSha: 'a1b2c3d4',
 * };
 * ```
 *
 * @see docs/scope-execution-strategy.md (high-level pipeline overview)
 * @see skills/cali-product-scope-executor/SKILL.md (Steps 2e / 3c / 3e / 8)
 * @see skills/stelow-product-orchestrator/references/cli-tools/file-locking.md
 *      (parallel-scope prevention via file-reservation locks)
 */
export interface Scope {
  /** Stable identifier for this scope (e.g. `"scope-1"`, `"scope-2"`). */
  id: string;
  /** Human-readable label for display (e.g. `"Auth Foundation"`). */
  name: string;
  /** One of `"feature"`, `"optimization"`, `"spike"`, `"test-unit"`,
   *  `"test-integration"`, `"test-security"`, `"test-behavior"`. Drives
   *  executor routing per scope-executor Step 2b. */
  type: string;
  /** Current lifecycle state. */
  status: ScopeStatus;
  /**
   * Scope IDs that must complete before this one starts.
   *
   * - `undefined` or `[]` → no deps, eligible for any phase.
   * - Parsed from `"Dependencies: [SCOPE-1, SCOPE-3]"` line in `spec-tech.md`.
   *
   * DAG constraint only. Does NOT imply file-set independence — that is
   * handled separately via `targetFiles` + the file-reservation lock protocol.
   */
  blockedBy?: string[];
  /** Current iteration count (for `feature` scopes that have an
   *  acceptance-driven loop). Increments on each child self-correction
   *  round. Capped by `maxIterations`. */
  iteration?: number;
  /** Maximum self-correction iterations allowed before escalation.
   *  Sourced from `[MAX_ITERATIONS]` block in `spec-tech.md`. */
  maxIterations?: number;
  /** Where this scope originated. Currently one of `"spec-tech"` (from
   *  the approved plan) or `"audit-gap"` (from a prior Audit cycle's
   *  gap classification). */
  source?: string;
  /**
   * Optional. The set of file paths this scope is *expected* to modify.
   *
   * Parsed from the `[TARGET_FILES]` block in `spec-tech.md` by the
   * scope-executor skill at init time. Convention over config:
   *   - trailing `/**` ⇒ prefix match (e.g. `src/auth/**` matches
   *     every path under `src/auth/`)
   *   - trailing `/*`  ⇒ single-level match (e.g. `src/auth/*` matches
   *     `src/auth/foo.ts` but not `src/auth/sub/bar.ts`)
   *   - exact path    ⇒ exact match
   *
   * USED FOR:
   *   1. PARALLEL-DISPATCH DECISION — declared & disjoint → safe parallel;
   *      declared & intersect → acquire locks via `file-locking.md`.
   *   2. 4-CLASS REPORT (Step 8) — class (a) "undeclared writes" flags
   *      any `actualFiles` entry NOT matching any declared glob.
   *
   * NOT enforced at this layer. Advisory only. See
   * `references/cli-tools/file-locking.md` for the prevention protocol.
   */
  targetFiles?: string[];
  /**
   * Optional. The set of file paths actually modified by this scope.
   *
   * Captured by scope-executor Step 3e via
   *   `git diff --name-only ${startSha}..HEAD`
   * Ground truth. Reported in:
   *   1. 4-class overlap report (Step 8) — class (b) "real overlaps" if
   *      this list intersects another scope's `actualFiles`.
   *   2. Execution report under each scope's row.
   * Populated only on `status: 'completed'` (or `'escalated'` with partial
   * capture if the escalation happened mid-edit).
   */
  actualFiles?: string[];
  /**
   * Optional. The git SHA captured at scope start (Step 3c).
   *
   * Recorded via `git rev-parse HEAD` immediately before delegating the
   * scope to its worker. Used to compute `actualFiles` via
   * `git diff --name-only ${startSha}..HEAD` so the diff is scoped to
   * the scope's lifetime (not the user's whole session).
   *
   * If absent on a completed scope, the diff cannot be reconstructed
   * post-hoc; Step 8 will report `actualFiles: []` rather than crash.
   */
  startSha?: string;
  /**
   * Optional. Per-scope override of the file-reservation lock TTL in seconds.
   *
   * Parsed from `[LOCK_TTL_SECONDS]` block in `spec-tech.md` (see
   * `references/cli-tools/file-locking.md#ttl-configuration`). Validated
   * and clamped to `[60, 86400]` by the acquire snippet; values outside
   * that range are silently clamped. Omitted / `undefined` ⇒ default
   * `1800` (30 min).
   *
   * Honored ONLY when the scope declares `[TARGET_FILES]` AND the
   * orchestrator dispatches scopes in parallel. Sequential dispatch
   * never touches locks regardless of TTL.
   */
  lockTtlSeconds?: number;
  /**
   * Optional. Per-scope task checklist — the Shape Up model: scopes are
   * atomic delivery units, tasks are sub-items that emerge as the
   * scope is executed. Tasks can be **planned** (carried from the
   * Scope Detail Template in `spec-tech_{v}.md` table) or **discovered**
   * (added during execution when reality reveals new work, a la the
   * hill-chart principle). Tasks are NEVER separate execution units —
   * they are a checklist rendered in `iteration-state-{SCOPE-ID}.md`.
   *
   * Populated by scope-executor:
   *   - Tasks seed: at scope start, parse the `| # | Task | ... |` table
   *     in spec-tech.md and seed each as `source: 'planned'`.
   *   - Tasks append: during iteration, the executor (LLM child) may
   *     add `source: 'discovered'` entries. Always with a comment
   *     explaining the discovery trigger (slow query, test flake,
   *     schema mismatch, etc.).
   *
   * @see references/scopes-and-sequencing.md#Scope Detail Template
   *      (the spec-tech table that seeds tasks)
   */
  tasks?: ScopeTask[];
  /**
   * Optional. Aggregate count of `source: 'discovered'` tasks at
   * close time. Mirrors the increment done in scope-executor Step
   * 3e-ter bash. Surfaced in Muxy scope cards + execution-critique
   * for quick "how much new work did reality reveal" signal.
   */
  discovered_tasks_count?: number;
  /**
   * Optional. Claim-proof evidence block populated by scope-executor
   * Step 3e-bis. The full Record body lives in markdown at
   * `iteration-state-{SCOPE-ID}.md`; this is the machine-checkable
   * subset that `cali-product-execution-critique` reads.
   *
   * Convention (v1, advisory). Field names are snake_case throughout
   * to match the rest of `stelow.json` schema:
   *   - `completed_at` set when status transitions to `completed`.
   *   - `files_count` mirrors `actual_files.length`.
   *   - `commands_count` is the number of verify commands listed in the
   *     Record body. Helps detect "verified via vibes" (0 commands).
   *   - `verified: true` requires the full Verification checklist to
   *     be ticked in the markdown body.
   *   - `suggested_commit` is the conventional-commit line the executor
   *     would write; kept here so execution-critique can compare against
   *     what was actually committed.
   *
   * See `cali-product-scope-executor` SKILL Step 3e-bis for the full
   * Record template and evidence-ladder rationale.
   */
  record?: ScopeRecord;
}

/**
 * A single task within a scope. Mirrors the markdown table row from
 * spec-tech.md (planned) or an executor-append entry (discovered).
 */
export interface ScopeTask {
  /** Hierarchical ID matching spec-tech convention (`{scope}.{task}`). */
  id: string;
  /** Short action description. */
  name: string;
  /** Where this task came from. */
  source: 'planned' | 'discovered';
  /** Task lifecycle. `pending` → `done` or `skipped`. */
  status: 'pending' | 'done' | 'skipped';
  /** Iteration index where a discovered task was added. Undefined for planned. */
  discovered_in_iter?: number;
  /** Components touched (matches spec-tech table column). Optional. */
  components?: string[];
  /** Risk score 1-5 (matches spec-tech table column). Optional. */
  risk?: number;
  /** Free-form note — required for `source: 'discovered'` explaining
   *  what triggered the discovery. */
  note?: string;
}

/**
 * Machine-checkable subset of the Record evidence block. Full text
 * lives in `iteration-state-{SCOPE-ID}.md`; this is what `stelow.json`
 * stores for programmatic checks (execution-critique, schema validators).
 */
export interface ScopeRecord {
  /** ISO-8601 timestamp when the scope transitioned to `completed`. */
  completed_at: string;
  /** Mirror of `actual_files.length`. Set by executor at close. */
  files_count: number;
  /** Number of verify commands logged in the Record body. */
  commands_count: number;
  /** True only when the full Verification checklist is ticked. */
  verified: boolean;
  /** Conventional-commit line the executor would write. */
  suggested_commit?: string;
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
   //   in-progress → completed  : /sw-complete OR /sw-next on last phase
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
  completedAt?: string;  // Immutable: set once when status becomes "completed"
  cwd?: string;
  worktreePath?: string;  // Path to git worktree if created for execution
  dirHash?: string;       // Stable directory name (e.g., pw-ollc-whkaxv) — REQUIRED for rename/archive operations
  detectedCLI?: string;   // CLI harness detected at workflow creation
  intent?: WorkflowIntent; // Intent category detected at /sw-start
  scopes?: Scope[];       // Tech plan scopes — populated during Execution phase
  specTechFile?: string;  // Filename of spec-tech.md that scopes were synced from (e.g. "spec-tech_v2.md")
}

export interface TrackingData {
  $schema: string;
  version: string;
  created: string;
  updated: string;
  workflows: Workflow[];
}
