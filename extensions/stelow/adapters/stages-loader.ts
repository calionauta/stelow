// extensions/stelow/adapters/stages-loader.ts
// Loads and parses stages.yaml for use by Pi adapters
// Mirrors types/stages.ts — kept separate because adapters are Pi-only

import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { join } from 'node:path';
import type { CLI } from '../types';

export interface StageTransitions {
  next?: string[];
  accept?: string[];
  reject?: string[];
  rework?: string[];
  [key: string]: string[] | undefined;
}

export interface Stage {
  name: string;
  order: number;
  description: string;
  blocked_tools: string[];
  allowed_tools: string[];
  preferred_tools: string[];
  primary_actions: string[];
  transitions: StageTransitions;
  requires_approval?: boolean;
  approval_tool?: string;
  supervisor?: boolean;
}

export interface StagesConfig {
  tools?: Record<string, Partial<Record<CLI, string | null>>>;
  stages: Stage[];
}

export function loadStages(configPath: string): StagesConfig {
  const content = readFileSync(configPath, 'utf-8');
  return parseYaml(content) as StagesConfig;
}

/** Resolve a canonical tool name to its host-native implementation. */
export function resolveTool(
  agnosticName: string,
  host: CLI,
  configPath = join(process.cwd(), 'skills/stelow-product-orchestrator/stages.yaml'),
): string | null {
  const mapped = loadStages(configPath).tools?.[agnosticName];
  return mapped && host in mapped ? mapped[host] ?? null : agnosticName;
}
