/**
 * Integration Tests: Event Dispatcher
 * 
 * Tests for EventDispatcher and createEventDispatcher():
 * - EventDispatcher.on() subscription
 * - Event routing to handlers
 * - Multi-handler support
 * - Dispatch methods
 * - Adapter integration
 * 
 * Reference: docs/2026-05-20/multi-cli-plan/plans/spec-tech_multi-cli-impl-v1.md
 */
// @ts-nocheck

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCLICapabilities } from '../../extensions/cali-product-workflow/types';
import { EventDispatcher, type EventType } from '../../extensions/cali-product-workflow/adapters/event-dispatcher';
import type { CLIAdapter } from '../../extensions/cali-product-workflow/adapters/cli-adapter';

// Helper to create a mock adapter for testing EventDispatcher
function createMockAdapter(cli: string): CLIAdapter {
  const caps = getCLICapabilities(cli as any);
  
  return {
    name: cli as any,
    capabilities: caps,
    registerCommands: () => [],
    getCommandPrefix: () => '/',
    onToolCall: () => {},
    onSessionStart: () => {},
    onTurnEnd: () => {},
    onInput: () => {},
    getAvailableTools: () => [],
    hasCapability: () => false,
    showNotification: () => {},
    showSelectList: async () => null,
    showStatusLine: () => {},
    clearStatusLine: () => {},
    initialize: () => {},
    dispose: () => {},
  };
}

// Factory function matching the real createEventDispatcher
function createEventDispatcherLocal(adapter: CLIAdapter): EventDispatcher {
  return new EventDispatcher(adapter);
}

describe('Event Dispatcher Integration Tests', () => {
  let adapter: CLIAdapter;
  let dispatcher: EventDispatcher;

  beforeEach(() => {
    adapter = createMockAdapter('generic');
    dispatcher = createEventDispatcherLocal(adapter);
  });

  afterEach(() => {
    dispatcher.dispose();
  });

  // ── EventDispatcher.on() Subscription Tests ───────────────────────

  describe('EventDispatcher.on() subscription', () => {
    it('subscribes to "tool_call" event', () => {
      const handler = vi.fn();
      const unsubscribe = dispatcher.on('tool_call', handler);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('subscribes to "session_start" event', () => {
      const handler = vi.fn();
      const unsubscribe = dispatcher.on('session_start', handler);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('subscribes to "turn_end" event', () => {
      const handler = vi.fn();
      const unsubscribe = dispatcher.on('turn_end', handler);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('subscribes to "input" event', () => {
      const handler = vi.fn();
      const unsubscribe = dispatcher.on('input', handler);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('subscribes to "agent_end" event', () => {
      const handler = vi.fn();
      const unsubscribe = dispatcher.on('agent_end', handler);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('returns unsubscribe function that removes handler', () => {
      const handler = vi.fn();
      const unsubscribe = dispatcher.on('tool_call', handler);
      
      // Dispatch should trigger handler
      dispatcher.dispatchToolCall('read', {}, '/tmp');
      expect(handler).toHaveBeenCalled();
      
      // Unsubscribe
      unsubscribe();
      
      // Clear mock and dispatch again - handler should not be called
      handler.mockClear();
      dispatcher.dispatchToolCall('write', {}, '/tmp');
      expect(handler).not.toHaveBeenCalled();
    });

    it('handles multiple calls to on() for same event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      
      dispatcher.on('tool_call', handler1);
      dispatcher.on('tool_call', handler2);
      dispatcher.on('tool_call', handler3);
      
      dispatcher.dispatchToolCall('read', {}, '/tmp');
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();
    });

    it('handles duplicate unsubscribe gracefully', () => {
      const handler = vi.fn();
      const unsubscribe = dispatcher.on('tool_call', handler);
      
      // First unsubscribe should work
      unsubscribe();
      
      // Second unsubscribe should not throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  // ── Event Routing to Handlers ──────────────────────────────────────

  describe('Event routing to handlers', () => {
    it('dispatches tool_call event to registered handler', () => {
      const handler = vi.fn();
      dispatcher.on('tool_call', handler);
      
      dispatcher.dispatchToolCall('read', { path: '/tmp' }, '/tmp');
      
      expect(handler).toHaveBeenCalledTimes(1);
      const [data] = handler.mock.calls[0];
      expect(data).toHaveProperty('tool', 'read');
      expect(data).toHaveProperty('input');
      expect(data).toHaveProperty('cwd', '/tmp');
    });

    it('dispatches session_start event to registered handler', () => {
      const handler = vi.fn();
      dispatcher.on('session_start', handler);
      
      dispatcher.dispatchSessionStart('/tmp', 'session-123');
      
      expect(handler).toHaveBeenCalledTimes(1);
      const [data] = handler.mock.calls[0];
      expect(data).toHaveProperty('cwd', '/tmp');
      expect(data).toHaveProperty('sessionId', 'session-123');
    });

    it('dispatches turn_end event to registered handler', () => {
      const handler = vi.fn();
      dispatcher.on('turn_end', handler);
      
      dispatcher.dispatchTurnEnd('/tmp', 'session-456');
      
      expect(handler).toHaveBeenCalledTimes(1);
      const [data] = handler.mock.calls[0];
      expect(data).toHaveProperty('cwd', '/tmp');
      expect(data).toHaveProperty('sessionId', 'session-456');
    });

    it('dispatches input event to registered handler', () => {
      const handler = vi.fn();
      dispatcher.on('input', handler);
      
      dispatcher.dispatchInput('Hello world', '/tmp', 'session-789');
      
      expect(handler).toHaveBeenCalledTimes(1);
      const [data] = handler.mock.calls[0];
      expect(data).toHaveProperty('text', 'Hello world');
      expect(data).toHaveProperty('cwd', '/tmp');
      expect(data).toHaveProperty('sessionId', 'session-789');
    });

    it('dispatches agent_end event to registered handler', () => {
      const handler = vi.fn();
      dispatcher.on('agent_end', handler);
      
      dispatcher.dispatchAgentEnd('/tmp', 'session-final');
      
      expect(handler).toHaveBeenCalledTimes(1);
      const [data] = handler.mock.calls[0];
      expect(data).toHaveProperty('cwd', '/tmp');
      expect(data).toHaveProperty('sessionId', 'session-final');
    });

    it('passes correct data to tool_call handler', () => {
      const handler = vi.fn();
      dispatcher.on('tool_call', handler);
      
      const toolData = { path: '/tmp/test.ts' };
      dispatcher.dispatchToolCall('write', toolData, '/tmp');
      
      const [data] = handler.mock.calls[0];
      expect(data.tool).toBe('write');
      expect(data.input).toEqual(toolData);
      expect(data.cwd).toBe('/tmp');
    });

    it('calls handler with event data object', () => {
      const handler = vi.fn();
      dispatcher.on('session_start', handler);
      
      dispatcher.dispatchSessionStart('/project');
      
      const [data] = handler.mock.calls[0];
      expect(typeof data).toBe('object');
      expect(data).not.toBeNull();
    });
  });

  // ── Multi-Handler Support ─────────────────────────────────────────

  describe('Multi-handler support', () => {
    it('calls all handlers registered for same event', () => {
      const handlers = [vi.fn(), vi.fn(), vi.fn()];
      
      handlers.forEach(h => dispatcher.on('tool_call', h));
      
      dispatcher.dispatchToolCall('bash', {}, '/tmp');
      
      handlers.forEach(h => expect(h).toHaveBeenCalledTimes(1));
    });

    it('handlers receive same event data', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      dispatcher.on('input', handler1);
      dispatcher.on('input', handler2);
      
      dispatcher.dispatchInput('test input', '/tmp');
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      
      const [data1] = handler1.mock.calls[0];
      const [data2] = handler2.mock.calls[0];
      
      expect(data1).toEqual(data2);
    });

    it('handler errors do not prevent other handlers', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();
      
      dispatcher.on('tool_call', errorHandler);
      dispatcher.on('tool_call', normalHandler);
      
      // Should not throw
      expect(() => dispatcher.dispatchToolCall('read', {}, '/tmp')).not.toThrow();
      
      // Normal handler should still be called
      expect(normalHandler).toHaveBeenCalled();
    });

    it('errors are logged but not thrown', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Test error');
      });
      
      dispatcher.on('tool_call', errorHandler);
      
      // Should not throw
      expect(() => dispatcher.dispatchToolCall('read', {}, '/tmp')).not.toThrow();
    });

    it('selective unsubscription works with multiple handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      
      const unsub1 = dispatcher.on('tool_call', handler1);
      dispatcher.on('tool_call', handler2);
      const unsub3 = dispatcher.on('tool_call', handler3);
      
      // Unsubscribe handler1 and handler3
      unsub1();
      unsub3();
      
      dispatcher.dispatchToolCall('read', {}, '/tmp');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(handler3).not.toHaveBeenCalled();
    });

    it('can register up to 10 handlers for same event', () => {
      const handlers = Array.from({ length: 10 }, () => vi.fn());
      
      handlers.forEach(h => dispatcher.on('tool_call', h));
      
      dispatcher.dispatchToolCall('read', {}, '/tmp');
      
      handlers.forEach(h => expect(h).toHaveBeenCalledTimes(1));
    });
  });

  // ── Event Types ───────────────────────────────────────────────────

  describe('Event types', () => {
    const eventTypes: EventType[] = [
      'session_start',
      'tool_call',
      'turn_end',
      'input',
      'agent_end',
      'pre_compact',
    ];

    it('accepts all valid event types', () => {
      for (const type of eventTypes) {
        const handler = vi.fn();
        expect(() => dispatcher.on(type, handler)).not.toThrow();
      }
    });

    it('subscribes to pre_compact event', () => {
      const handler = vi.fn();
      const unsubscribe = dispatcher.on('pre_compact', handler);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('dispatch methods exist for each event type', () => {
      expect(typeof dispatcher.dispatchSessionStart).toBe('function');
      expect(typeof dispatcher.dispatchToolCall).toBe('function');
      expect(typeof dispatcher.dispatchTurnEnd).toBe('function');
      expect(typeof dispatcher.dispatchInput).toBe('function');
      expect(typeof dispatcher.dispatchAgentEnd).toBe('function');
    });
  });

  // ── Adapter Integration ───────────────────────────────────────────

  describe('Adapter integration', () => {
    it('dispatcher exposes adapter via getter', () => {
      expect(dispatcher.adapter).toBe(adapter);
    });

    it('creates dispatcher with EventDispatcher constructor', () => {
      const newAdapter = createMockAdapter('generic');
      const newDispatcher = new EventDispatcher(newAdapter);
      
      expect(newDispatcher).toBeInstanceOf(EventDispatcher);
      expect(newDispatcher.adapter).toBe(newAdapter);
      
      newDispatcher.dispose();
    });

    it('dispatcher works with pi adapter', () => {
      const piAdapter = createMockAdapter('pi');
      const piDispatcher = new EventDispatcher(piAdapter);
      
      const handler = vi.fn();
      piDispatcher.on('tool_call', handler);
      
      piDispatcher.dispatchToolCall('read', {}, '/tmp');
      
      expect(handler).toHaveBeenCalled();
      
      piDispatcher.dispose();
    });

    it('dispatcher works with opencode adapter', () => {
      const opencodeAdapter = createMockAdapter('opencode');
      const opencodeDispatcher = new EventDispatcher(opencodeAdapter);
      
      const handler = vi.fn();
      opencodeDispatcher.on('tool_call', handler);
      
      opencodeDispatcher.dispatchToolCall('write', {}, '/tmp');
      
      expect(handler).toHaveBeenCalled();
      
      opencodeDispatcher.dispose();
    });

    it('dispatcher works with claude-code adapter', () => {
      const ccAdapter = createMockAdapter('claude-code');
      const ccDispatcher = new EventDispatcher(ccAdapter);
      
      const handler = vi.fn();
      ccDispatcher.on('tool_call', handler);
      
      ccDispatcher.dispatchToolCall('bash', {}, '/tmp');
      
      expect(handler).toHaveBeenCalled();
      
      ccDispatcher.dispose();
    });

    it('dispatcher works with codex adapter', () => {
      const codexAdapter = createMockAdapter('codex');
      const codexDispatcher = new EventDispatcher(codexAdapter);
      
      const handler = vi.fn();
      codexDispatcher.on('tool_call', handler);
      
      codexDispatcher.dispatchToolCall('edit', {}, '/tmp');
      
      expect(handler).toHaveBeenCalled();
      
      codexDispatcher.dispose();
    });
  });

  // ── Lifecycle ───────────────────────────────────────────────────────

  describe('Lifecycle', () => {
    it('dispose() clears all listeners', () => {
      const handlers = [vi.fn(), vi.fn(), vi.fn()];
      handlers.forEach(h => dispatcher.on('tool_call', h));
      
      dispatcher.dispose();
      
      dispatcher.dispatchToolCall('read', {}, '/tmp');
      
      handlers.forEach(h => expect(h).not.toHaveBeenCalled());
    });

    it('dispose() can be called multiple times', () => {
      expect(() => dispatcher.dispose()).not.toThrow();
      expect(() => dispatcher.dispose()).not.toThrow();
    });

    it('dispatcher is functional before dispose', () => {
      const handler = vi.fn();
      dispatcher.on('tool_call', handler);
      
      dispatcher.dispatchToolCall('read', {}, '/tmp');
      expect(handler).toHaveBeenCalled();
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles empty string event data', () => {
      const handler = vi.fn();
      dispatcher.on('input', handler);
      
      dispatcher.dispatchInput('', '/tmp');
      
      expect(handler).toHaveBeenCalled();
      const [data] = handler.mock.calls[0];
      expect(data.text).toBe('');
    });

    it('handles undefined sessionId', () => {
      const handler = vi.fn();
      dispatcher.on('session_start', handler);
      
      dispatcher.dispatchSessionStart('/tmp');
      
      expect(handler).toHaveBeenCalled();
      const [data] = handler.mock.calls[0];
      expect(data.sessionId).toBeUndefined();
    });

    it('handles null input', () => {
      const handler = vi.fn();
      dispatcher.on('tool_call', handler);
      
      dispatcher.dispatchToolCall('read', null, '/tmp');
      
      expect(handler).toHaveBeenCalled();
      const [data] = handler.mock.calls[0];
      expect(data.input).toBeNull();
    });

    it('handles complex nested input data', () => {
      const handler = vi.fn();
      dispatcher.on('tool_call', handler);
      
      const complexInput = {
        path: '/tmp',
        options: { recursive: true, encoding: 'utf-8' },
        metadata: { created: new Date().toISOString() },
      };
      
      dispatcher.dispatchToolCall('read', complexInput, '/tmp');
      
      expect(handler).toHaveBeenCalled();
      const [data] = handler.mock.calls[0];
      expect(data.input).toEqual(complexInput);
    });

    it('does not call handlers registered after dispatch', () => {
      const handler = vi.fn();
      
      dispatcher.dispatchToolCall('read', {}, '/tmp');
      // Register after dispatch
      dispatcher.on('tool_call', handler);
      
      // Should not have been called yet
      expect(handler).not.toHaveBeenCalled();
    });

    it('handler receives data as single argument', () => {
      const handler = vi.fn();
      dispatcher.on('tool_call', handler);
      
      dispatcher.dispatchToolCall('read', { path: '/test' }, '/tmp');
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'read',
          input: { path: '/test' },
          cwd: '/tmp',
        })
      );
    });
  });

  // ── Async Handler Support ─────────────────────────────────────────

  describe('Async handler support', () => {
    it('handles async handler', async () => {
      const asyncHandler = vi.fn().mockResolvedValue(undefined);
      dispatcher.on('tool_call', asyncHandler);
      
      await dispatcher.dispatchToolCall('read', {}, '/tmp');
      
      expect(asyncHandler).toHaveBeenCalled();
    });

    it('handles multiple async handlers', async () => {
      const asyncHandler1 = vi.fn().mockResolvedValue(undefined);
      const asyncHandler2 = vi.fn().mockResolvedValue(undefined);
      
      dispatcher.on('tool_call', asyncHandler1);
      dispatcher.on('tool_call', asyncHandler2);
      
      await dispatcher.dispatchToolCall('read', {}, '/tmp');
      
      expect(asyncHandler1).toHaveBeenCalled();
      expect(asyncHandler2).toHaveBeenCalled();
    });
  });
});