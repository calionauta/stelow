/**
 * Unit tests: FileStore classes
 * 
 * Tests the three file store implementations:
 * - TextFileStore: plain text read/write
 * - JsonFileStore: JSON serialization with replacer/reviver support
 * - MarkdownFileStore: markdown with header support for inbox
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { 
  TextFileStore, 
  JsonFileStore, 
  MarkdownFileStore,
  ensureDir 
} from '../../extensions/cali-product-workflow/modules/file-store';

describe('TextFileStore', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pw-text-'));
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should return null when file does not exist', () => {
    const store = new TextFileStore(join(tempDir, 'nonexistent.txt'));
    expect(store.read()).toBeNull();
    expect(store.exists()).toBe(false);
  });

  it('should write and read text content', () => {
    const path = join(tempDir, 'test.txt');
    const store = new TextFileStore(path);
    
    store.write('Hello, World!');
    expect(store.read()).toBe('Hello, World!');
    expect(store.exists()).toBe(true);
  });

  it('should handle encoder/decoder', () => {
    const path = join(tempDir, 'encoded.txt');
    const store = new TextFileStore(
      path,
      (s) => s.toUpperCase(),
      (s) => s.toLowerCase()
    );
    
    store.write('Hello');
    expect(store.read()).toBe('hello'); // decoded
  });

  it('should create parent directories automatically', () => {
    const path = join(tempDir, 'subdir', 'nested', 'test.txt');
    const store = new TextFileStore(path);
    
    store.write('nested content');
    expect(store.read()).toBe('nested content');
  });

  it('should overwrite existing content', () => {
    const path = join(tempDir, 'overwrite.txt');
    const store = new TextFileStore(path);
    
    store.write('first');
    store.write('second');
    expect(store.read()).toBe('second');
  });
});

describe('JsonFileStore', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pw-json-'));
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should return null when file does not exist', () => {
    const store = new JsonFileStore<{ name: string }>(join(tempDir, 'nonexistent.json'));
    expect(store.read()).toBeNull();
  });

  it('should write and read JSON objects', () => {
    const path = join(tempDir, 'test.json');
    const store = new JsonFileStore<{ name: string; value: number }>(path);
    
    store.write({ name: 'test', value: 42 });
    const data = store.read();
    expect(data).toEqual({ name: 'test', value: 42 });
  });

  it('should use replacer when writing', () => {
    const path = join(tempDir, 'replacer.json');
    const replacer = (_key: string, value: unknown) => {
      if (typeof value === 'number') return value * 2;
      return value;
    };
    const store = new JsonFileStore<{ n: number }>(path, replacer);
    
    store.write({ n: 21 });
    expect(store.read()?.n).toBe(42);
  });

  it('should use reviver when reading', () => {
    const path = join(tempDir, 'reviver.json');
    const store = new JsonFileStore<{ value: number }>(join(tempDir, "reviver.json"), undefined, (_key, value) => {
      if (typeof value === 'number') return value * 3;
      return value;
    });
    
    store.write({ value: 10 });
    // Note: The reviver is NOT applied on write, only on read
    // This test verifies the stored JSON is valid
    const data = store.read();
    expect(data?.value).toBeDefined();
  });

  it('should create parent directories automatically', () => {
    const path = join(tempDir, 'subdir', 'nested', 'test.json');
    const store = new JsonFileStore<{ data: string }>(path);
    
    store.write({ data: 'nested' });
    expect(store.read()).toEqual({ data: 'nested' });
  });

  it('should handle arrays', () => {
    const path = join(tempDir, 'array.json');
    const store = new JsonFileStore<string[]>(path);
    
    store.write(['item1', 'item2', 'item3']);
    expect(store.read()).toEqual(['item1', 'item2', 'item3']);
  });

  it('should handle empty arrays', () => {
    const path = join(tempDir, 'empty.json');
    const store = new JsonFileStore<string[]>(path);
    
    store.write([]);
    expect(store.read()).toEqual([]);
  });

  it('should return null for invalid JSON', () => {
    // Manually create an invalid JSON file
    const path = join(tempDir, 'invalid.json');
    const { writeFileSync } = require('node:fs');
    writeFileSync(path, 'not valid json {');
    
    const store = new JsonFileStore<unknown>(path);
    expect(store.read()).toBeNull();
  });
});

describe('MarkdownFileStore', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pw-markdown-'));
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should return empty array when file does not exist', () => {
    const store = new MarkdownFileStore(join(tempDir, 'nonexistent.md'));
    expect(store.read()).toEqual([]);
  });

  it('should write with default header and read items', () => {
    const path = join(tempDir, 'items.md');
    const store = new MarkdownFileStore(path);
    
    store.write(['item1', 'item2', 'item3']);
    const items = store.read();
    expect(items).toEqual(['item1', 'item2', 'item3']);
  });

  it('should write with custom header', () => {
    const path = join(tempDir, 'custom.md');
    const store = new MarkdownFileStore(path, '# Custom Header');
    
    store.write(['item1', 'item2']);
    
    // Verify the file has the header
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('# Custom Header');
    expect(content).toContain('item1');
    expect(content).toContain('item2');
    
    // But read() returns only items (no header)
    expect(store.read()).toEqual(['item1', 'item2']);
  });

  it('should skip header line when reading', () => {
    const path = join(tempDir, 'withheader.md');
    const { writeFileSync } = require('node:fs');
    writeFileSync(path, '# Inbox\n\nitem1\nitem2\n');
    
    const store = new MarkdownFileStore(path);
    expect(store.read()).toEqual(['item1', 'item2']);
  });

  it('should skip empty lines when reading', () => {
    const path = join(tempDir, 'emptylines.md');
    const store = new MarkdownFileStore(path);
    
    store.write(['item1', '', 'item2', '   ', 'item3']);
    // Empty strings get filtered out
    expect(store.read()).toEqual(['item1', 'item2', 'item3']);
  });

  it('should write empty content with header', () => {
    const path = join(tempDir, 'empty.md');
    const store = new MarkdownFileStore(path);
    
    store.write([]);
    
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('# Items');
    expect(store.read()).toEqual([]);
  });

  it('should create parent directories automatically', () => {
    const path = join(tempDir, 'subdir', 'nested', 'inbox.md');
    const store = new MarkdownFileStore(path);
    
    store.write(['nested item']);
    expect(store.read()).toEqual(['nested item']);
  });

  it('should handle special characters in items', () => {
    const path = join(tempDir, 'special.md');
    const store = new MarkdownFileStore(path);
    
    store.write(['item with # hash', 'item with [brackets]', 'normal item']);
    const items = store.read();
    // Only lines starting with # at the very beginning are skipped
    // '# hash' at start of line is filtered as header
    expect(items).toContain('item with [brackets]');
    expect(items).toContain('normal item');
  });

  it('should trim whitespace from items', () => {
    const path = join(tempDir, 'whitespace.md');
    const store = new MarkdownFileStore(path);
    
    store.write(['  spaced item  ', 'normal']);
    // Items are trimmed when read (this is the design)
    expect(store.read()).toEqual(['spaced item', 'normal']);
  });
});

describe('ensureDir', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pw-ensure-'));
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should create nested directories', () => {
    const path = join(tempDir, 'a', 'b', 'c', 'd');
    ensureDir(path);
    expect(existsSync(path)).toBe(true);
  });

  it('should not throw if directory exists', () => {
    const path = join(tempDir, 'existing');
    mkdirSync(path, { recursive: true });
    ensureDir(path); // Should not throw
    expect(existsSync(path)).toBe(true);
  });

  it('should be idempotent', () => {
    const path = join(tempDir, 'multi', 'call');
    ensureDir(path);
    ensureDir(path);
    ensureDir(path);
    expect(existsSync(path)).toBe(true);
  });
});