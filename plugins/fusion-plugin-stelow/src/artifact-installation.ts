import { mkdir, readFile, rename, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export interface ArtifactBundle {
  settingsBytes: string;
  workflowBytes: string;
  settings: Record<string, unknown>;
  workflow: Record<string, unknown>;
}

export interface ArtifactInstallOptions {
  /** Test/embedding seam invoked immediately before each final rename. */
  beforeRename?: (targetPath: string, index: number) => Promise<void> | void;
}

function parseObject(bytes: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes);
  } catch (error) {
    throw new Error(`invalid ${label} JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/** Validate the exact serialized resource bytes before any project write. */
export function parseArtifactBundle(settingsBytes: string, workflowBytes: string): ArtifactBundle {
  const settings = parseObject(settingsBytes, 'settings artifact');
  const workflow = parseObject(workflowBytes, 'workflow artifact');
  const stelow = settings.stelow;
  if (!stelow || typeof stelow !== 'object' || Array.isArray(stelow)
      || (stelow as Record<string, unknown>).pluginId !== 'fusion-plugin-stelow') {
    throw new Error("settings.stelow.pluginId must be 'fusion-plugin-stelow'");
  }
  if (
    workflow.version !== 'v2'
    || typeof workflow.name !== 'string'
    || !Array.isArray(workflow.columns)
    || !Array.isArray(workflow.nodes)
    || !Array.isArray(workflow.edges)
  ) {
    throw new Error('workflow artifact is not a structurally valid v2 workflow');
  }
  return { settingsBytes, workflowBytes, settings, workflow };
}

async function readExisting(path: string): Promise<string | undefined> {
  try {
    const metadata = await stat(path);
    if (!metadata.isFile()) throw new Error(`artifact target is not a file: ${path}`);
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function restore(path: string, bytes: string | undefined, token: string): Promise<void> {
  if (bytes === undefined) {
    await rm(path, { force: true });
    return;
  }
  const restorePath = `${path}.${token}.restore`;
  await writeFile(restorePath, bytes, 'utf8');
  await rename(restorePath, path);
}

/**
 * Remove only directories created by this transaction when it fails. This
 * keeps a failed first install from leaving an otherwise empty `.fusion`
 * tree, while never deleting a directory that existed before the install.
 */
async function cleanupCreatedDirectories(paths: Set<string>): Promise<void> {
  const ordered = [...paths].sort((left, right) => right.length - left.length);
  for (const path of ordered) {
    try {
      await rmdir(path);
    } catch (error) {
      // Keep pre-existing or concurrently populated directories intact.
      if (!['ENOENT', 'ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
    }
  }
}

async function noteMissingParentDirectories(
  parent: string,
  projectRoot: string,
  created: Set<string>,
): Promise<void> {
  const missing: string[] = [];
  let cursor = parent;
  while (cursor !== projectRoot) {
    try {
      const metadata = await stat(cursor);
      if (!metadata.isDirectory()) throw new Error(`artifact parent is not a directory: ${cursor}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      missing.push(cursor);
    }
    cursor = dirname(cursor);
  }
  await mkdir(parent, { recursive: true });
  for (const path of missing) created.add(path);
}

/**
 * Atomically install both project artifacts. All bytes are validated and both
 * final files are staged before `beforeCommit`; any later failure restores the
 * exact prior bytes and executes the workflow compensation callback.
 */
export async function installArtifacts(
  projectRoot: string,
  settingsBytes: string,
  workflowBytes: string,
  beforeCommit: (workflow: Record<string, unknown>) => Promise<() => Promise<void>> = async () => async () => {},
  options: ArtifactInstallOptions = {},
): Promise<void> {
  const bundle = parseArtifactBundle(settingsBytes, workflowBytes);
  const installationRoot = resolve(projectRoot);
  const targets = [
    { path: join(installationRoot, '.fusion', 'plugins', 'fusion-plugin-stelow', 'settings.json'), bytes: bundle.settingsBytes },
    { path: join(installationRoot, '.fusion', 'workflows', 'stelow-v2.json'), bytes: bundle.workflowBytes },
  ];
  const previous = await Promise.all(targets.map(({ path }) => readExisting(path)));
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const stages = targets.map(({ path }) => `${path}.${token}.tmp`);
  let rollbackWorkflow: () => Promise<void> = async () => {};
  let workflowMutated = false;
  let failed = false;

  const createdDirectories = new Set<string>();
  try {
    for (let index = 0; index < targets.length; index += 1) {
      await noteMissingParentDirectories(dirname(targets[index].path), installationRoot, createdDirectories);
      await writeFile(stages[index], targets[index].bytes, 'utf8');
    }
    rollbackWorkflow = await beforeCommit(bundle.workflow);
    workflowMutated = true;
    for (let index = 0; index < targets.length; index += 1) {
      await options.beforeRename?.(targets[index].path, index);
      await rename(stages[index], targets[index].path);
    }
  } catch (error) {
    failed = true;
    const restoreErrors: unknown[] = [];
    for (let index = 0; index < targets.length; index += 1) {
      try {
        await restore(targets[index].path, previous[index], token);
      } catch (restoreError) {
        restoreErrors.push(restoreError);
      }
    }
    if (workflowMutated) {
      try {
        await rollbackWorkflow();
      } catch (rollbackError) {
        restoreErrors.push(rollbackError);
      }
    }
    if (restoreErrors.length > 0) {
      throw new AggregateError([error, ...restoreErrors], 'artifact installation failed and rollback was incomplete');
    }
    throw error;
  } finally {
    await Promise.all(stages.map((path) => rm(path, { force: true }).catch(() => {})));
    await Promise.all(targets.map(({ path }) => rm(`${path}.${token}.restore`, { force: true }).catch(() => {})));
    if (failed) await cleanupCreatedDirectories(createdDirectories);
  }
}
