<script lang="ts">
    import { onMount } from 'svelte';
    import Icon from './Icon.svelte';
    import type { Locale } from '../data/i18n';
    import { getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel } from '../lib/dock';
    import { t, setLocale, getLocale } from '../lib/i18n.svelte';
    import { getIsDark, toggleTheme } from '../lib/theme.svelte';
    import { siteConfig } from '../data/site';

    let isDark = $derived(getIsDark());
    let activePanel = $state<string | null>(null);
    let open = $state(false);

    let sidebarRef: HTMLDivElement | undefined = $state();
    let outsideClickCleanup: (() => void) | undefined;

    function close() {
        open = false;
    }

    function getLangLabel(display: { text?: string; i18nKey?: string }) {
        return resolveDockLabel(display, t);
    }

    function getLangActive(item: { type: string; action?: string; panel?: string }) {
        return getDockItemActiveState(item, { isDark, activePanel });
    }

    function getLangIcon(display: { icon?: string; iconActive?: string }, active: boolean) {
        return resolveDockIcon(display, active);
    }

    onMount(() => {
        const handleOpen = () => (open = true);
        window.addEventListener('wakusei:open-mobile-menu', handleOpen);

        return () => {
            window.removeEventListener('wakusei:open-mobile-menu', handleOpen);
            if (outsideClickCleanup) outsideClickCleanup();
        };
    });

    function handleAction(action: string) {
        switch (action) {
            case 'toggleTheme':
                toggleTheme();
                break;
            default:
                console.warn(`[MobileDockSidebar] Unsupported action: "${action}".`);
        }
    }

    function handlePanel(panel: string) {
        switch (panel) {
            case 'language':
                activePanel = activePanel === panel ? null : panel;
                break;
            default:
                console.warn(`[MobileDockSidebar] Unsupported panel: "${panel}".`);
                activePanel = null;
        }
    }

    function selectLanguage(lang: Locale) {
        setLocale(lang);
        activePanel = null;
        close();
    }

    function setupOutsideClick() {
        setTimeout(() => {
            const handler = (e: MouseEvent) => {
                if (!sidebarRef?.contains(e.target as Node)) close();
            };
            document.addEventListener('click', handler);
            outsideClickCleanup = () => document.removeEventListener('click', handler);
        }, 0);
    }

    $effect(() => {
        if (open) {
            setupOutsideClick();
        } else {
            activePanel = null;
            if (outsideClickCleanup) {
                outsideClickCleanup();
                outsideClickCleanup = undefined;
            }
        }
    });

    function shouldRenderTrailingDivider() {
        const items = siteConfig.dock.items;
        const lastItem = items[items.length - 1];
        return items.length > 0 && lastItem?.type !== 'divider';
    }
</script>

<div
    bind:this={sidebarRef}
    class="mobile-dock-sidebar"
    class:theme-light={!isDark}
    class:theme-dark={isDark}
    data-open={open ? '' : undefined}
    role="dialog"
    aria-label="Menu"
>
    <div class="sidebar-header">
        <div class="sidebar-avatar-frame">
            <img
                src={siteConfig.profile.avatar}
                alt=""
                class="sidebar-avatar"
                width="48"
                height="48"
                loading="lazy"
                decoding="async"
            />
        </div>
        <span class="sidebar-name">{siteConfig.profile.name}</span>
    </div>

    <div class="sidebar-divider"></div>

    {#each siteConfig.dock.items as item}
        {#if item.type === 'divider'}
            <div class="sidebar-divider"></div>
        {:else}
            {@const label = getLangLabel(item.display)}
            {@const active = getLangActive(item)}
            {@const iconName = getLangIcon(item.display, active)}

            {#if item.type === 'panel'}
                <div class="sidebar-menu-group">
                    <button
                        class="sidebar-menu-item"
                        class:active
                        class:expanded={active}
                        onclick={() => handlePanel(item.panel)}
                        aria-label={label}
                        aria-expanded={active}
                    >
                        <Icon name={iconName} class="sidebar-menu-icon" />
                        <span>{label}</span>
                        <Icon name="fa-solid fa-chevron-down" class="expand-icon" />
                    </button>
                    {#if item.panel === 'language'}
                        <div class="sidebar-submenu" class:expanded={activePanel === item.panel}>
                            {#each siteConfig.i18n.locales as lang}
                                <div
                                    class="sidebar-submenu-item"
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
                    {/if}
                </div>
            {:else if item.type === 'action'}
                <button
                    class="sidebar-menu-item"
                    class:active
                    onclick={() => handleAction(item.action)}
                    aria-label={label}
                >
                    <Icon name={iconName} class="sidebar-menu-icon" />
                    <span>{label}</span>
                </button>
            {:else}
                {@const disabled = isDockLinkDisabled(item.href)}
                {#if item.openInNewTab}
                    <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="sidebar-menu-item"
                        aria-label={label}
                        onclick={() => close()}
                    >
                        <Icon name={iconName} class="sidebar-menu-icon" />
                        <span>{label}</span>
                    </a>
                {:else}
                    <a
                        href={disabled ? undefined : item.href}
                        class="sidebar-menu-item"
                        class:disabled
                        aria-label={label}
                        onclick={(e) => {
                            if (disabled) {
                                e.preventDefault();
                                close();
                                return;
                            }
                            const currentPath = window.location.pathname;
                            const targetPath = item.href;
                            if (currentPath === targetPath || currentPath === targetPath + '/') {
                                e.preventDefault();
                                close();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            } else {
                                close();
                            }
                        }}
                    >
                        <Icon name={iconName} class="sidebar-menu-icon" />
                        <span>{label}</span>
                    </a>
                {/if}
            {/if}
        {/if}
    {/each}

    {#if shouldRenderTrailingDivider()}
        <div class="sidebar-divider"></div>
    {/if}
</div>

<div class="mobile-dock-sidebar-overlay" data-open={open ? '' : undefined} onclick={() => close()}></div>
