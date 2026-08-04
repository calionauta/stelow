import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { FusionAdapter } from '../../extensions/stelow/adapters/fusion.js';
import plugin, { STELOW_SKILLS } from '../../plugins/fusion-plugin-stelow/src/index.js';

const root = process.cwd();
const pluginRoot = join(root, 'plugins', 'fusion-plugin-stelow');

describe('Fusion plugin public contract', () => {
  it('keeps manifest, packages, compiled entry, settings schema, and export aligned', async () => {
    const [rootPackage, nestedPackage, manifest] = await Promise.all([
      readFile(join(root, 'package.json'), 'utf8').then(JSON.parse),
      readFile(join(pluginRoot, 'package.json'), 'utf8').then(JSON.parse),
      readFile(join(pluginRoot, 'manifest.json'), 'utf8').then(JSON.parse),
    ]);

    expect({
      rootVersion: rootPackage.version,
      nestedVersion: nestedPackage.version,
      manifestVersion: manifest.version,
      id: manifest.id,
      main: nestedPackage.main,
      nestedExport: nestedPackage.exports['.'],
      rootExport: rootPackage.exports['./fusion-plugin'],
      dependencies: nestedPackage.dependencies,
      setting: manifest.settingsSchema.installProjectIntegration,
    }).toEqual({
      rootVersion: rootPackage.version,
      nestedVersion: rootPackage.version,
      manifestVersion: rootPackage.version,
      id: 'fusion-plugin-stelow',
      main: './dist/index.js',
      nestedExport: { types: './dist/index.d.ts', import: './dist/index.js' },
      rootExport: {
        types: './plugins/fusion-plugin-stelow/dist/index.d.ts',
        import: './plugins/fusion-plugin-stelow/dist/index.js',
      },
      dependencies: {},
      setting: {
        type: 'boolean',
        label: 'Install project integration',
        description: 'Install Stelow project artifacts and maintain its managed workflow when the full project runtime loads.',
        defaultValue: true,
      },
    });
    await expect(stat(join(pluginRoot, 'dist', 'index.js'))).resolves.toMatchObject({});
  });

  it('exports the loader shape and every canonical skill with concrete plugin-relative body', async () => {
    const canonical = (await readdir(join(root, 'skills'), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('stelow-product-'))
      .map((entry) => entry.name)
      .sort();

    expect(plugin.state).toBe('installed');
    expect(Object.keys(plugin.hooks)).toEqual(['onLoad']);
    expect(plugin.tools).toBeUndefined();
    expect(plugin.skills).toEqual(STELOW_SKILLS);
    expect(STELOW_SKILLS.map((skill) => skill.skillId)).toEqual(canonical);
    expect(STELOW_SKILLS).toHaveLength(25);
    for (const skill of STELOW_SKILLS) {
      expect(skill).toMatchObject({
        skillId: skill.name,
        description: expect.stringMatching(/\S/),
        skillFiles: [`skills/${skill.skillId}/SKILL.md`],
      });
      await expect(stat(join(pluginRoot, skill.skillFiles[0]))).resolves.toMatchObject({});
    }
  });

  it('ships dependency-free JavaScript without private imports or native tool shadows', async () => {
    const sourceFiles = ['index.ts', 'artifact-installation.ts', 'workflow-registration.ts', 'skills.ts'];
    const source = (await Promise.all(sourceFiles.map((name) => readFile(join(pluginRoot, 'src', name), 'utf8')))).join('\n');
    const emitted = await readFile(join(pluginRoot, 'dist', 'index.js'), 'utf8');
    expect(`${source}\n${emitted}`).not.toMatch(/@fusion\/|@runfusion\/|workspace:\*|from ['"]yaml['"]/);
    expect(plugin).not.toHaveProperty('tools');
    expect(source).not.toMatch(/fn_ask_question|fn_spawn_agent|visual_review/);
  });

  it('preserves the canonical Fusion tool mapping and file-based visual review fallback', async () => {
    const adapter = new FusionAdapter();
    expect(adapter.getAvailableTools().map(({ name }) => name)).toEqual([
      'fn_ask_question', 'fn_spawn_agent', 'read', 'write', 'edit', 'bash', 'ls', 'grep',
    ]);
    expect({
      ask: adapter.toAgnosticName('fn_ask_question'),
      spawn: adapter.toAgnosticName('fn_spawn_agent'),
      visual: adapter.toAgnosticName('visual_review'),
    }).toEqual({ ask: 'ask_user_question', spawn: 'subagent', visual: 'visual_review' });

    const prepareSource = await readFile(join(root, 'scripts', 'prepare-fusion-plugin.ts'), 'utf8');
    for (const builder of [
      'buildFusionSettings', 'buildFusionWorkflowIR', 'stableStringify',
      'validateFusionSettings', 'validateFusionWorkflowIR',
    ]) expect(prepareSource).toContain(builder);
    expect(prepareSource).not.toMatch(/const\s+(stages|transitions|traits|toolMap)\s*=/);
  });
});
