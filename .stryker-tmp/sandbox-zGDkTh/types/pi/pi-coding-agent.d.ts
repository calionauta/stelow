/**
 * Stub type declarations for @earendil-works/pi-coding-agent
 * 
 * These are stub types since the package is an optional peer dependency.
 * Users who install the package for Pi will have the real types installed.
 */
// @ts-nocheck


// Extension types
export interface ExtensionContext {
  api: ExtensionAPI;
  actions: ExtensionActions;
}

export interface Extension {
  init(context: ExtensionContext): Promise<void> | void;
}

export interface ExtensionAPI {
  registerTool(tool: ToolDefinition): void;
  registerCommand(command: RegisteredCommand): void;
  on<T extends ExtensionEvent>(type: T['type'], handler: ExtensionHandler<T>): void;
  exec(command: string, options?: ExecOptions): Promise<ExecResult>;
  showDialog(options: DialogOptions): Promise<string | undefined>;
  showWidget(options: WidgetOptions): void;
}

export interface ExtensionActions {
  sendMessage(text: string): Promise<void>;
  setModel(model: Model, thinkingLevel?: ThinkingLevel): void;
  setThinkingLevel(level: ThinkingLevel): void;
  setActiveTools(toolNames: string[]): void;
}

export interface ToolDefinition {
  name: string;
  label: string;
  description: string;
  parameters: unknown;
  execute: (toolCallId: string, args: unknown, signal?: AbortSignal) => Promise<ToolResult>;
}

export interface ToolResult {
  content: Array<{ type: string; text: string }>;
  details?: Record<string, unknown>;
}

export interface RegisteredCommand {
  name: string;
  description: string;
  shortcut?: string;
  handler: (ctx: ExtensionCommandContext) => Promise<void>;
}

export interface ExtensionCommandContext {
  cwd: string;
  sendMessage(message: string): Promise<void>;
}

export type ExtensionEvent =
  | { type: 'agent_start' }
  | { type: 'agent_end' }
  | { type: 'tool_call'; toolName: string; toolInput: unknown }
  | { type: 'tool_result'; toolName: string; toolInput: unknown; toolResult: unknown }
  | { type: 'session_start' }
  | { type: 'session_shutdown' }
  | { type: 'session_compact' }
  | { type: 'session_fork' }
  | { type: 'session_switch' }
  | { type: 'input'; text: string }
  | { type: 'turn_start' }
  | { type: 'turn_end' };

export type ExtensionHandler<T extends ExtensionEvent> = (event: T) => void | Promise<void>;

export interface ExecOptions {
  cwd?: string;
  signal?: AbortSignal;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface DialogOptions {
  title?: string;
  message: string;
  options?: Array<{ label: string; value: string }>;
}

export interface WidgetOptions {
  content: string;
  position?: 'left' | 'right';
}

export interface Model {
  provider: string;
  name: string;
}

export type ThinkingLevel = 'off' | 'low' | 'medium' | 'high';
