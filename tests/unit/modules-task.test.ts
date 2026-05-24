/**
 * Unit tests: Task types and formatters
 * 
 * Tests the shared types for task management:
 * - PhaseTodo: Tasks for workflow phases
 * - InboxItem: Deferred items in inbox
 * - TaskStatus: Status enum
 * - Formatting functions
 */

import { describe, it, expect } from 'vitest';
import {
  TaskStatus,
  TaskItem,
  PhaseTodo,
  PhaseTodosData,
  InboxItem,
  TASK_ICONS,
  formatTask,
  formatTaskList,
} from '../../extensions/cali-product-workflow/modules/task';

describe('TaskStatus', () => {
  it('should be a union type with three values', () => {
    const validateStatus = (s: TaskStatus) => ['pending', 'in_progress', 'completed'].includes(s);
    expect(validateStatus('pending')).toBe(true);
    expect(validateStatus('in_progress')).toBe(true);
    expect(validateStatus('completed')).toBe(true);
  });

  it('should match TASK_ICONS keys', () => {
    expect(Object.keys(TASK_ICONS)).toEqual(['pending', 'in_progress', 'completed']);
  });
});

describe('TASK_ICONS', () => {
  it('should have correct icons for each status', () => {
    expect(TASK_ICONS.pending).toBe('○');
    expect(TASK_ICONS.in_progress).toBe('◐');
    expect(TASK_ICONS.completed).toBe('✓');
  });
});

describe('TaskItem', () => {
  it('should accept valid task item', () => {
    const item: TaskItem = {
      content: 'Test task',
      status: 'pending',
    };
    expect(item.content).toBe('Test task');
    expect(item.status).toBe('pending');
  });

  it('should accept optional fields', () => {
    const item: TaskItem = {
      id: 'optional-id',
      content: 'Test',
      status: 'completed',
      createdAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-02T00:00:00Z',
    };
    expect(item.id).toBe('optional-id');
    expect(item.createdAt).toBe('2024-01-01T00:00:00Z');
    expect(item.completedAt).toBe('2024-01-02T00:00:00Z');
  });
});

describe('PhaseTodo', () => {
  it('should require id field', () => {
    const todo: PhaseTodo = {
      id: 'SHAPE-1',
      content: 'Define the hill',
      status: 'pending',
    };
    expect(todo.id).toBe('SHAPE-1');
  });

  it('should accept all status values', () => {
    const todos: PhaseTodo[] = [
      { id: '1', content: 'p', status: 'pending' },
      { id: '2', content: 'i', status: 'in_progress' },
      { id: '3', content: 'c', status: 'completed' },
    ];
    expect(todos).toHaveLength(3);
  });

  it('should work with dates', () => {
    const todo: PhaseTodo = {
      id: 'SHAPE-1',
      content: 'Task with dates',
      status: 'completed',
      createdAt: '2024-01-01T00:00:00.000Z',
      completedAt: '2024-01-02T00:00:00.000Z',
    };
    expect(todo.createdAt).toBeDefined();
    expect(todo.completedAt).toBeDefined();
  });
});

describe('PhaseTodosData', () => {
  it('should hold phase todos structure', () => {
    const data: PhaseTodosData = {
      workflowName: 'My Workflow',
      phase: 'SHAPE',
      phaseIndex: 2,
      todos: [
        { id: 'SHAPE-1', content: 'Task 1', status: 'completed' },
        { id: 'SHAPE-2', content: 'Task 2', status: 'pending' },
      ],
      updatedAt: '2024-01-01T00:00:00Z',
    };
    expect(data.workflowName).toBe('My Workflow');
    expect(data.todos).toHaveLength(2);
  });
});

describe('InboxItem', () => {
  it('should only require content', () => {
    const item: InboxItem = { content: 'Remember to do this' };
    expect(item.content).toBe('Remember to do this');
  });

  it('should accept optional source', () => {
    const item: InboxItem = {
      content: 'Feature idea',
      source: 'triage',
    };
    expect(item.source).toBe('triage');
  });

  it('should accept optional date', () => {
    const item: InboxItem = {
      content: 'Backlog item',
      addedAt: '2024-01-01T00:00:00Z',
    };
    expect(item.addedAt).toBe('2024-01-01T00:00:00Z');
  });
});

describe('formatTask', () => {
  it('should format task without id', () => {
    const task: TaskItem = {
      content: 'Simple task',
      status: 'pending',
    };
    expect(formatTask(task)).toBe('○ Simple task');
  });

  it('should format task with id', () => {
    const task: PhaseTodo = {
      id: 'SHAPE-1',
      content: 'Define the hill',
      status: 'in_progress',
    };
    expect(formatTask(task)).toBe('◐ [SHAPE-1] Define the hill');
  });

  it('should format completed task', () => {
    const task: PhaseTodo = {
      id: 'SCOPE-3',
      content: 'Done task',
      status: 'completed',
    };
    expect(formatTask(task)).toBe('✓ [SCOPE-3] Done task');
  });
});

describe('formatTaskList', () => {
  it('should format empty list', () => {
    expect(formatTaskList([])).toBe('');
  });

  it('should format list without header', () => {
    const tasks: PhaseTodo[] = [
      { id: '1', content: 'Task 1', status: 'pending' },
      { id: '2', content: 'Task 2', status: 'completed' },
    ];
    expect(formatTaskList(tasks)).toBe('○ [1] Task 1\n✓ [2] Task 2');
  });

  it('should format list with header', () => {
    const tasks: PhaseTodo[] = [
      { id: '1', content: 'Task 1', status: 'pending' },
    ];
    const result = formatTaskList(tasks, 'SHAPE Phase Tasks:');
    expect(result).toBe('SHAPE Phase Tasks:\n\n○ [1] Task 1');
  });
});