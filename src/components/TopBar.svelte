<script lang="ts">
    import { onMount } from 'svelte';
    import Icon from './Icon.svelte';
    import type { Locale } from '../data/i18n';
    import { getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel } from '../lib/dock';
    import { t, setLocale, getLocale } from '../lib/i18n.svelte';
    import { isHomePageDocument, subscribeHomePageStateChange } from '../lib/homepage-context';
    import { getIsDark, initTheme, toggleTheme } from '../lib/theme.svelte';
    import { siteConfig } from '../data/site';

    let { initialIsHomePage }: { initialIsHomePage: boolean } = $props();

    let isDark = $derived(getIsDark());
    let activePanel = $state<string | null>(null);

    let barRef: HTMLDivElement | undefined = $state();
    let popupRef: HTMLDivElement | undefined = $state();
    let languageBtnRef: HTMLButtonElement | undefined = $state();
    let outsideClickCleanup: (() => void) | undefined;
    let magnifyCleanup: (() => void) | undefined;

    let isMobile = $state(typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);
    let scrollProgress = $state(0);
    let isHomePage = $state(initialIsHomePage);

    let scrollerEl: HTMLElement | null = null;
    let scrollHandler: ((_e: Event) => void) | undefined;
    let progressAnimationId: number | null = null;

    function stopProgressAnimation() {
        if (progressAnimationId !== null) {
            cancelAnimationFrame(progressAnimationId);
            progressAnimationId = null;
        }
    }

    function animateScrollProgressTo(target: number) {
        stopProgressAnimation();
        const start = scrollProgress;
        const delta = target - start;
        if (Math.abs(delta) < 0.001) {
            scrollProgress = target;
            return;
        }

        const duration = 460;
        const startTime = performance.now();

        const tick = (now: number) => {
            const t = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 4);
            scrollProgress = start + delta * eased;
            if (t >= 1) {
                progressAnimationId = null;
                return;
            }
            progressAnimationId = requestAnimationFrame(tick);
        };

        progressAnimationId = requestAnimationFrame(tick);
    }

    let topBarOpacity = $derived.by(() => {
        if (!isHomePage) return 1;
        if (!isMobile) return 1;
        const sp = scrollProgress;
        if (sp <= 0.15) return 0;
        if (sp >= 0.4) return 1;
        return (sp - 0.15) / 0.25;
    });

    let expansionProgress = $derived.by(() => {
        if (!isHomePage) return 1;
        if (isMobile) return 1;
        const sp = scrollProgress;
        if (sp <= 0.02) return 0;
        if (sp >= 0.45) return 1;
        const raw = (sp - 0.02) / 0.43;
        return 1 - Math.pow(1 - raw, 4);
    });

    let barStyle = $derived.by(() => {
        if (!isHomePage) return 'opacity: 1; transform: translateX(0)';
        if (isMobile) return `opacity: ${topBarOpacity}; transform: translateX(0)`;
        const p = expansionProgress;
        return `opacity: 1; transform: translateX(calc(var(--left-panel-width, 500px) * ${1 - p}))`;
    });

    let rightStyle = $derived.by(() => {
        if (!isHomePage) return 'transform: translateX(0)';
        if (isMobile) return 'transform: translateX(0)';
        const p = expansionProgress;
        return `transform: translateX(calc(var(--left-panel-width, 500px) * ${p - 1}))`;
    });

    let leftStyle = $derived.by(() => {
        if (!isHomePage || isMobile) return '';
        const p = expansionProgress;
        const x = (1 - expansionProgress) * 18;
        if (p >= 1 && x <= 0.01) return '';
        return `opacity: ${p}; transform: translateX(${-x}px)`;
    });

    function bindScroll(animateProgress = false) {
        if (scrollHandler && scrollerEl) {
            scrollerEl.removeEventListener('scroll', scrollHandler);
            scrollHandler = undefined;
        }
        scrollerEl = isHomePageDocument() ? (document.querySelector('.page-scroller') as HTMLElement | null) : null;
        if (scrollerEl) {
            const nextProgress = Math.min(scrollerEl.scrollTop / window.innerHeight, 1);
            if (animateProgress) {
                animateScrollProgressTo(nextProgress);
            } else {
                stopProgressAnimation();
                scrollProgress = nextProgress;
            }
            const handleScroll = (_e: Event) => {
                stopProgressAnimation();
                scrollProgress = Math.min(scrollerEl!.scrollTop / window.innerHeight, 1);
            };
            scrollerEl.addEventListener('scroll', handleScroll, { passive: true });
            scrollHandler = handleScroll;
        } else {
            if (animateProgress) {
                animateScrollProgressTo(1);
            } else {
                stopProgressAnimation();
                scrollProgress = 1;
            }
        }
    }

    function setupViewportMediaSync() {
        const mql = window.matchMedia('(max-width: 900px)');
        const handleMediaChange = (event: MediaQueryListEvent) => {
            isMobile = event.matches;
        };
        mql.addEventListener('change', handleMediaChange);

        return () => mql.removeEventListener('change', handleMediaChange);
    }

    onMount(() => {
        initTheme();
        const cleanups: Array<() => void> = [];
        bindScroll(false);
        cleanups.push(setupViewportMediaSync());
        cleanups.push(
            subscribeHomePageStateChange((next) => {
                const stateChanged = next !== isHomePage;
                isHomePage = next;
                bindScroll(stateChanged);
            })
        );

        return () => {
            cleanups.forEach((cleanup) => cleanup());
            stopProgressAnimation();
            if (scrollHandler && scrollerEl) scrollerEl.removeEventListener('scroll', scrollHandler);
            if (outsideClickCleanup) outsideClickCleanup();
            if (magnifyCleanup) magnifyCleanup();
        };
    });

    $effect(() => {
        const mobile = isMobile;
        const homePage = isHomePage;
        const bar = barRef;

        if (magnifyCleanup) {
            magnifyCleanup();
            magnifyCleanup = undefined;
        }

        if (!bar || mobile || !homePage) return;
        magnifyCleanup = setupIconMagnifyHover();
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

    function handlePanel(panel: string, trigger?: HTMLButtonElement) {
        if (panel === 'language' && trigger) {
            languageBtnRef = trigger;
        }
        switch (panel) {
            case 'language':
                toggleLanguagePanel();
                break;
            default:
                console.warn(`[TopBar] Unsupported panel: "${panel}".`);
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
            activePanel = 'language';
            setupOutsideClick();
        } else {
            popupRef?.removeAttribute('data-open');
            activePanel = null;
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
        setTimeout(() => {
            const handler = (e: MouseEvent) => {
                const target = e.target as Node;
                if (!barRef?.contains(target) && !popupRef?.contains(target)) setOpen(false);
            };
            document.addEventListener('click', handler);
            outsideClickCleanup = () => document.removeEventListener('click', handler);
        }, 0);
    }

    function setupIconMagnifyHover() {
        const el = barRef;
        if (!el) return;
        const items = el.querySelectorAll('.top-bar-dock-item') as NodeListOf<HTMLElement>;
        if (items.length === 0) return;
        let frameId: number | null = null;
        let latestMouseX = 0;
        const updateScales = () => {
            if (!el) {
                frameId = null;
                return;
            }
            const rect = el.getBoundingClientRect();
            items.forEach((item) => {
                const itemRect = item.getBoundingClientRect();
                const itemCenter = itemRect.left - rect.left + itemRect.width / 2;
                const distance = Math.abs(latestMouseX - itemCenter);
                item.style.transform = `scale(${1 + 0.12 * Math.exp(-(distance * distance) / (2 * 30 * 30))})`;
            });
            frameId = null;
        };
        const handleMouseMove = (e: MouseEvent) => {
            latestMouseX = e.clientX - el.getBoundingClientRect().left;
            if (frameId === null) frameId = requestAnimationFrame(updateScales);
        };
        const handleMouseLeave = () => {
            if (frameId !== null) {
                cancelAnimationFrame(frameId);
                frameId = null;
            }
            items.forEach((item) => {
                item.style.transform = '';
            });
        };
        el.addEventListener('mousemove', handleMouseMove);
        el.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            if (frameId !== null) {
                cancelAnimationFrame(frameId);
                frameId = null;
            }
            items.forEach((item) => {
                item.style.transform = '';
            });
            el.removeEventListener('mousemove', handleMouseMove);
            el.removeEventListener('mouseleave', handleMouseLeave);
        };
    }

    function getLabel(display: { text?: string; i18nKey?: string }) {
        return resolveDockLabel(display, t);
    }

    function getActive(item: { type: string; action?: string; panel?: string }) {
        return getDockItemActiveState(item, { isDark, activePanel });
    }

    function getIcon(display: { icon?: string; iconActive?: string }, active: boolean) {
        return resolveDockIcon(display, active);
    }

    function getMode(display: { renderMode?: string }) {
        return display.renderMode ?? 'icon';
    }
</script>

<div bind:this={barRef} class="top-bar" role="toolbar" aria-label="Top navigation" style={barStyle}>
    <a
        class="top-bar-left"
        href="/"
        style={leftStyle}
        onclick={(e) => {
            if (isMobile) {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('wakusei:open-mobile-menu'));
            } else {
                const s = document.querySelector('.page-scroller');
                if (s) {
                    e.preventDefault();
                    s.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        }}
        role={isMobile ? 'button' : undefined}
        aria-label={isMobile ? 'Open menu' : undefined}
    >
        <img class="top-bar-avatar" src={siteConfig.profile.avatar} alt="" width="40" height="40" />
        <span class="top-bar-name">{siteConfig.profile.name}</span>
    </a>

    <div class="top-bar-right" style={rightStyle}>
        {#each siteConfig.dock.items as item}
            {#if item.type === 'divider'}
                <div class="top-bar-divider"></div>
            {:else}
                {@const mode = getMode(item.display)}
                {@const label = getLabel(item.display)}
                {@const active = getActive(item)}
                {@const iconClass = getIcon(item.display, active)}

                {#if item.type === 'action'}
                    <button
                        class="top-bar-dock-item"
                        class:active
                        class:has-text={mode !== 'icon'}
                        onclick={() => handleAction(item.action)}
                        title={label}
                        aria-label={label}
                    >
                        {#if mode !== 'text'}<Icon name={iconClass} />{/if}
                        {#if mode === 'text' || mode === 'both'}<span class="top-bar-dock-label">{label}</span>{/if}
                    </button>
                {:else if item.type === 'panel'}
                    <button
                        class="top-bar-dock-item"
                        class:active
                        class:has-text={mode !== 'icon'}
                        onclick={(event) => handlePanel(item.panel, event.currentTarget as HTMLButtonElement)}
                        title={label}
                        aria-label={label}
                    >
                        {#if mode !== 'text'}<Icon name={iconClass} />{/if}
                        {#if mode === 'text' || mode === 'both'}<span class="top-bar-dock-label">{label}</span>{/if}
                    </button>
                {:else}
                    {@const disabled = isDockLinkDisabled(item.href)}
                    {#if item.openInNewTab}
                        <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="top-bar-dock-item"
                            class:has-text={mode !== 'icon'}
                            title={label}
                            aria-label={label}
                        >
                            {#if mode !== 'text'}<Icon name={iconClass} />{/if}
                            {#if mode === 'text' || mode === 'both'}<span class="top-bar-dock-label">{label}</span>{/if}
                        </a>
                    {:else}
                        <a
                            href={disabled ? undefined : item.href}
                            class="top-bar-dock-item"
                            class:disabled
                            class:has-text={mode !== 'icon'}
                            title={label}
                            aria-label={label}
                            onclick={(e) => {
                                if (disabled) {
                                    e.preventDefault();
                                    return;
                                }
                                const currentPath = window.location.pathname;
                                const targetPath = item.href;
                                if (currentPath === targetPath || currentPath === targetPath + '/') {
                                    e.preventDefault();
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            }}
                        >
                            {#if mode !== 'text'}<Icon name={iconClass} />{/if}
                            {#if mode === 'text' || mode === 'both'}<span class="top-bar-dock-label">{label}</span>{/if}
                        </a>
                    {/if}
                {/if}
            {/if}
        {/each}
    </div>
</div>

<div bind:this={popupRef} class="top-bar-language-popup" role="dialog" aria-label="Language selection">
    <div class="top-bar-popup-title">{t('dock.language')}</div>
    {#each siteConfig.i18n.locales as lang}
        <div
            class="top-bar-popup-option"
            class:selected={getLocale() === lang}
            onclick={() => selectLanguage(lang)}
            role="option"
            aria-selected={getLocale() === lang}
        >
            <Icon name="check" class="check-icon" />
            <span>{t(`dock.lang.${lang}`)}</span>
        </div>
    {/each}
</div>
