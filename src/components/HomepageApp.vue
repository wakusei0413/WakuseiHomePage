<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { siteConfig } from '../data/site';
import { createLogger } from '../lib/logger';
import { enableContentProtection, initMobileStickyAvatar, initScrollAnimations } from '../lib/runtime-effects';
import { WallpaperScrollerController } from '../lib/wallpaper-scroller';
import ClockPanel from './ClockPanel.vue';
import Footer from './Footer.vue';
import SocialLinks from './SocialLinks.vue';
import TypewriterSlogan from './TypewriterSlogan.vue';

const logger = createLogger(siteConfig.debug.consoleLog);

const ready = ref(false);
const scrollProgress = ref(0);

const heroAvatarNameOpacity = computed(() => {
    const sp = scrollProgress.value;
    if (sp <= 0.15) return 1;
    if (sp >= 0.4) return 0;
    return 1 - (sp - 0.15) / 0.25;
});

const containerRef = ref<HTMLElement>();
const viewportRef = ref<HTMLDivElement>();
const avatarRef = ref<HTMLDivElement>();
const wallpaperRef = ref<HTMLDivElement>();
let wallpaperController: WallpaperScrollerController | null = null;

const isMobile = ref(typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);

const pageCleanups: Array<() => void> = [];

function startWallpaperLoading() {
    const wref = wallpaperRef.value;
    if (!wref) {
        logger.warn('Wallpaper ref not available');
        ready.value = true;
        return;
    }

    wallpaperController = new WallpaperScrollerController(siteConfig.wallpaper, siteConfig.loading, {
        onReady: () => {
            logger.log('Wallpaper ready - showing homepage content');
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

let watchStop: (() => void) | null = null;

onMounted(() => {
    window.dispatchEvent(new CustomEvent('wakusei:homepage-mounted'));

    if (siteConfig.contentProtection.preventCopyAndDrag) {
        pageCleanups.push(enableContentProtection(true));
    }

    if (siteConfig.effects.scrollReveal.enabled) {
        pageCleanups.push(
            initScrollAnimations(siteConfig.effects.scrollReveal.delay, siteConfig.effects.scrollReveal.offset)
        );
    }

    const container = containerRef.value;
    const avatar = avatarRef.value;
    if (container && avatar) {
        pageCleanups.push(initMobileStickyAvatar(viewportRef.value || container, avatar));
    }

    const scroller = viewportRef.value;
    if (scroller) {
        const handleScroll = (_e: Event) => {
            scrollProgress.value = Math.min(scroller.scrollTop / window.innerHeight, 1);
        };
        scroller.addEventListener('scroll', handleScroll, { passive: true });
        pageCleanups.push(() => scroller.removeEventListener('scroll', handleScroll));
    }

    const mql = window.matchMedia('(max-width: 900px)');
    const handleMediaChange = (event: MediaQueryListEvent) => {
        isMobile.value = event.matches;
    };
    mql.addEventListener('change', handleMediaChange);
    pageCleanups.push(() => mql.removeEventListener('change', handleMediaChange));

    watchStop = watch(isMobile, (mobile) => {
        teardownWallpaper();

        if (mobile) {
            logger.log('Mobile layout detected - skipping wallpaper loading');
            ready.value = true;
        } else {
            logger.log('Desktop layout detected - starting wallpaper loading');
            ready.value = false;
            startWallpaperLoading();
        }
    }, { immediate: true });
});

onUnmounted(() => {
    watchStop?.();
    teardownWallpaper();
    pageCleanups.forEach((cleanup) => cleanup());
});

watch(ready, (isReady) => {
    const container = containerRef.value;
    if (!container) return;
    container.classList.toggle('visible', isReady);
    if (isReady) {
        window.dispatchEvent(new CustomEvent('wakusei:homepage-ready'));
    }
});

function splitLatinText(text: string) {
    return text
        .split(/([A-Za-z][A-Za-z0-9'.-]*)/g)
        .filter(Boolean)
        .map((part) => ({ text: part, isLatin: /^[A-Za-z]/.test(part) }));
}

const heroStyle = computed(() => {
    const sp = scrollProgress.value;
    return (
        'transform: ' +
        `translateZ(${-600 * sp}px) ` +
        `rotateX(${15 * sp}deg) ` +
        `scale(${1 - 0.3 * sp}); ` +
        `opacity: ${Math.max(1 - sp * 1.2, 0)}; ` +
        `filter: brightness(${1 - sp * 0.6}) blur(${sp * 8}px)`
    );
});

function handleAvatarClick() {
    if (window.matchMedia('(max-width: 900px)').matches) {
        window.dispatchEvent(new CustomEvent('wakusei:open-mobile-menu'));
    } else if (viewportRef.value) {
        viewportRef.value.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }
}
</script>

<template>
    <div ref="viewportRef" class="page-scroller">
        <div class="hero-sticky">
            <div class="hero-content" :style="heroStyle">
                <main ref="containerRef" class="container">
                    <div ref="wallpaperRef" class="wallpaper-scroll-area" />
                    <section class="left-panel">
                        <header class="hero">
                            <div
                                id="avatarBox"
                                ref="avatarRef"
                                class="avatar-box"
                                :style="{ opacity: heroAvatarNameOpacity }"
                                @click="handleAvatarClick"
                            >
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

                            <h1 class="name" :style="{ opacity: heroAvatarNameOpacity }">
                                <template v-for="part in splitLatinText(siteConfig.profile.name)" :key="part.text">
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

                        <footer class="footer-left">
                            <div class="footer-line" />
                            <p class="footer-text">
                                {{ `${siteConfig.footer.text} • ${new Date().getFullYear()}` }}
                            </p>
                        </footer>
                    </section>

                    <aside class="right-panel">
                        <div class="right-panel-shadow" />
                        <div class="info-panel">
                            <ClockPanel :config="siteConfig.time" />
                        </div>
                    </aside>
                </main>
            </div>
        </div>

        <div class="blog-content">
            <Footer
                :links="siteConfig.footer.links"
                :social-links="siteConfig.socialLinks.links"
                :copyright-text="siteConfig.footer.text"
            />
        </div>
    </div>
</template>
