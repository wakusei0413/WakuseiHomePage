<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { siteConfig } from '../data/site';
import { createLogger } from '../lib/logger';
import { enableContentProtection, initMobileStickyAvatar, initScrollAnimations } from '../lib/runtime-effects';
import { WallpaperScrollerController } from '../lib/wallpaper-scroller';
import { getPageShellStateFromDocument, subscribePageShellStateChange } from '../lib/page-shell-context';
import { usePageShellStore } from '../stores/page-shell';
import SocialLinks from './SocialLinks.vue';
import TopBar from './TopBar.vue';
import TypewriterSlogan from './TypewriterSlogan.vue';

const props = defineProps<{ showTopBar?: boolean }>();

const pageShell = usePageShellStore();
const logger = createLogger(siteConfig.debug.consoleLog);

const containerRef = ref<HTMLElement>();
const avatarRef = ref<HTMLDivElement>();
const wallpaperRef = ref<HTMLDivElement>();
const ready = ref(false);
const isMobile = ref(typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);

let wallpaperController: WallpaperScrollerController | null = null;
let watchStop: (() => void) | null = null;
let shellCleanup: (() => void) | undefined;
let scrollCleanup: (() => void) | undefined;
let scrollAnimationCleanup: (() => void) | undefined;
let stickyAvatarCleanup: (() => void) | undefined;
const pageCleanups: Array<() => void> = [];

const heroOpacity = computed(() => {
    const sp = pageShell.scrollProgress;
    if (sp <= 0.15) return 1;
    if (sp >= 0.4) return 0;
    return 1 - (sp - 0.15) / 0.25;
});

const heroStyle = computed(() => {
    const sp = pageShell.scrollProgress;
    return (
        'transform: ' +
        `translateZ(${-600 * sp}px) ` +
        `rotateX(${15 * sp}deg) ` +
        `scale(${1 - 0.3 * sp}); ` +
        `opacity: ${Math.max(1 - sp * 1.2, 0)}; ` +
        `filter: brightness(${1 - sp * 0.6}) blur(${sp * 8}px)`
    );
});

function startWallpaperLoading() {
    const wref = wallpaperRef.value;
    if (!wref) {
        logger.warn('Wallpaper ref not available');
        ready.value = true;
        return;
    }

    wallpaperController = new WallpaperScrollerController(siteConfig.wallpaper, siteConfig.loading, {
        onReady: () => {
            ready.value = true;
        }
    });

    wallpaperController.attach(wref);
    wallpaperController.init();
}

function teardownWallpaper() {
    if (wallpaperController) {
        wallpaperController.destroy();
        wallpaperController = null;
    }
}

function splitLatinText(text: string) {
    return text
        .split(/([A-Za-z][A-Za-z0-9'.-]*)/g)
        .filter(Boolean)
        .map((part) => ({ text: part, isLatin: /^[A-Za-z]/.test(part) }));
}

function attachScrollListener() {
    scrollCleanup?.();
    scrollCleanup = undefined;
    const scroller = document.getElementById('pageScroller');
    if (!scroller) return;
    const handleScroll = () => {
        pageShell.setScrollProgress(Math.min(scroller.scrollTop / window.innerHeight, 1));
    };
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    scrollCleanup = () => {
        scroller.removeEventListener('scroll', handleScroll);
    };
}

function reinitScrollAnimations() {
    scrollAnimationCleanup?.();
    scrollAnimationCleanup = undefined;
    if (siteConfig.effects.scrollReveal.enabled) {
        scrollAnimationCleanup = initScrollAnimations(
            siteConfig.effects.scrollReveal.delay,
            siteConfig.effects.scrollReveal.offset
        );
    }
}

function reinitStickyAvatar() {
    stickyAvatarCleanup?.();
    stickyAvatarCleanup = undefined;
    const container = containerRef.value;
    const avatar = avatarRef.value;
    if (container && avatar) {
        stickyAvatarCleanup = initMobileStickyAvatar(document.getElementById('pageScroller') || container, avatar);
    }
}

function reattachDomListeners() {
    attachScrollListener();
    reinitScrollAnimations();
    reinitStickyAvatar();
}

onMounted(() => {
    const initialState = getPageShellStateFromDocument();
    pageShell.enterPage(initialState);
    shellCleanup = subscribePageShellStateChange((next) => {
        pageShell.enterPage(next);
        pageShell.resetScrollProgress();
    });

    reattachDomListeners();

    if (siteConfig.contentProtection.preventCopyAndDrag) {
        pageCleanups.push(enableContentProtection(true));
    }

    const mql = window.matchMedia('(max-width: 900px)');
    const handleMediaChange = (event: MediaQueryListEvent) => {
        isMobile.value = event.matches;
    };
    mql.addEventListener('change', handleMediaChange);
    pageCleanups.push(() => mql.removeEventListener('change', handleMediaChange));

    watchStop = watch(
        isMobile,
        (mobile) => {
            teardownWallpaper();
            if (mobile) {
                ready.value = true;
            } else {
                ready.value = false;
                startWallpaperLoading();
            }
        },
        { immediate: true }
    );

    document.addEventListener('astro:after-swap', reattachDomListeners);
    pageCleanups.push(() => document.removeEventListener('astro:after-swap', reattachDomListeners));
});

onUnmounted(() => {
    clearTimeout(readyEventTimer);
    shellCleanup?.();
    watchStop?.();
    teardownWallpaper();
    scrollCleanup?.();
    scrollAnimationCleanup?.();
    stickyAvatarCleanup?.();
    pageCleanups.forEach((cleanup) => cleanup());
});

function syncShellVisibility(isReady: boolean) {
    const container = containerRef.value;
    if (container) {
        container.classList.toggle('visible', isReady);
    }
}

let readyEventTimer: ReturnType<typeof setTimeout> | undefined;

function dispatchShellReadyEvents(isReady: boolean) {
    if (!isReady) {
        return;
    }

    clearTimeout(readyEventTimer);
    readyEventTimer = setTimeout(() => {
        readyEventTimer = undefined;
        if (!ready.value) {
            return;
        }

        window.dispatchEvent(new CustomEvent('wakusei:shell-ready'));
        if (pageShell.isHomePage) {
            window.dispatchEvent(new CustomEvent('wakusei:homepage-ready'));
        }
    }, 0);
}

watch([ready, () => pageShell.isHomePage], ([isReady]) => {
    syncShellVisibility(isReady);
    dispatchShellReadyEvents(isReady);
});
</script>

<template>
    <div class="noise-overlay" />

    <div class="hero-sticky">
        <div class="hero-content" :style="heroStyle">
            <main ref="containerRef" class="container">
                <div ref="wallpaperRef" class="wallpaper-scroll-area" />

                <section class="left-panel">
                    <Transition name="left-panel-content" mode="out-in">
                        <header v-if="pageShell.mode === 'home'" :key="pageShell.leftPanelKey" class="hero">
                            <div id="avatarBox" ref="avatarRef" class="avatar-box" :style="{ opacity: heroOpacity }">
                                <img
                                    :src="siteConfig.profile.avatar"
                                    alt="Avatar"
                                    class="avatar-image"
                                    width="150"
                                    height="150"
                                    loading="eager"
                                    decoding="async"
                                    fetchpriority="high"
                                />
                            </div>

                            <h1 class="name" :style="{ opacity: heroOpacity }">
                                <template v-for="part in splitLatinText(pageShell.title)" :key="part.text">
                                    <span v-if="part.isLatin" class="name-latin">{{ part.text }}</span>
                                    <template v-else>
                                        {{ part.text }}
                                    </template>
                                </template>
                            </h1>

                            <div class="status-bar">
                                <span class="status-dot" />
                                <span class="status-text">{{ siteConfig.profile.status }}</span>
                            </div>

                            <div id="bioContainer" class="bio-container">
                                <TypewriterSlogan
                                    :config="siteConfig.slogans"
                                    :cursor-style="siteConfig.animation.cursorStyle"
                                />
                            </div>

                            <SocialLinks :config="siteConfig.socialLinks" />
                        </header>

                        <header
                            v-else-if="pageShell.mode === 'blog'"
                            :key="pageShell.leftPanelKey"
                            class="hero hero-minimal"
                        >
                            <h1 class="name" :style="{ opacity: heroOpacity }">
                                <template v-for="part in splitLatinText(pageShell.title)" :key="part.text">
                                    <span v-if="part.isLatin" class="name-latin">{{ part.text }}</span>
                                    <template v-else>
                                        {{ part.text }}
                                    </template>
                                </template>
                            </h1>
                        </header>

                        <header
                            v-else-if="pageShell.mode === 'article'"
                            :key="pageShell.leftPanelKey"
                            class="hero hero-minimal"
                        >
                            <h1 class="name" :style="{ opacity: heroOpacity }">
                                <template v-for="part in splitLatinText(pageShell.title)" :key="part.text">
                                    <span v-if="part.isLatin" class="name-latin">{{ part.text }}</span>
                                    <template v-else>{{ part.text }}</template>
                                </template>
                            </h1>
                        </header>

                        <!-- error mode: no header rendered -->
                    </Transition>
                </section>
            </main>
        </div>
    </div>

    <TopBar v-if="props.showTopBar !== false" :initial-is-home-page="pageShell.isHomePage" />
</template>
