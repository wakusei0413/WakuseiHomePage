<script setup lang="ts">
import { computed } from 'vue';
import type { PostListItem, TaxonomyTerm } from '../lib/post-model';
import PostCard from './PostCard.vue';

const props = defineProps<{
    variant: 'categories' | 'tags';
    title: string;
    description: string;
    terms: TaxonomyTerm[];
    activeTerm?: TaxonomyTerm;
    posts?: PostListItem[];
}>();

const variantLabel = computed(() => (props.variant === 'categories' ? '分类' : '标签'));
const allLabel = computed(() => (props.variant === 'categories' ? '全部分类' : '全部标签'));
const indexHref = '/archives';
const visiblePosts = computed(() => props.posts ?? []);
const emptyText = '这里暂时还没有文章。';
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
                    {{ title }}
                </h2>
                <p class="taxonomy-description">
                    {{ description }}
                </p>
                <div v-if="activeTerm" class="taxonomy-summary" aria-label="文章数量">
                    <span class="taxonomy-summary__count">{{ activeTerm.count }}</span>
                    <span class="taxonomy-summary__label">篇文章</span>
                </div>
            </header>

            <div v-if="!activeTerm" class="taxonomy-grid" :aria-label="allLabel">
                <a v-for="term in terms" :key="term.name" class="taxonomy-chip" :href="term.href">
                    <span class="taxonomy-chip__name">{{ term.name }}</span>
                    <span class="taxonomy-chip__count">{{ term.count }} 篇</span>
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

                <div v-if="visiblePosts.length" class="post-list--masonry taxonomy-post-list">
                    <PostCard
                        v-for="post in visiblePosts"
                        :key="post.slug"
                        :slug="post.slug"
                        :data="post.data"
                        :date-label="post.dateLabel"
                        :word-count="post.wordCount"
                    />
                </div>
                <p v-else class="taxonomy-empty">
                    {{ emptyText }}
                </p>
            </template>
        </div>
    </section>
</template>
