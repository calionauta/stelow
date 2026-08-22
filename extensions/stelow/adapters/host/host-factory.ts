/**
 * Host Adapter factory.
 *
 * Resolves a `DecisionGateway` for the active workflow based on
 * `.stelow/host-workgroup.yaml`. Today only `multica` is implemented;
 * future hosts (`slack`, `linear`, `notion`) plug in here without
 * touching the orchestrator.
 */

import { loadWorkgroupConfig } from "./config";
import { MulticaAdapter } from "./multica-adapter";
import type { DecisionGateway } from "./types";

export class HostAdapterError extends Error {
  constructor(message: string, public readonly host?: string) {
    super(message);
    this.name = "HostAdapterError";
  }
}

/**
 * Create the appropriate host adapter for the given project root.
 *
 * Returns `null` when no `.stelow/host-workgroup.yaml` exists — the
 * caller should fall back to the local CLI tools (ask_user_question /
 * plannotator) instead of throwing. Throws `HostAdapterError` when the
 * file is present but malformed or the named host is not implemented.
 */
export function createHostAdapter(
  projectRoot: string,
  opts: {
    parentIssueId?: string | null;
    stelowAgent?: { id: string; name: string } | null;
  } = {},
): DecisionGateway | null {
  const config = loadWorkgroupConfig(projectRoot);
  if (!config) return null;

  switch (config.host) {
    case "multica":
      return new MulticaAdapter(config, opts.parentIssueId ?? null, opts.stelowAgent ?? null);
    // Future: case "slack": return new SlackAdapter(config, ...);
    // Future: case "linear": return new LinearAdapter(config, ...);
    default:
      throw new HostAdapterError(
        `Host '${config.host}' is not implemented. Supported: multica.`,
        config.host,
      );
  }
}