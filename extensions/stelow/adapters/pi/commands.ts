// Pi-native slash command registration boundary.
// Command behavior remains in the host-agnostic command module; only the
// registration API is used here.
import { registerCommands } from "../../commands";

export function registerPiCommands(pi: unknown): void {
  registerCommands(pi as Parameters<typeof registerCommands>[0]);
}
