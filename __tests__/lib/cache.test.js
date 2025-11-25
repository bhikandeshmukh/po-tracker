// __tests__/lib/cache.test.js
import cache from '../../lib/cache';

describe('Cache', () => {
    beforeEach(() => {
        cache.clear();
    });

    afterEach(() => {
        cache.clear();
    });

    it('should set and get values', () => {
        cache.set('key1', 'value1');
        expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
        expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
        cache.set('key1', 'value1');
        expect(cache.has('key1')).toBe(true);
        expect(cache.has('key2')).toBe(false);
    });

    it('should delete values', () => {
        cache.set('key1', 'value1');
        cache.delete('key1');
        expect(cache.has('key1')).toBe(false);
    });

    it('should expire values after TTL', (done) => {
        cache.set('key1', 'value1', 100); // 100ms TTL
        
        setTimeout(() => {
            expect(cache.has('key1')).toBe(false);
            done();
        }, 150);
    });

    it('should return cache size', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        expect(cache.size()).toBe(2);
    });

    it('should clear all values', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.clear();
        expect(cache.size()).toBe(0);
    });
});
