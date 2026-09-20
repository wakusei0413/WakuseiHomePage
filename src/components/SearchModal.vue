<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
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
const selectedIndex = ref(-1);
const resultElements = ref<HTMLElement[]>([]);

let previousActiveElement: HTMLElement | null = null;

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

watch(trimmedQuery, () => {
    selectedIndex.value = -1;
});

function clearQuery() {
    query.value = '';
    selectedIndex.value = -1;
    searchInput.value?.focus();
}

function closeModal() {
    searchStore.close();
    query.value = '';
    selectedIndex.value = -1;
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
    }
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

function handleViewAllSearch() {
    if (!trimmedQuery.value) return;
    const targetUrl = `/search?q=${encodeURIComponent(trimmedQuery.value)}`;
    closeModal();
    navigate(targetUrl);
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

function scrollToSelected() {
    nextTick(() => {
        if (selectedIndex.value >= 0 && resultElements.value[selectedIndex.value]) {
            resultElements.value[selectedIndex.value].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    });
}

function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        e.preventDefault();
        handleEscape();
        return;
    }

    if (e.key === 'ArrowDown') {
        if (results.value.length > 0) {
            e.preventDefault();
            selectedIndex.value = (selectedIndex.value + 1) % results.value.length;
            scrollToSelected();
        }
        return;
    }

    if (e.key === 'ArrowUp') {
        if (results.value.length > 0) {
            e.preventDefault();
            selectedIndex.value = selectedIndex.value <= 0 ? results.value.length - 1 : selectedIndex.value - 1;
            scrollToSelected();
        }
        return;
    }

    if (e.key === 'Enter') {
        if (selectedIndex.value >= 0 && results.value[selectedIndex.value]) {
            e.preventDefault();
            handleResultClick(results.value[selectedIndex.value].slug);
            return;
        }
        if (hasQuery.value) {
            e.preventDefault();
            handleViewAllSearch();
            return;
        }
    }

    // Focus Trap: keep Tab within modal
    if (e.key === 'Tab' && dialogRef.value) {
        const focusableElements = dialogRef.value.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
}

onMounted(() => {
    previousActiveElement = document.activeElement as HTMLElement | null;
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
                            <button
                                v-if="hasQuery && results.length > 0"
                                type="button"
                                class="search-view-all-link"
                                @click="handleViewAllSearch"
                            >
                                {{ t('search.page.title') }} →
                            </button>
                        </div>

                        <div v-if="results.length" class="search-results">
                            <div
                                v-for="(result, idx) in results"
                                :key="result.slug"
                                :ref="
                                    (el) => {
                                        if (el) resultElements[idx] = el as HTMLElement;
                                    }
                                "
                                class="search-result"
                                :class="{ 'search-result--selected': selectedIndex === idx }"
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
