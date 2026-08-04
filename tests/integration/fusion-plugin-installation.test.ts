import { cp, mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import type { PluginContext, WorkflowDefinition } from '../../plugins/fusion-plugin-stelow/src/fusion-contract.js';
import { installArtifacts } from '../../plugins/fusion-plugin-stelow/src/artifact-installation.js';
import { installProjectIntegration } from '../../plugins/fusion-plugin-stelow/src/index.js';
import { installSkills } from '../../plugins/fusion-plugin-stelow/src/skill-installation.js';
import {
  STELOW_MANAGED_MARKER,
  STELOW_WORKFLOW_NAME,
  registerWorkflow,
} from '../../plugins/fusion-plugin-stelow/src/workflow-registration.js';

const tempRoots: string[] = [];
async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'stelow-fusion-plugin-'));
  tempRoots.push(root);
  return root;
}
afterEach(async () => Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

class StatefulWorkflowStore {
  rows: WorkflowDefinition[] = [];
  nextId = 1;
  failCreate = false;
  constructor(private readonly root: string) {}
  getRootDir = () => this.root;
  listWorkflowDefinitions = async () => structuredClone(this.rows);
  createWorkflowDefinition = async (input: { name: string; description?: string; ir: Record<string, unknown> }) => {
    if (this.failCreate) throw new Error('injected registration failure');
    const row: WorkflowDefinition = {
      id: `WF-${String(this.nextId++).padStart(3, '0')}`,
      name: input.name,
      description: input.description ?? '',
      ir: structuredClone(input.ir),
      layout: {},
    };
    this.rows.push(row);
    return structuredClone(row);
  };
  updateWorkflowDefinition = async (id: string, updates: Partial<{ name: string; description: string; ir: Record<string, unknown>; layout: Record<string, { x: number; y: number }> }>) => {
    const index = this.rows.findIndex((row) => row.id === id);
    if (index < 0) throw new Error(`unknown workflow ${id}`);
    this.rows[index] = { ...this.rows[index], ...structuredClone(updates) };
    return structuredClone(this.rows[index]);
  };
  deleteWorkflowDefinition = async (id: string) => {
    this.rows = this.rows.filter((row) => row.id !== id);
  };
}

function context(store: StatefulWorkflowStore, settings: Record<string, unknown> = {}): PluginContext {
  return {
    pluginId: 'fusion-plugin-stelow',
    taskStore: store,
    settings,
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    emitEvent() {},
  };
}

async function readProjectArtifacts(root: string) {
  return Promise.all([
    readFile(join(root, '.fusion', 'plugins', 'fusion-plugin-stelow', 'settings.json'), 'utf8'),
    readFile(join(root, '.fusion', 'workflows', 'stelow-v2.json'), 'utf8'),
  ]);
}

async function writeSkill(root: string, directory: string, name = directory, description = 'Useful test skill'): Promise<void> {
  await mkdir(join(root, directory, 'references'), { recursive: true });
  await writeFile(join(root, directory, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`, 'utf8');
  await writeFile(join(root, directory, 'references', 'nested.md'), 'nested resource\n', 'utf8');
}

describe('Fusion plugin preparation I/O', () => {
  it('rejects empty sources and malformed serialized artifacts before creating final paths', async () => {
    const root = await tempRoot();
    const empty = join(root, 'empty');
    await mkdir(empty);
    await expect(installSkills(empty, join(root, 'target'))).rejects.toThrow(/no stelow-product/);

    await expect(installArtifacts(root, '{"stelow":{}}\n', '{"version":"v2"}\n')).rejects.toThrow(/pluginId/);
    await expect(installArtifacts(root, '{"stelow":{"pluginId":"fusion-plugin-stelow"}}\n', '{not json')).rejects.toThrow(/invalid workflow artifact JSON/);
    await expect(stat(join(root, '.fusion'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('installs complete skill trees repeatedly and rejects malformed replacement without data loss', async () => {
    const root = await tempRoot();
    const source = join(root, 'source');
    const target = join(root, 'plugin', 'skills');
    await writeSkill(source, 'stelow-product-alpha');
    await writeSkill(source, 'stelow-product-beta');

    expect(await installSkills(source, target)).toEqual(['stelow-product-alpha', 'stelow-product-beta']);
    expect(await readFile(join(target, 'stelow-product-alpha', 'references', 'nested.md'), 'utf8')).toBe('nested resource\n');
    const firstBody = await readFile(join(target, 'stelow-product-beta', 'SKILL.md'), 'utf8');
    expect(await installSkills(source, target)).toEqual(['stelow-product-alpha', 'stelow-product-beta']);
    expect(await readFile(join(target, 'stelow-product-beta', 'SKILL.md'), 'utf8')).toBe(firstBody);

    await writeFile(join(source, 'stelow-product-beta', 'SKILL.md'), '---\nname: duplicate\n---\n', 'utf8');
    await expect(installSkills(source, target)).rejects.toThrow(/frontmatter name|description/);
    expect(await readFile(join(target, 'stelow-product-beta', 'SKILL.md'), 'utf8')).toBe(firstBody);
    expect((await readdir(join(root, 'plugin'))).filter((name) => /stage|\.bak/.test(name))).toEqual([]);
  });
});

describe('Fusion project installation and workflow registration', () => {
  it('defers in the reduced loader and honors the explicit disabled setting', async () => {
    const root = await tempRoot();
    const reduced = context(new StatefulWorkflowStore(root));
    reduced.taskStore = { getRootDir: () => root };
    await expect(installProjectIntegration(reduced)).resolves.toEqual({ deferred: true });
    await expect(stat(join(root, '.fusion'))).rejects.toMatchObject({ code: 'ENOENT' });

    const store = new StatefulWorkflowStore(root);
    await expect(installProjectIntegration(context(store, { installProjectIntegration: false }))).resolves.toEqual({ deferred: true });
    expect(store.rows).toEqual([]);
  });

  it('creates one workflow and byte-identical project artifacts across repeated loads', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'stelow.json'), '{"owned":"stelow"}\n', 'utf8');
    await mkdir(join(root, '.stelow'), { recursive: true });
    await writeFile(join(root, '.stelow', 'keep.txt'), 'keep\n', 'utf8');
    const store = new StatefulWorkflowStore(root);

    const first = await installProjectIntegration(context(store));
    const firstArtifacts = await readProjectArtifacts(root);
    const second = await installProjectIntegration(context(store));
    const secondArtifacts = await readProjectArtifacts(root);

    expect(first).toEqual({ deferred: false, id: 'WF-001', outcome: 'created' });
    expect(second).toEqual({ deferred: false, id: 'WF-001', outcome: 'unchanged' });
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({ id: 'WF-001', name: STELOW_WORKFLOW_NAME });
    expect(store.rows[0].description).toContain(STELOW_MANAGED_MARKER);
    expect(secondArtifacts).toEqual(firstArtifacts);
    expect(await readFile(join(root, 'stelow.json'), 'utf8')).toBe('{"owned":"stelow"}\n');
    expect(await readFile(join(root, '.stelow', 'keep.txt'), 'utf8')).toBe('keep\n');
  });

  it('updates the same managed workflow and fails closed on collision or duplicates', async () => {
    const root = await tempRoot();
    const store = new StatefulWorkflowStore(root);
    store.rows.push({ id: 'WF-009', name: 'Old Stelow', description: STELOW_MANAGED_MARKER, ir: { version: 'v2', old: true } });
    const generated = JSON.parse(await readFile(join(process.cwd(), 'plugins/fusion-plugin-stelow/artifacts/workflows/stelow-v2.json'), 'utf8'));
    await expect(registerWorkflow(context(store), generated)).resolves.toEqual({ deferred: false, id: 'WF-009', outcome: 'updated' });
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({ id: 'WF-009', name: STELOW_WORKFLOW_NAME, ir: generated });

    store.rows = [{ id: 'WF-100', name: STELOW_WORKFLOW_NAME, description: 'operator owned', ir: generated }];
    await expect(registerWorkflow(context(store), generated)).rejects.toThrow(/name collision/);
    store.rows = [
      { id: 'WF-101', name: 'one', description: STELOW_MANAGED_MARKER, ir: generated },
      { id: 'WF-102', name: 'two', description: STELOW_MANAGED_MARKER, ir: generated },
    ];
    await expect(registerWorkflow(context(store), generated)).rejects.toThrow(/multiple managed/);
    expect(store.rows.map(({ id }) => id)).toEqual(['WF-101', 'WF-102']);
  });

  it('leaves no project files or workflow after registration and final-rename failures', async () => {
    const registrationRoot = await tempRoot();
    const registrationStore = new StatefulWorkflowStore(registrationRoot);
    registrationStore.failCreate = true;
    await expect(installProjectIntegration(context(registrationStore))).rejects.toThrow('injected registration failure');
    expect(registrationStore.rows).toEqual([]);
    await expect(stat(join(registrationRoot, '.fusion', 'plugins', 'fusion-plugin-stelow', 'settings.json'))).rejects.toMatchObject({ code: 'ENOENT' });

    const fileRoot = await tempRoot();
    const fileStore = new StatefulWorkflowStore(fileRoot);
    await expect(installProjectIntegration(context(fileStore), {
      beforeRename: (_path, index) => { if (index === 1) throw new Error('injected final rename failure'); },
    })).rejects.toThrow('injected final rename failure');
    expect(fileStore.rows).toEqual([]);
    for (const path of [
      join(fileRoot, '.fusion', 'plugins', 'fusion-plugin-stelow', 'settings.json'),
      join(fileRoot, '.fusion', 'workflows', 'stelow-v2.json'),
    ]) await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(stat(join(fileRoot, '.fusion'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
