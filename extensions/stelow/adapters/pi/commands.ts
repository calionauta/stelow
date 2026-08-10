// Pi-native slash command registration boundary.
//
// Command behavior remains in the host-agnostic command module; only the
// registration API is used here.
//
// v0.57.0: `sw-unlock` (the last `piOnly` descriptor after the v0.57.0
// inbox/pulse/provenance removal) is registered here as a Pi-local command
// instead of living in `WORKFLOW_COMMANDS`. Hosts that don't expose the
// Pi TUI/state-hooks it depends on never see it.
import { registerCommands } from "../../commands";
import { cmdUnlock } from "../../commands";
import type { CommandDescriptor } from "../../adapters/commands/dispatcher";

/**
 * Pi-local command descriptors — host-specific commands that depend on
 * Pi-only primitives (TUI overlay, state hooks, auto-sync). They are NOT
 * part of the host-agnostic `WORKFLOW_COMMANDS` list; Fusion and Generic
 * hosts have no equivalent surface.
 */
export const PI_LOCAL_COMMANDS: CommandDescriptor[] = [
  {
    name: "sw-unlock",
    description: "Disable stage guard for this session (debug/emergency)",
    usage: "/sw-unlock",
    piOnly: true,
  },
];

export function registerPiCommands(pi: unknown): void {
  const piApi = pi as Parameters<typeof registerCommands>[0];
  registerCommands(piApi);

  // Pi-local descriptors (post-v0.57.0: only sw-unlock). Register directly
  // here so the host-agnostic `WORKFLOW_COMMANDS` stays clean.
  for (const descriptor of PI_LOCAL_COMMANDS) {
    piApi.registerCommand(descriptor.name, {
      description: `${descriptor.description}. Usage: ${descriptor.usage ?? descriptor.name}`,
      handler: async (args: string, ctx: unknown) => cmdUnlock(
        piApi,
        args ?? "",
        ctx as Parameters<typeof cmdUnlock>[2],
      ),
    });
  }
}