import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createGenericAdapter,
  type CLIAdapter,
  type NotificationType,
} from '../../extensions/cali-product-workflow/adapters/generic.js';
import {
  createEventDispatcher,
  type EventDispatcher,
} from '../../extensions/cali-product-workflow/adapters/event-dispatcher.js';

describe('Generic Adapter', () => {
  let adapter: CLIAdapter;

  beforeEach(() => {
    adapter = createGenericAdapter();
  });

  it('should have correct name', () => {
    expect(adapter.name).toBe('generic');
  });

  it('should return empty commands array', () => {
    const commands = adapter.registerCommands();
    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBe(0);
  });

  it('should return 4 basic tools with correct names', () => {
    const tools = adapter.getAvailableTools();
    expect(tools).toHaveLength(4);
    const names = tools.map(t => t.name);
    expect(names).toContain('read');
    expect(names).toContain('write');
    expect(names).toContain('bash');
    expect(names).toContain('edit');
  });

  it('should format notifications with type prefix', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    adapter.showNotification('hello', 'info');
    expect(consoleSpy).toHaveBeenCalledWith('[INFO] hello');
    consoleSpy.mockRestore();
  });

  it('should format error notifications with ERROR prefix', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    adapter.showNotification('fail', 'error');
    expect(consoleSpy).toHaveBeenCalledWith('[ERROR] fail');
    consoleSpy.mockRestore();
  });

  it('should format warning notifications with WARNING prefix', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    adapter.showNotification('careful', 'warning');
    expect(consoleSpy).toHaveBeenCalledWith('[WARNING] careful');
    consoleSpy.mockRestore();
  });

  it('should format success notifications with SUCCESS prefix', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    adapter.showNotification('done', 'success');
    expect(consoleSpy).toHaveBeenCalledWith('[SUCCESS] done');
    consoleSpy.mockRestore();
  });
});

describe('Event Dispatcher', () => {
  let adapter: CLIAdapter;
  let dispatcher: EventDispatcher;

  beforeEach(() => {
    adapter = createGenericAdapter();
    dispatcher = createEventDispatcher(adapter);
  });

  it('should emit session_start with cwd', () => {
    const handler = vi.fn();
    dispatcher.on('session_start', handler);
    dispatcher.dispatchSessionStart('/test/cwd');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: '/test/cwd' })
    );
  });

  it('should emit tool_call with tool and input', () => {
    const handler = vi.fn();
    dispatcher.on('tool_call', handler);
    dispatcher.dispatchToolCall('read', { path: '/test' }, '/cwd');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'read', input: { path: '/test' } })
    );
  });

  it('should emit turn_end with cwd', () => {
    const handler = vi.fn();
    dispatcher.on('turn_end', handler);
    dispatcher.dispatchTurnEnd('/cwd');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: '/cwd' })
    );
  });

  it('should emit input with text and sessionId', () => {
    const handler = vi.fn();
    dispatcher.on('input', handler);
    dispatcher.dispatchInput('hello', '/cwd', 'session-1');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'hello', sessionId: 'session-1' })
    );
  });

  it('should emit agent_end with sessionId', () => {
    const handler = vi.fn();
    dispatcher.on('agent_end', handler);
    dispatcher.dispatchAgentEnd('/cwd', 'session-123');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-123' })
    );
  });

  it('should unsubscribe handlers', () => {
    const handler = vi.fn();
    const unsubscribe = dispatcher.on('session_start', handler);
    dispatcher.dispatchSessionStart('/test');
    expect(handler).toHaveBeenCalledTimes(1);

    unsubscribe();
    dispatcher.dispatchSessionStart('/test2');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support multiple listeners on same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    dispatcher.on('session_start', handler1);
    dispatcher.on('session_start', handler2);
    dispatcher.dispatchSessionStart('/test');
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should clear listeners on dispose', () => {
    const handler = vi.fn();
    dispatcher.on('session_start', handler);
    dispatcher.dispose();
    dispatcher.dispatchSessionStart('/test');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should not throw when handler errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    dispatcher.on('session_start', () => { throw new Error('boom'); });
    expect(() => dispatcher.dispatchSessionStart('/test')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should pass cwd in turn_end dispatch', () => {
    const handler = vi.fn();
    dispatcher.on('turn_end', handler);
    dispatcher.dispatchTurnEnd('/my/project');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: '/my/project' })
    );
  });
});
