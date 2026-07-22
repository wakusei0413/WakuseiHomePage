<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { navigate } from 'astro:transitions/client';
import Icon from './Icon.vue';
import PostCard from './PostCard.vue';
import { searchPosts, type SearchIndexEntry, type SearchMatchSnippet } from '../lib/search';
import { useI18n } from '../composables/useI18n';
import { useSearchStore } from '../stores/search';

const { t } = useI18n();
const searchStore = useSearchStore();

const query = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const entries = ref<SearchIndexEntry[]>([]);
const loading = ref(true);
const dialogRef = ref<HTMLDivElement | null>(null);

const trimmedQuery = computed(() => query.value.trim());
const results = computed(() => searchPosts(entries.value, query.value));
const hasQuery = computed(() => trimmedQuery.value.length > 0);
const totalPosts = computed(() => entries.value.length);

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

function closeModal() {
    searchStore.close();
    query.value = '';
}

function handleEscape() {
    if (hasQuery.value) {
        clearQuery();
    } else {
        closeModal();
    }
}

function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
        closeModal();
    }
}

function handleResultClick(slug: string) {
    closeModal();
    navigate(`/posts/${slug}`);
}

function snippetLabel(snippet: SearchMatchSnippet) {
    return snippet.field === 'description' ? t('search.snippet.description') : t('search.snippet.body');
}

async function loadIndex() {
    try {
        loading.value = true;
        // Built endpoint — do not import posts.ts (getCollection/getImage are server-only).
        const response = await fetch('/search-index.json');
        if (!response.ok) {
            throw new Error(`search-index.json ${response.status}`);
        }
        entries.value = (await response.json()) as SearchIndexEntry[];
    } catch (error) {
        console.error('Failed to load search index:', error);
        entries.value = [];
    } finally {
        loading.value = false;
    }
}

function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        e.preventDefault();
        handleEscape();
    }
}

onMounted(() => {
    loadIndex();
    window.requestAnimationFrame(() => searchInput.value?.focus());
    document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
    <Teleport to="body">
        <div
            class="search-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-modal-title"
            @click="handleOverlayClick"
        >
            <div ref="dialogRef" class="search-modal-dialog">
                <div class="search-modal-header">
                    <div class="search-control">
                        <Icon name="fa-solid fa-magnifying-glass" class="search-control__icon" />
                        <input
                            id="search-modal-input"
                            ref="searchInput"
                            v-model="query"
                            class="search-input"
                            type="search"
                            inputmode="search"
                            autocomplete="off"
                            spellcheck="false"
                            :placeholder="t('search.placeholder')"
                            :aria-label="t('search.title')"
                            aria-describedby="search-modal-help"
                            :disabled="loading"
                        />
                        <button
                            v-if="hasQuery"
                            class="search-clear"
                            type="button"
                            :aria-label="t('search.clear')"
                            @click="clearQuery"
                        >
                            {{ t('search.clear') }}
                        </button>
                    </div>
                    <p id="search-modal-help" class="search-help">
                        {{ t('search.help') }}
                    </p>
                </div>

                <div class="search-modal-body">
                    <div v-if="loading" class="search-loading">
                        <p>{{ t('search.loading') }}</p>
                    </div>

                    <template v-else>
                        <div class="search-summary" aria-live="polite">
                            <span>{{ resultSummary }}</span>
                            <span v-if="hasQuery">"{{ trimmedQuery }}"</span>
                        </div>

                        <div v-if="results.length" class="search-results">
                            <div
                                v-for="result in results"
                                :key="result.slug"
                                class="search-result"
                                role="link"
                                tabindex="0"
                                @click="handleResultClick(result.slug)"
                                @keydown.enter.prevent="handleResultClick(result.slug)"
                            >
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
                            </div>
                        </div>

                        <div v-else-if="hasQuery" class="search-empty" role="status">
                            <p>{{ t('search.empty') }}</p>
                            <button class="search-empty__button" type="button" @click="clearQuery">
                                {{ t('search.retry') }}
                            </button>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </Teleport>
</template>
