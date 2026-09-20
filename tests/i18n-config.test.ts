import { siteConfig } from '../src/data/site';

describe('i18n config', () => {
    it('has i18n section with defaultLocale and locales', () => {
        expect(siteConfig.i18n).toBeTruthy();
        expect(siteConfig.i18n.defaultLocale).toBe('zh-CN');
        expect(Array.isArray(siteConfig.i18n.locales)).toBeTruthy();
        expect(siteConfig.i18n.locales.includes('zh-CN')).toBeTruthy();
        expect(siteConfig.i18n.locales.includes('en')).toBeTruthy();
        expect(siteConfig.i18n.locales.includes('ja')).toBeTruthy();
    });
});
