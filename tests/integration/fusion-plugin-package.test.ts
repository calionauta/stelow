import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const root = process.cwd();
let temporaryRoot: string;
let extractedRoot: string;

beforeAll(async () => {
  temporaryRoot = await mkdtemp(join(tmpdir(), 'stelow-fusion-pack-'));
  await exec('npm', ['pack', '--pack-destination', temporaryRoot], {
    cwd: root,
    timeout: 180_000,
    maxBuffer: 20 * 1024 * 1024,
  });
  const tarballs = (await readdir(temporaryRoot)).filter((name) => name.endsWith('.tgz'));
  expect(tarballs).toHaveLength(1);
  await exec('tar', ['-xzf', join(temporaryRoot, tarballs[0]), '-C', temporaryRoot], { timeout: 30_000 });
  extractedRoot = join(temporaryRoot, 'package');
}, 200_000);

afterAll(async () => rm(temporaryRoot, { recursive: true, force: true }));

describe('packed Stelow Fusion plugin', () => {
  it('contains the compiled entry, metadata, generated artifacts, and every canonical skill tree', async () => {
    const pluginRoot = join(extractedRoot, 'plugins', 'fusion-plugin-stelow');
    const [rootPackage, nestedPackage, manifest, workflow, settings] = await Promise.all([
      readFile(join(extractedRoot, 'package.json'), 'utf8').then(JSON.parse),
      readFile(join(pluginRoot, 'package.json'), 'utf8').then(JSON.parse),
      readFile(join(pluginRoot, 'manifest.json'), 'utf8').then(JSON.parse),
      readFile(join(pluginRoot, 'artifacts', 'workflows', 'stelow-v2.json'), 'utf8').then(JSON.parse),
      readFile(join(pluginRoot, 'artifacts', 'settings.json'), 'utf8').then(JSON.parse),
    ]);
    expect({
      versions: [rootPackage.version, nestedPackage.version, manifest.version],
      export: rootPackage.exports['./fusion-plugin'],
      skillCount: manifest.skills.length,
      workflowVersion: workflow.version,
      workflowName: workflow.name,
      settingsPlugin: settings.stelow.pluginId,
    }).toEqual({
      versions: [rootPackage.version, rootPackage.version, rootPackage.version],
      export: {
        types: './plugins/fusion-plugin-stelow/dist/index.d.ts',
        import: './plugins/fusion-plugin-stelow/dist/index.js',
      },
      skillCount: 25,
      workflowVersion: 'v2',
      workflowName: 'Stelow product planning',
      settingsPlugin: 'fusion-plugin-stelow',
    });
    await expect(stat(join(pluginRoot, 'dist', 'index.js'))).resolves.toMatchObject({});
    await expect(stat(join(pluginRoot, 'dist', 'index.d.ts'))).resolves.toMatchObject({});
    for (const { skillId } of manifest.skills) {
      await expect(stat(join(pluginRoot, 'skills', skillId, 'SKILL.md'))).resolves.toMatchObject({});
    }
  });

  it('loads the extracted compiled export without unresolved runtime dependencies', async () => {
    const entry = join(extractedRoot, 'plugins', 'fusion-plugin-stelow', 'dist', 'index.js');
    const loaded = await import(`${pathToFileURL(entry).href}?packed=${Date.now()}`);
    expect({
      defaultId: loaded.default.manifest.id,
      state: loaded.default.state,
      hook: typeof loaded.default.hooks.onLoad,
      skills: loaded.default.skills.length,
    }).toEqual({
      defaultId: 'fusion-plugin-stelow',
      state: 'installed',
      hook: 'function',
      skills: 25,
    });
  });

  it('passes the installed Fusion publish preflight when the fn CLI is available', async () => {
    const { stdout: commandPath } = await exec('sh', ['-c', 'command -v fn || true']);
    if (!commandPath.trim()) return;
    const pluginRoot = join(extractedRoot, 'plugins', 'fusion-plugin-stelow');
    const result = await exec(commandPath.trim(), ['plugin', 'publish', '--dry-run', pluginRoot], {
      cwd: extractedRoot,
      timeout: 60_000,
      maxBuffer: 5 * 1024 * 1024,
    });
    expect(result.stdout).toContain('Plugin publish preflight passed');
    expect(result.stdout).toContain('Declared hook functions: hooks.onLoad');
  });
});
