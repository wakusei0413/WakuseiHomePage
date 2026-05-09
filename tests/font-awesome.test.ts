import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as fontAwesome from '../src/lib/font-awesome';

describe('Deprecated Font Awesome loading module', () => {
    it('does not expose legacy stylesheet loading helpers', () => {
        assert.deepStrictEqual(Object.keys(fontAwesome), []);
    });
});
