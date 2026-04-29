import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSloganSelector } from '../src/lib/slogan-selector';

describe('createSloganSelector', () => {
    it('returns slogans in sequence mode and wraps back to the start', () => {
        const selector = createSloganSelector('sequence', ['alpha', 'beta', 'gamma']);

        assert.deepStrictEqual(selector.next(), { index: 0, text: 'alpha' });
        assert.deepStrictEqual(selector.next(), { index: 1, text: 'beta' });
        assert.deepStrictEqual(selector.next(), { index: 2, text: 'gamma' });
        assert.deepStrictEqual(selector.next(), { index: 0, text: 'alpha' });
    });

    it('never repeats the same slogan consecutively in random mode when there are multiple slogans', () => {
        const selector = createSloganSelector('random', ['x', 'y', 'z']);
        let previous = selector.next().text;

        for (let index = 0; index < 32; index += 1) {
            const current = selector.next().text;
            assert.notStrictEqual(current, previous);
            previous = current;
        }
    });
});
