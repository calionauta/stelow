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

// Tasks
export { 
  TaskStatus, 
  TaskItem, 
  PhaseTodo, 
  PhaseTodosData, 
  InboxItem,
  TASK_ICONS,
  formatTask,
  formatTaskList 
} from './task';