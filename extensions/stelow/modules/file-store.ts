/**
 * JsonFileStore - Read/write JSON files with optional replacer/reviver
 *
 * Used by checkpoint.ts to persist ExecutionCheckpoint state.
 * The LLM writes via the store; the extension reads on turn_end to run verify.
 *
 * @example
 * ```typescript
 * const store = new JsonFileStore<ExecutionCheckpoint>(path);
 * const cp = store.read();
 * if (cp) store.write({ ...cp, status: "waiting_verify" });
 * ```
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * JSON file store with type-safe read/write.
 * Returns null when the file is missing or invalid (defensive for cold start).
 */
export class JsonFileStore<T extends object = object> {
  constructor(
    private readonly basePath: string,
    private readonly replacer?: (key: string, value: unknown) => unknown,
    private readonly reviver?: (key: string, value: unknown) => unknown
  ) {}

  path(): string {
    return this.basePath;
  }

  exists(): boolean {
    return existsSync(this.basePath);
  }

  read(): T | null {
    try {
      const content = readFileSync(this.basePath, "utf-8");
      return JSON.parse(content, this.reviver) as T;
    } catch {
      return null;
    }
  }

  write(data: T): void {
    const dir = dirname(this.basePath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(this.basePath, JSON.stringify(data, this.replacer, 2), "utf-8");
  }
}
