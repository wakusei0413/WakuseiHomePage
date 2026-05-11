<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import Icon from './Icon.vue';
import type { Locale } from '../data/i18n';
import { getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel } from '../lib/dock';
import { useI18n } from '../composables/useI18n';
import { useTheme } from '../composables/useTheme';
import { siteConfig } from '../data/site';

const { t, setLocale, locale } = useI18n();
const { isDark, toggle: toggleTheme } = useTheme();

const activePanel = ref<string | null>(null);
const open = ref(false);

const sidebarRef = ref<HTMLDivElement>();
let outsideClickCleanup: (() => void) | undefined;

function close() {
    open.value = false;
}

function getLangLabel(display: { text?: string; i18nKey?: string }) {
    return resolveDockLabel(display, t);
}

function getLangActive(item: { type: string; action?: string; panel?: string }) {
    return getDockItemActiveState(item, { isDark: isDark.value, activePanel: activePanel.value });
}

function getLangIcon(display: { icon?: string; iconActive?: string }, active: boolean) {
    return resolveDockIcon(display, active);
}

onMounted(() => {
    const handleOpen = () => (open.value = true);
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
            activePanel.value = activePanel.value === panel ? null : panel;
            break;
        default:
            console.warn(`[MobileDockSidebar] Unsupported panel: "${panel}".`);
            activePanel.value = null;
    }
}

function selectLanguage(lang: Locale) {
    setLocale(lang);
    activePanel.value = null;
    close();
}

function setupOutsideClick() {
    setTimeout(() => {
        const handler = (e: MouseEvent) => {
            if (!sidebarRef.value?.contains(e.target as Node)) close();
        };
        document.addEventListener('click', handler);
        outsideClickCleanup = () => document.removeEventListener('click', handler);
    }, 0);
}

watch(open, (isOpen) => {
    if (isOpen) {
        setupOutsideClick();
    } else {
        activePanel.value = null;
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

<template>
    <div
        ref="sidebarRef"
        class="mobile-dock-sidebar"
        :class="{ 'theme-light': !isDark, 'theme-dark': isDark }"
        :data-open="open ? '' : undefined"
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

        <div class="sidebar-divider"></div>

        <template v-for="(item, index) in siteConfig.dock.items" :key="index">
            <div v-if="item.type === 'divider'" class="sidebar-divider"></div>

            <template v-else>
                <div v-if="item.type === 'panel'" class="sidebar-menu-group">
                    <button
                        class="sidebar-menu-item"
                        :class="{ active: getLangActive(item), expanded: getLangActive(item) }"
                        @click="handlePanel(item.panel)"
                        :aria-label="getLangLabel(item.display)"
                        :aria-expanded="getLangActive(item)"
                    >
                        <Icon :name="getLangIcon(item.display, getLangActive(item))" class="sidebar-menu-icon" />
                        <span>{{ getLangLabel(item.display) }}</span>
                        <Icon name="fa-solid fa-chevron-down" class="expand-icon" />
                    </button>
                    <div
                        v-if="item.panel === 'language'"
                        class="sidebar-submenu"
                        :class="{ expanded: activePanel === item.panel }"
                    >
                        <div
                            v-for="lang in siteConfig.i18n.locales"
                            :key="lang"
                            class="sidebar-submenu-item"
                            :class="{ selected: locale === lang }"
                            @click="selectLanguage(lang)"
                            role="option"
                            :aria-selected="locale === lang"
                        >
                            <Icon name="check" class="check-icon" />
                            <span>{{ t(`dock.lang.${lang}`) }}</span>
                        </div>
                    </div>
                </div>

                <button
                    v-else-if="item.type === 'action'"
                    class="sidebar-menu-item"
                    :class="{ active: getLangActive(item) }"
                    @click="handleAction(item.action)"
                    :aria-label="getLangLabel(item.display)"
                >
                    <Icon :name="getLangIcon(item.display, getLangActive(item))" class="sidebar-menu-icon" />
                    <span>{{ getLangLabel(item.display) }}</span>
                </button>

                <template v-else>
                    <a
                        v-if="item.openInNewTab"
                        :href="item.href"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="sidebar-menu-item"
                        :aria-label="getLangLabel(item.display)"
                        @click="close()"
                    >
                        <Icon :name="getLangIcon(item.display, false)" class="sidebar-menu-icon" />
                        <span>{{ getLangLabel(item.display) }}</span>
                    </a>
                    <a
                        v-else
                        :href="isDockLinkDisabled(item.href) ? undefined : item.href"
                        class="sidebar-menu-item"
                        :class="{ disabled: isDockLinkDisabled(item.href) }"
                        :aria-label="getLangLabel(item.display)"
                        @click="
                            (e: MouseEvent) => {
                                if (isDockLinkDisabled(item.href)) {
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
                            }
                        "
                    >
                        <Icon :name="getLangIcon(item.display, false)" class="sidebar-menu-icon" />
                        <span>{{ getLangLabel(item.display) }}</span>
                    </a>
                </template>
            </template>
        </template>

        <div v-if="shouldRenderTrailingDivider()" class="sidebar-divider"></div>
    </div>

    <div class="mobile-dock-sidebar-overlay" :data-open="open ? '' : undefined" @click="close()"></div>
</template>
