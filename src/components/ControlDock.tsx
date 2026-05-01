import { createSignal, onCleanup, onMount } from 'solid-js';
import type { I18nContext } from '../lib/i18n';
import { applyTheme, getStoredTheme, getSystemTheme } from '../lib/i18n';
import type { SiteConfig } from '../types/site';
import type { Locale } from '../data/i18n';

interface ControlDockProps {
    config: SiteConfig;
    i18n: I18nContext;
}

export function ControlDock(props: ControlDockProps) {
    const { locale, setLocale, t } = props.i18n;
    const [isDark, setIsDark] = createSignal(false);
    const [showLanguagePanel, setShowLanguagePanel] = createSignal(false);
    const [isMobile, setIsMobile] = createSignal(false);

    let dockRef: HTMLDivElement | undefined;
    let outsideClickCleanup: (() => void) | undefined;

    onMount(() => {
        const storedTheme = getStoredTheme();
        const theme = storedTheme ?? getSystemTheme();
        setIsDark(theme === 'dark');
        applyTheme(theme);

        const updateMobile = () => {
            setIsMobile(window.innerWidth <= 900);
        };
        updateMobile();
        window.addEventListener('resize', updateMobile);
        onCleanup(() => window.removeEventListener('resize', updateMobile));

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = (e: MediaQueryListEvent) => {
            if (!getStoredTheme()) {
                const newTheme = e.matches ? 'dark' : 'light';
                setIsDark(newTheme === 'dark');
                applyTheme(newTheme);
            }
        };
        mediaQuery.addEventListener('change', handleMediaChange);
        onCleanup(() => mediaQuery.removeEventListener('change', handleMediaChange));
    });

    function toggleTheme() {
        const newTheme = isDark() ? 'light' : 'dark';
        setIsDark(newTheme === 'dark');
        applyTheme(newTheme);
    }

    function toggleLanguagePanel() {
        setShowLanguagePanel((prev) => !prev);
        if (!showLanguagePanel()) {
            setupOutsideClick();
        }
    }

    function selectLanguage(lang: Locale) {
        setLocale(lang);
        setShowLanguagePanel(false);
    }

    function setupOutsideClick() {
        if (outsideClickCleanup) {
            outsideClickCleanup();
        }
        const handler = (e: MouseEvent) => {
            if (dockRef && !dockRef.contains(e.target as Node)) {
                setShowLanguagePanel(false);
            }
        };
        document.addEventListener('click', handler);
        outsideClickCleanup = () => document.removeEventListener('click', handler);
    }

    onCleanup(() => {
        if (outsideClickCleanup) {
            outsideClickCleanup();
        }
    });

    const locales = props.config.i18n.locales;

    return (
        <div ref={dockRef} class="control-dock">
            <button
                class="control-dock-item"
                classList={{ active: isDark() }}
                onClick={toggleTheme}
                title={t('dock.theme')}
                aria-label={t('dock.theme')}
            >
                <i class={isDark() ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} aria-hidden="true"></i>
            </button>

            <div class="control-dock-divider"></div>

            <button
                class="control-dock-item"
                classList={{ active: showLanguagePanel() }}
                onClick={toggleLanguagePanel}
                title={t('dock.language')}
                aria-label={t('dock.language')}
            >
                <i class="fa-solid fa-globe" aria-hidden="true"></i>
            </button>

            <div class="control-dock-divider"></div>

            <button
                class="control-dock-item"
                title={t('dock.settings')}
                aria-label={t('dock.settings')}
            >
                <i class="fa-solid fa-gear" aria-hidden="true"></i>
            </button>

            {showLanguagePanel() && !isMobile() && (
                <div class="dock-popup">
                    <div class="dock-popup-title">{t('dock.language')}</div>
                    {locales.map((lang) => (
                        <div
                            class="dock-popup-option"
                            classList={{ selected: locale() === lang }}
                            onClick={() => selectLanguage(lang)}
                        >
                            {t(`dock.lang.${lang}`)}
                        </div>
                    ))}
                </div>
            )}

            {showLanguagePanel() && isMobile() && (
                <>
                    <div
                        class="dock-overlay visible"
                        onClick={() => setShowLanguagePanel(false)}
                    ></div>
                    <div class="dock-bottom-sheet visible">
                        <div class="dock-bottom-sheet-title">{t('dock.language')}</div>
                        {locales.map((lang) => (
                            <div
                                class="dock-bottom-sheet-option"
                                classList={{ selected: locale() === lang }}
                                onClick={() => selectLanguage(lang)}
                            >
                                {t(`dock.lang.${lang}`)}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}