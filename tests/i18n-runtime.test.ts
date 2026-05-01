import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { translations } from '../src/data/i18n';

function createT(locale: string, defaultLocale: string) {
    return (key: string): string => {
        const localeEntry = translations[locale as keyof typeof translations];
        if (localeEntry && key in localeEntry) {
            return localeEntry[key];
        }
        const fallbackEntry = translations[defaultLocale as keyof typeof translations];
        if (fallbackEntry && key in fallbackEntry) {
            return fallbackEntry[key];
        }
        return key;
    };
}

describe('i18n t() lookup logic', () => {
    it('returns correct translation for zh-CN', () => {
        const t = createT('zh-CN', 'zh-CN');
        assert.equal(t('dock.theme'), '主题');
    });

    it('returns correct translation for en', () => {
        const t = createT('en', 'zh-CN');
        assert.equal(t('dock.theme'), 'Theme');
    });

    it('returns key itself when no translation found', () => {
        const t = createT('zh-CN', 'zh-CN');
        assert.equal(t('nonexistent.key'), 'nonexistent.key');
    });

    it('returns slogan list from translations', () => {
        const t = createT('zh-CN', 'zh-CN');
        assert.equal(t('slogan.1'), '安静，听到我使用锤子的TNT vibe coding了吗！');
    });

    it('returns loading texts from translations', () => {
        const t = createT('zh-CN', 'zh-CN');
        assert.equal(t('loading.1'), '少女祈祷中...');
    });

    it('returns time-related translations for en', () => {
        const t = createT('en', 'zh-CN');
        assert.equal(t('time.weekday.mon'), 'Monday');
        assert.equal(t('time.month.jan'), 'January');
    });
});