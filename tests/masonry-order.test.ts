import { masonryColumnCount, toColumnMajorOrder } from '../src/lib/masonry-order';

describe('toColumnMajorOrder', () => {
    it('returns a copy unchanged for a single column', () => {
        const items = [0, 1, 2, 3];
        expect(toColumnMajorOrder(items, 1)).toEqual([0, 1, 2, 3]);
        expect(toColumnMajorOrder(items, 1)).not.toBe(items);
    });

    it('interleaves for two columns so CSS columns read left-to-right', () => {
        // DOM order for columns fill → visual:
        // 0 1
        // 2 3
        // 4 5
        expect(toColumnMajorOrder([0, 1, 2, 3, 4, 5], 2)).toEqual([0, 2, 4, 1, 3, 5]);
    });

    it('handles odd lengths', () => {
        expect(toColumnMajorOrder(['a', 'b', 'c', 'd', 'e'], 2)).toEqual(['a', 'c', 'e', 'b', 'd']);
    });

    it('handles empty and single-item lists', () => {
        expect(toColumnMajorOrder([], 2)).toEqual([]);
        expect(toColumnMajorOrder([42], 2)).toEqual([42]);
    });
});

describe('masonryColumnCount', () => {
    it('maps the single-column media query to 1, otherwise 2', () => {
        expect(masonryColumnCount(true)).toBe(1);
        expect(masonryColumnCount(false)).toBe(2);
    });
});
