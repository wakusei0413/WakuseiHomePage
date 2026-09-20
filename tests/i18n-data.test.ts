import { translations } from '../src/data/i18n';

describe('i18n translations', () => {
    it('has zh-CN, en and ja locales', () => {
        expect(translations).toHaveProperty('zh-CN');
        expect(translations).toHaveProperty('en');
        expect(translations).toHaveProperty('ja');
    });

    it('zh-CN has system-level keys', () => {
        const zh = translations['zh-CN'];
        expect(zh['dock.theme']).toBeTruthy();
        expect(zh['dock.language']).toBeTruthy();
        expect(zh['time.weekday.mon']).toBeTruthy();
        expect(zh['time.month.jan']).toBeTruthy();
    });

    it('en has system-level keys', () => {
        const en = translations['en'];
        expect(en['dock.theme']).toBeTruthy();
        expect(en['dock.language']).toBeTruthy();
        expect(en['time.weekday.mon']).toBeTruthy();
        expect(en['time.month.jan']).toBeTruthy();
    });

    it('ja has system-level keys', () => {
        const ja = translations['ja'];
        expect(ja['dock.theme']).toBeTruthy();
        expect(ja['dock.language']).toBeTruthy();
        expect(ja['time.weekday.mon']).toBeTruthy();
        expect(ja['time.month.jan']).toBeTruthy();
    });

    it('all locales have the same keys', () => {
        const zhKeys = Object.keys(translations['zh-CN']).sort();
        const enKeys = Object.keys(translations['en']).sort();
        const jaKeys = Object.keys(translations['ja']).sort();
        expect(zhKeys).toEqual(enKeys);
        expect(enKeys).toEqual(jaKeys);
    });
});
