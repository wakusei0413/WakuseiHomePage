<script setup lang="ts">
import type { TaxonomyTerm } from '../lib/post-model';

defineProps<{
    categories: TaxonomyTerm[];
    tags: TaxonomyTerm[];
    postCount: number;
}>();

const archiveTitle = '归档';
const archiveDescription = '按分类和标签浏览所有文章。';
const articleLabel = '篇文章';
const categoryTitle = '分类';
const categoryLabel = '个分类';
const tagTitle = '标签';
const tagLabel = '个标签';
</script>

<template>
    <section class="topics-page taxonomy-page" aria-labelledby="topics-title">
        <div class="taxonomy-page__inner">
            <header class="taxonomy-header topics-header">
                <p class="taxonomy-kicker topics-kicker">
                    {{ archiveTitle }}
                </p>
                <h2 id="topics-title" class="taxonomy-title">
                    {{ archiveTitle }}
                </h2>
                <p class="taxonomy-description">
                    {{ archiveDescription }}
                </p>
                <div class="topics-stats" aria-label="归档统计">
                    <div class="topics-stat">
                        <span class="topics-stat__value">{{ postCount }}</span>
                        <span class="topics-stat__label">{{ articleLabel }}</span>
                    </div>
                    <div class="topics-stat">
                        <span class="topics-stat__value">{{ categories.length }}</span>
                        <span class="topics-stat__label">{{ categoryLabel }}</span>
                    </div>
                    <div class="topics-stat">
                        <span class="topics-stat__value">{{ tags.length }}</span>
                        <span class="topics-stat__label">{{ tagLabel }}</span>
                    </div>
                </div>
            </header>

            <div class="topics-sections">
                <section class="topics-section topics-section--categories" aria-labelledby="topics-categories-title">
                    <div class="topics-section__header">
                        <h3 id="topics-categories-title">
                            {{ categoryTitle }}
                        </h3>
                        <span>{{ categories.length }} {{ categoryLabel }}</span>
                    </div>
                    <div class="taxonomy-grid topics-grid" :aria-label="categoryTitle">
                        <a v-for="term in categories" :key="term.name" class="taxonomy-chip" :href="term.href">
                            <span class="taxonomy-chip__name">{{ term.name }}</span>
                            <span class="taxonomy-chip__count">{{ term.count }} 篇</span>
                        </a>
                    </div>
                </section>

                <section
                    class="topics-section topics-section--tags taxonomy-page--tags"
                    aria-labelledby="topics-tags-title"
                >
                    <div class="topics-section__header">
                        <h3 id="topics-tags-title">
                            {{ tagTitle }}
                        </h3>
                        <span>{{ tags.length }} {{ tagLabel }}</span>
                    </div>
                    <div class="taxonomy-grid topics-grid" :aria-label="tagTitle">
                        <a v-for="term in tags" :key="term.name" class="taxonomy-chip" :href="term.href">
                            <span class="taxonomy-chip__name">{{ term.name }}</span>
                            <span class="taxonomy-chip__count">{{ term.count }} 篇</span>
                        </a>
                    </div>
                </section>
            </div>
        </div>
    </section>
</template>
