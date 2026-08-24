<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from '../composables/useI18n';
import Icon from './Icon.vue';
import {
    FONT_SCALE_MIN,
    FONT_SCALE_MAX,
    LINE_HEIGHT_LEVELS,
    WIDTH_LEVELS,
    nextFontScale,
    normalizeLineHeight,
    normalizeWidth,
    readStoredSettings,
    persistSettings,
    readStoredFocusMode,
    persistFocusMode,
    type ReadingSettings
} from '../lib/reading-settings';
import { isArticleStarted } from '../lib/article-scroll';

const { t } = useI18n();

const settings = ref<ReadingSettings>({
    fontScale: 1,
    lineHeight: 1.8,
    widthPx: 840
});
const focusMode = ref(false);

// ===== 阅读设置「Aa」模态框 =====
const settingsOpen = ref(false);
// Teleport emits server-side anchor comments even when its child is hidden.
// Keep it out of the SSR/client hydration tree until the island has mounted so
// the first client render matches the static markup exactly.
const teleportReady = ref(false);
const settingsTriggerRef = ref<HTMLButtonElement>();
const dialogRef = ref<HTMLElement>();

const atFontMin = computed(() => settings.value.fontScale <= FONT_SCALE_MIN);
const atFontMax = computed(() => settings.value.fontScale >= FONT_SCALE_MAX);
const fontPercent = computed(() => Math.round(settings.value.fontScale * 100));

const lineHeightIndex = computed(() => {
    const index = LINE_HEIGHT_LEVELS.indexOf(settings.value.lineHeight);
    return index >= 0 ? index : 1;
});

const widthIndex = computed(() => {
    const index = WIDTH_LEVELS.indexOf(settings.value.widthPx);
    return index >= 0 ? index : 1;
});

const lineHeightLabels = computed(() => [
    t('article.reading.lineHeight.compact'),
    t('article.reading.lineHeight.normal'),
    t('article.reading.lineHeight.loose')
]);

const widthLabels = computed(() => [
    t('article.reading.width.narrow'),
    t('article.reading.width.medium'),
    t('article.reading.width.wide')
]);

// ===== dock 显隐：翻到正文开始才一起出现 =====
const dockVisible = ref(false);
let scrollerEl: HTMLElement | null = null;
let scrollFrame: number | null = null;
let scrollCleanup: (() => void) | null = null;

function getScroller(): HTMLElement | null {
    const el = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    return el instanceof HTMLElement ? el : null;
}

function updateDockVisibility(): void {
    if (!scrollerEl || scrollerEl.scrollTop <= 0) {
        dockVisible.value = false;
        return;
    }
    dockVisible.value = isArticleStarted(scrollerEl);
}

function scheduleDockVisibilityUpdate(): void {
    if (scrollFrame !== null) return;
    scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        updateDockVisibility();
    });
}

function attachScrollListener(): void {
    scrollCleanup?.();
    scrollCleanup = null;
    scrollerEl = getScroller();
    if (!scrollerEl) {
        dockVisible.value = false;
        return;
    }
    const handler = scheduleDockVisibilityUpdate;
    scrollerEl.addEventListener('scroll', handler, { passive: true });
    updateDockVisibility();
    scrollCleanup = () => scrollerEl?.removeEventListener('scroll', handler);
}

function scrollToTop(): void {
    const scroller = scrollerEl ?? getScroller();
    if (scroller) scroller.scrollTo({ top: 0, behavior: 'smooth' });
}

function notifyLayoutChange(): void {
    if (typeof window === 'undefined') return;
    // The TOC side panel anchors to the .post-container right edge; a width
    // change (width control or focus mode) moves that edge, so nudge a re-measure.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}

function applySettings(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--article-font-scale', String(settings.value.fontScale));
    root.style.setProperty('--article-line-height', String(settings.value.lineHeight));
    root.style.setProperty('--article-width', `${settings.value.widthPx}px`);
    persistSettings(settings.value);
    notifyLayoutChange();
}

function applyFocusMode(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('is-focus-mode', focusMode.value);
    persistFocusMode(focusMode.value);
    notifyLayoutChange();
}

function decreaseFont(): void {
    settings.value.fontScale = nextFontScale(settings.value.fontScale, -1);
    applySettings();
}

function increaseFont(): void {
    settings.value.fontScale = nextFontScale(settings.value.fontScale, 1);
    applySettings();
}

function setLineHeight(level: number): void {
    settings.value.lineHeight = normalizeLineHeight(level);
    applySettings();
}

function setWidth(widthPx: number): void {
    settings.value.widthPx = normalizeWidth(widthPx);
    applySettings();
}

function toggleFocus(): void {
    focusMode.value = !focusMode.value;
    applyFocusMode();
}

// ===== 「Aa」模态框开关与关闭 =====
function openSettings(): void {
    settingsOpen.value = true;
    nextTick(() => dialogRef.value?.focus());
}

function closeSettings(): void {
    settingsOpen.value = false;
}

function toggleSettings(): void {
    if (settingsOpen.value) closeSettings();
    else openSettings();
}

function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && settingsOpen.value) {
        closeSettings();
        settingsTriggerRef.value?.focus();
    }
}

onMounted(() => {
    teleportReady.value = true;
    settings.value = readStoredSettings();
    focusMode.value = readStoredFocusMode();
    applySettings();
    applyFocusMode();
    attachScrollListener();
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('astro:page-load', attachScrollListener);
});

onUnmounted(() => {
    // Reading settings live on the article page only. Clear the root-level
    // overrides when navigating away so nothing leaks onto home/list pages.
    if (typeof document !== 'undefined') {
        const root = document.documentElement;
        root.style.removeProperty('--article-font-scale');
        root.style.removeProperty('--article-line-height');
        root.style.removeProperty('--article-width');
        root.classList.remove('is-focus-mode');
        document.removeEventListener('keydown', onKeydown);
        document.removeEventListener('astro:page-load', attachScrollListener);
    }
    if (scrollFrame !== null) {
        window.cancelAnimationFrame(scrollFrame);
        scrollFrame = null;
    }
    scrollCleanup?.();
    scrollCleanup = null;
    scrollerEl = null;
});
</script>

<template>
    <div class="article-dock" :class="{ 'article-dock--hidden': !dockVisible }">
        <button type="button" class="article-dock__fab" :aria-label="t('article.dock.backToTop')" @click="scrollToTop">
            <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <path d="M12 19V5M6 11l6-6 6 6"></path>
            </svg>
        </button>

        <button
            ref="settingsTriggerRef"
            type="button"
            class="article-dock__fab article-dock__fab--aa"
            :class="{ 'article-dock__fab--active': settingsOpen }"
            :aria-label="t('article.reading.controls')"
            :aria-expanded="settingsOpen"
            aria-haspopup="dialog"
            @click="toggleSettings"
        >
            Aa
        </button>
    </div>

    <Teleport v-if="teleportReady" to="body">
        <Transition name="dock-popover">
            <div v-if="settingsOpen" class="article-dock__overlay" @click="closeSettings">
                <div
                    ref="dialogRef"
                    class="article-dock__popover"
                    role="dialog"
                    aria-modal="true"
                    :aria-label="t('article.reading.controls')"
                    tabindex="-1"
                    @click.stop
                >
                    <div class="article-dock__popover-group" role="group" :aria-label="t('article.reading.fontSize')">
                        <span class="article-dock__popover-label">{{ t('article.reading.fontSize') }}</span>
                        <div class="article-dock__popover-row">
                            <button
                                type="button"
                                class="article-dock__btn article-dock__btn--font"
                                :aria-label="t('article.reading.fontSize.decrease')"
                                :disabled="atFontMin"
                                @click="decreaseFont"
                            >
                                A−
                            </button>
                            <span class="article-dock__popover-value">{{ fontPercent }}%</span>
                            <button
                                type="button"
                                class="article-dock__btn article-dock__btn--font"
                                :aria-label="t('article.reading.fontSize.increase')"
                                :disabled="atFontMax"
                                @click="increaseFont"
                            >
                                A+
                            </button>
                        </div>
                    </div>

                    <div class="article-dock__popover-group" role="group" :aria-label="t('article.reading.lineHeight')">
                        <span class="article-dock__popover-label">{{ t('article.reading.lineHeight') }}</span>
                        <div class="article-dock__popover-row">
                            <button
                                v-for="(level, index) in LINE_HEIGHT_LEVELS"
                                :key="`line-height-${level}`"
                                type="button"
                                class="article-dock__btn article-dock__btn--seg"
                                :class="{ 'article-dock__btn--active': index === lineHeightIndex }"
                                :aria-pressed="index === lineHeightIndex"
                                @click="setLineHeight(level)"
                            >
                                {{ lineHeightLabels[index] }}
                            </button>
                        </div>
                    </div>

                    <div class="article-dock__popover-group" role="group" :aria-label="t('article.reading.width')">
                        <span class="article-dock__popover-label">{{ t('article.reading.width') }}</span>
                        <div class="article-dock__popover-row">
                            <button
                                v-for="(width, index) in WIDTH_LEVELS"
                                :key="`width-${width}`"
                                type="button"
                                class="article-dock__btn article-dock__btn--seg"
                                :class="{ 'article-dock__btn--active': index === widthIndex }"
                                :aria-pressed="index === widthIndex"
                                @click="setWidth(width)"
                            >
                                {{ widthLabels[index] }}
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        class="article-dock__btn article-dock__btn--focus"
                        :class="{ 'article-dock__btn--active': focusMode }"
                        :aria-pressed="focusMode"
                        :aria-label="focusMode ? t('article.reading.focus.disable') : t('article.reading.focus.enable')"
                        @click="toggleFocus"
                    >
                        <Icon :name="focusMode ? 'compress' : 'expand'" size="14px" />
                        <span>{{ t('article.reading.focus') }}</span>
                    </button>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
