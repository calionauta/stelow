/**
 * Stelow Fusion plugin entrypoint.
 *
 * Public contract audited at Runfusion/Fusion commit
 * d5df6fc63554149f392f84b12e49216e84f91e20. The emitted JavaScript is
 * dependency-free and uses only host capabilities supplied through context.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FusionPlugin, PluginContext } from './fusion-contract.js';
import { installArtifacts, type ArtifactInstallOptions } from './artifact-installation.js';
import { mutateManagedWorkflow, type RegistrationResult } from './workflow-registration.js';
import { STELOW_PLUGIN_ID, STELOW_PLUGIN_VERSION, STELOW_SKILLS } from './skills.js';

export type {
  FusionPlugin,
  PluginContext,
  PluginSkillContribution,
  TaskStore,
  WorkflowDefinition,
} from './fusion-contract.js';
export { STELOW_PLUGIN_ID, STELOW_PLUGIN_VERSION, STELOW_SKILLS } from './skills.js';
export { installSkills } from './skill-installation.js';
export { installArtifacts, parseArtifactBundle } from './artifact-installation.js';
export {
  registerWorkflow,
  mutateManagedWorkflow,
  STELOW_MANAGED_MARKER,
  STELOW_WORKFLOW_NAME,
} from './workflow-registration.js';

const SETTINGS_SCHEMA = {
  installProjectIntegration: {
    type: 'boolean' as const,
    label: 'Install project integration',
    description: 'Install Stelow project artifacts and maintain its managed workflow when the full project runtime loads.',
    defaultValue: true,
  },
};

function hasFullProjectStore(context: PluginContext): boolean {
  const store = context.taskStore;
  return Boolean(
    store?.getRootDir
    && store.listWorkflowDefinitions
    && store.createWorkflowDefinition
    && store.updateWorkflowDefinition
    && store.deleteWorkflowDefinition,
  );
}

export async function installProjectIntegration(
  context: PluginContext,
  options: ArtifactInstallOptions = {},
): Promise<RegistrationResult> {
  if (!hasFullProjectStore(context)) return { deferred: true };
  if (context.settings.installProjectIntegration === false) return { deferred: true };

  const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const [settingsBytes, workflowBytes] = await Promise.all([
    readFile(join(pluginRoot, 'artifacts', 'settings.json'), 'utf8'),
    readFile(join(pluginRoot, 'artifacts', 'workflows', 'stelow-v2.json'), 'utf8'),
  ]);

  let registration: RegistrationResult = { deferred: true };
  await installArtifacts(
    context.taskStore.getRootDir!(),
    settingsBytes,
    workflowBytes,
    async (workflow) => {
      const mutation = await mutateManagedWorkflow(context, workflow);
      registration = mutation.result;
      return mutation.rollback;
    },
    options,
  );
  return registration;
}

export const plugin: FusionPlugin = {
  manifest: {
    id: STELOW_PLUGIN_ID,
    name: 'Stelow',
    version: STELOW_PLUGIN_VERSION,
    description: 'Stelow product-planning workflow and skills for Fusion.',
    author: 'calionauta',
    fusionVersion: '>=0.1.0',
    settingsSchema: SETTINGS_SCHEMA,
    skills: STELOW_SKILLS.map(({ skillId, name }) => ({ skillId, name })),
  },
  state: 'installed',
  hooks: {
    onLoad: async (context) => {
      const result = await installProjectIntegration(context);
      if (result.deferred) {
        context.logger.info('Stelow loaded in reduced context; project integration deferred');
        return;
      }
      context.logger.info(`Stelow project integration ready — workflow=${result.id} outcome=${result.outcome}`);
      context.emitEvent('stelow:integration-ready', result);
    },
  },
  skills: STELOW_SKILLS,
};

export default plugin;
