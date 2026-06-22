<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

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
</script>

<template>
    <a :href="`/posts/${props.slug}`" :class="['post-card', `post-card--${layout}`, 'scroll-reveal']" ref="cardRef">
        <img v-if="hasCover" :src="props.data.cover" :alt="props.data.title" class="post-cover" loading="lazy" />
        <div class="post-info">
            <div class="post-meta">
                <time v-if="props.dateLabel">{{ props.dateLabel }}</time>
                <span v-if="props.dateLabel" class="meta-separator">·</span>
                <span>{{ props.wordCount }} 字</span>
                <span v-if="props.data.category" class="meta-separator">·</span>
                <span v-if="props.data.category" class="post-category">{{ props.data.category }}</span>
            </div>
            <h3 class="post-title">{{ props.data.title }}</h3>
            <p class="post-desc">{{ props.data.description }}</p>
        </div>
    </a>
</template>
