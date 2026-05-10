import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { Locale } from '../data/i18n';
import { getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel } from '../lib/dock';
import type { I18nContext } from '../lib/i18n';
import { applyTheme, getCurrentTheme, getStoredTheme, subscribeThemeChange } from '../lib/i18n';
import type { SiteConfig } from '../types/site';
import { Icon } from './Icon';

interface NavigationDockProps {
    config: SiteConfig;
    i18n: I18nContext;
}

export function NavigationDock(props: NavigationDockProps) {
    const { locale, setLocale, t } = props.i18n;
    const [isDark, setIsDark] = createSignal(false);
    const [isMobile, setIsMobile] = createSignal(false);
    const [activePanel, setActivePanel] = createSignal<string | null>(null);
    const [popupStyle, setPopupStyle] = createSignal<{ left: string; top: string }>({ left: '0px', top: '0px' });

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
        const theme = getCurrentTheme();
        setIsDark(theme === 'dark');
        applyTheme(theme);

        const unsubscribeThemeChange = subscribeThemeChange((newTheme) => {
            setIsDark(newTheme === 'dark');
        });
        onCleanup(unsubscribeThemeChange);

        const updateMobile = () => {
            const mobile = isMobileViewport();
            setIsMobile(mobile);
            popupRef?.removeAttribute('data-open');
            overlayRef?.removeAttribute('data-open');
            sheetRef?.removeAttribute('data-open');
            setActivePanel(null);
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
            top: `${rect.bottom + 14}px`
        });
    }

    function selectLanguage(lang: Locale) {
        setLocale(lang);
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

        let frameId: number | null = null;
        let latestMouseX = 0;

        const updateScales = () => {
            if (!dockRef) {
                frameId = null;
                return;
            }

            const rect = dockRef.getBoundingClientRect();
            items.forEach((item) => {
                const itemRect = item.getBoundingClientRect();
                const itemCenter = itemRect.left - rect.left + itemRect.width / 2;
                const distance = Math.abs(latestMouseX - itemCenter);
                const scale = 1 + 0.12 * Math.exp(-(distance * distance) / (2 * 30 * 30));
                item.style.transform = `scale(${scale})`;
            });
            frameId = null;
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = dockRef!.getBoundingClientRect();
            latestMouseX = e.clientX - rect.left;

            if (frameId === null) {
                frameId = window.requestAnimationFrame(updateScales);
            }
        };

        const handleMouseLeave = () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
                frameId = null;
            }

            items.forEach((item) => {
                item.style.transform = '';
            });
        };

        dockRef.addEventListener('mousemove', handleMouseMove);
        dockRef.addEventListener('mouseleave', handleMouseLeave);
        onCleanup(() => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
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

    return (
        <>
            <div ref={dockRef} class="nav-dock" role="toolbar" aria-label="Navigation dock">
                {props.config.dock.items.map((item) => {
                    if (item.type === 'divider') {
                        return <div class="nav-dock-divider" />;
                    }

                    const display = item.display;
                    const label = () => resolveDockLabel(display, t);
                    const active = () => getDockItemActiveState(item, { isDark: isDark(), activePanel: activePanel() });
                    const iconClass = () => resolveDockIcon(display, active());

                    if (item.type === 'action') {
                        return (
                            <button
                                class="nav-dock-item"
                                classList={{ active: active() }}
                                onClick={() => handleAction(item.action)}
                                title={label()}
                                aria-label={label()}
                            >
                                <Icon name={iconClass()} />
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
                                classList={{ active: active() }}
                                onClick={() => handlePanel(item.panel)}
                                title={label()}
                                aria-label={label()}
                            >
                                <Icon name={iconClass()} />
                                <Show when={display.text}>
                                    <span class="dock-item-label">{display.text}</span>
                                </Show>
                            </button>
                        );
                    }

                    // link
                    const disabled = isDockLinkDisabled(item.href);
                    return (
                        <button
                            class="nav-dock-item"
                            classList={{ active: false, disabled }}
                            onClick={() => {
                                if (disabled) return;
                                if (item.openInNewTab) {
                                    window.open(item.href, '_blank', 'noopener,noreferrer');
                                } else {
                                    window.location.href = item.href;
                                }
                            }}
                            title={label()}
                            aria-label={label()}
                        >
                            <Icon name={iconClass()} />
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
                            <Icon name="check" class="check-icon" />
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
                            <Icon name="check" class="check-icon" />
                            <span>{t(`dock.lang.${lang}`)}</span>
                        </div>
                    ))}
                </div>
            </Portal>
        </>
    );
}
