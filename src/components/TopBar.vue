<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import Icon from './Icon.vue';
import type { Locale } from '../data/i18n';
import { getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel } from '../lib/dock';
import { useI18n } from '../composables/useI18n';
import { useTheme } from '../composables/useTheme';
import { useHomepage } from '../composables/useHomepage';
import { isHomePageDocument } from '../lib/homepage-context';
import { siteConfig } from '../data/site';

const props = defineProps<{
    initialIsHomePage: boolean;
}>();

const { t, setLocale, locale } = useI18n();
const { isDark, toggle: toggleTheme } = useTheme();
const { subscribeStateChange } = useHomepage();

const activePanel = ref<string | null>(null);

const barRef = ref<HTMLDivElement>();
const popupRef = ref<HTMLDivElement>();
const languageBtnRef = ref<HTMLButtonElement>();
let outsideClickCleanup: (() => void) | undefined;
let magnifyCleanup: (() => void) | undefined;

const isMobile = ref(typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);
const scrollProgress = ref(0);
const isHomePage = ref(props.initialIsHomePage);

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
    const start = scrollProgress.value;
    const delta = target - start;
    if (Math.abs(delta) < 0.001) {
        scrollProgress.value = target;
        return;
    }

    const duration = 460;
    const startTime = performance.now();

    const tick = (now: number) => {
        const t = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        scrollProgress.value = start + delta * eased;
        if (t >= 1) {
            progressAnimationId = null;
            return;
        }
        progressAnimationId = requestAnimationFrame(tick);
    };

    progressAnimationId = requestAnimationFrame(tick);
}

const topBarOpacity = computed(() => {
    if (!isHomePage.value) return 1;
    if (!isMobile.value) return 1;
    const sp = scrollProgress.value;
    if (sp <= 0.15) return 0;
    if (sp >= 0.4) return 1;
    return (sp - 0.15) / 0.25;
});

const expansionProgress = computed(() => {
    if (!isHomePage.value) return 1;
    if (isMobile.value) return 1;
    const sp = scrollProgress.value;
    if (sp <= 0.02) return 0;
    if (sp >= 0.45) return 1;
    const raw = (sp - 0.02) / 0.43;
    return 1 - Math.pow(1 - raw, 4);
});

const barStyle = computed(() => {
    if (!isHomePage.value) return 'opacity: 1; transform: translateX(0)';
    if (isMobile.value) return `opacity: ${topBarOpacity.value}; transform: translateX(0)`;
    const p = expansionProgress.value;
    return `opacity: 1; transform: translateX(calc(var(--left-panel-width, 500px) * ${1 - p}))`;
});

const rightStyle = computed(() => {
    if (!isHomePage.value) return 'transform: translateX(0)';
    if (isMobile.value) return 'transform: translateX(0)';
    const p = expansionProgress.value;
    return `transform: translateX(calc(var(--left-panel-width, 500px) * ${p - 1}))`;
});

const leftStyle = computed(() => {
    if (!isHomePage.value || isMobile.value) return '';
    const p = expansionProgress.value;
    const x = (1 - expansionProgress.value) * 18;
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
            scrollProgress.value = nextProgress;
        }
        const handleScroll = (_e: Event) => {
            stopProgressAnimation();
            scrollProgress.value = Math.min(scrollerEl!.scrollTop / window.innerHeight, 1);
        };
        scrollerEl.addEventListener('scroll', handleScroll, { passive: true });
        scrollHandler = handleScroll;
    } else {
        if (animateProgress) {
            animateScrollProgressTo(1);
        } else {
            stopProgressAnimation();
            scrollProgress.value = 1;
        }
    }
}

function setupViewportMediaSync() {
    const mql = window.matchMedia('(max-width: 900px)');
    const handleMediaChange = (event: MediaQueryListEvent) => {
        isMobile.value = event.matches;
    };
    mql.addEventListener('change', handleMediaChange);

    return () => mql.removeEventListener('change', handleMediaChange);
}

onMounted(() => {
    const cleanups: Array<() => void> = [];
    bindScroll(false);
    cleanups.push(setupViewportMediaSync());
    cleanups.push(
        subscribeStateChange((next: boolean) => {
            const stateChanged = next !== isHomePage.value;
            isHomePage.value = next;
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

watch([isMobile, isHomePage, barRef], () => {
    if (magnifyCleanup) {
        magnifyCleanup();
        magnifyCleanup = undefined;
    }

    if (!barRef.value || isMobile.value || !isHomePage.value) return;
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

function isPopupOpen() {
    return popupRef.value?.hasAttribute('data-open') ?? false;
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

function setupOutsideClick() {
    setTimeout(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (!barRef.value?.contains(target) && !popupRef.value?.contains(target)) setOpen(false);
        };
        document.addEventListener('click', handler);
        outsideClickCleanup = () => document.removeEventListener('click', handler);
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
</script>

<template>
    <div ref="barRef" class="top-bar" role="toolbar" aria-label="Top navigation" :style="barStyle">
        <a
            class="top-bar-left"
            href="/"
            :style="leftStyle"
            @click="
                (e: MouseEvent) => {
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
                }
            "
            :role="isMobile ? 'button' : undefined"
            :aria-label="isMobile ? 'Open menu' : undefined"
        >
            <img class="top-bar-avatar" :src="siteConfig.profile.avatar" alt="" width="40" height="40" />
            <span class="top-bar-name">{{ siteConfig.profile.name }}</span>
        </a>

        <div class="top-bar-right" :style="rightStyle">
            <template v-for="(item, index) in siteConfig.dock.items" :key="index">
                <div v-if="item.type === 'divider'" class="top-bar-divider"></div>

                <template v-else>
                    <button
                        v-if="item.type === 'action'"
                        class="top-bar-dock-item"
                        :class="{ active: getActive(item), 'has-text': getMode(item.display) !== 'icon' }"
                        @click="handleAction(item.action)"
                        :title="getLabel(item.display)"
                        :aria-label="getLabel(item.display)"
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
                        @click="
                            (event: MouseEvent) => handlePanel(item.panel, event.currentTarget as HTMLButtonElement)
                        "
                        :title="getLabel(item.display)"
                        :aria-label="getLabel(item.display)"
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
                        <a
                            v-else
                            :href="isDockLinkDisabled(item.href) ? undefined : item.href"
                            class="top-bar-dock-item"
                            :class="{
                                disabled: isDockLinkDisabled(item.href),
                                'has-text': getMode(item.display) !== 'icon'
                            }"
                            :title="getLabel(item.display)"
                            :aria-label="getLabel(item.display)"
                            @click="
                                (e: MouseEvent) => {
                                    if (isDockLinkDisabled(item.href)) {
                                        e.preventDefault();
                                        return;
                                    }
                                    const currentPath = window.location.pathname;
                                    const targetPath = item.href;
                                    if (currentPath === targetPath || currentPath === targetPath + '/') {
                                        e.preventDefault();
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }
                            "
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

    <div ref="popupRef" class="top-bar-language-popup" role="dialog" aria-label="Language selection">
        <div class="top-bar-popup-title">{{ t('dock.language') }}</div>
        <div
            v-for="lang in siteConfig.i18n.locales"
            :key="lang"
            class="top-bar-popup-option"
            :class="{ selected: locale === lang }"
            @click="selectLanguage(lang)"
            role="option"
            :aria-selected="locale === lang"
        >
            <Icon name="check" class="check-icon" />
            <span>{{ t(`dock.lang.${lang}`) }}</span>
        </div>
    </div>
</template>
