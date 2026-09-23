<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { navigate } from 'astro:transitions/client';
import { useI18n } from '../composables/useI18n';
import { shouldEnhanceAnchorClick } from '../lib/navigation-click';
import { estimateReadingTime } from '../lib/post-model';

interface PostData {
    title: string;
    description: string;
    cover?: string;
    coverLayout?: 'overlay' | 'below';
    language?: string;
    category?: string;
    tags?: string[];
    draft?: boolean;
    pubDate?: string;
    updatedDate?: string;
}

interface PostCardProps {
    slug: string;
    data: PostData;
    dateLabel: string | null;
    wordCount: number;
}

const props = defineProps<PostCardProps>();
const { t } = useI18n();
const cardRef = ref<HTMLElement | null>(null);
const coverRef = ref<HTMLImageElement | null>(null);
const coverShown = ref(false);
const readingLabel = computed(() =>
    t('post.reading').replace('{minutes}', String(estimateReadingTime(props.wordCount)))
);
let observer: IntersectionObserver | null = null;

const layout = computed(() => props.data.coverLayout || 'below');
const hasCover = computed(() => !!props.data.cover);

function showCover() {
    coverShown.value = true;
}

/**
 * The cover fades in only once `decode()` resolves — that promise settles when
 * the bitmap is decoded and ready to paint. Revealing on `load` alone would
 * hand the decode to the first frame of the fade, which is exactly the
 * main-thread stall the previous pop-in caused.
 *
 * `decode()` is only ever reached from the load/complete paths: calling it on a
 * still-pending `loading="lazy"` image would start the fetch immediately and
 * defeat the native lookahead. Both a rejected decode and a broken image still
 * reveal, so a failure never leaves an invisible `opacity: 0` element behind.
 */
function handleCoverLoad() {
    const cover = coverRef.value;
    if (cover && typeof cover.decode === 'function') {
        try {
            cover.decode().then(showCover, showCover);
            return;
        } catch {
            // Safari throws synchronously for a detached/broken image.
        }
    }
    showCover();
}

onMounted(() => {
    // The cover keeps its `src` from SSR on so native lazy loading can start the
    // fetch ~1250px early. Cards hydrate at `client:idle`, though, so a cached
    // cover may already be complete before this runs — `load` will never fire
    // again and the cover would stay transparent forever. Adopt it here.
    const cover = coverRef.value;
    if (cover?.complete && cover.naturalWidth > 0) {
        handleCoverLoad();
    }

    if (!cardRef.value) return;
    observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('scroll-reveal--visible');
                    observer?.unobserve(entry.target);
                }
            });
        },
        { root: null, rootMargin: '0px 0px -50px 0px', threshold: 0.1 }
    );
    observer.observe(cardRef.value);
});

onUnmounted(() => {
    if (observer && cardRef.value) observer.unobserve(cardRef.value);
    observer?.disconnect();
});

function handleClick(e: MouseEvent) {
    const anchor = e.currentTarget as HTMLAnchorElement | null;
    if (!anchor || !shouldEnhanceAnchorClick(e, anchor)) return;
    e.preventDefault();
    navigate(`/posts/${props.slug}`);
}
</script>

<template>
    <a
        ref="cardRef"
        :href="`/posts/${props.slug}`"
        :class="['post-card', `post-card--${layout}`, 'scroll-reveal']"
        @click="handleClick"
    >
        <img
            v-if="hasCover"
            ref="coverRef"
            :src="props.data.cover"
            :alt="props.data.title"
            :class="['post-cover', { 'post-cover--shown': coverShown }]"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
            @load="handleCoverLoad"
            @error="showCover"
        />
        <div class="post-info">
            <div class="post-meta">
                <time v-if="props.dateLabel">{{ props.dateLabel }}</time>
                <span v-if="props.dateLabel" class="meta-separator">·</span>
                <span>{{ readingLabel }}</span>
                <span v-if="props.data.category" class="meta-separator">·</span>
                <span v-if="props.data.category" class="post-category">{{ props.data.category }}</span>
            </div>
            <h3 class="post-title">{{ props.data.title }}</h3>
            <p class="post-desc">{{ props.data.description }}</p>
        </div>
    </a>
</template>
