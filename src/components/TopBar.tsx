import { createSignal, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { Locale } from '../data/i18n';
import { getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel } from '../lib/dock';
import type { I18nContext } from '../lib/i18n';
import { applyTheme, getCurrentTheme, getStoredTheme, subscribeThemeChange } from '../lib/i18n';
import type { SiteConfig } from '../types/site';
import { Icon } from './Icon';

interface TopBarProps {
    config: SiteConfig;
    i18n: I18nContext;
    initialIsHomePage: boolean;
}

export function TopBar(props: TopBarProps) {
    const { locale, setLocale, t } = props.i18n;
    const [isDark, setIsDark] = createSignal(false);
    const [activePanel, setActivePanel] = createSignal<string | null>(null);

    let barRef: HTMLDivElement | undefined;
    let popupRef: HTMLDivElement | undefined;
    let languageBtnRef: HTMLButtonElement | undefined;
    let outsideClickCleanup: (() => void) | undefined;

    const [isMobile, setIsMobile] = createSignal(
        typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
    );

    const [scrollProgress, setScrollProgress] = createSignal(0);
    const [isHomePage, setIsHomePage] = createSignal(props.initialIsHomePage);

    let scrollerEl: HTMLElement | null = null;
    let scrollHandler: ((_e: Event) => void) | undefined;

    const topBarOpacity = () => {
        if (!isHomePage()) return 1;
        if (!isMobile()) return 1;
        const sp = scrollProgress();
        if (sp <= 0.15) return 0;
        if (sp >= 0.4) return 1;
        return (sp - 0.15) / 0.25;
    };

    const expansionProgress = () => {
        if (!isHomePage()) return 1;
        if (isMobile()) return 1;
        const sp = scrollProgress();
        if (sp <= 0.02) return 0;
        if (sp >= 0.45) return 1;
        const raw = (sp - 0.02) / 0.43;
        return 1 - Math.pow(1 - raw, 4);
    };

    const barStyle = () => {
        if (!isHomePage()) return { opacity: 1, transform: 'translateX(0)' };
        if (isMobile()) return { opacity: topBarOpacity(), transform: 'translateX(0)' };

        const p = expansionProgress();
        return {
            opacity: 1,
            transform: `translateX(calc(var(--left-panel-width, 500px) * ${1 - p}))`
        };
    };

    const rightStyle = () => {
        if (!isHomePage()) return { transform: 'translateX(0)' };
        if (isMobile()) return { transform: 'translateX(0)' };
        const p = expansionProgress();
        return {
            transform: `translateX(calc(var(--left-panel-width, 500px) * ${p - 1}))`
        };
    };

    const leftOpacity = () => {
        if (!isHomePage()) return 1;
        if (isMobile()) return 1;
        const sp = scrollProgress();
        if (sp <= 0.15) return 0;
        if (sp >= 0.4) return 1;
        return (sp - 0.15) / 0.25;
    };

    const leftStyle = () => {
        const p = leftOpacity();
        if (p >= 1) return { opacity: 1 };
        return {
            opacity: p,
            transform: `translateY(${(1 - p) * 8}px)`
        };
    };

    function bindScroll() {
        if (scrollHandler && scrollerEl) {
            scrollerEl.removeEventListener('scroll', scrollHandler);
            scrollHandler = undefined;
        }
        scrollerEl = document.querySelector('.page-scroller');
        if (scrollerEl) {
            setIsHomePage(true);
            setScrollProgress(Math.min(scrollerEl.scrollTop / window.innerHeight, 1));
            const handleScroll = (_e: Event) => {
                const progress = Math.min(scrollerEl!.scrollTop / window.innerHeight, 1);
                setScrollProgress(progress);
            };
            scrollerEl.addEventListener('scroll', handleScroll, { passive: true });
            scrollHandler = handleScroll;
        } else {
            setIsHomePage(false);
            setScrollProgress(1);
        }
    }

    onMount(() => {
        bindScroll();
        window.addEventListener('wakusei:homepage-mounted', bindScroll);
        onCleanup(() => window.removeEventListener('wakusei:homepage-mounted', bindScroll));

        const theme = getCurrentTheme();
        setIsDark(theme === 'dark');
        applyTheme(theme);

        const unsubscribeThemeChange = subscribeThemeChange((newTheme) => {
            setIsDark(newTheme === 'dark');
        });
        onCleanup(unsubscribeThemeChange);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaTheme = (e: MediaQueryListEvent) => {
            if (!getStoredTheme()) {
                const newTheme = e.matches ? 'dark' : 'light';
                setIsDark(newTheme === 'dark');
                applyTheme(newTheme);
            }
        };
        mediaQuery.addEventListener('change', handleMediaTheme);
        onCleanup(() => mediaQuery.removeEventListener('change', handleMediaTheme));

        const mql = window.matchMedia('(max-width: 900px)');
        const handleMediaChange = (event: MediaQueryListEvent) => {
            setIsMobile(event.matches);
        };
        mql.addEventListener('change', handleMediaChange);
        onCleanup(() => mql.removeEventListener('change', handleMediaChange));

        if (!isMobile() && isHomePage()) {
            setupIconMagnifyHover();
        }
    });

    onCleanup(() => {
        if (scrollHandler && scrollerEl) {
            scrollerEl.removeEventListener('scroll', scrollHandler);
        }
        if (outsideClickCleanup) {
            outsideClickCleanup();
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

    const locales = () => props.config.i18n.locales;

    return (
        <>
            <div ref={barRef} class="top-bar" role="toolbar" aria-label="Top navigation" style={barStyle()}>
                <div
                    class="top-bar-left"
                    style={leftStyle()}
                    onClick={() => {
                        if (isMobile()) {
                            window.dispatchEvent(new CustomEvent('wakusei:open-mobile-menu'));
                        } else {
                            const scroller = document.querySelector('.page-scroller');
                            if (scroller) {
                                scroller.scrollTo({ top: 0, behavior: 'smooth' });
                            } else {
                                window.location.href = '/';
                            }
                        }
                    }}
                    role={isMobile() ? 'button' : undefined}
                    aria-label={isMobile() ? 'Open menu' : undefined}
                >
                    <img class="top-bar-avatar" src={props.config.profile.avatar} alt="" width="40" height="40" />
                    <span class="top-bar-name">{props.config.profile.name}</span>
                </div>

                <div class="top-bar-right" style={rightStyle()}>
                    {props.config.dock.items.map((item) => {
                        if (item.type === 'divider') {
                            return <div class="top-bar-divider" />;
                        }

                        const display = item.display;
                        const label = () => resolveDockLabel(display, t);
                        const active = () =>
                            getDockItemActiveState(item, { isDark: isDark(), activePanel: activePanel() });
                        const iconClass = () => resolveDockIcon(display, active());
                        const mode = display.renderMode ?? 'icon';

                        const renderItem = () => (
                            <>
                                {mode !== 'text' && <Icon name={iconClass()} />}
                                {(mode === 'text' || mode === 'both') && (
                                    <span class="top-bar-dock-label">{label()}</span>
                                )}
                            </>
                        );

                        if (item.type === 'action') {
                            return (
                                <button
                                    class="top-bar-dock-item"
                                    classList={{ active: active(), 'has-text': mode !== 'icon' }}
                                    onClick={() => handleAction(item.action)}
                                    title={label()}
                                    aria-label={label()}
                                >
                                    {renderItem()}
                                </button>
                            );
                        }

                        if (item.type === 'panel') {
                            return (
                                <button
                                    ref={item.panel === 'language' ? (el) => (languageBtnRef = el) : undefined}
                                    class="top-bar-dock-item"
                                    classList={{ active: active(), 'has-text': mode !== 'icon' }}
                                    onClick={() => handlePanel(item.panel)}
                                    title={label()}
                                    aria-label={label()}
                                >
                                    {renderItem()}
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
                                    class="top-bar-dock-item"
                                    classList={{ active: false, 'has-text': mode !== 'icon' }}
                                    title={label()}
                                    aria-label={label()}
                                >
                                    {renderItem()}
                                </a>
                            );
                        }
                        return (
                            <a
                                href={disabled ? undefined : item.href}
                                class="top-bar-dock-item"
                                classList={{ active: false, disabled, 'has-text': mode !== 'icon' }}
                                title={label()}
                                aria-label={label()}
                                onClick={(e) => {
                                    if (disabled) e.preventDefault();
                                }}
                            >
                                {renderItem()}
                            </a>
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
