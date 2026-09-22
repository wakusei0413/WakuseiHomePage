<script setup lang="ts">
import { computed } from 'vue';
import type { PostListItem, TaxonomyTerm } from '../lib/post-model';
import PostCard from './PostCard.vue';
import { useI18n } from '../composables/useI18n';
import { useMasonryOrder } from '../composables/useMasonryOrder';
import { usePageMeta } from '../composables/usePageMeta';

const props = defineProps<{
    variant: 'categories' | 'tags';
    titleKey: string;
    descriptionKey: string;
    metaParams: Record<string, string | number>;
    terms: TaxonomyTerm[];
    activeTerm?: TaxonomyTerm;
    posts?: PostListItem[];
}>();

const { t } = useI18n();

const variantLabel = computed(() => t(props.variant === 'categories' ? 'taxonomy.categories' : 'taxonomy.tags'));
const allLabel = computed(() => t(props.variant === 'categories' ? 'taxonomy.categories.all' : 'taxonomy.tags.all'));
const indexHref = '/archives';
const visiblePosts = computed(() => props.posts ?? []);
const { orderedItems: displayPosts } = useMasonryOrder(visiblePosts);

usePageMeta({
    titleKey: props.titleKey,
    descriptionKey: props.descriptionKey,
    // The term counts are build-time props, but reading them lazily keeps the
    // composable's contract uniform across pages.
    params: () => props.metaParams,
    mode: 'blog'
});
</script>

<template>
    <section class="taxonomy-page" :class="`taxonomy-page--${variant}`" aria-labelledby="taxonomy-title">
        <div class="taxonomy-page__inner">
            <header class="taxonomy-header">
                <a v-if="activeTerm" class="taxonomy-back-link" :href="indexHref">
                    {{ allLabel }}
                </a>
                <p class="taxonomy-kicker">
                    {{ variantLabel }}
                </p>
                <h2 id="taxonomy-title" class="taxonomy-title">
                    {{ t(titleKey, metaParams) }}
                </h2>
                <p class="taxonomy-description">
                    {{ t(descriptionKey, metaParams) }}
                </p>
                <div v-if="activeTerm" class="taxonomy-summary" :aria-label="t('taxonomy.summary.aria')">
                    <span class="taxonomy-summary__count">{{ activeTerm.count }}</span>
                    <span class="taxonomy-summary__label">{{ t('taxonomy.article.label') }}</span>
                </div>
            </header>

            <div v-if="!activeTerm" class="taxonomy-grid" :aria-label="allLabel">
                <a v-for="term in terms" :key="term.name" class="taxonomy-chip" :href="term.href">
                    <span class="taxonomy-chip__name">{{ term.name }}</span>
                    <span class="taxonomy-chip__count">{{ t('taxonomy.count', { count: term.count }) }}</span>
                </a>
            </div>

            <template v-else>
                <nav class="taxonomy-rail" :aria-label="allLabel">
                    <a
                        v-for="term in terms"
                        :key="term.name"
                        class="taxonomy-rail__item"
                        :class="{ 'taxonomy-rail__item--active': term.name === activeTerm.name }"
                        :href="term.href"
                        :aria-current="term.name === activeTerm.name ? 'page' : undefined"
                    >
                        <span>{{ term.name }}</span>
                        <span>{{ term.count }}</span>
                    </a>
                </nav>

                <div v-if="displayPosts.length" class="post-list--masonry taxonomy-post-list">
                    <PostCard
                        v-for="post in displayPosts"
                        :key="post.slug"
                        :slug="post.slug"
                        :data="post.data"
                        :date-label="post.dateLabel"
                        :word-count="post.wordCount"
                    />
                </div>
                <p v-else class="taxonomy-empty">
                    {{ t('taxonomy.empty') }}
                </p>
            </template>
        </div>
    </section>
</template>
