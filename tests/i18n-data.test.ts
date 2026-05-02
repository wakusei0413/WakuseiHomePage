import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { translations } from '../src/data/i18n';

describe('i18n translations', () => {
    it('has zh-CN, en and ja locales', () => {
        assert.ok('zh-CN' in translations);
        assert.ok('en' in translations);
        assert.ok('ja' in translations);
    });

    it('zh-CN has system-level keys', () => {
        const zh = translations['zh-CN'];
        assert.ok(zh['dock.theme']);
        assert.ok(zh['dock.language']);
        assert.ok(zh['time.weekday.mon']);
        assert.ok(zh['time.month.jan']);
    });

    it('en has system-level keys', () => {
        const en = translations['en'];
        assert.ok(en['dock.theme']);
        assert.ok(en['dock.language']);
        assert.ok(en['time.weekday.mon']);
        assert.ok(en['time.month.jan']);
    });

    it('ja has system-level keys', () => {
        const ja = translations['ja'];
        assert.ok(ja['dock.theme']);
        assert.ok(ja['dock.language']);
        assert.ok(ja['time.weekday.mon']);
        assert.ok(ja['time.month.jan']);
    });

    it('all locales have the same keys', () => {
        const zhKeys = Object.keys(translations['zh-CN']).sort();
        const enKeys = Object.keys(translations['en']).sort();
        const jaKeys = Object.keys(translations['ja']).sort();
        assert.deepEqual(zhKeys, enKeys);
        assert.deepEqual(enKeys, jaKeys);
    });
});
