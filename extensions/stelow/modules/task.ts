/**
 * Task Types - Shared interfaces for task management.
 *
 * Defines common types for tasks across different systems.
 * (InboxItem removed in v0.57.0 — hosts own their inbox surface.)
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
 * Status icons for display.
 */
export const TASK_ICONS: Record<TaskStatus, string> = {
  pending: "○",
  in_progress: "◐",
  completed: "✓",
};