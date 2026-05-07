import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { Locale } from '../data/i18n';
import type { I18nContext } from '../lib/i18n';
import { applyTheme, getCurrentTheme, getStoredTheme, subscribeThemeChange } from '../lib/i18n';
import type { DockDisplayConfig, DockItem, SiteConfig } from '../types/site';
import { Icon } from './Icon';

interface MobileDockSidebarProps {
    config: SiteConfig;
    i18n: I18nContext;
    open: boolean;
    onClose: () => void;
}

export function MobileDockSidebar(props: MobileDockSidebarProps) {
    const { locale, setLocale, t } = props.i18n;
    const [isDark, setIsDark] = createSignal(false);
    const [activePanel, setActivePanel] = createSignal<string | null>(null);

    let sidebarRef: HTMLDivElement | undefined;
    let outsideClickCleanup: (() => void) | undefined;

    onMount(() => {
        // Theme is initialized once by NavigationDock; we only track changes.
        setIsDark(getCurrentTheme() === 'dark');

        const unsubscribeThemeChange = subscribeThemeChange((newTheme) => {
            setIsDark(newTheme === 'dark');
        });
        onCleanup(unsubscribeThemeChange);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = (e: MediaQueryListEvent) => {
            if (!getStoredTheme()) {
                setIsDark(e.matches);
            }
        };
        mediaQuery.addEventListener('change', handleMediaChange);
        onCleanup(() => mediaQuery.removeEventListener('change', handleMediaChange));
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
                setActivePanel(activePanel() === panel ? null : panel);
                break;
            default:
                warnUnsupported('panel', panel);
                setActivePanel(null);
        }
    }

    function warnUnsupported(kind: string, key: string) {
        console.warn(`[MobileDockSidebar] Unsupported ${kind}: "${key}". No built-in handler registered.`);
    }

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
        setActivePanel(null);
        props.onClose();
    }

    /* ===== Dock item display helpers ===== */
    function resolveLabel(display: DockDisplayConfig) {
        if (display.i18nKey) {
            return t(display.i18nKey);
        }
        if (display.text) {
            return display.text;
        }
        return '';
    }

    function isItemActive(item: DockItem) {
        if (item.type === 'action' && item.action === 'toggleTheme') {
            return isDark();
        }
        if (item.type === 'panel') {
            return activePanel() === item.panel;
        }
        return false;
    }

    function resolveIcon(display: DockDisplayConfig, active: boolean) {
        return active && display.iconActive ? display.iconActive : display.icon;
    }

    function navigateToItem(href: string, openInNewTab?: boolean) {
        if (href === '#') {
            return;
        }

        if (openInNewTab) {
            window.open(href, '_blank', 'noopener,noreferrer');
            props.onClose();
            return;
        }

        window.location.href = href;
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
    createEffect(() => {
        if (props.open) {
            setupOutsideClick();
        } else {
            setActivePanel(null);
            if (outsideClickCleanup) {
                outsideClickCleanup();
                outsideClickCleanup = undefined;
            }
        }
    });

    onCleanup(() => {
        if (outsideClickCleanup) {
            outsideClickCleanup();
        }
    });

    const locales = () => props.config.i18n.locales;

    function renderLanguageSubmenu(panel: string) {
        if (panel !== 'language') {
            return null;
        }

        return (
            <div class="sidebar-submenu" classList={{ expanded: activePanel() === panel }}>
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
        );
    }

    function shouldRenderTrailingDivider() {
        const items = props.config.dock.items;
        const lastItem = items[items.length - 1];
        return items.length > 0 && lastItem?.type !== 'divider';
    }

    function renderDockItem(item: DockItem) {
        if (item.type === 'divider') {
            return <div class="sidebar-divider"></div>;
        }

        const label = () => resolveLabel(item.display);
        const active = () => isItemActive(item);
        const iconName = () => resolveIcon(item.display, active());

        if (item.type === 'panel') {
            return (
                <div class="sidebar-menu-group">
                    <button
                        class="sidebar-menu-item"
                        classList={{ active: active(), expanded: active() }}
                        onClick={() => handlePanel(item.panel)}
                        aria-label={label()}
                        aria-expanded={active()}
                    >
                        <Icon name={iconName()} class="sidebar-menu-icon" />
                        <span>{label()}</span>
                        <Icon name="fa-solid fa-chevron-down" class="expand-icon" />
                    </button>
                    {renderLanguageSubmenu(item.panel)}
                </div>
            );
        }

        if (item.type === 'action') {
            return (
                <button
                    class="sidebar-menu-item"
                    classList={{ active: active() }}
                    onClick={() => handleAction(item.action)}
                    aria-label={label()}
                >
                    <Icon name={iconName()} class="sidebar-menu-icon" />
                    <span>{label()}</span>
                </button>
            );
        }

        return (
            <button
                class="sidebar-menu-item"
                classList={{ disabled: item.href === '#' }}
                onClick={() => navigateToItem(item.href, item.openInNewTab)}
                aria-label={label()}
                disabled={item.href === '#'}
            >
                <Icon name={iconName()} class="sidebar-menu-icon" />
                <span>{label()}</span>
            </button>
        );
    }

    return (
        <Portal>
            <div
                ref={sidebarRef}
                class="mobile-dock-sidebar"
                data-open={props.open ? '' : undefined}
                role="dialog"
                aria-label="Menu"
            >
                <div class="sidebar-header">
                    <div class="sidebar-avatar-frame">
                        <img
                            src={props.config.profile.avatar}
                            alt=""
                            class="sidebar-avatar"
                            width="48"
                            height="48"
                            loading="lazy"
                            decoding="async"
                        />
                    </div>
                    <span class="sidebar-name">{props.config.profile.name}</span>
                </div>

                <div class="sidebar-divider"></div>

                {props.config.dock.items.map((item) => renderDockItem(item))}
                {shouldRenderTrailingDivider() ? <div class="sidebar-divider"></div> : null}
            </div>

            <div
                class="mobile-dock-sidebar-overlay"
                data-open={props.open ? '' : undefined}
                onClick={() => props.onClose()}
            ></div>
        </Portal>
    );
}
