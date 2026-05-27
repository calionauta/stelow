// @ts-nocheck
// extensions/cali-product-workflow/adapters/stages-guard.ts
// Pi-only enforcement via PreToolUse hooks
// Lê stages.yaml e current-stage.json para bloquear ferramentas

import { parse as parseYAML } from 'yaml';
import { readFileSync, existsSync } from 'fs';

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
    // Fallback seguro: assume triage
    return {
      current_stage: 'triage',
      previous_stage: null,
      transitioned_at: new Date().toISOString(),
      history: [],
      gates_passed: [],
      supervisor_active: false
    };
  }
  return JSON.parse(readFileSync(statePath, 'utf-8'));
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

export function createStagesGuardFromPaths(
  stagesPath: string,
  statePath: string,
  onBlocked?: (tool: string, stage: string, allowed: string[]) => void
) {
  const stages = loadStages(stagesPath);
  const state = loadState(statePath);
  return createStagesGuard(stages, state, onBlocked);
}
