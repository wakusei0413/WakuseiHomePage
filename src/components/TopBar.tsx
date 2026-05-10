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

    let popupRef: HTMLDivElement | undefined;
    let languageBtnRef: HTMLButtonElement | undefined;
    let outsideClickCleanup: (() => void) | undefined;

    const locales = () => props.config.i18n.locales;

    onMount(() => {
        setIsDark(getCurrentTheme() === 'dark');
        const unsubscribe = subscribeThemeChange((theme) => {
            setIsDark(theme === 'dark');
        });

        onCleanup(() => {
            unsubscribe();
            outsideClickCleanup?.();
        });
    });

    const handleAction = (action: string) => {
        if (action === 'toggle-theme') {
            const next = isDark() ? 'light' : 'dark';
            applyTheme(next);
        }
    };

    const handlePanel = (panel: string) => {
        if (panel === 'language') {
            const current = activePanel();
            if (current === 'language') {
                closePopup();
            } else {
                openLanguagePopup();
            }
        }
    };

    const openLanguagePopup = () => {
        setActivePanel('language');
        setTimeout(() => {
            if (!popupRef || !languageBtnRef) return;
            const btnRect = languageBtnRef.getBoundingClientRect();
            popupRef.style.top = `${btnRect.bottom + 8}px`;
            popupRef.style.right = `${window.innerWidth - btnRect.right}px`;
            popupRef.classList.add('visible');

            const handleClickOutside = (e: MouseEvent) => {
                if (!popupRef?.contains(e.target as Node) && !languageBtnRef?.contains(e.target as Node)) {
                    closePopup();
                }
            };
            document.addEventListener('click', handleClickOutside);
            outsideClickCleanup = () => document.removeEventListener('click', handleClickOutside);
        }, 0);
    };

    const closePopup = () => {
        popupRef?.classList.remove('visible');
        setActivePanel(null);
        outsideClickCleanup?.();
        outsideClickCleanup = undefined;
    };

    const selectLanguage = (lang: Locale) => {
        setLocale(lang);
        closePopup();
    };

    const expansionProgress = () => {
        if (props.isMobile()) return 1;
        // 从 0 到 0.25 的滚动距离内完成形变
        return Math.min(1, props.scrollProgress() / 0.25);
    };

    const isSticky = () => expansionProgress() > 0.95;

    const barStyle = () => {
        if (props.isMobile()) {
            const opacity = props.scrollProgress() > 0.2 ? Math.min(1, (props.scrollProgress() - 0.2) * 5) : 0;
            return {
                width: 'auto',
                opacity: opacity,
                visibility: opacity > 0 ? 'visible' : 'hidden',
                transform: `translateY(${props.scrollProgress() > 0.2 ? 0 : -20}px)`
            };
        }

        const p = expansionProgress();
        const easeP = 1 - Math.pow(1 - p, 4); // EaseOutQuart

        // 初始宽度 220px，完全展开后 100%
        const width = `calc(220px + (100% - 220px) * ${easeP})`;

        return {
            width,
            top: `${(1 - easeP) * 20}px`,
            right: `${(1 - easeP) * 20}px`,
            transform: 'none'
        };
    };

    // 头像名字在悬浮胶囊状态下隐藏，展开过程中淡入
    const leftContentStyle = () => {
        const p = expansionProgress();
        const opacity = p > 0.5 ? (p - 0.5) * 2 : 0;
        return {
            opacity,
            display: opacity > 0 ? 'flex' : 'none',
            'align-items': 'center',
            gap: 'var(--space-sm)'
        };
    };

    return (
        <>
            <header
                class="top-bar"
                classList={{ 'is-expanded': isSticky() }}
                style={barStyle()}
                onClick={() => props.isMobile() && props.onMobileMenuOpen()}
            >
                <div class="top-bar-left" style={leftContentStyle()}>
                    <img class="top-bar-avatar" src={props.config.profile.avatar} alt="" width="32" height="32" />
                    <span class="top-bar-name">{props.config.profile.name}</span>
                </div>

                <div class="top-bar-right">
                    {props.config.dock.items.map((item) => {
                        if (item.type === 'divider') return null;

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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAction(item.action);
                                    }}
                                    title={label()}
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePanel(item.panel);
                                    }}
                                    title={label()}
                                >
                                    <Icon name={iconClass()} />
                                </button>
                            );
                        }

                        const disabled = isDockLinkDisabled(item.href);
                        return (
                            <button
                                class="top-bar-dock-item"
                                classList={{ disabled }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (disabled) return;
                                    if (item.openInNewTab) {
                                        window.open(item.href, '_blank', 'noopener,noreferrer');
                                    } else {
                                        window.location.href = item.href;
                                    }
                                }}
                                title={label()}
                            >
                                <Icon name={iconClass()} />
                            </button>
                        );
                    })}
                </div>
            </header>

            <Portal>
                <div ref={popupRef} class="top-bar-language-popup" role="dialog">
                    <div class="top-bar-popup-title">{t('dock.language')}</div>
                    {locales().map((lang) => (
                        <div
                            class="top-bar-popup-option"
                            classList={{ selected: locale() === lang }}
                            onClick={() => selectLanguage(lang)}
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
