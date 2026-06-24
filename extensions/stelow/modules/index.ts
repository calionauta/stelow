/**
 * Modules - Re-exports for convenience
 *
 * Usage:
 *   import { JsonFileStore, TASK_ICONS } from './modules';
 *   import type { PhaseTodo, TaskStatus } from './modules';
 */

// File stores - only JsonFileStore remains (used by checkpoint.ts)
export { JsonFileStore } from './file-store';

// Tasks - types use 'export type' for isolatedModules compatibility
export type {
  TaskStatus,
  TaskItem,
  PhaseTodo,
  PhaseTodosData,
  InboxItem
} from './task';

export { TASK_ICONS } from './task';
