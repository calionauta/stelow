/**
 * Task Types - Shared interfaces for task management
 * 
 * Defines common types for tasks across different systems:
 * - InboxItem: Deferred items in inbox
 * 
 * Usage:
 *   import type { TaskStatus } from './modules/task';
 */

/**
 * Task status enum.
 */
export type TaskStatus = "pending" | "in_progress" | "completed";

/**
 * Base task item interface.
 */
export interface TaskItem {
  id?: string;
  content: string;
  status: TaskStatus;
  createdAt?: string;
  completedAt?: string;
}

/**
 * Inbox item - simpler than phase todo.
 * No id required, just content.
 */
export interface InboxItem {
  content: string;
  addedAt?: string;
  source?: string;  // Where the item came from (e.g., "triage", "selection")
}

/**
 * Status icons for display.
 */
export const TASK_ICONS: Record<TaskStatus, string> = {
  pending: "○",
  in_progress: "◐",
  completed: "✓",
};