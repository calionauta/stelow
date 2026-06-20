/**
 * Verify Runner - Async execution of verify commands
 *
 * Runs shell commands with a timeout and returns structured results.
 * Used by the extension's onTurnEnd handler when a checkpoint
 * has status "waiting_verify".
 *
 * Does NOT use execSync — uses async exec with Promise wrapper
 * so the event loop is not blocked.
 *
 * Usage:
 *   import { runVerifyCommands } from "../modules/verify-runner";
 *   const results = await runVerifyCommands(["go test ./...", "npm run lint"]);
 *   results.forEach(r => console.log(r.passed, r.command));
 */

import { exec } from "node:child_process";

export interface VerifyResult {
  command: string;
  passed: boolean;
  output: string;
}

export interface RunOptions {
  /** Per-command timeout in ms (default: 120000) */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Run verify commands sequentially and return structured results.
 *
 * Each command is run with a timeout. If the command times out or
 * exits non-zero, it is marked as failed with the error output.
 *
 * Commands run sequentially to avoid resource contention.
 *
 * @param commands  - Array of shell command strings
 * @param options   - Optional timeout overrides
 * @returns Array of VerifyResult (one per command)
 */
export async function runVerifyCommands(
  commands: string[],
  options?: RunOptions
): Promise<VerifyResult[]> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const results: VerifyResult[] = [];

  for (const cmd of commands) {
    try {
      const output = await execWithTimeout(cmd, timeoutMs);
      results.push({ command: cmd, passed: true, output: output.trim() });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ command: cmd, passed: false, output: msg });
    }
  }

  return results;
}

/**
 * Execute a command with a timeout and capture stdout+stderr.
 *
 * Resolves with stdout on success (exit code 0).
 * Rejects with stderr or error message on failure.
 */
function execWithTimeout(
  command: string,
  timeoutMs: number
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = exec(
      command,
      { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, // 1MB output cap
      (error, stdout, stderr) => {
        if (error) {
          // Killed by timeout
          if (error.killed) {
            reject(new Error(`Timed out after ${timeoutMs}ms`));
            return;
          }
          // Non-zero exit — include stderr (truncated to 2000 chars)
          reject(new Error(stderr.slice(0, 2000) || error.message));
          return;
        }
        // Success — include stderr as suffix if present (e.g. warnings)
        const stderrTrimmed = stderr.trim();
        const combined = stderrTrimmed
          ? stdout + "\n--- stderr ---\n" + stderrTrimmed
          : stdout;
        resolve(combined);
      }
    );

    // Unref so the process doesn't keep the extension alive
    child.unref();
  });
}
