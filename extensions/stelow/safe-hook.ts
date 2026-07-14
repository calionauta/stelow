/**
 * Hook error containment (G1A from stelow-reliability plan)
 *
 * Wraps a hook body so a throw inside one hook does not break the
 * user input stream or silently swallow errors. The wrapper logs to
 * console with the hook name and returns `undefined` (no block, no
 * reply) — Pi treats a missing return as "allow" and the user's
 * input is preserved. Each hook is wrapped individually so one
 * failing hook does not affect siblings.
 *
 * Extracted from extensions/stelow/index.ts so it can be:
 *  1. Unit-tested in isolation (this file's consumer is safe-hook.test.ts)
 *  2. Reused by any future hook that wants the same guarantee
 *
 * Convention over configuration:
 *  - Generic type `<T>` preserves the hook's full signature, including
 *    return type (e.g. `{ block: true, reason }` for tool_call).
 *  - Errors are logged but not rethrown — the Pi runtime would
 *    otherwise log the throw twice (once in console.error, once via
 *    the unhandled rejection). Returning `undefined` is the documented
 *    Pi "allow" signal.
 */

/**
 * Wraps a hook handler so any thrown error is caught, logged with
 * the hook's name, and converted to an "allow" return (`undefined`).
 *
 * @param name  - Hook event name (input, session_start, tool_call, turn_end, agent_end).
 *                Used in the error log so operators can attribute failures.
 * @param fn    - The original hook body.
 * @returns     - A function with the same signature as `fn` that
 *                swallows errors and returns `undefined` on failure.
 */
export function safeHook<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error(`[stelow] hook '${name}' threw:`, err instanceof Error ? err.message : err);
      return undefined;
    }
  }) as T;
}