import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { translations } from '../src/data/i18n';

describe('i18n translations', () => {
    it('has zh-CN and en locales', () => {
        assert.ok('zh-CN' in translations);
        assert.ok('en' in translations);
    });

    it('zh-CN has all required keys', () => {
        const zh = translations['zh-CN'];
        assert.ok(zh['profile.status']);
        assert.ok(zh['footer.text']);
        assert.ok(zh['dock.theme']);
        assert.ok(zh['dock.language']);
        assert.ok(zh['dock.settings']);
    });

    it('en has all required keys', () => {
        const en = translations['en'];
        assert.ok(en['profile.status']);
        assert.ok(en['footer.text']);
        assert.ok(en['dock.theme']);
        assert.ok(en['dock.language']);
        assert.ok(en['dock.settings']);
    });

    it('both locales have the same keys', () => {
        const zhKeys = Object.keys(translations['zh-CN']).sort();
        const enKeys = Object.keys(translations['en']).sort();
        assert.deepEqual(zhKeys, enKeys);
    });
});