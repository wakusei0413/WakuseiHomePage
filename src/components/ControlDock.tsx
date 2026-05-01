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
    const [isMobile, setIsMobile] = createSignal(false);

    let dockRef: HTMLDivElement | undefined;
    let popupRef: HTMLDivElement | undefined;
    let overlayRef: HTMLDivElement | undefined;
    let sheetRef: HTMLDivElement | undefined;
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

        // MacOS Dock Wave Hover (desktop only)
        if (!isMobile()) {
            setupWaveHover();
        }
    });

    /* ===== MacOS Dock Wave Hover ===== */
    function setupWaveHover() {
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
                // Gaussian falloff: scale = 1 + 0.5 * exp(-distance^2 / (2 * 60^2))
                const scale = 1 + 0.5 * Math.exp(-(distance * distance) / (2 * 60 * 60));
                const translateY = (1 - scale) * 10;
                item.style.transform = `scale(${scale}) translateY(${translateY}px)`;
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
        if (isMobile()) {
            return sheetRef?.hasAttribute('data-open') ?? false;
        }
        return popupRef?.hasAttribute('data-open') ?? false;
    }

    function setOpen(open: boolean) {
        if (outsideClickCleanup) {
            outsideClickCleanup();
            outsideClickCleanup = undefined;
        }

        if (isMobile()) {
            if (open) {
                overlayRef?.setAttribute('data-open', '');
                sheetRef?.setAttribute('data-open', '');
                setupOutsideClick();
            } else {
                overlayRef?.removeAttribute('data-open');
                sheetRef?.removeAttribute('data-open');
            }
        } else {
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
                if (dockRef && !dockRef.contains(target)) {
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

            {/* ===== PC Popup (always rendered, CSS-driven via data-open) ===== */}
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

            {/* ===== Mobile Bottom Sheet (always rendered, CSS-driven via data-open) ===== */}
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
        </div>
    );
}
