<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import PostCard from './PostCard.vue';
import { useI18n } from '../composables/useI18n';
import { useMasonryOrder } from '../composables/useMasonryOrder';
import { usePageMeta } from '../composables/usePageMeta';
import { searchPosts, type SearchIndexEntry, type SearchMatchSnippet } from '../lib/search';
import { loadClientSearchIndex } from '../lib/search-index-client';
import { readSearchQuery, writeSearchQuery } from '../lib/search-query';
import type { PostListItem } from '../lib/post-model';

const props = defineProps<{
    posts: PostListItem[];
}>();

const { t } = useI18n();

const query = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const entries = ref<SearchIndexEntry[] | null>(null);
const indexState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');
let isMounted = false;

const trimmedQuery = computed(() => query.value.trim());
const hasQuery = computed(() => trimmedQuery.value.length > 0);
const totalPosts = computed(() => props.posts.length);
const results = computed(() => (entries.value ? searchPosts(entries.value, query.value) : []));
const visibleCards = computed(() =>
    hasQuery.value ? results.value : props.posts.map((post) => ({ ...post, snippet: null }))
);
const { orderedItems: displayResults } = useMasonryOrder(visibleCards);

const resultSummary = computed(() => {
    if (!hasQuery.value) {
        return t('search.summary.total', { count: totalPosts.value });
    }
    return t('search.summary.results', { count: results.value.length });
});

usePageMeta({
    titleKey: 'pages.search.title',
    descriptionKey: 'pages.search.description',
    params: () => ({ count: totalPosts.value }),
    mode: 'blog'
});

function clearQuery() {
    query.value = '';
    searchInput.value?.focus();
}

async function loadIndex() {
    indexState.value = 'loading';
    try {
        entries.value = await loadClientSearchIndex();
        indexState.value = 'ready';
    } catch {
        indexState.value = 'error';
    }
}

function snippetLabel(snippet: SearchMatchSnippet) {
    return snippet.field === 'description' ? t('search.snippet.description') : t('search.snippet.body');
}

// Mirror the query into `?q=` so a search result is shareable and bookmarkable,
// and so the WebSite SearchAction target in the structured data is truthful.
// `replaceState` rather than `pushState`: typing must not flood the history or
// disturb the View Transitions state.
function syncQueryParam() {
    if (!isMounted) return;
    window.history.replaceState(window.history.state, '', writeSearchQuery(window.location.href, query.value));
}

watch(query, syncQueryParam);

onMounted(() => {
    isMounted = true;

    const requested = readSearchQuery(window.location.search);
    if (requested) {
        query.value = requested;
    }
    void loadIndex();

    window.requestAnimationFrame(() => searchInput.value?.focus());
});

onUnmounted(() => {
    isMounted = false;
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

            <div v-if="hasQuery && indexState === 'loading'" class="search-empty" role="status">
                <p>{{ t('search.loading') }}</p>
            </div>

            <div v-else-if="hasQuery && indexState === 'error'" class="search-empty" role="status">
                <p>{{ t('search.error') }}</p>
                <button class="search-empty__button" type="button" @click="loadIndex">{{ t('search.retry') }}</button>
            </div>

            <div v-else-if="displayResults.length" class="post-list--masonry search-results">
                <article v-for="result in displayResults" :key="result.slug" class="search-result">
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
