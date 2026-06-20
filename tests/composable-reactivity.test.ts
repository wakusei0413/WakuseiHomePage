import { createPinia, setActivePinia } from 'pinia';
import { useI18n } from '../src/composables/useI18n';
import { useTheme } from '../src/composables/useTheme';

describe('composable reactivity', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorage.clear();
        document.documentElement.setAttribute('data-theme', 'light');
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: () => ({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            })
        });
    });

    it('keeps theme state reactive after toggling', () => {
        const theme = useTheme();

        expect(theme.isDark.value).toBe(false);

        theme.toggle();

        expect(theme.isDark.value).toBe(true);
    });

    it('keeps locale state reactive after switching language', () => {
        const i18n = useI18n();

        expect(i18n.locale.value).toBe('zh-CN');

        i18n.setLocale('en');

        expect(i18n.locale.value).toBe('en');
        expect(i18n.t('dock.blog')).toBe('Blog');
    });
});
