import { createSignal, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { Accessor } from 'solid-js';
import type { Locale } from '../data/i18n';
import { getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel } from '../lib/dock';
import type { I18nContext } from '../lib/i18n';
import { applyTheme, getCurrentTheme, getStoredTheme, subscribeThemeChange } from '../lib/i18n';
import type { SiteConfig } from '../types/site';
import { Icon } from './Icon';

interface TopBarProps {
    config: SiteConfig;
    i18n: I18nContext;
    isMobile: Accessor<boolean>;
    scrollProgress: Accessor<number>;
    onMobileMenuOpen: () => void;
}

export function TopBar(props: TopBarProps) {
    const { locale, setLocale, t } = props.i18n;
    const [isDark, setIsDark] = createSignal(false);
    const [activePanel, setActivePanel] = createSignal<string | null>(null);

    let barRef: HTMLDivElement | undefined;
    let popupRef: HTMLDivElement | undefined;
    let languageBtnRef: HTMLButtonElement | undefined;
    let outsideClickCleanup: (() => void) | undefined;

    const topBarOpacity = () => {
        if (!props.isMobile()) return 1;
        const sp = props.scrollProgress();
        if (sp <= 0.15) return 0;
        if (sp >= 0.4) return 1;
        return (sp - 0.15) / 0.25;
    };

    const expansionProgress = () => {
        if (props.isMobile()) return 1;
        const sp = props.scrollProgress();
        if (sp <= 0.1) return 0;
        if (sp >= 0.4) return 1;
        return (sp - 0.1) / 0.3;
    };

    const barStyle = () => {
        if (props.isMobile()) return { opacity: topBarOpacity() };

        const p = expansionProgress();
        return {
            opacity: 1,
            left: `calc(var(--left-panel-width, 500px) * ${1 - p} + 16px)`
        };
    };

    const leftOpacity = () => {
        if (props.isMobile()) return 1;
        const sp = props.scrollProgress();
        if (sp <= 0.15) return 0;
        if (sp >= 0.4) return 1;
        return (sp - 0.15) / 0.25;
    };

    onMount(() => {
        const theme = getCurrentTheme();
        setIsDark(theme === 'dark');
        applyTheme(theme);

        const unsubscribeThemeChange = subscribeThemeChange((newTheme) => {
            setIsDark(newTheme === 'dark');
        });
        onCleanup(unsubscribeThemeChange);

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

        if (!props.isMobile()) {
            setupIconMagnifyHover();
        }
    });

    function handleAction(action: string) {
        switch (action) {
            case 'toggleTheme':
                toggleTheme();
                break;
            default:
                console.warn(`[TopBar] Unsupported action: "${action}".`);
        }
    }

    function handlePanel(panel: string) {
        switch (panel) {
            case 'language':
                toggleLanguagePanel();
                break;
            default:
                console.warn(`[TopBar] Unsupported panel: "${panel}".`);
        }
    }

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

    function isPopupOpen() {
        return popupRef?.hasAttribute('data-open') ?? false;
    }

    function toggleLanguagePanel() {
        setOpen(!isPopupOpen());
    }

    function setOpen(open: boolean) {
        if (outsideClickCleanup) {
            outsideClickCleanup();
            outsideClickCleanup = undefined;
        }

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

    function updatePopupPosition() {
        if (!languageBtnRef || !popupRef) return;
        const rect = languageBtnRef.getBoundingClientRect();
        popupRef.style.left = `${rect.left + rect.width / 2}px`;
        popupRef.style.top = `${rect.bottom + 8}px`;
    }

    function selectLanguage(lang: Locale) {
        setLocale(lang);
        setOpen(false);
    }

    function setupOutsideClick() {
        window.setTimeout(() => {
            const handler = (e: MouseEvent) => {
                const target = e.target as Node;
                const clickedInsideBar = barRef?.contains(target) ?? false;
                const clickedInsidePopup = popupRef?.contains(target) ?? false;

                if (!clickedInsideBar && !clickedInsidePopup) {
                    setOpen(false);
                }
            };
            document.addEventListener('click', handler);
            outsideClickCleanup = () => document.removeEventListener('click', handler);
        }, 0);
    }

    function setupIconMagnifyHover() {
        if (!barRef) return;
        const items = barRef.querySelectorAll('.top-bar-dock-item') as NodeListOf<HTMLElement>;
        if (items.length === 0) return;

        let frameId: number | null = null;
        let latestMouseX = 0;

        const updateScales = () => {
            if (!barRef) {
                frameId = null;
                return;
            }

            const rect = barRef.getBoundingClientRect();
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
            const rect = barRef!.getBoundingClientRect();
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

        barRef.addEventListener('mousemove', handleMouseMove);
        barRef.addEventListener('mouseleave', handleMouseLeave);
        onCleanup(() => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            barRef?.removeEventListener('mousemove', handleMouseMove);
            barRef?.removeEventListener('mouseleave', handleMouseLeave);
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
            <div ref={barRef} class="top-bar" role="toolbar" aria-label="Top navigation" style={barStyle()}>
                <div
                    class="top-bar-left"
                    style={{ opacity: leftOpacity() }}
                    onClick={() => {
                        if (props.isMobile()) {
                            props.onMobileMenuOpen();
                        }
                    }}
                    role={props.isMobile() ? 'button' : undefined}
                    aria-label={props.isMobile() ? 'Open menu' : undefined}
                >
                    <img class="top-bar-avatar" src={props.config.profile.avatar} alt="" width="32" height="32" />
                    <span class="top-bar-name">{props.config.profile.name}</span>
                </div>

                <div class="top-bar-right">
                    {props.config.dock.items.map((item) => {
                        if (item.type === 'divider') {
                            return null;
                        }

                        const display = item.display;
                        const label = () => resolveDockLabel(display, t);
                        const active = () =>
                            getDockItemActiveState(item, { isDark: isDark(), activePanel: activePanel() });
                        const iconClass = () => resolveDockIcon(display, active());

                        if (item.type === 'action') {
                            return (
                                <button
                                    class="top-bar-dock-item"
                                    classList={{ active: active() }}
                                    onClick={() => handleAction(item.action)}
                                    title={label()}
                                    aria-label={label()}
                                >
                                    <Icon name={iconClass()} />
                                </button>
                            );
                        }

                        if (item.type === 'panel') {
                            return (
                                <button
                                    ref={item.panel === 'language' ? (el) => (languageBtnRef = el) : undefined}
                                    class="top-bar-dock-item"
                                    classList={{ active: active() }}
                                    onClick={() => handlePanel(item.panel)}
                                    title={label()}
                                    aria-label={label()}
                                >
                                    <Icon name={iconClass()} />
                                </button>
                            );
                        }

                        const disabled = isDockLinkDisabled(item.href);
                        return (
                            <button
                                class="top-bar-dock-item"
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
                            </button>
                        );
                    })}
                </div>
            </div>

            <Portal>
                <div ref={popupRef} class="top-bar-language-popup" role="dialog" aria-label="Language selection">
                    <div class="top-bar-popup-title">{t('dock.language')}</div>
                    {locales().map((lang) => (
                        <div
                            class="top-bar-popup-option"
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
