/**
 * Modules - Re-exports for convenience
 * 
 * Usage:
 *   import { FileStore, CacheManager } from './modules';
 *   import { PhaseTodo, TaskStatus } from './modules';
 */

// File stores
export { 
  IFileStore, 
  TextFileStore, 
  JsonFileStore, 
  MarkdownFileStore,
  ensureDir 
} from './file-store';

// Cache
export { 
  ICacheManager, 
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
