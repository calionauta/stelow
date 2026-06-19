/**
 * CacheManager - Generic in-memory cache with file persistence
 *
 * @example
 * ```typescript
 * const cache = new CacheManager<PhaseTodo[]>(
 *   () => readFromFile(),      // optional load
 *   (data) => writeToFile(data) // optional save
 * );
 * cache.set([...]);  // saves to file if save callback provided
 * const todos = cache.get();  // from memory or falls back to file
 * ```
 */

export interface ICacheManager<T> {
  get(): T | null;
  set(data: T): void;
  clear(): void;
  isEmpty(): boolean;
}

/**
 * Simple generic cache manager.
 * Stores data in memory, optionally syncs to file.
 */
export class CacheManager<T> implements ICacheManager<T> {
  private _data: T | null = null;
  private readonly _loadFromFile?: () => T | null;
  private readonly _saveToFile?: (data: T) => void;

  /**
   * Create a cache manager.
   * 
   * @param loadFromFile - Optional function to load data from file
   * @param saveToFile - Optional function to save data to file
   */
  constructor(loadFromFile?: () => T | null, saveToFile?: (data: T) => void) {
    this._loadFromFile = loadFromFile;
    this._saveToFile = saveToFile;
  }

  /**
   * Get data from cache or file.
   */
  get(): T | null {
    if (this._data !== null) return this._data;
    if (this._loadFromFile) {
      this._data = this._loadFromFile();
    }
    return this._data;
  }

  /**
   * Set data in cache and optionally persist to file.
   */
  set(data: T): void {
    this._data = data;
    if (this._saveToFile) {
      this._saveToFile(data);
    }
  }

  /**
   * Clear cache and optionally file.
   */
  clear(): void {
    this._data = null;
    // Note: File clearing is optional and should be done explicitly
  }

  /**
   * Check if cache is empty.
   */
  isEmpty(): boolean {
    return this._data === null;
  }

  /**
   * Check if cache has data (including from file).
   */
  hasData(): boolean {
    if (this._data !== null) return true;
    if (this._loadFromFile) {
      const fromFile = this._loadFromFile();
      return fromFile !== null;
    }
    return false;
  }
}

/**
 * Map-based cache for multiple items.
 */
export class MapCache<K, V> {
  private readonly _map: Map<K, V> = new Map();

  get(key: K): V | undefined {
    return this._map.get(key);
  }

  set(key: K, value: V): void {
    this._map.set(key, value);
  }

  has(key: K): boolean {
    return this._map.has(key);
  }

  delete(key: K): boolean {
    return this._map.delete(key);
  }

  clear(): void {
    this._map.clear();
  }

  keys(): IterableIterator<K> {
    return this._map.keys();
  }

  values(): IterableIterator<V> {
    return this._map.values();
  }

  entries(): IterableIterator<[K, V]> {
    return this._map.entries();
  }

  size(): number {
    return this._map.size;
  }
}