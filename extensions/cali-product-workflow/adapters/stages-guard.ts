// extensions/cali-product-workflow/adapters/stages-guard.ts
// Pi-only enforcement via PreToolUse hooks
// Lê stages.yaml e current-stage.json para bloquear ferramentas

import { parse as parseYAML } from 'yaml';
import { readFileSync, existsSync } from 'fs';
import { resolve as resolvePath } from 'node:path';

// ── Tipos (espelha types/stages.ts) ──────────────────────────────

export interface Stage {
  name: string;
  order: number;
  description: string;
  blocked_tools: string[];
  allowed_tools: string[];
  preferred_tools: string[];
  primary_actions: string[];
  transitions: Record<string, string[]>;
  requires_approval?: boolean;
  approval_tool?: string;
  supervisor?: boolean;
}

export interface StagesConfig {
  stages: Stage[];
}

export interface StageState {
  current_stage: string;
  previous_stage: string | null;
  transitioned_at: string;
  history: Array<{
    stage: string;
    entered_at: string;
    exited_at: string | null;
  }>;
  gates_passed: string[];
  supervisor_active: boolean;
}

export interface StagesGuardResult {
  allowed: boolean;
  reason?: string;
  allowedTools?: string[];
}

// ── Loader ───────────────────────────────────────────────────────

export function loadStages(configPath: string): StagesConfig {
  const content = readFileSync(configPath, 'utf-8');
  return parseYAML(content) as StagesConfig;
}

export function loadState(statePath: string): StageState {
  if (!existsSync(statePath)) {
    return defaultStageState();
  }
  const raw = JSON.parse(readFileSync(statePath, 'utf-8'));

  // Auto-detect: if file has `workflows` array, it's a tracking file.
  // Extract stage from the active (in-progress) workflow.
  if (raw.workflows && Array.isArray(raw.workflows)) {
    const active = raw.workflows.find((w: any) => w.status === 'in-progress');
    if (active?.stage) return active.stage as StageState;
    // Fallback: no active workflow or missing stage field
    return defaultStageState();
  }

  // Otherwise, treat as direct stage state file (legacy current-stage.json)
  return raw as StageState;
}

function defaultStageState(): StageState {
  return {
    current_stage: 'triage',
    previous_stage: null,
    transitioned_at: new Date().toISOString(),
    history: [],
    gates_passed: [],
    supervisor_active: false
  };
}

// ── Guard ────────────────────────────────────────────────────────

export function createStagesGuard(
  stages: StagesConfig,
  state: StageState,
  onBlocked?: (tool: string, stage: string, allowed: string[]) => void
) {
  // Cache para lookup rápido
  const stageMap = new Map<string, Stage>();
  for (const s of stages.stages) {
    stageMap.set(s.name, s);
  }

  return function checkTool(toolName: string): StagesGuardResult {
    const stageName = state.current_stage;
    const stage = stageMap.get(stageName);

    if (!stage) {
      // Stage não encontrado — permitir (fallback seguro)
      return { allowed: true };
    }

    // POLICY CHECK: blocked_tools
    if (stage.blocked_tools.includes(toolName)) {
      const reason = `Tool '${toolName}' is blocked in '${stageName}' stage`;
      onBlocked?.(toolName, stageName, stage.allowed_tools);

      return {
        allowed: false,
        reason,
        allowedTools: stage.allowed_tools
      };
    }

    // VERIFICATION CHECK: allowed_tools
    if (stage.allowed_tools.length > 0 && !stage.allowed_tools.includes(toolName)) {
      // Tool não está na lista de permitidas, mas não está blocked
      // Log warning mas permite (opt-in model — só bloqueia o que está em blocked_tools)
      console.warn(
        `[Stages Guard] Tool '${toolName}' not in allowed list for stage '${stageName}'`
      );
    }

    return { allowed: true };
  };
}

// ── Factory ──────────────────────────────────────────────────────

/**
 * Check if a tracking file has at least one in-progress (active) workflow.
 * Used by the dogfooding guard to skip enforcement when no workflow is active
 * — the guard's job is to enforce stages of an ACTIVE workflow, not to block
 * dev in any directory that happens to have a tracking file from past work.
 *
 * Returns false when:
 * - file missing
 * - file is corrupt
 * - file has no `workflows` array
 * - no workflow has `status: "in-progress"`
 */
export function hasActiveWorkflow(trackingPath: string): boolean {
  if (!existsSync(trackingPath)) return false;
  try {
    const tracking = JSON.parse(readFileSync(trackingPath, "utf-8"));
    if (!Array.isArray(tracking?.workflows)) return false;
    return tracking.workflows.some((w: any) => w && w.status === "in-progress");
  } catch {
    return false;
  }
}

/**
 * Return the `cwd` of the in-progress workflow, or null if none exists.
 * Used by the guard to verify the active workflow targets the current cwd
 * before enforcing stage locks (avoids cross-project lock).
 */
export function getActiveWorkflowCwd(trackingPath: string): string | null {
  if (!existsSync(trackingPath)) return null;
  try {
    const tracking = JSON.parse(readFileSync(trackingPath, "utf-8"));
    if (!Array.isArray(tracking?.workflows)) return null;
    const active = tracking.workflows.find(
      (w: any) => w && w.status === "in-progress"
    );
    return active?.cwd ?? null;
  } catch {
    return null;
  }
}

/**
 * Return true if `child` equals `parent` or is a descendant of `parent`.
 * Resolves `..` and `.` segments via `path.resolve` so that paths written
 * with `..` (e.g. from a symlink) compare correctly. Trailing slashes
 * are stripped. Pure utility, exported for testing.
 */
export function isAncestorOrSame(parent: string, child: string): boolean {
  const norm = (p: string) => resolvePath(p).replace(/\/+$/, "");
  const a = norm(parent);
  const c = norm(child);
  return c === a || c.startsWith(a + "/");
}

export function createStagesGuardFromPaths(
  stagesPath: string,
  statePath: string,
  onBlocked?: (tool: string, stage: string, allowed: string[]) => void
) {
  const stages = loadStages(stagesPath);
  const state = loadState(statePath);
  return createStagesGuard(stages, state, onBlocked);
}
