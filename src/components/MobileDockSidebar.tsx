import { createSignal, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { I18nContext } from '../lib/i18n';
import { applyTheme, getStoredTheme, getSystemTheme } from '../lib/i18n';
import type { SiteConfig } from '../types/site';
import type { Locale } from '../data/i18n';

interface MobileDockSidebarProps {
    config: SiteConfig;
    i18n: I18nContext;
    open: boolean;
    onClose: () => void;
}

export function MobileDockSidebar(props: MobileDockSidebarProps) {
    const { locale, setLocale, t } = props.i18n;
    const [isDark, setIsDark] = createSignal(false);
    const [isLanguageExpanded, setIsLanguageExpanded] = createSignal(false);

    let sidebarRef: HTMLDivElement | undefined;
    let outsideClickCleanup: (() => void) | undefined;

    onMount(() => {
        const storedTheme = getStoredTheme();
        const theme = storedTheme ?? getSystemTheme();
        setIsDark(theme === 'dark');

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = (e: MediaQueryListEvent) => {
            if (!getStoredTheme()) {
                setIsDark(e.matches);
            }
        };
        mediaQuery.addEventListener('change', handleMediaChange);
        onCleanup(() => mediaQuery.removeEventListener('change', handleMediaChange));
    });

    /* ===== Theme Toggle ===== */
    function toggleTheme() {
        const newTheme = isDark() ? 'light' : 'dark';
        setIsDark(newTheme === 'dark');

        const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown };
        if (typeof doc.startViewTransition === 'function') {
            doc.startViewTransition(() => {
                applyTheme(newTheme);
            });
        } else {
            applyTheme(newTheme);
        }
    }

    /* ===== Language ===== */
    function selectLanguage(lang: Locale) {
        setLocale(lang);
        setIsLanguageExpanded(false);
        props.onClose();
    }

    /* ===== Outside Click ===== */
    function setupOutsideClick() {
        window.setTimeout(() => {
            const handler = (e: MouseEvent) => {
                const target = e.target as Node;
                const clickedInsideSidebar = sidebarRef?.contains(target) ?? false;
                if (!clickedInsideSidebar) {
                    props.onClose();
                }
            };
            document.addEventListener('click', handler);
            outsideClickCleanup = () => document.removeEventListener('click', handler);
        }, 0);
    }

    /* ===== Open/Close Side Effects ===== */
    onMount(() => {
        // Watch for prop changes to handle open/close side effects
        const checkOpen = () => {
            if (props.open) {
                setupOutsideClick();
            } else {
                if (outsideClickCleanup) {
                    outsideClickCleanup();
                    outsideClickCleanup = undefined;
                }
            }
        };
        checkOpen();
    });

    onCleanup(() => {
        if (outsideClickCleanup) {
            outsideClickCleanup();
        }
    });

    const locales = () => props.config.i18n.locales;

    return (
        <Portal>
            <div
                ref={sidebarRef}
                class="mobile-dock-sidebar"
                classList={{ 'data-open': props.open }}
                role="dialog"
                aria-label="Menu"
            >
                <div class="sidebar-header">
                    <img
                        src={props.config.profile.avatar}
                        alt=""
                        class="sidebar-avatar"
                        decoding="async"
                    />
                    <span class="sidebar-name">{props.config.profile.name}</span>
                </div>

                <div class="sidebar-divider"></div>

                <button class="sidebar-menu-item" onClick={toggleTheme}>
                    <i class={isDark() ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} aria-hidden="true"></i>
                    <span>{t('dock.theme')}</span>
                </button>

                <div class="sidebar-menu-group">
                    <button
                        class="sidebar-menu-item"
                        classList={{ expanded: isLanguageExpanded() }}
                        onClick={() => setIsLanguageExpanded(!isLanguageExpanded())}
                    >
                        <i class="fa-solid fa-globe" aria-hidden="true"></i>
                        <span>{t('dock.language')}</span>
                        <i class="fa-solid fa-chevron-down expand-icon" aria-hidden="true"></i>
                    </button>
                    <div class="sidebar-submenu" classList={{ expanded: isLanguageExpanded() }}>
                        {locales().map((lang) => (
                            <div
                                class="sidebar-submenu-item"
                                classList={{ selected: locale() === lang }}
                                onClick={() => selectLanguage(lang)}
                                role="option"
                                aria-selected={locale() === lang}
                            >
                                <span class="check-icon">✓</span>
                                <span>{t(`dock.lang.${lang}`)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    class="sidebar-menu-item"
                    onClick={() => {
                        window.location.href = '/settings';
                    }}
                >
                    <i class="fa-solid fa-gear" aria-hidden="true"></i>
                    <span>{t('dock.settings')}</span>
                </button>
            </div>

            <div
                class="mobile-dock-sidebar-overlay"
                classList={{ 'data-open': props.open }}
                onClick={() => props.onClose()}
            ></div>
        </Portal>
    );
}
