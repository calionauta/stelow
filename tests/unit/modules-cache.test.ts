import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheManager, MapCache } from '../../extensions/cali-product-workflow/modules/cache';

describe('CacheManager', () => {
  describe('without file sync', () => {
    it('should start empty', () => {
      const cache = new CacheManager<string>();
      expect(cache.get()).toBeNull();
      expect(cache.isEmpty()).toBe(true);
      expect(cache.hasData()).toBe(false);
    });

    it('should store and retrieve data', () => {
      const cache = new CacheManager<string>();
      cache.set('hello');
      expect(cache.get()).toBe('hello');
      expect(cache.isEmpty()).toBe(false);
      expect(cache.hasData()).toBe(true);
    });

    it('should overwrite previous data', () => {
      const cache = new CacheManager<number>();
      cache.set(1);
      cache.set(2);
      expect(cache.get()).toBe(2);
    });

    it('should clear data', () => {
      const cache = new CacheManager<string>();
      cache.set('data');
      cache.clear();
      expect(cache.get()).toBeNull();
      expect(cache.isEmpty()).toBe(true);
    });

    it('should return false for hasData when no file loader', () => {
      const cache = new CacheManager<string>();
      expect(cache.hasData()).toBe(false);
    });
  });

  describe('with file sync', () => {
    it('should load from file when memory is empty', () => {
      const loader = vi.fn().mockReturnValue('from-file');
      const cache = new CacheManager<string>(loader);
      expect(cache.get()).toBe('from-file');
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should not call loader when data is in memory', () => {
      const loader = vi.fn().mockReturnValue('from-file');
      const cache = new CacheManager<string>(loader);
      cache.set('in-memory');
      loader.mockClear();
      expect(cache.get()).toBe('in-memory');
      expect(loader).not.toHaveBeenCalled();
    });

    it('should call saver on set', () => {
      const saver = vi.fn();
      const cache = new CacheManager<string>(undefined, saver);
      cache.set('data');
      expect(saver).toHaveBeenCalledWith('data');
    });

    it('should not call saver when no saver provided', () => {
      const cache = new CacheManager<string>();
      expect(() => cache.set('data')).not.toThrow();
    });

    it('should clear memory but not call file saver', () => {
      const saver = vi.fn();
      const cache = new CacheManager<string>(undefined, saver);
      cache.set('data');
      saver.mockClear();
      cache.clear();
      expect(cache.get()).toBeNull();
      expect(saver).not.toHaveBeenCalled();
    });

    it('should report hasData=true when file has data', () => {
      const loader = vi.fn().mockReturnValue('from-file');
      const cache = new CacheManager<string>(loader);
      expect(cache.hasData()).toBe(true);
    });

    it('should report hasData=false when file returns null', () => {
      const loader = vi.fn().mockReturnValue(null);
      const cache = new CacheManager<string>(loader);
      expect(cache.hasData()).toBe(false);
    });

    it('should report hasData=true when memory has data', () => {
      const loader = vi.fn().mockReturnValue(null);
      const cache = new CacheManager<string>(loader);
      cache.set('in-memory');
      expect(cache.hasData()).toBe(true);
    });

    it('should cache file load result in memory', () => {
      const loader = vi.fn().mockReturnValue('from-file');
      const cache = new CacheManager<string>(loader);
      cache.get(); // loads from file
      cache.get(); // should use memory
      expect(loader).toHaveBeenCalledTimes(1);
    });
  });
});

describe('MapCache', () => {
  let cache: MapCache<string, number>;

  beforeEach(() => {
    cache = new MapCache<string, number>();
  });

  it('should get undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should store and retrieve values', () => {
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('should report has correctly', () => {
    expect(cache.has('a')).toBe(false);
    cache.set('a', 1);
    expect(cache.has('a')).toBe(true);
  });

  it('should delete entries', () => {
    cache.set('a', 1);
    expect(cache.delete('a')).toBe(true);
    expect(cache.has('a')).toBe(false);
  });

  it('should return false when deleting non-existent key', () => {
    expect(cache.delete('missing')).toBe(false);
  });

  it('should clear all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('should report correct size', () => {
    expect(cache.size()).toBe(0);
    cache.set('a', 1);
    expect(cache.size()).toBe(1);
    cache.set('b', 2);
    expect(cache.size()).toBe(2);
  });

  it('should iterate keys', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    const keys = Array.from(cache.keys());
    expect(keys).toContain('a');
    expect(keys).toContain('b');
  });

  it('should iterate values', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    const values = Array.from(cache.values());
    expect(values).toContain(1);
    expect(values).toContain(2);
  });

  it('should iterate entries', () => {
    cache.set('a', 1);
    const entries = Array.from(cache.entries());
    expect(entries).toEqual([['a', 1]]);
  });

  it('should overwrite existing key', () => {
    cache.set('a', 1);
    cache.set('a', 2);
    expect(cache.get('a')).toBe(2);
    expect(cache.size()).toBe(1);
  });
});
