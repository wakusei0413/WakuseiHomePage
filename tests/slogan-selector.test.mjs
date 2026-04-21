import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSloganSelector } from '../js/slogan-selector.js';

describe('createSloganSelector', () => {
    it('sequence mode: returns slogans in order and wraps', () => {
        const slogans = ['alpha', 'beta', 'gamma'];
        const selector = createSloganSelector('sequence', slogans);
        assert.strictEqual(selector.next().text, 'alpha');
        assert.strictEqual(selector.next().text, 'beta');
        assert.strictEqual(selector.next().text, 'gamma');
        assert.strictEqual(selector.next().text, 'alpha');
    });

    it('sequence mode: tracks index starting at 0', () => {
        const slogans = ['a', 'b', 'c'];
        const selector = createSloganSelector('sequence', slogans);
        assert.strictEqual(selector.next().index, 0);
        assert.strictEqual(selector.next().index, 1);
        assert.strictEqual(selector.next().index, 2);
        assert.strictEqual(selector.next().index, 0);
    });

    it('random mode: never repeats the same slogan consecutively', () => {
        const slogans = ['x', 'y', 'z'];
        const selector = createSloganSelector('random', slogans);
        let prev = selector.next();
        for (let i = 0; i < 50; i++) {
            const curr = selector.next();
            assert.notStrictEqual(curr.text, prev.text);
            prev = curr;
        }
    });

    it('random mode: single-item list does not infinite-loop', () => {
        const slogans = ['only'];
        const selector = createSloganSelector('random', slogans);
        const result = selector.next();
        assert.strictEqual(result.text, 'only');
        assert.strictEqual(result.index, 0);
    });

    it('sequence mode: single-item list always returns the same item', () => {
        const slogans = ['only'];
        const selector = createSloganSelector('sequence', slogans);
        assert.strictEqual(selector.next().text, 'only');
        assert.strictEqual(selector.next().text, 'only');
    });

    it('defaults to sequence mode for unknown mode values', () => {
        const slogans = ['a', 'b'];
        const selector = createSloganSelector('unknown', slogans);
        assert.strictEqual(selector.next().text, 'a');
        assert.strictEqual(selector.next().text, 'b');
    });
});