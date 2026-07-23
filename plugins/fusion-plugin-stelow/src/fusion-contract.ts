/**
 * Dependency-free structural subset of Fusion's public plugin contract.
 *
 * Audited against Runfusion/Fusion commit
 * d5df6fc63554149f392f84b12e49216e84f91e20. Runtime code deliberately
 * imports no host package: external compiled plugins are shape-validated by
 * Fusion's loader and receive these capabilities through PluginContext.
 */

export interface PluginSkillContribution {
  skillId: string;
  name: string;
  description: string;
  skillFiles: string[];
  enabled?: boolean;
  triggerPatterns?: string[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  ir: Record<string, unknown>;
  layout?: Record<string, { x: number; y: number }>;
  [key: string]: unknown;
}

export interface WorkflowDefinitionInput {
  name: string;
  description?: string;
  ir: Record<string, unknown>;
  layout?: Record<string, { x: number; y: number }>;
}

export interface TaskStore {
  getRootDir?: () => string;
  listWorkflowDefinitions?: () => Promise<WorkflowDefinition[]>;
  createWorkflowDefinition?: (input: WorkflowDefinitionInput) => Promise<WorkflowDefinition>;
  updateWorkflowDefinition?: (
    id: string,
    input: Partial<WorkflowDefinitionInput>,
  ) => Promise<WorkflowDefinition>;
  deleteWorkflowDefinition?: (id: string) => Promise<void>;
}

export interface PluginContext {
  pluginId: string;
  taskStore: TaskStore;
  settings: Record<string, unknown>;
  logger: {
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
  };
  emitEvent: (event: string, data: unknown) => void;
}

export interface PluginSettingSchema {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'password' | 'array';
  label?: string;
  description?: string;
  defaultValue?: unknown;
}

export interface FusionPlugin {
  manifest: {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    fusionVersion: string;
    settingsSchema: Record<string, PluginSettingSchema>;
    skills: Array<{ skillId: string; name: string }>;
  };
  state: 'installed' | 'started' | 'stopped' | 'error';
  hooks: {
    onLoad?: (context: PluginContext) => Promise<void> | void;
  };
  skills?: PluginSkillContribution[];
}
