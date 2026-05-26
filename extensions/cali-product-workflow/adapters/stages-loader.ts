// extensions/cali-product-workflow/adapters/stages-loader.ts
// Carrega e parseia stages.yaml para uso dos adapters Pi
// Espelha types/stages.ts — mantido separado pois adapters são Pi-only

import { readFileSync } from 'fs';

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
  stages: Stage[];
}

export function loadStages(configPath: string): StagesConfig {
  const content = readFileSync(configPath, 'utf-8');
  // YAML já está instalado em node_modules/
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { parse } = require('yaml');
  return parse(content) as StagesConfig;
}
