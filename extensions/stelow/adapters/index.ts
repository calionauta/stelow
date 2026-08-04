/**
 * CLI Adapters Index
 * 
 * Exports all CLI adapters and the adapter factory.
 * Main entry point for the adapter system.
 */

// ── Adapter Interface & Factory ──────────────────────────────────────

export type {
  CLIAdapter,
  CommandRegistration,
  ToolCallHandler,
  SessionStartHandler,
  TurnEndHandler,
  InputHandler,
  ToolDefinition,
  NotificationType,
  SelectOption,
  StatusInfo,
} from "./cli-adapter";

export {
  createAdapter,
  createGenericCLIAdapter,
} from "./cli-adapter";

// ── Event Dispatcher ──────────────────────────────────────────────────

export {
  EventDispatcher,
  createEventDispatcher,
} from "./event-dispatcher";

export type {
  EventType,
  SessionStartEvent,
  ToolCallEvent,
  TurnEndEvent,
  InputEvent,
  AgentEndEvent,
} from "./event-dispatcher";

// ── Base Adapter ─────────────────────────────────────────────────────

export {
  BaseAdapter,
  parseCommandArgs,
  formatNotification,
  truncateStatusLine,
  debounce,
  supportsAnsiColors,
  GenericAdapter,
} from "./base";

// ── UI Adapter ───────────────────────────────────────────────────────

export {
  createUIAdapter,
  type UIAdapter,
  detectUIFallbackLevel,
  formatAnsiNotification,
  formatSelectList,
  formatStatusLine,
  AnsiColors,
} from "./ui-factory";

export {
  PiUIAdapter,
  createPiUIAdapter,
  getPiUIAdapter,
  setPiContext,
} from "./pi/ui";

export { FusionAdapter, createFusionAdapter } from "./fusion";

// ── Pi Adapter ───────────────────────────────────────────────────────

export {
  PiAdapter,
  createPiAdapter,
  getPiAdapter,
  setPiAPI,
} from "./pi";

// ── Command Dispatcher ────────────────────────────────────────────────

export {
  type CommandDescriptor,
  type CommandRegistrationSystem,
  WORKFLOW_COMMANDS,
  getCommandSystem,
  installCommandFiles,
} from "./commands";

// ── Stages Guard ────────────────────────────────────────────────────

export {
  createStagesGuard,
  createStagesGuardFromPaths,
  loadStages,
  loadState,
} from "./stages-guard";

// ── Stages Loader ───────────────────────────────────────────────────

export {
  loadStages as loadStagesConfig,
  resolveTool,
  type Stage,
  type StagesConfig,
  type StageTransitions,
} from "./stages-loader";

// ── State Manager ───────────────────────────────────────────────────

export {
  transition,
  saveState,
  getCurrentStage,
} from "./state-manager";