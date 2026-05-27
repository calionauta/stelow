/**
 * Task Types - Shared interfaces for task management
 * 
 * Defines common types for tasks across different systems:
 * - PhaseTodo: Tasks for workflow phases
 * - InboxItem: Deferred items in inbox
 * 
 * Usage:
 *   import { PhaseTodo, TaskStatus } from './modules/task';
 *   const task: PhaseTodo = { id: 'SHAPE-1', content: '...', status: 'pending' };
 */
// @ts-nocheck


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
 * Phase todo for workflow phases.
 * Extends TaskItem with phase-specific fields.
 */
export interface PhaseTodo extends TaskItem {
  id: string;  // Required for phase todos (e.g., "SHAPE-1")
  content: string;
  status: TaskStatus;
  createdAt?: string;
  completedAt?: string;
}

/**
 * Phase todos data structure stored in file.
 */
export interface PhaseTodosData {
  workflowName: string;
  phase: string;
  phaseIndex: number;
  todos: PhaseTodo[];
  updatedAt: string;
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

/**
 * Format a task for display.
 */
export function formatTask(task: TaskItem): string {
  const icon = TASK_ICONS[task.status];
  const id = task.id ? `[${task.id}] ` : "";
  return `${icon} ${id}${task.content}`;
}

/**
 * Format a list of tasks for display.
 */
export function formatTaskList(tasks: TaskItem[], header?: string): string {
  const lines: string[] = [];
  if (header) {
    lines.push(header, "");
  }
  for (const task of tasks) {
    lines.push(formatTask(task));
  }
  return lines.join("\n");
}