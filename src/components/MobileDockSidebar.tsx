import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { Locale } from '../data/i18n';
import { getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel } from '../lib/dock';
import type { I18nContext } from '../lib/i18n';
import { applyTheme, getCurrentTheme, getStoredTheme, subscribeThemeChange } from '../lib/i18n';
import type { DockItem, SiteConfig } from '../types/site';
import { Icon } from './Icon';

interface MobileDockSidebarProps {
    config: SiteConfig;
    i18n: I18nContext;
}

export function MobileDockSidebar(props: MobileDockSidebarProps) {
    const { locale, setLocale, t } = props.i18n;
    const [isDark, setIsDark] = createSignal(false);
    const [activePanel, setActivePanel] = createSignal<string | null>(null);
    const [open, setOpen] = createSignal(false);

    let sidebarRef: HTMLDivElement | undefined;
    let outsideClickCleanup: (() => void) | undefined;

    function close() {
        setOpen(false);
    }

    onMount(() => {
        const handleOpen = () => setOpen(true);
        window.addEventListener('wakusei:open-mobile-menu', handleOpen);
        onCleanup(() => window.removeEventListener('wakusei:open-mobile-menu', handleOpen));

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
        close();
    }

    /* ===== Dock item display helpers ===== */

    /* ===== Outside Click ===== */
    function setupOutsideClick() {
        window.setTimeout(() => {
            const handler = (e: MouseEvent) => {
                const target = e.target as Node;
                const clickedInsideSidebar = sidebarRef?.contains(target) ?? false;
                if (!clickedInsideSidebar) {
                    close();
                }
            };
            document.addEventListener('click', handler);
            outsideClickCleanup = () => document.removeEventListener('click', handler);
        }, 0);
    }

    /* ===== Open/Close Side Effects ===== */
    createEffect(() => {
        if (open()) {
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
                        <Icon name="check" class="check-icon" />
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

        const label = () => resolveDockLabel(item.display, t);
        const active = () => getDockItemActiveState(item, { isDark: isDark(), activePanel: activePanel() });
        const iconName = () => resolveDockIcon(item.display, active());

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

        const disabled = isDockLinkDisabled(item.href);
        if (item.openInNewTab) {
            return (
                <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="sidebar-menu-item"
                    aria-label={label()}
                    onClick={() => close()}
                >
                    <Icon name={iconName()} class="sidebar-menu-icon" />
                    <span>{label()}</span>
                </a>
            );
        }
        return (
            <a
                href={disabled ? undefined : item.href}
                class="sidebar-menu-item"
                classList={{ disabled }}
                aria-label={label()}
                onClick={(e) => {
                    if (disabled) e.preventDefault();
                    close();
                }}
            >
                <Icon name={iconName()} class="sidebar-menu-icon" />
                <span>{label()}</span>
            </a>
        );
    }

    return (
        <Portal>
            <div
                ref={sidebarRef}
                class="mobile-dock-sidebar"
                classList={{ 'theme-light': !isDark(), 'theme-dark': isDark() }}
                data-open={open() ? '' : undefined}
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

            <div class="mobile-dock-sidebar-overlay" data-open={open() ? '' : undefined} onClick={() => close()}></div>
        </Portal>
    );
}
