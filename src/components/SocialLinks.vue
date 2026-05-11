<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Icon from './Icon.vue';
import type { SocialLink, SocialLinksConfig } from '../types/site';

const cycleColors = ['#ffe600', '#ff3e3e', '#3e59ff'];
const ITEMS_PER_PAGE = 6;

const props = defineProps<{
    config: SocialLinksConfig;
}>();

const breathe = ref(true);
const currentPage = ref(0);
const transitionDirection = ref<'next' | 'prev' | null>(null);
const animationKey = ref(0);
const navRef = ref<HTMLElement>();
let suppressNextClick = false;
let suppressClickTimer: ReturnType<typeof setTimeout> | undefined;

const totalPages = computed(() => Math.ceil(props.config.links.length / ITEMS_PER_PAGE));
const pages = computed(() => {
    const result: SocialLink[][] = [];
    for (let i = 0; i < props.config.links.length; i += ITEMS_PER_PAGE) {
        result.push(props.config.links.slice(i, i + ITEMS_PER_PAGE));
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

function handleLinkClick(event: MouseEvent, linkElement: HTMLAnchorElement) {
    if (suppressNextClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressNextClick = false;
        clearHoveredStateOnNavigate(linkElement);
        return;
    }
    clearHoveredStateOnNavigate(linkElement);
}

onMounted(() => {
    const wrapper = navRef.value;
    if (!wrapper || totalPages.value <= 1) return;

    const breatheTimer = setTimeout(() => (breathe.value = false), 3200);
    window.addEventListener('pagehide', clearAllHoveredStates);
    window.addEventListener('pageshow', clearAllHoveredStates);

    let isDown = false;
    let startX = 0;
    let wheelLocked = false;
    let wheelSettlingTimer: ReturnType<typeof setTimeout> | undefined;

    function handlePointerDown(e: PointerEvent) {
        isDown = true;
        suppressNextClick = false;
        startX = e.pageX - wrapper.offsetLeft;
        wrapper.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isDown) return;
        e.preventDefault();
    }

    function handlePointerUp(e: PointerEvent) {
        isDown = false;
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

    return () => {
        clearTimeout(breatheTimer);
        clearTimeout(wheelSettlingTimer);
        clearTimeout(suppressClickTimer);
        window.removeEventListener('pagehide', clearAllHoveredStates);
        window.removeEventListener('pageshow', clearAllHoveredStates);
        wrapper.removeEventListener('pointerdown', handlePointerDown);
        wrapper.removeEventListener('pointermove', handlePointerMove);
        wrapper.removeEventListener('pointerup', handlePointerUp);
        wrapper.removeEventListener('wheel', handleWheel);
    };
});
</script>

<template>
    <nav
        v-if="props.config.links.length <= ITEMS_PER_PAGE"
        ref="navRef"
        class="social-links"
        id="socialLinks"
        :class="{ 'breathe-once': breathe }"
    >
        <div
            v-for="(link, index) in props.config.links"
            :key="link.url + index"
            class="social-link-slot"
            @pointerenter="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, true)"
            @pointerleave="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, false)"
            @pointerdown="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, true)"
            @pointerup="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, false)"
            @pointercancel="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, false)"
        >
            <a
                :href="link.url"
                :aria-label="link.name"
                :target="isMailTo(link.url) ? '_self' : '_blank'"
                :rel="isMailTo(link.url) ? undefined : 'noopener noreferrer'"
                class="social-link social-link--custom"
                :style="`--custom-color: ${getLinkColor(link, index)}`"
                @click="(event: MouseEvent) => handleLinkClick(event, event.currentTarget as HTMLAnchorElement)"
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
        </div>
    </nav>

    <nav v-else ref="navRef" class="social-links-wrapper" id="socialLinks" :class="{ 'breathe-once': breathe }">
        <div
            id="socialLinksPage"
            class="social-links-page"
            :data-page-key="animationKey"
            @animationend="() => (transitionDirection = null)"
            :class="{
                'is-swap-fade': transitionDirection !== null,
                'is-animation-alt': animationKey % 2 === 1
            }"
        >
            <div
                v-for="(link, index) in currentLinks"
                :key="link.url + index"
                class="social-link-slot"
                @pointerenter="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, true)"
                @pointerleave="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, false)"
                @pointerdown="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, true)"
                @pointerup="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, false)"
                @pointercancel="(e: PointerEvent) => setHoveredState(e.currentTarget as HTMLElement, false)"
            >
                <a
                    :href="link.url"
                    :aria-label="link.name"
                    :target="isMailTo(link.url) ? '_self' : '_blank'"
                    :rel="isMailTo(link.url) ? undefined : 'noopener noreferrer'"
                    class="social-link social-link--custom"
                    :style="`--custom-color: ${getLinkColor(link, currentPage * ITEMS_PER_PAGE + index)}`"
                    @click="(event: MouseEvent) => handleLinkClick(event, event.currentTarget as HTMLAnchorElement)"
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
            </div>

            <div
                v-for="(_, i) in ITEMS_PER_PAGE - currentLinks.length"
                :key="'placeholder-' + i"
                class="social-link-slot social-link-slot--placeholder"
                aria-hidden="true"
            ></div>
        </div>

        <div v-if="totalPages > 1" class="social-links-dots">
            <button
                v-for="(_, i) in totalPages"
                :key="'dot-' + i"
                class="social-link-dot"
                :class="{ active: currentPage === i }"
                type="button"
                :aria-current="currentPage === i ? 'page' : undefined"
                aria-controls="socialLinksPage"
                @click="showPage(i)"
                :aria-label="`social page ${i + 1}`"
            ></button>
        </div>
    </nav>
</template>
