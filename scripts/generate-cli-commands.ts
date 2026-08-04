#!/usr/bin/env node
/** Generate Fusion command, settings, and workflow artifacts. */
import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getCommandSystem } from "../extensions/stelow/adapters/commands/dispatcher.ts";
import {
  buildFusionSettings,
  buildFusionWorkflowIR,
  stableStringify,
  validateFusionSettings,
  validateFusionWorkflowIR,
} from "../extensions/stelow/adapters/commands/fusion-artifacts.ts";

export type GeneratorTarget = "pi" | "fusion" | "all";

export interface FusionArtifactOverrides {
  settings?: unknown;
  workflow?: unknown;
}

function writeArtifactAtomically(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(temporaryPath, content, "utf8");
    renameSync(temporaryPath, path);
  } catch (error) {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    throw error;
  }
}

export function generateFusionCommands(
  baseDir = process.cwd(),
  repoRoot = process.cwd(),
  overrides: FusionArtifactOverrides = {},
): string[] {
  const settingsSerialized = stableStringify(overrides.settings ?? buildFusionSettings(repoRoot));
  const workflowSerialized = stableStringify(overrides.workflow ?? buildFusionWorkflowIR(repoRoot));

  // Validate the exact bytes destined for disk, not only builder objects.
  // No directory or file is touched until every serialized artifact passes.
  const parsedSettings: unknown = JSON.parse(settingsSerialized);
  const parsedWorkflow: unknown = JSON.parse(workflowSerialized);
  const settingsResult = validateFusionSettings(parsedSettings);
  if (!settingsResult.ok) throw new Error(`Invalid Fusion settings: ${settingsResult.error}`);
  const workflowResult = validateFusionWorkflowIR(parsedWorkflow);
  if (!workflowResult.ok) throw new Error(`Invalid Fusion workflow IR: ${workflowResult.error}`);

  const artifacts = [
    ...getCommandSystem("fusion").generateCommandFiles(),
    { path: ".fusion/settings.json", content: settingsSerialized },
    { path: ".fusion/workflows/stelow-v2.json", content: workflowSerialized },
  ];

  return artifacts.map((artifact) => {
    const path = join(baseDir, artifact.path);
    writeArtifactAtomically(path, artifact.content);
    return path;
  });
}

/** Pi uses native slash registration, so it intentionally writes nothing. */
export function generatePiCommands(_baseDir = process.cwd()): string[] {
  return [];
}

export function generateCliCommands(
  target: GeneratorTarget,
  baseDir = process.cwd(),
  repoRoot = process.cwd(),
): string[] {
  if (target === "pi") return generatePiCommands(baseDir);
  if (target === "fusion") return generateFusionCommands(baseDir, repoRoot);
  return [...generatePiCommands(baseDir), ...generateFusionCommands(baseDir, repoRoot)];
}

export function parseGeneratorArgs(argv: string[]): { target: GeneratorTarget; baseDir: string } {
  let target: string = "fusion";
  let baseDir = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--target=")) target = arg.slice("--target=".length);
    else if (arg === "--target") target = argv[++i] ?? "";
    else if (arg.startsWith("--output=")) baseDir = arg.slice("--output=".length);
    else if (arg === "--output") baseDir = argv[++i] ?? "";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (target !== "pi" && target !== "fusion" && target !== "all") {
    throw new Error(`Unsupported target '${target}'. Expected pi, fusion, or all.`);
  }
  if (!baseDir) throw new Error("--output requires a directory path");
  return { target, baseDir };
}

const isMain = process.argv[1]
  ? resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])
  : false;

if (isMain) {
  try {
    const { target, baseDir } = parseGeneratorArgs(process.argv.slice(2));
    const files = generateCliCommands(target, baseDir);
    console.log(`[stelow] Generated ${files.length} Fusion artifacts.`);
    if (target !== "pi") {
      console.log(
        "[stelow] Run fn_workflow_validate on .fusion/workflows/stelow-v2.json " +
        "before registering it with fn_workflow_create.",
      );
    }
  } catch (error) {
    console.error(`[stelow] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
