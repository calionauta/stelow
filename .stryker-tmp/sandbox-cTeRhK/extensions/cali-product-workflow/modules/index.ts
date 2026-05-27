/**
 * Modules - Re-exports for convenience
 * 
 * Usage:
 *   import { FileStore, CacheManager } from './modules';
 *   import { PhaseTodo, TaskStatus } from './modules';
 */
// @ts-nocheck


// File stores
export type { IFileStore } from './file-store';
export {
  TextFileStore, 
  JsonFileStore, 
  MarkdownFileStore,
  ensureDir 
} from './file-store';

// Cache
export type { ICacheManager } from './cache';
export {
  CacheManager, 
  MapCache 
} from './cache';

// Tasks - types use 'export type' for isolatedModules compatibility
export type { 
  TaskStatus, 
  TaskItem, 
  PhaseTodo, 
  PhaseTodosData, 
  InboxItem
} from './task';

export { 
  TASK_ICONS,
  formatTask,
  formatTaskList 
} from './task';
