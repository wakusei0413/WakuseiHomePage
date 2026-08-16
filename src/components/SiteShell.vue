<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { siteConfig } from '../data/site';
import { createLogger } from '../lib/logger';
import { enableContentProtection, initMobileStickyAvatar, initScrollAnimations } from '../lib/runtime-effects';
import { WallpaperController } from '../lib/wallpaper-scroller';
import { sampleGlassTints } from '../lib/wallpaper-glass';
import { getPageShellStateFromDocument, subscribePageShellStateChange } from '../lib/page-shell-context';
import { initHashSectionScrollOnLoad, navigateToHashSection } from '../lib/section-nav';
import { splitLatinText } from '../lib/text';
import { usePageShellStore } from '../stores/page-shell';
import { useSearchStore } from '../stores/search';
import HeroWidgetMarquee, { type FeaturedPost, type SiteStats } from './HeroWidgetMarquee.vue';
import SearchModal from './SearchModal.vue';
import GitHubContributions from './GitHubContributions.vue';
import SocialLinks from './SocialLinks.vue';
import TopBar from './TopBar.vue';

const props = withDefaults(
    defineProps<{
        showTopBar?: boolean;
        initialMode?: 'home' | 'blog' | 'article' | 'error';
        initialTitle?: string;
        initialIsHomePage?: boolean;
        featuredPosts?: FeaturedPost[];
        siteStats?: SiteStats;
        recentlyUpdated?: FeaturedPost | null;
    }>(),
    {
        featuredPosts: () => [],
        siteStats: () => ({
            postCount: 0,
            categoryCount: 0,
            tagCount: 0,
            yearSpan: 0,
            yearFrom: null,
            yearTo: null
        }),
        recentlyUpdated: null
    }
);

const pageShell = usePageShellStore();
const searchStore = useSearchStore();

// Seed the shell store synchronously so SSR markup matches the first client render
// (the store defaults to the home page; without this, blog/article pages hydrate
// from the home hero into their real mode and emit a hydration mismatch).
pageShell.enterPage({
    title: props.initialTitle ?? siteConfig.profile.name,
    mode: props.initialMode ?? 'home',
    isHomePage: props.initialIsHomePage ?? true
});
const logger = createLogger(siteConfig.debug.consoleLog);

const containerRef = ref<HTMLElement>();
const avatarRef = ref<HTMLDivElement>();
const wallpaperRef = ref<HTMLDivElement>();
const shellRef = ref<HTMLDivElement>();
const ready = ref(false);
const heroEntering = ref(true);
const heroRevealed = ref(false);
const isMobile = ref(typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);

let wallpaperController: WallpaperController | null = null;
// --- frosted-glass tint management ---
// The glass surfaces paint a flat tint sampled from the current wallpaper
// (one tiny drawImage + getImageData per change), so a wallpaper change is a
// compositor-only background-color transition — no baked textures, no blob
// URLs, no Ken Burns mirror to keep in phase with the wallpaper.
let watchStop: (() => void) | null = null;
let shellCleanup: (() => void) | undefined;
let scrollCleanup: (() => void) | undefined;
let scrollAnimationCleanup: (() => void) | undefined;
let stickyAvatarCleanup: (() => void) | undefined;
const pageCleanups: Array<() => void> = [];

// The glass surfaces read their tint from the persisted shell element (not
// <html>): it lives inside the view-transition `transition:persist` wrapper, so
// Astro's swap — which wipes every attribute on <html> — never clears the tint
// between navigations.
function glassRoot(): HTMLElement {
    return shellRef.value ?? document.documentElement;
}

const heroOpacity = computed(() => {
    const sp = pageShell.scrollProgress;
    if (sp <= 0.15) return 1;
    if (sp >= 0.4) return 0;
    return 1 - (sp - 0.15) / 0.25;
});

const heroStyle = computed(() => {
    const sp = pageShell.scrollProgress;
    // Avoid forcing a composited layer (transform/opacity) before the user
    // scrolls so the hero paints in normal flow and the LCP element renders at FCP.
    if (sp <= 0) return '';
    // Performance note: the old scroll style animated `filter: blur(...)` every
    // frame, which re-rasterized the whole first-screen scene on the main thread
    // (the wallpaper + marquee + panel) and was the primary source of scroll jank.
    // The 3D sink + fade keep the visual intent; the filter is gone from the
    // scroll path entirely.
    return (
        'transform: ' +
        `translateZ(${-600 * sp}px) ` +
        `rotateX(${15 * sp}deg) ` +
        `scale(${1 - 0.3 * sp}); ` +
        `opacity: ${Math.max(1 - sp * 1.2, 0)};`
    );
});

function startWallpaperLoading() {
    const wref = wallpaperRef.value;
    if (!wref) {
        logger.warn('Wallpaper ref not available');
        ready.value = true;
        return;
    }

    wallpaperController = new WallpaperController(siteConfig.wallpaper, {
        onReady: () => {
            ready.value = true;
        },
        // Sample the active frame's tint and publish it to the CSS glass
        // surfaces; the surfaces transition background-color in sync with the
        // wallpaper's own crossfade. If sampling fails (tainted canvas), the
        // glass simply keeps the previous frame's tint.
        onWallpaperChange: (img) => {
            const tints = sampleGlassTints(img);
            if (!tints) {
                return;
            }
            const root = glassRoot();
            root.style.setProperty('--glass-panel-tint', tints.panel);
            root.style.setProperty('--glass-bed-tint', tints.bed);
        }
    });

    wallpaperController.attach(wref);
    wallpaperController.init();
}

// Wallpaper loading starts immediately on mount (desktop only). The first image is
// also prefetched from the <head> (see BaseLayout.astro) so it is fetched in parallel
// with the page instead of waiting for hydration + a user interaction.

function teardownWallpaper() {
    if (wallpaperController) {
        wallpaperController.destroy();
        wallpaperController = null;
    }
    // Drop the glass tint so no stale wallpaper color lingers (e.g. after a
    // desktop -> mobile switch, where the wallpaper itself is gone).
    const root = glassRoot();
    root.style.removeProperty('--glass-panel-tint');
    root.style.removeProperty('--glass-bed-tint');
}

function handleHeroAvatarActivate() {
    if (isMobile.value) {
        window.dispatchEvent(new CustomEvent('wakusei:open-sidebar'));
        return;
    }
    navigateToHashSection('/#posts');
}

function attachScrollListener() {
    scrollCleanup?.();
    scrollCleanup = undefined;
    const scroller = document.getElementById('pageScroller');
    if (!scroller) return;
    // Coalesce scroll progress updates to one store write per animation frame:
    // scroll events can fire several times per frame (especially while the
    // inertial-scroll rAF loop is driving scrollTop), and every store write
    // re-evaluates the hero styles below. Batching them here keeps the scroll
    // path to a single style write per frame.
    let frame: number | undefined;
    let pendingScrollTop = scroller.scrollTop;
    let pendingDirection: 'up' | 'down' | null = null;
    let lastScrollY = scroller.scrollTop;

    const flush = () => {
        frame = undefined;
        pageShell.setScrollProgress(Math.min(pendingScrollTop / window.innerHeight, 1));
        if (pendingDirection) {
            pageShell.setScrollDirection(pendingDirection);
            pendingDirection = null;
        }
    };

    const handleScroll = () => {
        const currentScrollTop = scroller.scrollTop;
        if (currentScrollTop > lastScrollY) {
            pendingDirection = 'down';
        } else if (currentScrollTop < lastScrollY) {
            pendingDirection = 'up';
        }
        lastScrollY = currentScrollTop;
        pendingScrollTop = currentScrollTop;
        if (frame === undefined) frame = requestAnimationFrame(flush);
    };
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    scrollCleanup = () => {
        scroller.removeEventListener('scroll', handleScroll);
        if (frame !== undefined) cancelAnimationFrame(frame);
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
    reinitStickyAvatar();
}

// Re-read the shell state from the document after an Astro client-side swap.
// The primary update path is the `wakusei:shell-page-change` event dispatched
// in `astro:before-swap`, but that can be missed when the Vue reactivity flush
// is deferred (e.g. client:idle hydration timing). Reading the data attributes
// directly from the new `#pageTransitionSurface` guarantees the hero mode and
// title are always correct after navigation.
function resyncShellStateAfterSwap() {
    reattachDomListeners();
    const nextState = getPageShellStateFromDocument();
    pageShell.enterPage(nextState);
    pageShell.resetScrollProgress();
}

onMounted(() => {
    const initialState = getPageShellStateFromDocument();
    pageShell.enterPage(initialState);
    shellCleanup = subscribePageShellStateChange((next) => {
        pageShell.enterPage(next);
        pageShell.resetScrollProgress();
    });

    reattachDomListeners();
    reinitScrollAnimations();

    // Scroll to "/#posts" when the page is entered directly via a hash URL
    // (bookmark/share/back-forward). No-op unless the URL is "/" with a hash.
    initHashSectionScrollOnLoad();
    const onHashSectionPageLoad = () => initHashSectionScrollOnLoad();
    document.addEventListener('astro:page-load', onHashSectionPageLoad);
    pageCleanups.push(() => document.removeEventListener('astro:page-load', onHashSectionPageLoad));

    if (siteConfig.contentProtection.preventCopyAndDrag) {
        pageCleanups.push(enableContentProtection(true));
    }

    const mql = window.matchMedia('(max-width: 900px)');
    const handleMediaChange = (event: MediaQueryListEvent) => {
        isMobile.value = event.matches;
    };
    mql.addEventListener('change', handleMediaChange);
    pageCleanups.push(() => mql.removeEventListener('change', handleMediaChange));

    // Global search shortcut (Cmd/Ctrl + K)
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            searchStore.toggle();
        }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    pageCleanups.push(() => document.removeEventListener('keydown', handleGlobalKeyDown));

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

    // Reveal the left-panel hero with a staggered entrance once hydrated. The
    // children are pre-hidden via the .hero-entering class (rendered in SSR) so the
    // first paint is already hidden and the entrance never flickers.
    requestAnimationFrame(() => {
        heroEntering.value = false;
        heroRevealed.value = true;
    });

    document.addEventListener('astro:after-swap', resyncShellStateAfterSwap);
    pageCleanups.push(() => document.removeEventListener('astro:after-swap', resyncShellStateAfterSwap));
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

    <!-- Desktop: left panel for all modes. Mobile: first-screen only on home (CSS). -->
    <div
        ref="shellRef"
        class="hero-sticky"
        :data-shell-mode="pageShell.mode"
        :data-is-home="pageShell.isHomePage ? '' : undefined"
    >
        <div class="hero-content" :style="heroStyle">
            <main ref="containerRef" class="container">
                <div ref="wallpaperRef" class="wallpaper-scroll-area" />

                <section class="left-panel">
                    <Transition name="left-panel-content" mode="out-in">
                        <header
                            v-if="pageShell.mode === 'home'"
                            :key="pageShell.leftPanelKey"
                            class="hero"
                            :class="{ 'hero-entering': heroEntering, 'hero-revealed': heroRevealed }"
                            :style="{ '--hero-opacity': heroOpacity }"
                        >
                            <div
                                id="avatarBox"
                                ref="avatarRef"
                                class="avatar-box"
                                role="button"
                                tabindex="0"
                                :aria-label="siteConfig.profile.name"
                                @click="handleHeroAvatarActivate"
                                @keydown.enter.prevent="handleHeroAvatarActivate"
                                @keydown.space.prevent="handleHeroAvatarActivate"
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

                            <h1 class="name">
                                <template
                                    v-for="(part, index) in splitLatinText(pageShell.title)"
                                    :key="`${part.text}-${index}`"
                                >
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
                                <GitHubContributions />
                            </div>

                            <SocialLinks :config="siteConfig.socialLinks" />
                        </header>

                        <header
                            v-else-if="pageShell.mode === 'blog'"
                            :key="pageShell.leftPanelKey"
                            class="hero hero-minimal"
                            :class="{ 'hero-entering': heroEntering, 'hero-revealed': heroRevealed }"
                            :style="{ '--hero-opacity': heroOpacity }"
                        >
                            <h1 class="name">
                                <template
                                    v-for="(part, index) in splitLatinText(pageShell.title)"
                                    :key="`${part.text}-${index}`"
                                >
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
                            :class="{ 'hero-entering': heroEntering, 'hero-revealed': heroRevealed }"
                            :style="{ '--hero-opacity': heroOpacity }"
                        >
                            <h1 class="name">
                                <template
                                    v-for="(part, index) in splitLatinText(pageShell.title)"
                                    :key="`${part.text}-${index}`"
                                >
                                    <span v-if="part.isLatin" class="name-latin">{{ part.text }}</span>
                                    <template v-else>
                                        {{ part.text }}
                                    </template>
                                </template>
                            </h1>
                        </header>

                        <!-- error mode: no header rendered -->
                    </Transition>
                </section>
            </main>

            <!-- Both layers belong to the first-screen scene and pass underneath the left panel. -->
            <HeroWidgetMarquee
                layer="defocus"
                :posts="props.featuredPosts"
                :stats="props.siteStats"
                :recently-updated="props.recentlyUpdated"
            />
            <HeroWidgetMarquee
                layer="rail"
                :posts="props.featuredPosts"
                :stats="props.siteStats"
                :recently-updated="props.recentlyUpdated"
            />
        </div>
    </div>

    <TopBar v-if="props.showTopBar !== false" :initial-is-home-page="pageShell.isHomePage" />

    <SearchModal v-if="searchStore.isOpen" />
</template>
