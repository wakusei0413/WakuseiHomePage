import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';

describe('CONFIG key fields', () => {
    it('has version string', () => {
        assert.strictEqual(typeof CONFIG.version, 'string');
        assert.ok(CONFIG.version.length > 0);
    });

    it('has profile with name', () => {
        assert.ok(CONFIG.profile);
        assert.strictEqual(typeof CONFIG.profile.name, 'string');
        assert.ok(CONFIG.profile.name.length > 0);
    });

    it('has slogans.list as non-empty array', () => {
        assert.ok(Array.isArray(CONFIG.slogans.list));
        assert.ok(CONFIG.slogans.list.length > 0);
    });

    it('has socialLinks.links as non-empty array', () => {
        assert.ok(Array.isArray(CONFIG.socialLinks.links));
        assert.ok(CONFIG.socialLinks.links.length > 0);
    });

    it('has wallpaper.apis as non-empty array', () => {
        assert.ok(Array.isArray(CONFIG.wallpaper.apis));
        assert.ok(CONFIG.wallpaper.apis.length > 0);
    });

    it('slogans.mode is random or sequence', () => {
        assert.ok(['random', 'sequence'].includes(CONFIG.slogans.mode));
    });
});