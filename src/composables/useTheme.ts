import { useThemeStore } from '../stores/theme';

export function useTheme() {
    const store = useThemeStore();
    store.init();
    return {
        isDark: store.isDark,
        toggle: () => store.toggle(),
        syncFromStorage: () => store.syncFromStorage()
    };
}
