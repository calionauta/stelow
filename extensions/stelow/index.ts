import type { CLI } from "./types";
import { createAdapter } from "./adapters";
import type { PiAdapter } from "./adapters/pi";
import { detectHost } from "./state";

export { createAdapter, createGenericCLIAdapter, EventDispatcher, createEventDispatcher } from "./adapters";
export { matchesDeclaredGlob } from "./scope";
export { validateScopeRecord, validateScopeTask, validateScopeTasks, validateScopeAdditions, ScopeRecordValidationError } from "./schema-record";
export type { CLIAdapter, CommandRegistration, ToolCallHandler, SessionStartHandler, TurnEndHandler, InputHandler, ToolDefinition, NotificationType, SelectOption, StatusInfo, EventType, SessionStartEvent, ToolCallEvent, TurnEndEvent, InputEvent, AgentEndEvent } from "./adapters";

/**
 * Pi extension boundary. All host-specific behavior is initialized by
 * PiAdapter. The `api` parameter is the runtime signal that Pi is the
 * loading host: it is non-null ONLY when Pi's extension loader invokes
 * us. Filesystem probes (`~/.fusion`, `~/.pi`) cannot override this
 * signal — a user with both Pi and Fusion installed must still get
 * the Pi adapter here, because this file is the Pi extension entrypoint
 * declared in `package.json#pi.extensions` and Fusion does not invoke
 * it directly (Fusion consumes generated artifacts via the host adapter
 * in `extensions/stelow/adapters/fusion/`). Outside Pi (e.g. unit tests,
 * generic skill consumers), `api` is undefined and we defer to
 * detectHost(), which consults env vars + filesystem probes.
 */
export function resolveExtensionHost(api: unknown): CLI {
  return api ? "pi" : detectHost();
}

export default function stelowExtension(api: unknown): void {
  const adapter = createAdapter(resolveExtensionHost(api));
  if (adapter.name === "pi") {
    (adapter as PiAdapter).setAPI(api);
  } else {
    adapter.initialize();
  }
}
