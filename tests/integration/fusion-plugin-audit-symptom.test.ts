import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import type { PluginContext, WorkflowDefinition } from '../../plugins/fusion-plugin-stelow/src/fusion-contract.js';
import { installProjectIntegration } from '../../plugins/fusion-plugin-stelow/src/index.js';
import { STELOW_WORKFLOW_NAME, registerWorkflow } from '../../plugins/fusion-plugin-stelow/src/workflow-registration.js';

const roots: string[] = [];

class FailingStore {
  rows: WorkflowDefinition[] = [];
  getRootDir = () => this.root;
  constructor(private readonly root: string) {}
  listWorkflowDefinitions = async () => structuredClone(this.rows);
  createWorkflowDefinition = async (input: { name: string; description?: string; ir: Record<string, unknown> }) => {
    const row = { id: 'WF-001', name: input.name, description: input.description ?? '', ir: structuredClone(input.ir) };
    this.rows.push(row);
    return structuredClone(row);
  };
  updateWorkflowDefinition = async (id: string, updates: Partial<WorkflowDefinition>) => {
    const index = this.rows.findIndex((row) => row.id === id);
    if (index < 0) throw new Error(`unknown workflow ${id}`);
    this.rows[index] = { ...this.rows[index], ...structuredClone(updates) };
    return structuredClone(this.rows[index]);
  };
  deleteWorkflowDefinition = async (id: string) => {
    this.rows = this.rows.filter((row) => row.id !== id);
  };
}

function context(store: FailingStore): PluginContext {
  return {
    pluginId: 'fusion-plugin-stelow',
    taskStore: store,
    settings: {},
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    emitEvent() {},
  };
}

afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe('SW-007 artifact rollback regression', () => {
  it('removes newly-created Fusion directories when workflow registration fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stelow-sw007-registration-'));
    roots.push(root);
    const store = new FailingStore(root);
    store.createWorkflowDefinition = async () => { throw new Error('registration failed'); };

    await expect(installProjectIntegration(context(store))).rejects.toThrow('registration failed');
    expect(store.rows).toEqual([]);
    await expect(stat(join(root, '.fusion'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('fails closed when an operator removes the managed marker', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stelow-sw007-marker-'));
    roots.push(root);
    const store = new FailingStore(root);
    store.rows.push({
      id: 'WF-099',
      name: STELOW_WORKFLOW_NAME,
      description: 'operator-owned after marker removal',
      ir: { version: 'v2' },
    });
    const workflow = JSON.parse(await readFile(join(process.cwd(), 'plugins/fusion-plugin-stelow/artifacts/workflows/stelow-v2.json'), 'utf8')) as Record<string, unknown>;

    await expect(registerWorkflow(context(store), workflow)).rejects.toThrow(/name collision/);
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].id).toBe('WF-099');
  });

  it('removes newly-created Fusion directories after a final rename failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stelow-sw007-rename-'));
    roots.push(root);
    const store = new FailingStore(root);

    await expect(installProjectIntegration(context(store), {
      beforeRename: (_target, index) => {
        if (index === 1) throw new Error('final rename failed');
      },
    })).rejects.toThrow('final rename failed');
    expect(store.rows).toEqual([]);
    await expect(stat(join(root, '.fusion'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(join(root, 'stelow.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
