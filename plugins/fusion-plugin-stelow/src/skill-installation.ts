import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

function parseSkillName(body: string, directory: string): string {
  const match = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error(`invalid skill frontmatter: ${directory}/SKILL.md`);
  const nameMatch = match[1].match(/^name:\s*([^\r\n]+)\s*$/m);
  const descriptionLine = match[1].match(/^description:\s*([^\r\n]*)$/m);
  const descriptionValue = descriptionLine?.[1].trim() ?? '';
  const hasBlockDescription = (descriptionValue === '|' || descriptionValue === '>')
    && /^description:\s*[|>]\s*\r?\n[ \t]+\S/m.test(match[1]);
  if (!nameMatch || nameMatch[1].trim() !== directory) {
    throw new Error(`skill frontmatter name must equal directory '${directory}'`);
  }
  if ((!descriptionValue || descriptionValue === '|' || descriptionValue === '>') && !hasBlockDescription) {
    throw new Error(`skill description must be non-empty: ${directory}/SKILL.md`);
  }
  return nameMatch[1].trim();
}

/**
 * Copy all canonical Stelow skills through a sibling staging directory. The
 * prior target is retained as a backup until the replacement rename succeeds,
 * so malformed input or a failed swap cannot destroy an existing installation.
 */
export async function installSkills(sourceRoot: string, targetRoot: string): Promise<string[]> {
  const entries = (await readdir(sourceRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('stelow-product-'))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (entries.length === 0) throw new Error(`no stelow-product-* skills found in ${sourceRoot}`);

  const names = new Set<string>();
  for (const entry of entries) {
    const name = parseSkillName(await readFile(join(sourceRoot, entry.name, 'SKILL.md'), 'utf8'), entry.name);
    if (names.has(name)) throw new Error(`duplicate skill name: ${name}`);
    names.add(name);
  }

  const parent = dirname(targetRoot);
  await mkdir(parent, { recursive: true });
  const stage = await mkdtemp(join(parent, '.fusion-stelow-stage-'));
  const backup = `${targetRoot}.${process.pid}-${Date.now()}.bak`;
  let backedUp = false;
  try {
    await Promise.all(entries.map((entry) =>
      cp(join(sourceRoot, entry.name), join(stage, entry.name), { recursive: true })));
    try {
      await rename(targetRoot, backup);
      backedUp = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await rename(stage, targetRoot);
    await rm(backup, { recursive: true, force: true });
    return [...names].sort((left, right) => left.localeCompare(right));
  } catch (error) {
    await rm(stage, { recursive: true, force: true }).catch(() => {});
    if (backedUp) {
      await rm(targetRoot, { recursive: true, force: true }).catch(() => {});
      await rename(backup, targetRoot).catch(() => {});
    }
    throw error;
  } finally {
    await rm(stage, { recursive: true, force: true }).catch(() => {});
    await rm(backup, { recursive: true, force: true }).catch(() => {});
  }
}
