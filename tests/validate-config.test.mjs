import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../js/validate-config.js';
import { CONFIG } from '../config.js';

describe('validate-config', () => {
    it('passes with the current CONFIG', () => {
        const result = validate(CONFIG);
        assert.ok(result.valid, 'CONFIG should be valid, errors: ' + result.errors.join('; '));
    });

    it('reports errors for missing required fields', () => {
        const result = validate({});
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors.length > 0);
    });

    it('reports error for empty slogans.list', () => {
        const config = JSON.parse(JSON.stringify(CONFIG));
        config.slogans.list = [];
        const result = validate(config);
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('list')));
    });

    it('reports error for invalid time.format', () => {
        const config = JSON.parse(JSON.stringify(CONFIG));
        config.time.format = '25h';
        const result = validate(config);
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('format')));
    });

    it('reports error for missing profile.name', () => {
        const config = JSON.parse(JSON.stringify(CONFIG));
        delete config.profile.name;
        const result = validate(config);
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('name')));
    });
});