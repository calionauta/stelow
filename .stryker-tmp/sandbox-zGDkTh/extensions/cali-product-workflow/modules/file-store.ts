/**
 * FileStore - Generic file-based persistence
 * 
 * Provides a simple interface for reading/writing files.
 * Handles directory creation and file operations.
 * 
 * Usage:
 *   const store = new TextFileStore(cwd, '.cali-product-workflow/inbox/items.md');
 *   store.read();           // returns string
 *   store.write('content'); // writes to file
 */
// @ts-nocheck


import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Base file store interface.
 */
export interface IFileStore<T> {
  read(): T | null;
  write(data: T): void;
  path(): string;
  exists(): boolean;
}

/**
 * TextFileStore - Read/write plain text files
 */
export class TextFileStore implements IFileStore<string> {
  constructor(
    private readonly basePath: string,
    private readonly encoder: (data: string) => string = (s) => s,
    private readonly decoder: (data: string) => string = (s) => s
  ) {}

  path(): string {
    return this.basePath;
  }

  exists(): boolean {
    return existsSync(this.basePath);
  }

  read(): string | null {
    if (!this.exists()) return null;
    try {
      const raw = readFileSync(this.basePath, "utf-8");
      return this.decoder(raw);
    } catch {
      return null;
    }
  }

  write(data: string): void {
    const dir = dirname(this.basePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.basePath, this.encoder(data), "utf-8");
  }

  delete(): void {
    // Not implemented for safety
  }
}

/**
 * JsonFileStore - Read/write JSON files
 */
export class JsonFileStore<T extends object = object> implements IFileStore<T> {
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
    if (!this.exists()) return null;
    try {
      const content = readFileSync(this.basePath, "utf-8");
      return JSON.parse(content, this.reviver) as T;
    } catch {
      return null;
    }
  }

  write(data: T): void {
    const dir = dirname(this.basePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.basePath, JSON.stringify(data, this.replacer, 2), "utf-8");
  }

  delete(): void {
    // Not implemented for safety
  }
}

/**
 * MarkdownFileStore - Read/write markdown files with header support
 */
export class MarkdownFileStore implements IFileStore<string[]> {
  constructor(
    private readonly basePath: string,
    private readonly headerLine: string = "# Items"
  ) {}

  path(): string {
    return this.basePath;
  }

  exists(): boolean {
    return existsSync(this.basePath);
  }

  /**
   * Read items from markdown file.
   * Skips header line and empty lines.
   */
  read(): string[] {
    if (!this.exists()) return [];
    try {
      const content = readFileSync(this.basePath, "utf-8");
      return content
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => !line.startsWith("#"));
    } catch {
      return [];
    }
  }

  /**
   * Write items to markdown file with header.
   */
  write(items: string[]): void {
    const dir = dirname(this.basePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const header = `${this.headerLine}\n\n`;
    const content = items.length > 0 ? items.join("\n") + "\n" : "\n";
    writeFileSync(this.basePath, header + content, "utf-8");
  }

  delete(): void {
    // Not implemented for safety
  }
}

/**
 * Ensure directory exists.
 */
export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}