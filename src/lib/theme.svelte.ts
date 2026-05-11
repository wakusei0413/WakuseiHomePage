import { applyTheme, getCurrentTheme, getStoredTheme } from './i18n';

let _isDark = $state(false);
let _mediaListenerAttached = false;

export function getIsDark() {
    return _isDark;
}

export function initTheme() {
    const theme = getCurrentTheme();
    _isDark = theme === 'dark';

    if (!_mediaListenerAttached && typeof window !== 'undefined') {
        _mediaListenerAttached = true;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaTheme = (e: MediaQueryListEvent) => {
            if (!getStoredTheme()) {
                const newTheme = e.matches ? 'dark' : 'light';
                _isDark = newTheme === 'dark';
                applyTheme(newTheme);
            }
        };
        mediaQuery.addEventListener('change', handleMediaTheme);
    }
}

export function toggleTheme() {
    const newTheme = _isDark ? 'light' : 'dark';
    _isDark = newTheme === 'dark';
    const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown };
    if (typeof doc.startViewTransition === 'function') {
        doc.startViewTransition(() => applyTheme(newTheme));
    } else {
        applyTheme(newTheme);
    }
}

export function syncThemeFromStorage() {
    const theme = getCurrentTheme();
    _isDark = theme === 'dark';
}
