/**
 * Integration tests: safeHook error containment (G1A from stelow-reliability plan)
 *
 * Plan called for "A + C" — wrap each hook in try/catch (A, done in
 * safe-hook.ts) AND integration test that verifies behavior in a
 * realistic hook chain (C). This file is the C part.
 *
 * These tests exercise the actual safeHook function (not source-grep)
 * to verify runtime behavior:
 *  - A throw in one wrapped hook does NOT throw out of the hook call
 *  - The error is logged with the hook name (so operators can debug)
 *  - The wrapper returns `undefined` (Pi's "allow" signal)
 *  - For tool_call hooks returning `{ block: true, reason }`, the
 *    wrapper preserves the return shape on success and short-circuits
 *    to `undefined` on throw
 *  - When multiple hooks are wrapped in a chain, a throw in one does
 *    NOT prevent siblings from executing
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeHook } from '../../extensions/stelow/safe-hook';

describe('safeHook — error containment (integration)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns the original return value on success', async () => {
    const hook = safeHook('input', async (_event: unknown, _ctx: unknown) => {
      return { ok: true };
    });
    const result = await hook({ text: 'hello' }, { ui: null });
    expect(result).toEqual({ ok: true });
  });

  it('returns undefined when the hook throws synchronously', async () => {
    const hook = safeHook('session_start', () => {
      throw new Error('boom');
    });
    const result = await hook({}, {});
    expect(result).toBeUndefined();
  });

  it('returns undefined when the hook rejects asynchronously', async () => {
    const hook = safeHook('tool_call', async () => {
      throw new Error('async boom');
    });
    const result = await hook({ toolName: 'x' }, { cwd: '/tmp' });
    expect(result).toBeUndefined();
  });

  it('logs the error with the hook name (so operators can attribute failures)', async () => {
    const hook = safeHook('agent_end', async () => {
      throw new Error('test failure');
    });
    await hook({}, {});

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const [firstArg, secondArg] = consoleErrorSpy.mock.calls[0];
    expect(firstArg).toBe("[stelow] hook 'agent_end' threw:");
    expect(secondArg).toBe('test failure');
  });

  it('preserves the tool_call return shape `{ block: true, reason }` on success', async () => {
    const hook = safeHook('tool_call', async () => {
      return { block: true, reason: 'denied by guard' };
    });
    const result = await hook({ toolName: 'ask' }, { cwd: '/tmp' });
    expect(result).toEqual({ block: true, reason: 'denied by guard' });
  });

  it('does NOT return a block on throw (a throwing guard must not block)', async () => {
    // Important security property: if the guard itself throws, the
    // wrapped hook returns undefined (allow), NOT a block. The plan
    // calls this out: "log error + return allow".
    const hook = safeHook('tool_call', async () => {
      throw new Error('guard evaluation failed');
    });
    const result = await hook({ toolName: 'x' }, {});
    expect(result).toBeUndefined();
  });

  it('forwards all arguments to the wrapped function', async () => {
    const inner = vi.fn(async () => 'ok');
    const hook = safeHook('turn_end', inner);
    const event = { type: 'end' };
    const ctx = { cwd: '/foo' };
    await hook(event, ctx);
    expect(inner).toHaveBeenCalledWith(event, ctx);
  });

  it('one throwing hook does not prevent siblings in a chain', async () => {
    // Simulate Pi running 5 hooks in parallel. One throws, others
    // succeed independently.
    const good1 = safeHook('input', async () => 'good-1');
    const bad = safeHook('session_start', async () => { throw new Error('crash'); });
    const good2 = safeHook('tool_call', async () => 'good-2');
    const good3 = safeHook('turn_end', async () => 'good-3');
    const good4 = safeHook('agent_end', async () => 'good-4');

    // Mimic Pi's parallel invocation: all 5 hooks fire concurrently
    const results = await Promise.all([
      good1({}, {}),
      bad({}, {}),
      good2({}, {}),
      good3({}, {}),
      good4({}, {}),
    ]);

    // 4 succeed, 1 returns undefined (the throwing one)
    expect(results[0]).toBe('good-1');
    expect(results[1]).toBeUndefined(); // throwing hook — allowed through
    expect(results[2]).toBe('good-2');
    expect(results[3]).toBe('good-3');
    expect(results[4]).toBe('good-4');
  });

  it('error message includes the original Error message (not the wrapper stack)', async () => {
    const hook = safeHook('input', async () => {
      throw new Error('original cause');
    });
    await hook({}, {});
    // The console.error must log the original message, not the wrapper's
    expect(consoleErrorSpy.mock.calls[0][1]).toBe('original cause');
  });

  it('handles non-Error throw values gracefully (string, object, undefined)', async () => {
    // Some buggy hooks might throw non-Error values. The wrapper
    // stringifies them so the operator still sees something.
    const hook1 = safeHook('input', async () => { throw 'plain string error'; });
    const hook2 = safeHook('session_start', async () => { throw { code: 42 }; });
    const hook3 = safeHook('tool_call', async () => { throw undefined; });

    await hook1({}, {});
    await hook2({}, {});
    await hook3({}, {});

    expect(consoleErrorSpy.mock.calls[0][1]).toBe('plain string error');
    // For object throws, the wrapper outputs the value itself
    expect(consoleErrorSpy.mock.calls[1][1]).toEqual({ code: 42 });
    // For undefined throws, the wrapper outputs the value
    expect(consoleErrorSpy.mock.calls[2][1]).toBeUndefined();
  });
});