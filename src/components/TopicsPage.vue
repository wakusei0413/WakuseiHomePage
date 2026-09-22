<script setup lang="ts">
import type { TaxonomyTerm } from '../lib/post-model';
import { useI18n } from '../composables/useI18n';
import { usePageMeta } from '../composables/usePageMeta';

const props = defineProps<{
    titleKey: string;
    descriptionKey: string;
    metaParams: Record<string, string | number>;
    categories: TaxonomyTerm[];
    tags: TaxonomyTerm[];
    postCount: number;
}>();

const { t } = useI18n();

usePageMeta({
    titleKey: props.titleKey,
    descriptionKey: props.descriptionKey,
    params: () => props.metaParams,
    mode: 'blog'
});
</script>

<template>
    <section class="topics-page taxonomy-page" aria-labelledby="topics-title">
        <div class="taxonomy-page__inner">
            <header class="taxonomy-header topics-header">
                <p class="taxonomy-kicker topics-kicker">
                    {{ t(titleKey, metaParams) }}
                </p>
                <h2 id="topics-title" class="taxonomy-title">
                    {{ t(titleKey, metaParams) }}
                </h2>
                <p class="taxonomy-description">
                    {{ t(descriptionKey, metaParams) }}
                </p>
                <div class="topics-stats" :aria-label="t('topics.stats.aria')">
                    <div class="topics-stat">
                        <span class="topics-stat__value">{{ postCount }}</span>
                        <span class="topics-stat__label">{{ t('topics.article.label') }}</span>
                    </div>
                    <div class="topics-stat">
                        <span class="topics-stat__value">{{ categories.length }}</span>
                        <span class="topics-stat__label">{{ t('topics.category.label') }}</span>
                    </div>
                    <div class="topics-stat">
                        <span class="topics-stat__value">{{ tags.length }}</span>
                        <span class="topics-stat__label">{{ t('topics.tag.label') }}</span>
                    </div>
                </div>
            </header>

            <div class="topics-sections">
                <section class="topics-section topics-section--categories" aria-labelledby="topics-categories-title">
                    <div class="topics-section__header">
                        <h3 id="topics-categories-title">
                            {{ t('taxonomy.categories') }}
                        </h3>
                        <span>{{ t('taxonomy.count', { count: categories.length }) }}</span>
                    </div>
                    <div class="taxonomy-grid topics-grid" :aria-label="t('taxonomy.categories')">
                        <a v-for="term in categories" :key="term.name" class="taxonomy-chip" :href="term.href">
                            <span class="taxonomy-chip__name">{{ term.name }}</span>
                            <span class="taxonomy-chip__count">{{ t('taxonomy.count', { count: term.count }) }}</span>
                        </a>
                    </div>
                </section>

                <section
                    class="topics-section topics-section--tags taxonomy-page--tags"
                    aria-labelledby="topics-tags-title"
                >
                    <div class="topics-section__header">
                        <h3 id="topics-tags-title">
                            {{ t('taxonomy.tags') }}
                        </h3>
                        <span>{{ t('taxonomy.count', { count: tags.length }) }}</span>
                    </div>
                    <div class="taxonomy-grid topics-grid" :aria-label="t('taxonomy.tags')">
                        <a v-for="term in tags" :key="term.name" class="taxonomy-chip" :href="term.href">
                            <span class="taxonomy-chip__name">{{ term.name }}</span>
                            <span class="taxonomy-chip__count">{{ t('taxonomy.count', { count: term.count }) }}</span>
                        </a>
                    </div>
                </section>
            </div>
        </div>
    </section>
</template>
