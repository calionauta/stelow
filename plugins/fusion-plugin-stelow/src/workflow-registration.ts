import type { PluginContext, WorkflowDefinition } from './fusion-contract.js';

export const STELOW_WORKFLOW_NAME = 'Stelow product planning';
export const STELOW_MANAGED_MARKER = '[managed-by:fusion-plugin-stelow]';
const MANAGED_DESCRIPTION = `${STELOW_MANAGED_MARKER} Generated from Stelow's canonical Fusion workflow artifact. Do not edit in Fusion; update Stelow and reload the plugin.`;

export type RegistrationResult =
  | { deferred: true }
  | { deferred: false; id: string; outcome: 'created' | 'updated' | 'unchanged' };

export interface WorkflowMutation {
  result: RegistrationResult;
  rollback(): Promise<void>;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function requireStore(context: PluginContext) {
  const store = context.taskStore;
  if (
    !store?.listWorkflowDefinitions
    || !store.createWorkflowDefinition
    || !store.updateWorkflowDefinition
    || !store.deleteWorkflowDefinition
  ) {
    return undefined;
  }
  return store as Required<Pick<typeof store,
    'listWorkflowDefinitions' | 'createWorkflowDefinition' | 'updateWorkflowDefinition' | 'deleteWorkflowDefinition'>>;
}

/**
 * Persist the managed workflow and return a compensating rollback operation.
 * The marker lives in Fusion's public description field because the public
 * WorkflowDefinition contract has no arbitrary `managedBy` metadata column.
 */
export async function mutateManagedWorkflow(
  context: PluginContext,
  ir: Record<string, unknown>,
): Promise<WorkflowMutation> {
  const store = requireStore(context);
  if (!store) {
    return { result: { deferred: true }, rollback: async () => {} };
  }

  const rows = await store.listWorkflowDefinitions();
  const managed = rows.filter((row) => row.description.includes(STELOW_MANAGED_MARKER));
  if (managed.length > 1) {
    throw new Error('multiple managed Stelow workflows exist; resolve duplicates before reloading the plugin');
  }

  const nameCollisions = rows.filter((row) => row.name === STELOW_WORKFLOW_NAME && !row.description.includes(STELOW_MANAGED_MARKER));
  if (nameCollisions.length > 0) {
    throw new Error(`workflow name collision: '${STELOW_WORKFLOW_NAME}' is owned by another workflow`);
  }

  const current = managed[0];
  if (current) {
    if (current.name === STELOW_WORKFLOW_NAME && stable(current.ir) === stable(ir)) {
      return {
        result: { deferred: false, id: current.id, outcome: 'unchanged' },
        rollback: async () => {},
      };
    }
    const previous: WorkflowDefinition = structuredClone(current);
    const updated = await store.updateWorkflowDefinition(current.id, {
      name: STELOW_WORKFLOW_NAME,
      description: MANAGED_DESCRIPTION,
      ir,
    });
    return {
      result: { deferred: false, id: updated.id, outcome: 'updated' },
      rollback: async () => {
        await store.updateWorkflowDefinition(previous.id, {
          name: previous.name,
          description: previous.description,
          ir: previous.ir,
          ...(previous.layout ? { layout: previous.layout } : {}),
        });
      },
    };
  }

  const created = await store.createWorkflowDefinition({
    name: STELOW_WORKFLOW_NAME,
    description: MANAGED_DESCRIPTION,
    ir,
  });
  return {
    result: { deferred: false, id: created.id, outcome: 'created' },
    rollback: async () => store.deleteWorkflowDefinition(created.id),
  };
}

export async function registerWorkflow(
  context: PluginContext,
  ir: Record<string, unknown>,
): Promise<RegistrationResult> {
  return (await mutateManagedWorkflow(context, ir)).result;
}
