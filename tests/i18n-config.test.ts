import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { siteConfig } from '../src/data/site';

describe('i18n config', () => {
    it('has i18n section with defaultLocale and locales', () => {
        assert.ok(siteConfig.i18n);
        assert.equal(siteConfig.i18n.defaultLocale, 'zh-CN');
        assert.ok(Array.isArray(siteConfig.i18n.locales));
        assert.ok(siteConfig.i18n.locales.includes('zh-CN'));
        assert.ok(siteConfig.i18n.locales.includes('en'));
        assert.ok(siteConfig.i18n.locales.includes('ja'));
    });
});
