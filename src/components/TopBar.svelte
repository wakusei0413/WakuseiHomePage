<script lang="ts">
    import { onMount } from 'svelte';
    import Icon from './Icon.svelte';
    import type { Locale } from '../data/i18n';
    import { getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel } from '../lib/dock';
    import { t, setLocale, getLocale } from '../lib/i18n.svelte';
    import { applyTheme, getCurrentTheme, getStoredTheme } from '../lib/i18n';
    import { siteConfig } from '../data/site';

    let { initialIsHomePage }: { initialIsHomePage: boolean } = $props();

    let isDark = $state(false);
    let activePanel = $state<string | null>(null);

    let barRef: HTMLDivElement | undefined = $state();
    let popupRef: HTMLDivElement | undefined = $state();
    let languageBtnRef: HTMLButtonElement | undefined = $state();
    let outsideClickCleanup: (() => void) | undefined;

    let isMobile = $state(typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);
    let scrollProgress = $state(0);
    let isHomePage = $state(initialIsHomePage);

    let scrollerEl: HTMLElement | null = null;
    let scrollHandler: ((_e: Event) => void) | undefined;

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

    let leftOpacity = $derived.by(() => {
        if (!isHomePage) return 1;
        if (isMobile) return 1;
        const sp = scrollProgress;
        if (sp <= 0.15) return 0;
        if (sp >= 0.4) return 1;
        return (sp - 0.15) / 0.25;
    });

    let leftStyle = $derived.by(() => {
        const p = leftOpacity;
        if (p >= 1) return '';
        return `opacity: ${p}; transform: translateY(${(1 - p) * 8}px)`;
    });

    function bindScroll() {
        if (scrollHandler && scrollerEl) {
            scrollerEl.removeEventListener('scroll', scrollHandler);
            scrollHandler = undefined;
        }
        scrollerEl = document.querySelector('.page-scroller');
        if (scrollerEl) {
            isHomePage = true;
            scrollProgress = Math.min(scrollerEl.scrollTop / window.innerHeight, 1);
            const handleScroll = (_e: Event) => {
                scrollProgress = Math.min(scrollerEl!.scrollTop / window.innerHeight, 1);
            };
            scrollerEl.addEventListener('scroll', handleScroll, { passive: true });
            scrollHandler = handleScroll;
        } else {
            isHomePage = false;
            scrollProgress = 1;
        }
    }

    onMount(() => {
        bindScroll();
        window.addEventListener('wakusei:homepage-mounted', bindScroll);
        document.addEventListener('astro:after-swap', bindScroll);

        const theme = getCurrentTheme();
        isDark = theme === 'dark';
        applyTheme(theme);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaTheme = (e: MediaQueryListEvent) => {
            if (!getStoredTheme()) {
                const newTheme = e.matches ? 'dark' : 'light';
                isDark = newTheme === 'dark';
                applyTheme(newTheme);
            }
        };
        mediaQuery.addEventListener('change', handleMediaTheme);

        const mql = window.matchMedia('(max-width: 900px)');
        const handleMediaChange = (event: MediaQueryListEvent) => {
            isMobile = event.matches;
        };
        mql.addEventListener('change', handleMediaChange);

        if (!isMobile && isHomePage) {
            setupIconMagnifyHover();
        }

        return () => {
            window.removeEventListener('wakusei:homepage-mounted', bindScroll);
            document.removeEventListener('astro:after-swap', bindScroll);
            if (scrollHandler && scrollerEl) scrollerEl.removeEventListener('scroll', scrollHandler);
            if (outsideClickCleanup) outsideClickCleanup();
            mediaQuery.removeEventListener('change', handleMediaTheme);
            mql.removeEventListener('change', handleMediaChange);
        };
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
        const newTheme = isDark ? 'light' : 'dark';
        isDark = newTheme === 'dark';
        const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown };
        if (typeof doc.startViewTransition === 'function') {
            doc.startViewTransition(() => applyTheme(newTheme));
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
    <div
        class="top-bar-left"
        style={leftStyle}
        onclick={() => {
            if (isMobile) {
                window.dispatchEvent(new CustomEvent('wakusei:open-mobile-menu'));
            } else {
                const s = document.querySelector('.page-scroller');
                if (s) s.scrollTo({ top: 0, behavior: 'smooth' });
                else window.location.href = '/';
            }
        }}
        role={isMobile ? 'button' : undefined}
        aria-label={isMobile ? 'Open menu' : undefined}
    >
        <img class="top-bar-avatar" src={siteConfig.profile.avatar} alt="" width="40" height="40" />
        <span class="top-bar-name">{siteConfig.profile.name}</span>
    </div>

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
                        bind:this={languageBtnRef}
                        class="top-bar-dock-item"
                        class:active
                        class:has-text={mode !== 'icon'}
                        onclick={() => handlePanel(item.panel)}
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
                                if (disabled) e.preventDefault();
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
