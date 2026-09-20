/**
 * CSS `columns` fills top-to-bottom within each column, then left-to-right.
 * Given items in desired reading order (left→right, top→bottom), return the
 * DOM order that produces that layout under column-major fill.
 *
 * Example (2 cols): [0,1,2,3,4,5] → [0,2,4,1,3,5] so the page reads:
 *   0 1
 *   2 3
 *   4 5
 */
export function toColumnMajorOrder<T>(items: readonly T[], columnCount: number): T[] {
    if (columnCount <= 1 || items.length <= 1) {
        return items.slice();
    }

    const result: T[] = [];
    for (let col = 0; col < columnCount; col += 1) {
        for (let index = col; index < items.length; index += columnCount) {
            result.push(items[index] as T);
        }
    }
    return result;
}

/** Matches `.post-list--masonry` breakpoint in article.css */
export const MASONRY_SINGLE_COLUMN_MQ = '(max-width: 768px)';

export function masonryColumnCount(isSingleColumn: boolean): number {
    return isSingleColumn ? 1 : 2;
}
