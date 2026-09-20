import { describe, expect, it } from 'vitest';
import { splitLatinText } from '../src/lib/text';

describe('text segmentation', () => {
    it('marks Latin words without losing surrounding text', () => {
        expect(splitLatinText('遊星 Wakusei 的 Blog')).toEqual([
            { text: '遊星 ', isLatin: false },
            { text: 'Wakusei', isLatin: true },
            { text: ' 的 ', isLatin: false },
            { text: 'Blog', isLatin: true }
        ]);
    });

    it('keeps apostrophes, dots, and hyphens inside Latin segments', () => {
        expect(splitLatinText("Vue.js user's guide-v2")).toEqual([
            { text: 'Vue.js', isLatin: true },
            { text: ' ', isLatin: false },
            { text: "user's", isLatin: true },
            { text: ' ', isLatin: false },
            { text: 'guide-v2', isLatin: true }
        ]);
    });
});
