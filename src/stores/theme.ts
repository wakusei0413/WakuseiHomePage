import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getCurrentTheme, applyTheme, getStoredTheme } from '../lib/i18n';

export const useThemeStore = defineStore('theme', () => {
    const isDark = ref(getCurrentTheme() === 'dark');
    let _mediaListenerAttached = false;

    function init() {
        const theme = getCurrentTheme();
        isDark.value = theme === 'dark';

        if (!_mediaListenerAttached && typeof window !== 'undefined') {
            _mediaListenerAttached = true;
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e: MediaQueryListEvent) => {
                if (!getStoredTheme()) {
                    const newTheme = e.matches ? 'dark' : 'light';
                    isDark.value = newTheme === 'dark';
                    applyTheme(newTheme, false);
                }
            });
        }
    }

    function toggle() {
        const newTheme = isDark.value ? 'light' : 'dark';
        isDark.value = newTheme === 'dark';
        applyTheme(newTheme);
    }

    return { isDark, init, toggle };
});
