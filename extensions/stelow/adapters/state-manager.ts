// extensions/stelow/adapters/state-manager.ts
// Manages workflow state — transitions and history
// SINGLE SOURCE OF TRUTH: stelow.json

import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { StageState, StagesConfig } from './stages-guard';

export function loadState(path: string): StageState {
  if (!existsSync(path)) {
    return {
      current_stage: 'triage',
      previous_stage: null,
      transitioned_at: new Date().toISOString(),
      history: [],
      supervisor_active: false
    };
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function saveState(path: string, state: StageState): void {
  writeFileSync(path, JSON.stringify(state, null, 2), 'utf-8');
}

export function transition(
  statePath: string,
  toStage: string,
  stages: StagesConfig,
  transitionType: string = 'next',
  /** Optional path to stelow.json for single-source-of-truth sync */
  trackingPath?: string
): StageState {
  const state = loadState(statePath);
  const stage = stages.stages.find(s => s.name === toStage);

  // Update history
  const now = new Date().toISOString();
  if (state.history.length > 0) {
    const last = state.history[state.history.length - 1];
    if (last && !last.exited_at) {
      last.exited_at = now;
    }
  }

  // Registrar novo stage
  state.history.push({
    stage: toStage,
    entered_at: now,
    exited_at: null
  });

  state.previous_stage = state.current_stage;
  state.current_stage = toStage;
  state.transitioned_at = now;

  // Ativar supervisor se o stage requer
  state.supervisor_active = stage?.supervisor ?? false;

  saveState(statePath, state);

  // Sync to stelow.json if trackingPath provided
  if (trackingPath && existsSync(trackingPath)) {
    try {
      const tracking = JSON.parse(readFileSync(trackingPath, 'utf-8'));
      const idx = (tracking.workflows || []).findIndex((w: any) => w.status === 'in-progress');
      if (idx !== -1) {
        tracking.workflows[idx].stage = state;
        tracking.workflows[idx].updated = now;
        tracking.updated = now;
        writeFileSync(trackingPath, JSON.stringify(tracking, null, 2), 'utf-8');
      }
    } catch {
      // If tracking file is corrupt, skip sync
    }
  }

  return state;
}

export function getCurrentStage(statePath: string): string {
  return loadState(statePath).current_stage;
}
