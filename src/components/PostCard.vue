<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { navigate } from 'astro:transitions/client';
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
const cardRef = ref<HTMLElement | null>(null);
const readingMinutes = computed(() => estimateReadingTime(props.wordCount));
const revealed = ref(false);
let observer: IntersectionObserver | null = null;

const layout = computed(() => props.data.coverLayout || 'below');
const hasCover = computed(() => !!props.data.cover);

onMounted(() => {
    if (!cardRef.value) return;
    observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('scroll-reveal--visible');
                    revealed.value = true;
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

function scrollCurrentPageToTop(): Promise<void> {
    const s = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    if (s) {
        s.scrollTo({ top: 0, behavior: 'smooth' });
        return new Promise((resolve) => {
            const fallback = window.setTimeout(resolve, 1200);
            const onScrollEnd = () => {
                if (s.scrollTop <= 0) {
                    s.removeEventListener('scroll', onScrollEnd);
                    clearTimeout(fallback);
                    resolve();
                }
            };
            s.addEventListener('scroll', onScrollEnd, { passive: true });
            if (s.scrollTop <= 0) {
                s.removeEventListener('scroll', onScrollEnd);
                clearTimeout(fallback);
                resolve();
            }
        });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    return Promise.resolve();
}

function handleClick(e: MouseEvent) {
    e.preventDefault();
    scrollCurrentPageToTop().then(() => navigate(`/posts/${props.slug}`));
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
            :src="revealed ? props.data.cover : undefined"
            :alt="props.data.title"
            class="post-cover"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
        />
        <div class="post-info">
            <div class="post-meta">
                <time v-if="props.dateLabel">{{ props.dateLabel }}</time>
                <span v-if="props.dateLabel" class="meta-separator">·</span>
                <span>{{ readingMinutes }} 分钟阅读</span>
                <span v-if="props.data.category" class="meta-separator">·</span>
                <span v-if="props.data.category" class="post-category">{{ props.data.category }}</span>
            </div>
            <h3 class="post-title">{{ props.data.title }}</h3>
            <p class="post-desc">{{ props.data.description }}</p>
        </div>
    </a>
</template>
