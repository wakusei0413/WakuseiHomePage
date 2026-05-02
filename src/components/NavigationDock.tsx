import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { I18nContext } from '../lib/i18n';
import { applyTheme, getStoredTheme, getSystemTheme } from '../lib/i18n';
import type { SiteConfig } from '../types/site';
import type { Locale } from '../data/i18n';

interface NavigationDockProps {
    config: SiteConfig;
    i18n: I18nContext;
}

interface DockDisplay {
    icon: string;
    iconActive?: string;
    text?: string;
    i18nKey?: string;
}

export function NavigationDock(props: NavigationDockProps) {
    const { locale, setLocale, t } = props.i18n;
    const [isDark, setIsDark] = createSignal(false);
    const [isMobile, setIsMobile] = createSignal(false);
    const [activePanel, setActivePanel] = createSignal<string | null>(null);
    const [popupStyle, setPopupStyle] = createSignal<{ left: string; bottom: string }>({ left: '0px', bottom: '0px' });

    let dockRef: HTMLDivElement | undefined;
    let popupRef: HTMLDivElement | undefined;
    let overlayRef: HTMLDivElement | undefined;
    let sheetRef: HTMLDivElement | undefined;
    let outsideClickCleanup: (() => void) | undefined;
    let languageBtnRef: HTMLButtonElement | undefined;

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

        if (!isMobile()) {
            setupIconMagnifyHover();
        }
    });

    /* ===== Built-in action handlers ===== */
    function handleAction(action: string) {
        switch (action) {
            case 'toggleTheme':
                toggleTheme();
                break;
            default:
                warnUnsupported('action', action);
        }
    }

    /* ===== Built-in panel handlers ===== */
    function handlePanel(panel: string) {
        switch (panel) {
            case 'language':
                toggleLanguagePanel();
                break;
            default:
                warnUnsupported('panel', panel);
        }
    }

    function warnUnsupported(kind: string, key: string) {
        console.warn(`[NavigationDock] Unsupported ${kind}: "${key}". No built-in handler registered.`);
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

    /* ===== Language Panel ===== */
    function toggleLanguagePanel() {
        setOpen(!isOpen());
    }

    function isPanelOpen(panel: string) {
        return isOpen() && activePanel() === panel;
    }

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
                setActivePanel('language');
                setupOutsideClick();
            } else {
                overlayRef?.removeAttribute('data-open');
                sheetRef?.removeAttribute('data-open');
                setActivePanel(null);
            }
        } else {
            overlayRef?.removeAttribute('data-open');
            sheetRef?.removeAttribute('data-open');
            if (open) {
                updatePopupPosition();
                popupRef?.setAttribute('data-open', '');
                setActivePanel('language');
                setupOutsideClick();
            } else {
                popupRef?.removeAttribute('data-open');
                setActivePanel(null);
            }
        }
    }

    function updatePopupPosition() {
        if (!languageBtnRef) return;
        const rect = languageBtnRef.getBoundingClientRect();
        setPopupStyle({
            left: `${rect.left + rect.width / 2}px`,
            bottom: `${window.innerHeight - rect.top + 14}px`
        });
    }

    function selectLanguage(lang: string) {
        setLocale(lang as Locale);
        setOpen(false);
    }

    function setupOutsideClick() {
        window.setTimeout(() => {
            const handler = (e: MouseEvent) => {
                const target = e.target as Node;
                const clickedInsideDock = dockRef?.contains(target) ?? false;
                const clickedInsideSheet = sheetRef?.contains(target) ?? false;
                const clickedInsidePopup = popupRef?.contains(target) ?? false;

                if (!clickedInsideDock && !clickedInsideSheet && !clickedInsidePopup) {
                    setOpen(false);
                }
            };
            document.addEventListener('click', handler);
            outsideClickCleanup = () => document.removeEventListener('click', handler);
        }, 0);
    }

    /* ===== Soft Icon Magnify Hover (desktop only) ===== */
    function setupIconMagnifyHover() {
        if (!dockRef) return;
        const items = dockRef.querySelectorAll('.nav-dock-item') as NodeListOf<HTMLElement>;
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

    onCleanup(() => {
        if (outsideClickCleanup) {
            outsideClickCleanup();
        }
    });

    const locales = () => props.config.i18n.locales;

    /* ===== Resolve display label ===== */
    function resolveLabel(display: DockDisplay) {
        if (display.i18nKey) {
            return t(display.i18nKey);
        }
        if (display.text) {
            return display.text;
        }
        return '';
    }

    /* ===== Determine active state for icon swapping ===== */
    function isItemActive(type: string, key: string): boolean {
        if (type === 'action' && key === 'toggleTheme') {
            return isDark();
        }
        if (type === 'panel' && key === 'language') {
            return isPanelOpen('language');
        }
        return false;
    }

    return (
        <>
            <div ref={dockRef} class="nav-dock" role="toolbar" aria-label="Navigation dock">
                {props.config.dock.items.map((item) => {
                    if (item.type === 'divider') {
                        return <div class="nav-dock-divider" />;
                    }

                    const display = item.display;
                    const label = resolveLabel(display);
                    let active = false;
                    if (item.type === 'action') {
                        active = isItemActive(item.type, item.action);
                    } else if (item.type === 'panel') {
                        active = isItemActive(item.type, item.panel);
                    }
                    const iconClass = active && display.iconActive ? display.iconActive : display.icon;

                    if (item.type === 'action') {
                        return (
                            <button
                                class="nav-dock-item"
                                classList={{ active }}
                                onClick={() => handleAction(item.action)}
                                title={label}
                                aria-label={label}
                            >
                                <i class={iconClass} aria-hidden="true" />
                                <Show when={display.text}>
                                    <span class="dock-item-label">{display.text}</span>
                                </Show>
                            </button>
                        );
                    }

                    if (item.type === 'panel') {
                        return (
                            <button
                                ref={item.panel === 'language' ? (el) => (languageBtnRef = el) : undefined}
                                class="nav-dock-item"
                                classList={{ active }}
                                onClick={() => handlePanel(item.panel)}
                                title={label}
                                aria-label={label}
                            >
                                <i class={iconClass} aria-hidden="true" />
                                <Show when={display.text}>
                                    <span class="dock-item-label">{display.text}</span>
                                </Show>
                            </button>
                        );
                    }

                    // link
                    const disabled = item.href === '#';
                    return (
                        <button
                            class="nav-dock-item"
                            classList={{ active: false, disabled }}
                            onClick={() => {
                                if (disabled) return;
                                if (item.openInNewTab) {
                                    window.open(item.href, '_blank');
                                } else {
                                    window.location.href = item.href;
                                }
                            }}
                            title={label}
                            aria-label={label}
                        >
                            <i class={iconClass} aria-hidden="true" />
                            <Show when={display.text}>
                                <span class="dock-item-label">{display.text}</span>
                            </Show>
                        </button>
                    );
                })}
            </div>

            {/* Language popup (desktop) */}
            <Portal>
                <div
                    ref={popupRef}
                    class="dock-popup"
                    style={popupStyle()}
                    role="dialog"
                    aria-label="Language selection"
                >
                    <div class="dock-popup-title">{t('dock.language')}</div>
                    {locales().map((lang) => (
                        <div
                            class="dock-popup-option"
                            classList={{ selected: locale() === lang }}
                            onClick={() => selectLanguage(lang)}
                            role="option"
                            aria-selected={locale() === lang}
                        >
                            <span class="check-icon">{'\u2713'}</span>
                            <span>{t(`dock.lang.${lang}`)}</span>
                        </div>
                    ))}
                </div>
            </Portal>

            {/* Language bottom sheet (mobile) */}
            <Portal>
                <div ref={overlayRef} class="dock-overlay" onClick={() => setOpen(false)} />
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
                            <span class="check-icon">{'\u2713'}</span>
                            <span>{t(`dock.lang.${lang}`)}</span>
                        </div>
                    ))}
                </div>
            </Portal>
        </>
    );
}
