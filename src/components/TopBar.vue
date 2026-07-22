<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { navigate } from 'astro:transitions/client';
import Icon from './Icon.vue';
import type { Locale } from '../data/i18n';
import { getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel } from '../lib/dock';
import { isHashSectionHref, navigateToHashSection } from '../lib/section-nav';
import { useI18n } from '../composables/useI18n';
import { useTheme } from '../composables/useTheme';
import { usePageShellStore } from '../stores/page-shell';
import { useSearchStore } from '../stores/search';
import { siteConfig } from '../data/site';

defineProps<{ initialIsHomePage: boolean }>();

const { t, setLocale, locale } = useI18n();
const { isDark, toggle: toggleTheme } = useTheme();
const pageShell = usePageShellStore();
const searchStore = useSearchStore();

const activePanel = ref<string | null>(null);
const hydrateKey = ref(0);

const barRef = ref<HTMLDivElement>();
const popupRef = ref<HTMLDivElement>();
const languageBtnRef = ref<HTMLButtonElement>();
let outsideClickCleanup: (() => void) | undefined;
let outsideClickTimer: ReturnType<typeof setTimeout> | undefined;
let magnifyCleanup: (() => void) | undefined;

// SSR renders the desktop layout; the real viewport state is applied after
// hydration in onMounted to avoid mismatches. setupViewportMediaSync syncs on resize.
const isMobile = ref(false);

const sidebarOpen = ref(false);
const sidebarRef = ref<HTMLDivElement>();
let sidebarOutsideClickCleanup: (() => void) | undefined;
let sidebarOutsideClickTimer: ReturnType<typeof setTimeout> | undefined;

function openSidebar() {
    sidebarOpen.value = true;
    setupSidebarOutsideClick();
}

function closeSidebar() {
    sidebarOpen.value = false;
    activePanel.value = null;
    clearTimeout(sidebarOutsideClickTimer);
    sidebarOutsideClickTimer = undefined;
    if (sidebarOutsideClickCleanup) {
        sidebarOutsideClickCleanup();
        sidebarOutsideClickCleanup = undefined;
    }
}

const expansionProgress = computed(() => {
    if (isMobile.value) return 1;
    const sp = pageShell.scrollProgress;
    if (sp <= 0.02) return 0;
    if (sp >= 0.45) return 1;
    const raw = (sp - 0.02) / 0.43;
    return 1 - Math.pow(1 - raw, 4);
});

const barExpandStyle = computed(() => {
    const p = expansionProgress.value;
    return `--bar-left: calc(var(--left-panel-width, 500px) * ${1 - p}); --left-width: calc(${p} * var(--left-panel-width, 500px))`;
});

const navTranslateY = computed(() => {
    const sp = pageShell.scrollProgress;
    const dir = pageShell.scrollDirection;
    if (sp < 0.45) return '0';
    if (dir === 'down') return '-100%';
    return '0';
});

function setupViewportMediaSync() {
    const mql = window.matchMedia('(max-width: 900px)');
    const handleMediaChange = (event: MediaQueryListEvent) => {
        isMobile.value = event.matches;
    };
    mql.addEventListener('change', handleMediaChange);

    return () => mql.removeEventListener('change', handleMediaChange);
}

const cleanups: Array<() => void> = [];

onMounted(() => {
    isMobile.value = window.matchMedia('(max-width: 900px)').matches;
    cleanups.push(setupViewportMediaSync());
    hydrateKey.value = 1;
});

onUnmounted(() => {
    cleanups.forEach((cleanup) => cleanup());
    clearTimeout(outsideClickTimer);
    if (outsideClickCleanup) outsideClickCleanup();
    if (magnifyCleanup) magnifyCleanup();
    clearTimeout(sidebarOutsideClickTimer);
    if (sidebarOutsideClickCleanup) sidebarOutsideClickCleanup();
});

watch([isMobile, barRef], () => {
    if (magnifyCleanup) {
        magnifyCleanup();
        magnifyCleanup = undefined;
    }

    if (!barRef.value || isMobile.value) return;
    magnifyCleanup = setupIconMagnifyHover();
});

watch(isMobile, (mobile) => {
    if (!mobile) {
        closeSidebar();
    }
});

function handleAction(action: string) {
    switch (action) {
        case 'toggleTheme':
            toggleTheme();
            break;
        case 'openSearch':
            searchStore.open();
            closeSidebar();
            break;
        default:
            console.warn(`[TopBar] Unsupported action: "${action}".`);
    }
}

function handlePanel(panel: string, trigger?: HTMLButtonElement) {
    if (panel === 'language' && trigger) {
        languageBtnRef.value = trigger;
    }
    switch (panel) {
        case 'language':
            toggleLanguagePanel();
            break;
        default:
            console.warn(`[TopBar] Unsupported panel: "${panel}".`);
    }
}

function handleSidebarPanel(panel: string) {
    switch (panel) {
        case 'language':
            activePanel.value = activePanel.value === panel ? null : panel;
            break;
        default:
            console.warn(`[TopBar] Unsupported sidebar panel: "${panel}".`);
            activePanel.value = null;
    }
}

function isPopupOpen() {
    return popupRef.value?.hasAttribute('data-open') ?? false;
}

function toggleLanguagePanel() {
    setOpen(!isPopupOpen());
}

function setOpen(open: boolean) {
    clearTimeout(outsideClickTimer);
    outsideClickTimer = undefined;
    if (outsideClickCleanup) {
        outsideClickCleanup();
        outsideClickCleanup = undefined;
    }
    if (open) {
        updatePopupPosition();
        popupRef.value?.setAttribute('data-open', '');
        activePanel.value = 'language';
        setupOutsideClick();
    } else {
        popupRef.value?.removeAttribute('data-open');
        activePanel.value = null;
    }
}

function updatePopupPosition() {
    if (!languageBtnRef.value || !popupRef.value) return;
    const rect = languageBtnRef.value.getBoundingClientRect();
    popupRef.value.style.left = `${rect.left + rect.width / 2}px`;
    popupRef.value.style.top = `${rect.bottom + 8}px`;
}

function selectLanguage(lang: Locale) {
    setLocale(lang);
    setOpen(false);
}

function selectSidebarLanguage(lang: Locale) {
    setLocale(lang);
    activePanel.value = null;
    closeSidebar();
}

function setupOutsideClick() {
    outsideClickTimer = setTimeout(() => {
        outsideClickTimer = undefined;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (!barRef.value?.contains(target) && !popupRef.value?.contains(target)) setOpen(false);
        };
        document.addEventListener('click', handler);
        outsideClickCleanup = () => document.removeEventListener('click', handler);
    }, 0);
}

function setupSidebarOutsideClick() {
    clearTimeout(sidebarOutsideClickTimer);
    sidebarOutsideClickTimer = undefined;
    if (sidebarOutsideClickCleanup) {
        sidebarOutsideClickCleanup();
        sidebarOutsideClickCleanup = undefined;
    }
    sidebarOutsideClickTimer = setTimeout(() => {
        sidebarOutsideClickTimer = undefined;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (!sidebarRef.value?.contains(target)) closeSidebar();
        };
        document.addEventListener('click', handler);
        sidebarOutsideClickCleanup = () => document.removeEventListener('click', handler);
    }, 0);
}

function setupIconMagnifyHover() {
    const el = barRef.value;
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
    return getDockItemActiveState(item, { isDark: isDark.value, activePanel: activePanel.value });
}

function getIcon(display: { icon?: string; iconActive?: string }, active: boolean) {
    return resolveDockIcon(display, active);
}

function getMode(display: { renderMode?: string }) {
    return display.renderMode ?? 'icon';
}

function scrollCurrentPageToTop(): Promise<void> {
    const s = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    if (s) {
        s.scrollTo({ top: 0, behavior: 'smooth' });
        return new Promise((resolve) => {
            const fallback = window.setTimeout(resolve, 1200);
            const onScrollEnd = () => {
                if (s.scrollTop <= 0) {
                    s.removeEventListener('scroll', onScrollEnd);
                    clearTimeout(fallback);
                    resolve();
                }
            };
            s.addEventListener('scroll', onScrollEnd, { passive: true });
            if (s.scrollTop <= 0) {
                s.removeEventListener('scroll', onScrollEnd);
                clearTimeout(fallback);
                resolve();
            }
        });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    return Promise.resolve();
}

function handleLeftClick(e: MouseEvent) {
    if (isMobile.value) {
        e.preventDefault();
        openSidebar();
        return;
    }

    const isCurrentHome = window.location.pathname === '/';
    const s = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    if (isCurrentHome && s) {
        e.preventDefault();
        s.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!isCurrentHome) {
        e.preventDefault();
        scrollCurrentPageToTop().then(() => navigate('/'));
    }
}

function shouldHandleNavigationClick(event: MouseEvent): boolean {
    return (
        event.button === 0 &&
        !event.defaultPrevented &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey
    );
}

function handleDockLinkClick(e: MouseEvent, href: string) {
    if (isDockLinkDisabled(href)) {
        e.preventDefault();
        return;
    }
    if (!shouldHandleNavigationClick(e)) return;
    if (isHashSectionHref(href)) {
        e.preventDefault();
        navigateToHashSection(href);
        return;
    }
    const currentPath = window.location.pathname;
    const targetPath = href;
    if (currentPath === targetPath || currentPath === targetPath + '/') {
        e.preventDefault();
        scrollCurrentPageToTop();
    } else {
        e.preventDefault();
        scrollCurrentPageToTop().then(() => navigate(href));
    }
}

function handleSidebarDockLinkClick(e: MouseEvent, href: string) {
    if (isDockLinkDisabled(href)) {
        e.preventDefault();
        closeSidebar();
        return;
    }
    if (!shouldHandleNavigationClick(e)) {
        closeSidebar();
        return;
    }
    if (isHashSectionHref(href)) {
        e.preventDefault();
        closeSidebar();
        navigateToHashSection(href);
        return;
    }
    const currentPath = window.location.pathname;
    const targetPath = href;
    if (currentPath === targetPath || currentPath === targetPath + '/') {
        e.preventDefault();
        closeSidebar();
        scrollCurrentPageToTop();
    } else {
        e.preventDefault();
        closeSidebar();
        scrollCurrentPageToTop().then(() => navigate(href));
    }
}

function shouldRenderTrailingDivider() {
    const items = siteConfig.dock.items;
    const lastItem = items[items.length - 1];
    return items.length > 0 && lastItem?.type !== 'divider';
}
</script>

<template>
    <!-- Desktop / Mobile bar -->
    <div
        ref="barRef"
        :key="'bar-' + hydrateKey"
        class="top-bar"
        role="toolbar"
        aria-label="Top navigation"
        :style="`${barExpandStyle}; --nav-translate-y: ${navTranslateY}`"
    >
        <a class="top-bar-left" href="/" @click="handleLeftClick">
            <img class="top-bar-avatar" :src="siteConfig.profile.avatar" alt="" width="40" height="40" />
            <span class="top-bar-name">{{ siteConfig.profile.name }}</span>
        </a>

        <div class="top-bar-right">
            <template v-for="(item, index) in siteConfig.dock.items" :key="index">
                <div v-if="item.type === 'divider'" class="top-bar-divider" />

                <template v-else>
                    <button
                        v-if="item.type === 'action'"
                        class="top-bar-dock-item"
                        :class="{ active: getActive(item), 'has-text': getMode(item.display) !== 'icon' }"
                        :title="getLabel(item.display)"
                        :aria-label="getLabel(item.display)"
                        @click="handleAction(item.action)"
                    >
                        <Icon v-if="getMode(item.display) !== 'text'" :name="getIcon(item.display, getActive(item))" />
                        <span
                            v-if="getMode(item.display) === 'text' || getMode(item.display) === 'both'"
                            class="top-bar-dock-label"
                        >
                            {{ getLabel(item.display) }}
                        </span>
                    </button>

                    <button
                        v-else-if="item.type === 'panel'"
                        class="top-bar-dock-item"
                        :class="{ active: getActive(item), 'has-text': getMode(item.display) !== 'icon' }"
                        :title="getLabel(item.display)"
                        :aria-label="getLabel(item.display)"
                        @click="
                            (event: MouseEvent) => handlePanel(item.panel, event.currentTarget as HTMLButtonElement)
                        "
                    >
                        <Icon v-if="getMode(item.display) !== 'text'" :name="getIcon(item.display, getActive(item))" />
                        <span
                            v-if="getMode(item.display) === 'text' || getMode(item.display) === 'both'"
                            class="top-bar-dock-label"
                        >
                            {{ getLabel(item.display) }}
                        </span>
                    </button>

                    <template v-else>
                        <a
                            v-if="item.openInNewTab"
                            :href="item.href"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="top-bar-dock-item"
                            :class="{ 'has-text': getMode(item.display) !== 'icon' }"
                            :title="getLabel(item.display)"
                            :aria-label="getLabel(item.display)"
                        >
                            <Icon v-if="getMode(item.display) !== 'text'" :name="getIcon(item.display, false)" />
                            <span
                                v-if="getMode(item.display) === 'text' || getMode(item.display) === 'both'"
                                class="top-bar-dock-label"
                            >
                                {{ getLabel(item.display) }}
                            </span>
                        </a>
                        <button
                            v-else-if="isDockLinkDisabled(item.href)"
                            type="button"
                            class="top-bar-dock-item disabled"
                            :class="{ 'has-text': getMode(item.display) !== 'icon' }"
                            :title="getLabel(item.display)"
                            :aria-label="getLabel(item.display)"
                            @click="(e: MouseEvent) => handleDockLinkClick(e, item.href)"
                        >
                            <Icon v-if="getMode(item.display) !== 'text'" :name="getIcon(item.display, false)" />
                            <span
                                v-if="getMode(item.display) === 'text' || getMode(item.display) === 'both'"
                                class="top-bar-dock-label"
                            >
                                {{ getLabel(item.display) }}
                            </span>
                        </button>
                        <a
                            v-else
                            :href="item.href"
                            class="top-bar-dock-item"
                            :class="{ 'has-text': getMode(item.display) !== 'icon' }"
                            :title="getLabel(item.display)"
                            :aria-label="getLabel(item.display)"
                            @click="(e: MouseEvent) => handleDockLinkClick(e, item.href)"
                        >
                            <Icon v-if="getMode(item.display) !== 'text'" :name="getIcon(item.display, false)" />
                            <span
                                v-if="getMode(item.display) === 'text' || getMode(item.display) === 'both'"
                                class="top-bar-dock-label"
                            >
                                {{ getLabel(item.display) }}
                            </span>
                        </a>
                    </template>
                </template>
            </template>
        </div>
    </div>

    <!-- Desktop language popup -->
    <div
        ref="popupRef"
        :key="'popup-' + hydrateKey"
        class="top-bar-language-popup"
        role="dialog"
        aria-label="Language selection"
    >
        <div class="top-bar-popup-title">
            {{ t('dock.language') }}
        </div>
        <div role="listbox" aria-label="Language" class="top-bar-popup-list">
            <div
                v-for="lang in siteConfig.i18n.locales"
                :key="lang"
                class="top-bar-popup-option"
                :class="{ selected: locale === lang }"
                role="option"
                :aria-selected="locale === lang"
                @click="selectLanguage(lang)"
            >
                <Icon name="check" class="check-icon" />
                <span>{{ t(`dock.lang.${lang}`) }}</span>
            </div>
        </div>
    </div>

    <!-- Mobile sidebar -->
    <div
        v-if="isMobile"
        ref="sidebarRef"
        class="top-bar-sidebar"
        :class="{ 'theme-light': !isDark, 'theme-dark': isDark }"
        :data-open="sidebarOpen ? '' : undefined"
        role="dialog"
        aria-label="Menu"
    >
        <div class="sidebar-header">
            <div class="sidebar-avatar-frame">
                <img
                    :src="siteConfig.profile.avatar"
                    alt=""
                    class="sidebar-avatar"
                    width="48"
                    height="48"
                    loading="lazy"
                    decoding="async"
                />
            </div>
            <span class="sidebar-name">{{ siteConfig.profile.name }}</span>
        </div>

        <div class="sidebar-divider" />

        <template v-for="(item, index) in siteConfig.dock.items" :key="index">
            <div v-if="item.type === 'divider'" class="sidebar-divider" />

            <template v-else>
                <div v-if="item.type === 'panel'" class="sidebar-menu-group">
                    <button
                        class="sidebar-menu-item"
                        :class="{ active: getActive(item), expanded: getActive(item) }"
                        :aria-label="getLabel(item.display)"
                        :aria-expanded="getActive(item)"
                        @click="handleSidebarPanel(item.panel)"
                    >
                        <Icon :name="getIcon(item.display, getActive(item))" class="sidebar-menu-icon" />
                        <span>{{ getLabel(item.display) }}</span>
                        <Icon name="fa-solid fa-chevron-down" class="expand-icon" />
                    </button>
                    <div
                        v-if="item.panel === 'language'"
                        class="sidebar-submenu"
                        :class="{ expanded: activePanel === item.panel }"
                        role="listbox"
                        aria-label="Language"
                    >
                        <div
                            v-for="lang in siteConfig.i18n.locales"
                            :key="lang"
                            class="sidebar-submenu-item"
                            :class="{ selected: locale === lang }"
                            role="option"
                            :aria-selected="locale === lang"
                            @click="selectSidebarLanguage(lang)"
                        >
                            <Icon name="check" class="check-icon" />
                            <span>{{ t(`dock.lang.${lang}`) }}</span>
                        </div>
                    </div>
                </div>

                <button
                    v-else-if="item.type === 'action'"
                    class="sidebar-menu-item"
                    :class="{ active: getActive(item) }"
                    :aria-label="getLabel(item.display)"
                    @click="handleAction(item.action)"
                >
                    <Icon :name="getIcon(item.display, getActive(item))" class="sidebar-menu-icon" />
                    <span>{{ getLabel(item.display) }}</span>
                </button>

                <template v-else>
                    <a
                        v-if="item.openInNewTab"
                        :href="item.href"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="sidebar-menu-item"
                        :aria-label="getLabel(item.display)"
                        @click="closeSidebar()"
                    >
                        <Icon :name="getIcon(item.display, false)" class="sidebar-menu-icon" />
                        <span>{{ getLabel(item.display) }}</span>
                    </a>
                    <button
                        v-else-if="isDockLinkDisabled(item.href)"
                        type="button"
                        class="sidebar-menu-item disabled"
                        :aria-label="getLabel(item.display)"
                        @click="(e: MouseEvent) => handleSidebarDockLinkClick(e, item.href)"
                    >
                        <Icon :name="getIcon(item.display, false)" class="sidebar-menu-icon" />
                        <span>{{ getLabel(item.display) }}</span>
                    </button>
                    <a
                        v-else
                        :href="item.href"
                        class="sidebar-menu-item"
                        :aria-label="getLabel(item.display)"
                        @click="(e: MouseEvent) => handleSidebarDockLinkClick(e, item.href)"
                    >
                        <Icon :name="getIcon(item.display, false)" class="sidebar-menu-icon" />
                        <span>{{ getLabel(item.display) }}</span>
                    </a>
                </template>
            </template>
        </template>

        <div v-if="shouldRenderTrailingDivider()" class="sidebar-divider" />
    </div>

    <!-- Mobile sidebar overlay -->
    <div
        v-if="isMobile"
        class="top-bar-sidebar-overlay"
        :data-open="sidebarOpen ? '' : undefined"
        @click="closeSidebar()"
    />
</template>
