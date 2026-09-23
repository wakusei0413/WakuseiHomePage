<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Icon from './Icon.vue';
import { copyText } from '../lib/clipboard';
import { isCopyLink, resolveCopyUrl } from '../lib/social-link';
import { useI18n } from '../composables/useI18n';
import type { SocialLink, SocialLinksConfig } from '../types/site';

const cycleColors = ['#ffe600', '#ff3e3e', '#3e59ff'];
const ITEMS_PER_PAGE = 6;
/** 略长于复制按钮的 1600ms：这段时间里同时展示「已复制」和使用说明。 */
const COPIED_DURATION = 2400;

const props = defineProps<{
    config: SocialLinksConfig;
}>();

const { t } = useI18n();

const currentPage = ref(0);
const transitionDirection = ref<'next' | 'prev' | null>(null);
const animationKey = ref(0);
const navRef = ref<HTMLElement>();
let suppressNextClick = false;
let suppressClickTimer: ReturnType<typeof setTimeout> | undefined;
let mountedCleanup: (() => void) | undefined;

/** 刚复制过地址的那张卡片；同时驱动卡片内反馈与 live region 播报。 */
const copiedName = ref('');
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

const liveMessage = computed(() => (copiedName.value ? t('social.copy.done') : ''));

function resolveSiteOrigin(): string {
    // Astro 在构建期把 import.meta.env.SITE 替换成字面量，客户端产物里也一样，
    // 所以这里能拿到配置的正式域名（不是访客当前访问的地址）。
    const configured = import.meta.env.SITE;
    if (configured) return configured;
    return typeof window === 'undefined' ? '' : window.location.origin;
}

function resetCopiedState() {
    clearTimeout(copiedTimer);
    copiedTimer = undefined;
    copiedName.value = '';
}

async function copyLink(link: SocialLink, anchor: HTMLAnchorElement) {
    const ok = await copyText(resolveCopyUrl(link.url, resolveSiteOrigin()));
    if (!ok || !anchor.isConnected) return;

    // 同一张卡片连点：重置计时而不是叠加多个定时器。
    clearTimeout(copiedTimer);
    copiedName.value = link.name;
    copiedTimer = setTimeout(() => {
        copiedTimer = undefined;
        copiedName.value = '';
    }, COPIED_DURATION);
}

/** 带修饰键或非左键的点击是「我就是要打开原始 XML」的逃生口，不做拦截。 */
function isModifiedClick(event: MouseEvent): boolean {
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

const totalPages = computed(() => Math.max(1, Math.ceil(props.config.links.length / ITEMS_PER_PAGE)));
const pages = computed(() => {
    const result: SocialLink[][] = [];
    for (let i = 0; i < props.config.links.length; i += ITEMS_PER_PAGE) {
        result.push(props.config.links.slice(i, i + ITEMS_PER_PAGE));
    }
    if (result.length === 0) {
        result.push([]);
    }
    return result;
});
const currentLinks = computed(() => pages.value[currentPage.value] ?? []);

function getLinkColor(link: SocialLink, globalIndex: number): string {
    return link.color ?? (props.config.colorScheme === 'same' ? cycleColors[0] : cycleColors[globalIndex % 3]);
}

function isMailTo(url: string): boolean {
    return url.startsWith('mailto:');
}

function showPage(target: number) {
    const clamped = Math.max(0, Math.min(target, totalPages.value - 1));
    if (clamped === currentPage.value) return;
    transitionDirection.value = target > currentPage.value ? 'next' : 'prev';
    currentPage.value = clamped;
    animationKey.value += 1;
    clearAllHoveredStates();
}

function setHoveredState(element: HTMLElement, hovered: boolean) {
    element.classList.toggle('is-hovered', hovered);
}

function clearAllHoveredStates() {
    if (!navRef.value) return;
    navRef.value.querySelectorAll('.social-link-slot.is-hovered').forEach((element) => {
        element.classList.remove('is-hovered');
    });
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && navRef.value.contains(activeElement)) {
        activeElement.blur();
    }
}

function clearHoveredStateOnNavigate(linkElement: HTMLAnchorElement) {
    const slot = linkElement.closest('.social-link-slot');
    if (slot) setHoveredState(slot as HTMLElement, false);
    linkElement.blur();
}

function isInteractiveTarget(target: EventTarget | null) {
    const element = target as HTMLElement | null;
    if (!element) return false;
    return !!element.closest('a, button, [role="button"]');
}

function handleLinkClick(event: MouseEvent, linkElement: HTMLAnchorElement, link: SocialLink) {
    if (suppressNextClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressNextClick = false;
        clearHoveredStateOnNavigate(linkElement);
        return;
    }

    if (isCopyLink(link) && !isModifiedClick(event)) {
        event.preventDefault();
        // 立即解除焦点与悬停态，让卡片直接退回静止态与其他按钮保持一致；
        // 复制成功的提示由上方弹出的浮动气泡（Toast）展示。
        clearHoveredStateOnNavigate(linkElement);
        void copyLink(link, linkElement);
        return;
    }

    clearHoveredStateOnNavigate(linkElement);
}

onMounted(() => {
    const wrapper = navRef.value;
    if (!wrapper) return;

    window.addEventListener('pagehide', clearAllHoveredStates);
    window.addEventListener('pageshow', clearAllHoveredStates);

    if (totalPages.value <= 1) {
        mountedCleanup = () => {
            window.removeEventListener('pagehide', clearAllHoveredStates);
            window.removeEventListener('pageshow', clearAllHoveredStates);
            // 复制反馈的状态不随路由切换保留：离开页面时连定时器一起丢掉。
            resetCopiedState();
        };
        return;
    }

    let isDown = false;
    let startX = 0;
    let wheelLocked = false;
    let wheelSettlingTimer: ReturnType<typeof setTimeout> | undefined;

    function handlePointerDown(e: PointerEvent) {
        if (isInteractiveTarget(e.target)) return;
        isDown = true;
        suppressNextClick = false;
        startX = e.pageX - wrapper.offsetLeft;
        wrapper.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isDown) return;
        const dragX = e.pageX - wrapper.offsetLeft;
        if (Math.abs(dragX - startX) < 6) return;
        e.preventDefault();
    }

    function handlePointerUp(e: PointerEvent) {
        if (!isDown) return;
        isDown = false;
        if (wrapper.hasPointerCapture(e.pointerId)) {
            wrapper.releasePointerCapture(e.pointerId);
        }
        const dragX = e.pageX - wrapper.offsetLeft;
        const dragDistance = dragX - startX;
        if (Math.abs(dragDistance) < 36) return;
        suppressNextClick = true;
        clearTimeout(suppressClickTimer);
        suppressClickTimer = setTimeout(() => (suppressNextClick = false), 300);
        showPage(currentPage.value + (dragDistance < 0 ? 1 : -1));
    }

    function renewWheelLock() {
        clearTimeout(wheelSettlingTimer);
        wheelSettlingTimer = setTimeout(() => (wheelLocked = false), 450);
    }

    function handleWheel(e: WheelEvent) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        const direction = Math.sign(e.deltaY);
        if (direction === 0) return;
        if (wheelLocked) {
            e.preventDefault();
            renewWheelLock();
            return;
        }
        const target = Math.max(0, Math.min(currentPage.value + direction, totalPages.value - 1));
        if (target === currentPage.value) return;
        e.preventDefault();
        wheelLocked = true;
        renewWheelLock();
        showPage(target);
    }

    wrapper.addEventListener('pointerdown', handlePointerDown);
    wrapper.addEventListener('pointermove', handlePointerMove);
    wrapper.addEventListener('pointerup', handlePointerUp);
    wrapper.addEventListener('wheel', handleWheel, { passive: false });

    mountedCleanup = () => {
        clearTimeout(wheelSettlingTimer);
        clearTimeout(suppressClickTimer);
        resetCopiedState();
        window.removeEventListener('pagehide', clearAllHoveredStates);
        window.removeEventListener('pageshow', clearAllHoveredStates);
        wrapper.removeEventListener('pointerdown', handlePointerDown);
        wrapper.removeEventListener('pointermove', handlePointerMove);
        wrapper.removeEventListener('pointerup', handlePointerUp);
        wrapper.removeEventListener('wheel', handleWheel);
    };
});

onUnmounted(() => {
    mountedCleanup?.();
    // onMounted 可能根本没跑到挂载清理（navRef 缺失），兜底再清一次。
    resetCopiedState();
});
</script>

<template>
    <nav id="socialLinks" ref="navRef" class="social-links-wrapper">
        <div
            id="socialLinksPage"
            class="social-links-page"
            :data-page-key="animationKey"
            :class="{
                'is-swap-fade': transitionDirection !== null,
                'is-animation-alt': animationKey % 2 === 1
            }"
            @animationend="() => (transitionDirection = null)"
        >
            <div
                v-for="(link, index) in currentLinks"
                :key="link.url + index"
                class="social-link-slot"
                :class="{ 'is-copied': copiedName === link.name }"
                @pointerenter="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, true)"
                @pointerleave="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, false)"
                @pointerdown="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, true)"
                @pointerup="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, false)"
                @pointercancel="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, false)"
            >
                <a
                    :href="link.url"
                    :aria-label="isCopyLink(link) ? t('social.copy.aria', { name: link.name }) : link.name"
                    :target="isMailTo(link.url) ? '_self' : '_blank'"
                    :rel="isMailTo(link.url) ? undefined : 'noopener noreferrer'"
                    class="social-link social-link--custom"
                    :style="`--custom-color: ${getLinkColor(link, currentPage * ITEMS_PER_PAGE + index)}`"
                    @click="
                        (event: MouseEvent) => handleLinkClick(event, event.currentTarget as HTMLAnchorElement, link)
                    "
                    @blur="
                        (event: FocusEvent) => {
                            const slot = (event.currentTarget as HTMLElement).closest('.social-link-slot');
                            if (slot) setHoveredState(slot as HTMLElement, false);
                        }
                    "
                >
                    <Icon v-if="link.icon" :name="link.icon" class="social-icon" size="1.25rem" />
                    <span class="link-label">{{ link.name }}</span>
                </a>

                <Transition name="social-toast">
                    <div v-if="copiedName === link.name" class="social-link-toast" role="tooltip" aria-hidden="true">
                        <div class="social-link-toast__header">
                            <Icon name="check" class="social-link-toast__icon" size="0.85rem" />
                            <span class="social-link-toast__title">{{ t('social.copy.toast') }}</span>
                        </div>
                        <p class="social-link-toast__hint">{{ t('social.copy.hint') }}</p>
                    </div>
                </Transition>
            </div>

            <div
                v-for="(_, i) in ITEMS_PER_PAGE - currentLinks.length"
                :key="'placeholder-' + i"
                class="social-link-slot social-link-slot--placeholder"
                aria-hidden="true"
            />
        </div>

        <div class="social-links-dots">
            <button
                v-for="(_, i) in totalPages"
                :key="'dot-' + i"
                class="social-link-dot"
                :class="{ active: currentPage === i }"
                type="button"
                :aria-current="currentPage === i ? 'page' : undefined"
                aria-controls="socialLinksPage"
                :aria-label="`social page ${i + 1}`"
                @click="showPage(i)"
            />
        </div>

        <!-- live region 必须常驻（内容变化前就已存在）才会被播报，所以用改文本
             而不是 v-if 插入。空字符串时不产生任何朗读。 -->
        <p class="sr-only" role="status" aria-live="polite">{{ liveMessage }}</p>
    </nav>
</template>
