<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { navigate } from 'astro:transitions/client';
import { siteConfig } from '../data/site';
import { useI18n } from '../composables/useI18n';
import { createSloganSelector } from '../lib/slogan-selector';
import { usePageShellStore } from '../stores/page-shell';
import { useSearchStore } from '../stores/search';
import ClockPanel from './ClockPanel.vue';
import Icon from './Icon.vue';

export interface FeaturedPost {
    slug: string;
    title: string;
    description: string;
    category: string | null;
    cover: string | null;
    dateLabel: string | null;
}

export interface SiteStats {
    postCount: number;
    categoryCount: number;
    tagCount: number;
    yearSpan: number;
    yearFrom: number | null;
    yearTo: number | null;
}

/**
 * Both layers live inside .hero-content so they share the first-screen coordinate system.
 * The shell renders defocus first and rail second, beneath the higher-z-index left panel.
 */
const props = withDefaults(
    defineProps<{
        layer?: 'rail' | 'defocus';
        posts?: FeaturedPost[];
        stats?: SiteStats;
        recentlyUpdated?: FeaturedPost | null;
    }>(),
    {
        layer: 'rail',
        posts: () => [],
        stats: () => ({
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

const { t } = useI18n();
const pageShell = usePageShellStore();
const searchStore = useSearchStore();
const reducedMotion = ref(false);
const pageHidden = ref(false);
const interactionPaused = ref(false);
const instantInteractionPause = ref(false);
const marqueeTrack = ref<HTMLElement | null>(null);
/** Reveal after hero settles so the rail never races the first paint. */
const revealed = ref(false);
const initialSloganIndex =
    props.layer === 'rail' && siteConfig.slogans.mode === 'sequence' && siteConfig.slogans.list.length > 1 ? 1 : 0;
const sloganText = ref(siteConfig.slogans.list[initialSloganIndex] ?? '');

/**
 * Fade the defocus early during the hero exit. Its position and 3D motion are inherited
 * from .hero-content, so it cannot detach from the first-screen scene.
 */
const defocusOpacity = computed(() => {
    const progress = Math.min(Math.max(pageShell.scrollProgress, 0), 1);
    if (progress <= 0.02) return 1;
    if (progress >= 0.18) return 0;
    return 1 - (progress - 0.02) / 0.16;
});

const defocusShellStyle = computed(() => ({
    '--marquee-defocus-opacity': String(defocusOpacity.value)
}));

let mediaQuery: MediaQueryList | null = null;
let onMotionChange: ((event: MediaQueryListEvent) => void) | null = null;
let revealTimer: ReturnType<typeof setTimeout> | undefined;
let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
let sloganRotationTimer: ReturnType<typeof setTimeout> | undefined;
let playbackRateFrame: number | undefined;

function scheduleSloganRotation(selector: ReturnType<typeof createSloganSelector>) {
    if (!siteConfig.slogans.loop || siteConfig.slogans.list.length < 2) return;

    sloganRotationTimer = setTimeout(() => {
        sloganText.value = selector.next().text;
        scheduleSloganRotation(selector);
    }, siteConfig.slogans.pauseDuration);
}

const hasStats = computed(() => props.stats.postCount > 0 || props.stats.categoryCount > 0 || props.stats.tagCount > 0);

/**
 * Deliberate order: time → actions → voice → inventory → writing.
 * Keep the set small so the rail reads as a caption, not a dashboard.
 */
const sequence = computed<MarqueeItem[]>(() => {
    const list: MarqueeItem[] = [
        { kind: 'clock', key: 'clock' },
        { kind: 'search', key: 'search' }
    ];

    if (sloganText.value) {
        list.push({ kind: 'slogan', key: 'slogan', text: sloganText.value });
    }

    if (hasStats.value) {
        list.push({ kind: 'stats', key: 'stats' });
    }

    list.push({ kind: 'archive', key: 'archive' });

    if (props.recentlyUpdated) {
        list.push({
            kind: 'post',
            key: `updated-${props.recentlyUpdated.slug}`,
            variant: 'updated',
            post: props.recentlyUpdated
        });
    }

    for (const post of props.posts) {
        list.push({ kind: 'post', key: `post-${post.slug}`, variant: 'featured', post });
    }

    return list;
});

type MarqueeItem =
    | { kind: 'clock'; key: string }
    | { kind: 'search'; key: string }
    | { kind: 'slogan'; key: string; text: string }
    | { kind: 'archive'; key: string }
    | { kind: 'stats'; key: string }
    | { kind: 'post'; key: string; variant: 'featured' | 'updated'; post: FeaturedPost };

// Duplicate so CSS translateX(-50%) loops without a jump.
const trackItems = computed(() => {
    const base = sequence.value;
    if (base.length === 0) return [];
    return [...base, ...base];
});

const halfLength = computed(() => sequence.value.length);

/** Slow ambient drift — larger cards need more air between loops. */
const durationSec = computed(() => {
    const n = Math.max(sequence.value.length, 4);
    return Math.max(72, n * 14);
});

const isPaused = computed(
    () =>
        !revealed.value ||
        reducedMotion.value ||
        pageHidden.value ||
        instantInteractionPause.value ||
        pageShell.scrollProgress >= 0.95
);

const archiveMeta = computed(() => {
    const { yearFrom, yearTo, yearSpan } = props.stats;
    if (yearFrom !== null && yearTo !== null && yearFrom !== yearTo) {
        return t('widgets.archive.range').replace('{from}', String(yearFrom)).replace('{to}', String(yearTo));
    }
    if (yearFrom !== null) return String(yearFrom);
    if (yearSpan > 0) return t('widgets.archive.span').replace('{n}', String(yearSpan));
    return t('widgets.archive.open');
});

const statCells = computed(() => {
    const cells: Array<{ key: string; value: number; label: string }> = [];
    if (props.stats.postCount > 0) {
        cells.push({ key: 'posts', value: props.stats.postCount, label: t('widgets.stats.posts') });
    }
    if (props.stats.categoryCount > 0) {
        cells.push({
            key: 'categories',
            value: props.stats.categoryCount,
            label: t('widgets.stats.categories')
        });
    }
    if (props.stats.tagCount > 0) {
        cells.push({ key: 'tags', value: props.stats.tagCount, label: t('widgets.stats.tags') });
    }
    return cells;
});

function openPost(slug: string) {
    navigate(`/posts/${slug}`);
}

function openHref(href: string) {
    navigate(href);
}

function openSearch() {
    searchStore.open();
}

function onVisibility() {
    pageHidden.value = document.hidden;
}

function rampPlaybackRate(targetRate: number, duration: number, pauseAtEnd: boolean) {
    const animation = marqueeTrack.value?.getAnimations()[0];
    if (!animation) return false;

    if (playbackRateFrame !== undefined) cancelAnimationFrame(playbackRateFrame);

    const startRate = Math.max(animation.playbackRate, 0.001);
    const startTime = performance.now();
    if (targetRate > 0) animation.play();

    const step = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = progress * progress * (3 - 2 * progress);
        const rate = startRate + (targetRate - startRate) * eased;
        animation.updatePlaybackRate(Math.max(rate, 0.001));

        if (progress < 1) {
            playbackRateFrame = requestAnimationFrame(step);
            return;
        }

        playbackRateFrame = undefined;
        if (pauseAtEnd && interactionPaused.value) {
            animation.pause();
        } else if (!pauseAtEnd) {
            animation.updatePlaybackRate(targetRate);
        }
    };

    playbackRateFrame = requestAnimationFrame(step);
    return true;
}

function pause() {
    interactionPaused.value = true;
    instantInteractionPause.value = !rampPlaybackRate(0, 850, true);
}

function resume() {
    interactionPaused.value = false;
    instantInteractionPause.value = false;
    if (!isPaused.value) rampPlaybackRate(1, 650, false);
}

function revealMarquee() {
    if (revealed.value) return;
    clearTimeout(revealTimer);
    revealTimer = setTimeout(
        () => {
            revealed.value = true;
        },
        reducedMotion.value ? 0 : 520
    );
}

function isShellAlreadyReady() {
    return Boolean(document.querySelector('.container.visible'));
}

function onShellReady() {
    revealMarquee();
}

onMounted(() => {
    if (props.layer === 'rail') {
        const slogans = siteConfig.slogans.list;
        if (slogans.length > 0) {
            const selector = createSloganSelector(siteConfig.slogans.mode, slogans);
            const first = selector.next();
            // Start one phrase ahead of the left-panel typewriter so the two surfaces
            // do not mirror the same sentence while they temporarily coexist.
            sloganText.value = slogans.length > 1 ? selector.next().text : first.text;
            scheduleSloganRotation(selector);
        }
    }

    mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.value = mediaQuery.matches;
    onMotionChange = (event) => {
        reducedMotion.value = event.matches;
    };
    mediaQuery.addEventListener('change', onMotionChange);

    pageHidden.value = document.hidden;
    document.addEventListener('visibilitychange', onVisibility);

    window.addEventListener('wakusei:shell-ready', onShellReady);
    if (isShellAlreadyReady()) {
        revealMarquee();
    } else {
        fallbackTimer = setTimeout(revealMarquee, 2200);
    }
});

onUnmounted(() => {
    clearTimeout(revealTimer);
    clearTimeout(fallbackTimer);
    clearTimeout(sloganRotationTimer);
    if (playbackRateFrame !== undefined) cancelAnimationFrame(playbackRateFrame);
    if (mediaQuery && onMotionChange) {
        mediaQuery.removeEventListener('change', onMotionChange);
    }
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('wakusei:shell-ready', onShellReady);
});
</script>

<template>
    <!-- Gaussian bed: first-screen layer beneath both the rail and left panel. -->
    <div
        v-if="layer === 'defocus' && sequence.length > 0"
        class="hero-marquee-defocus"
        :class="{
            'hero-marquee-defocus--revealed': revealed,
            'hero-marquee-defocus--scrolled-away': defocusOpacity <= 0
        }"
        :style="defocusShellStyle"
        aria-hidden="true"
    >
        <div class="hero-marquee-defocus__layer hero-marquee-defocus__layer--far" />
        <div class="hero-marquee-defocus__layer hero-marquee-defocus__layer--mid" />
        <div class="hero-marquee-defocus__layer hero-marquee-defocus__layer--near" />
    </div>

    <!-- Ticket rail: first-screen layer beneath the left panel. -->
    <section
        v-else-if="layer === 'rail' && sequence.length > 0"
        class="hero-marquee"
        :class="{
            'hero-marquee--static': reducedMotion,
            'hero-marquee--paused': isPaused && !reducedMotion,
            'hero-marquee--revealed': revealed
        }"
        :aria-hidden="revealed ? undefined : 'true'"
        :aria-label="t('widgets.marquee.label')"
        @pointerenter="pause"
        @pointerleave="resume"
        @focusin="pause"
        @focusout="resume"
    >
        <div
            class="hero-marquee__viewport"
            :style="reducedMotion ? undefined : { '--marquee-duration': `${durationSec}s` }"
        >
            <div ref="marqueeTrack" class="hero-marquee__track">
                <article
                    v-for="(item, index) in trackItems"
                    :key="`${item.key}-${index}`"
                    class="hero-ticket"
                    :class="[
                        `hero-ticket--${item.kind === 'post' ? (item.variant === 'updated' ? 'updated' : 'post') : item.kind}`
                    ]"
                    :aria-hidden="index >= halfLength ? 'true' : undefined"
                >
                    <template v-if="item.kind === 'clock'">
                        <div class="hero-ticket__pad">
                            <span class="hero-ticket__label">{{ t('widgets.clock.kicker') }}</span>
                            <ClockPanel :config="siteConfig.time" />
                        </div>
                    </template>

                    <button
                        v-else-if="item.kind === 'search'"
                        type="button"
                        class="hero-ticket__hit"
                        :tabindex="index >= halfLength ? -1 : undefined"
                        @click="openSearch"
                    >
                        <span class="hero-ticket__label">
                            <Icon name="magnifying-glass" class="hero-ticket__icon" size="0.7em" />
                            {{ t('widgets.search.kicker') }}
                        </span>
                        <span class="hero-ticket__title">{{ t('widgets.search.title') }}</span>
                        <span class="hero-ticket__meta hero-ticket__meta--mono">{{ t('widgets.search.hint') }}</span>
                    </button>

                    <div v-else-if="item.kind === 'slogan'" class="hero-ticket__pad">
                        <span class="hero-ticket__label">{{ t('widgets.slogan.kicker') }}</span>
                        <Transition name="hero-ticket-quote" mode="out-in">
                            <p :key="item.text" class="hero-ticket__quote">
                                {{ item.text }}
                            </p>
                        </Transition>
                    </div>

                    <button
                        v-else-if="item.kind === 'stats'"
                        type="button"
                        class="hero-ticket__hit hero-ticket__hit--stats"
                        :tabindex="index >= halfLength ? -1 : undefined"
                        @click="openHref('/#posts')"
                    >
                        <span class="hero-ticket__label">{{ t('widgets.stats.kicker') }}</span>
                        <div class="hero-ticket__stat-row" role="presentation">
                            <div v-for="cell in statCells" :key="cell.key" class="hero-ticket__stat">
                                <span class="hero-ticket__stat-value">{{ cell.value }}</span>
                                <span class="hero-ticket__stat-label">{{ cell.label }}</span>
                            </div>
                        </div>
                    </button>

                    <button
                        v-else-if="item.kind === 'archive'"
                        type="button"
                        class="hero-ticket__hit"
                        :tabindex="index >= halfLength ? -1 : undefined"
                        @click="openHref('/archives')"
                    >
                        <span class="hero-ticket__label">
                            <Icon name="layer-group" class="hero-ticket__icon" size="0.7em" />
                            {{ t('widgets.archive.kicker') }}
                        </span>
                        <span class="hero-ticket__title">{{ t('widgets.archive.title') }}</span>
                        <span class="hero-ticket__meta">{{ archiveMeta }}</span>
                    </button>

                    <button
                        v-else
                        type="button"
                        class="hero-ticket__hit hero-ticket__hit--post"
                        :tabindex="index >= halfLength ? -1 : undefined"
                        @click="openPost(item.post.slug)"
                    >
                        <div
                            v-if="item.post.cover"
                            class="hero-ticket__cover"
                            :style="{ backgroundImage: `url(${item.post.cover})` }"
                            aria-hidden="true"
                        />
                        <div class="hero-ticket__body">
                            <span class="hero-ticket__label">
                                {{
                                    item.variant === 'updated'
                                        ? t('widgets.updated.kicker')
                                        : item.post.category || t('widgets.featured.kicker')
                                }}
                            </span>
                            <span class="hero-ticket__title">{{ item.post.title }}</span>
                            <span v-if="item.post.dateLabel" class="hero-ticket__meta">{{ item.post.dateLabel }}</span>
                        </div>
                    </button>
                </article>
            </div>
        </div>
    </section>
</template>
