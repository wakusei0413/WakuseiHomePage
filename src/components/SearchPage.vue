<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Icon from './Icon.vue';
import PostCard from './PostCard.vue';
import { searchPosts, type SearchIndexEntry, type SearchMatchSnippet } from '../lib/search';
import { useI18n } from '../composables/useI18n';

const props = defineProps<{
    entries: SearchIndexEntry[];
}>();

const { t } = useI18n();

const query = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

const trimmedQuery = computed(() => query.value.trim());
const results = computed(() => searchPosts(props.entries, query.value));
const hasQuery = computed(() => trimmedQuery.value.length > 0);
const totalPosts = computed(() => props.entries.length);

const resultSummary = computed(() => {
    if (!hasQuery.value) {
        return t('search.summary.total').replace('{count}', String(totalPosts.value));
    }
    return t('search.summary.results').replace('{count}', String(results.value.length));
});

function clearQuery() {
    query.value = '';
    searchInput.value?.focus();
}

function snippetLabel(snippet: SearchMatchSnippet) {
    return snippet.field === 'description' ? t('search.snippet.description') : t('search.snippet.body');
}

onMounted(() => {
    window.requestAnimationFrame(() => searchInput.value?.focus());
});
</script>

<template>
    <!-- eslint-disable vue/singleline-html-element-content-newline -->
    <section class="search-page taxonomy-page" aria-labelledby="search-title">
        <div class="taxonomy-page__inner search-page__inner">
            <header class="taxonomy-header search-header">
                <p class="taxonomy-kicker search-kicker">{{ t('search.kicker') }}</p>
                <h2 id="search-title" class="taxonomy-title">{{ t('search.title') }}</h2>
                <p class="taxonomy-description search-description">{{ t('search.description') }}</p>
            </header>

            <div class="search-panel" role="search">
                <label class="search-label" for="site-search-input">{{ t('search.label') }}</label>
                <div class="search-control">
                    <Icon name="fa-solid fa-magnifying-glass" class="search-control__icon" />
                    <input
                        id="site-search-input"
                        ref="searchInput"
                        v-model="query"
                        class="search-input"
                        type="search"
                        inputmode="search"
                        autocomplete="off"
                        spellcheck="false"
                        :placeholder="t('search.placeholder')"
                        aria-describedby="search-help search-summary"
                        @keydown.esc="clearQuery"
                    />
                    <button v-if="hasQuery" class="search-clear" type="button" @click="clearQuery">
                        {{ t('search.clear') }}
                    </button>
                </div>
                <p id="search-help" class="search-help">{{ t('search.help') }}</p>
            </div>

            <div id="search-summary" class="search-summary" aria-live="polite">
                <span>{{ resultSummary }}</span>
                <span v-if="hasQuery">“{{ trimmedQuery }}”</span>
            </div>

            <div v-if="results.length" class="post-list--masonry search-results">
                <article v-for="result in results" :key="result.slug" class="search-result">
                    <PostCard
                        :slug="result.slug"
                        :data="result.data"
                        :date-label="result.dateLabel"
                        :word-count="result.wordCount"
                    />
                    <div v-if="result.snippet" class="search-snippet">
                        <span class="search-snippet__label">{{ snippetLabel(result.snippet) }}</span>
                        <p>
                            <template v-for="(part, index) in result.snippet.parts" :key="index">
                                <mark v-if="part.highlighted">{{ part.text }}</mark>
                                <span v-else>{{ part.text }}</span>
                            </template>
                        </p>
                    </div>
                </article>
            </div>

            <div v-else-if="hasQuery" class="search-empty" role="status">
                <p>{{ t('search.empty') }}</p>
                <button class="search-empty__button" type="button" @click="clearQuery">{{ t('search.retry') }}</button>
            </div>
        </div>
    </section>
</template>
