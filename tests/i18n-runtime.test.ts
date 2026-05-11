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
        expect(t('dock.theme')).toBe('主题');
    });

    it('returns correct translation for en', () => {
        const t = createT('en', 'zh-CN');
        expect(t('dock.theme')).toBe('Theme');
    });

    it('returns correct translation for ja', () => {
        const t = createT('ja', 'zh-CN');
        expect(t('dock.theme')).toBe('テーマ');
    });

    it('returns key itself when no translation found', () => {
        const t = createT('zh-CN', 'zh-CN');
        expect(t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('returns time-related translations', () => {
        const t = createT('zh-CN', 'zh-CN');
        expect(t('time.weekday.mon')).toBe('星期一');
    });

    it('returns time-related translations for en', () => {
        const t = createT('en', 'zh-CN');
        expect(t('time.weekday.mon')).toBe('Monday');
        expect(t('time.month.jan')).toBe('January');
    });

    it('returns time-related translations for ja', () => {
        const t = createT('ja', 'zh-CN');
        expect(t('time.weekday.mon')).toBe('月曜日');
        expect(t('time.month.jan')).toBe('1月');
    });
});
