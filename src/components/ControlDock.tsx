import { createSignal, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
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
    const [isMobile, setIsMobile] = createSignal(false);

    let dockRef: HTMLDivElement | undefined;
    let popupRef: HTMLDivElement | undefined;
    let overlayRef: HTMLDivElement | undefined;
    let sheetRef: HTMLDivElement | undefined;
    let outsideClickCleanup: (() => void) | undefined;

    function isMobileViewport() {
        if (typeof window === 'undefined') return false;

        const isNarrowViewport = window.matchMedia('(max-width: 900px)').matches;
        const isDockInMobileLayout = dockRef ? window.getComputedStyle(dockRef).position === 'fixed' : false;

        return isNarrowViewport || isDockInMobileLayout;
    }

    onMount(() => {
        const storedTheme = getStoredTheme();
        const theme = storedTheme ?? getSystemTheme();
        setIsDark(theme === 'dark');
        applyTheme(theme);

        const updateMobile = () => {
            const mobile = isMobileViewport();
            setIsMobile(mobile);
            popupRef?.removeAttribute('data-open');
            overlayRef?.removeAttribute('data-open');
            sheetRef?.removeAttribute('data-open');
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

        // Soft icon magnify hover (desktop only)
        if (!isMobile()) {
            setupIconMagnifyHover();
        }
    });

    /* ===== Soft Icon Magnify Hover ===== */
    function setupIconMagnifyHover() {
        if (!dockRef) return;

        const items = dockRef.querySelectorAll('.control-dock-item') as NodeListOf<HTMLElement>;
        if (items.length === 0) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = dockRef!.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;

            items.forEach((item) => {
                const itemRect = item.getBoundingClientRect();
                const itemCenter = itemRect.left - rect.left + itemRect.width / 2;
                const distance = Math.abs(mouseX - itemCenter);
                const scale = 1 + 0.12 * Math.exp(-(distance * distance) / (2 * 38 * 38));
                item.style.transform = `scale(${scale})`;
            });
        };

        const handleMouseLeave = () => {
            items.forEach((item) => {
                item.style.transform = '';
            });
        };

        dockRef.addEventListener('mousemove', handleMouseMove);
        dockRef.addEventListener('mouseleave', handleMouseLeave);
        onCleanup(() => {
            dockRef?.removeEventListener('mousemove', handleMouseMove);
            dockRef?.removeEventListener('mouseleave', handleMouseLeave);
        });
    }

    /* ===== Theme Toggle with View Transition ===== */
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

    /* ===== Open / Close Helpers (CSS-driven via data-open) ===== */
    function isOpen() {
        if (isMobileViewport()) {
            return sheetRef?.hasAttribute('data-open') ?? false;
        }
        return popupRef?.hasAttribute('data-open') ?? false;
    }

    function setOpen(open: boolean) {
        if (outsideClickCleanup) {
            outsideClickCleanup();
            outsideClickCleanup = undefined;
        }

        if (isMobileViewport()) {
            popupRef?.removeAttribute('data-open');
            if (open) {
                overlayRef?.setAttribute('data-open', '');
                sheetRef?.setAttribute('data-open', '');
                setupOutsideClick();
            } else {
                overlayRef?.removeAttribute('data-open');
                sheetRef?.removeAttribute('data-open');
            }
        } else {
            overlayRef?.removeAttribute('data-open');
            sheetRef?.removeAttribute('data-open');
            if (open) {
                popupRef?.setAttribute('data-open', '');
                setupOutsideClick();
            } else {
                popupRef?.removeAttribute('data-open');
            }
        }
    }

    function toggleLanguagePanel() {
        setOpen(!isOpen());
    }

    function selectLanguage(lang: Locale) {
        setLocale(lang);
        setOpen(false);
    }

    function setupOutsideClick() {
        // Use setTimeout to avoid catching the same click that opened the panel
        window.setTimeout(() => {
            const handler = (e: MouseEvent) => {
                const target = e.target as Node;
                const clickedInsideDock = dockRef?.contains(target) ?? false;
                const clickedInsideSheet = sheetRef?.contains(target) ?? false;

                if (!clickedInsideDock && !clickedInsideSheet) {
                    setOpen(false);
                }
            };
            document.addEventListener('click', handler);
            outsideClickCleanup = () => document.removeEventListener('click', handler);
        }, 0);
    }

    onCleanup(() => {
        if (outsideClickCleanup) {
            outsideClickCleanup();
        }
    });

    const locales = () => props.config.i18n.locales;

    return (
        <>
            <div ref={dockRef} class="control-dock" role="toolbar" aria-label="Control dock">
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
                    classList={{ active: isOpen() }}
                    onClick={toggleLanguagePanel}
                    title={t('dock.language')}
                    aria-label={t('dock.language')}
                >
                    <i class="fa-solid fa-globe" aria-hidden="true"></i>
                </button>

                <div class="control-dock-divider"></div>

                <button class="control-dock-item" title={t('dock.settings')} aria-label={t('dock.settings')}>
                    <i class="fa-solid fa-gear" aria-hidden="true"></i>
                </button>

                <div ref={popupRef} class="dock-popup" role="dialog" aria-label="Language selection">
                    <div class="dock-popup-title">{t('dock.language')}</div>
                    {locales().map((lang) => (
                        <div
                            class="dock-popup-option"
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

            <Portal>
                <div ref={overlayRef} class="dock-overlay" onClick={() => setOpen(false)}></div>
                <div ref={sheetRef} class="dock-bottom-sheet" role="dialog" aria-label="Language selection">
                    <div class="dock-bottom-sheet-title">{t('dock.language')}</div>
                    {locales().map((lang) => (
                        <div
                            class="dock-bottom-sheet-option"
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
            </Portal>
        </>
    );
}
