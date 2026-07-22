<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { filterArchiveGroups, type ArchiveGroups } from '../lib/archive';
import { estimateReadingTime, type TaxonomyTerm } from '../lib/post-model';

const props = defineProps<{
    archive: ArchiveGroups;
    categories: TaxonomyTerm[];
    tags: TaxonomyTerm[];
}>();

const COLLAPSED_CATEGORY_LIMIT = 6;
const COLLAPSED_TAG_LIMIT = 10;

const archivesRoot = ref<HTMLElement | null>(null);
const activeCategory = ref<string | null>(null);
const activeTag = ref<string | null>(null);
const activeYear = ref<number | null>(null);
const isTaxonomyExpanded = ref(false);
const coverErrors = ref<Record<string, boolean>>({});

const hasArchivePosts = computed(() => props.archive.totalPosts > 0);
const hasFilters = computed(() => activeCategory.value !== null || activeTag.value !== null);
const filteredArchive = computed(() =>
    filterArchiveGroups(props.archive, {
        category: activeCategory.value,
        tag: activeTag.value
    })
);
const hasFilteredPosts = computed(() => filteredArchive.value.totalPosts > 0);
const selectedCategoryTerm = computed(() => props.categories.find((term) => term.name === activeCategory.value));
const selectedTagTerm = computed(() => props.tags.find((term) => term.name === activeTag.value));
const showExpandButton = computed(
    () => props.categories.length > COLLAPSED_CATEGORY_LIMIT || props.tags.length > COLLAPSED_TAG_LIMIT
);
const displayedCategories = computed(() =>
    isTaxonomyExpanded.value ? props.categories : props.categories.slice(0, COLLAPSED_CATEGORY_LIMIT)
);
const displayedTags = computed(() =>
    isTaxonomyExpanded.value ? props.tags : props.tags.slice(0, COLLAPSED_TAG_LIMIT)
);

const yearRange = computed(() => {
    if (props.archive.years.length === 0) return '日期待补';
    const newest = props.archive.years[0].year;
    const oldest = props.archive.years[props.archive.years.length - 1].year;
    return newest === oldest ? String(newest) : `${oldest}—${newest}`;
});

const archiveSummary = computed(
    () => `共 ${props.archive.totalPosts} 篇文章 · ${yearRange.value} · 跨 ${props.archive.totalMonths} 个月`
);

const statsCards = computed(() => [
    { value: String(props.archive.totalPosts), label: '篇文章' },
    { value: yearRange.value, label: '年份跨度' },
    { value: String(props.categories.length), label: '个分类' }
]);

const resultSummary = computed(() => {
    if (!hasFilters.value) return `正在浏览全部 ${props.archive.totalPosts} 篇文章`;
    return `当前显示 ${filteredArchive.value.totalPosts} / ${props.archive.totalPosts} 篇文章`;
});

function postHref(slug: string) {
    return `/posts/${slug}`;
}

function readingLabel(wordCount: number) {
    return `${estimateReadingTime(wordCount)} 分钟阅读`;
}

function toggleCategory(category: string) {
    activeCategory.value = activeCategory.value === category ? null : category;
}

function toggleTag(tag: string) {
    activeTag.value = activeTag.value === tag ? null : tag;
}

function resetFilters() {
    activeCategory.value = null;
    activeTag.value = null;
}

function markCoverFailed(slug: string) {
    coverErrors.value = { ...coverErrors.value, [slug]: true };
}

function syncFilterQuery() {
    const url = new URL(window.location.href);

    if (activeCategory.value) url.searchParams.set('category', activeCategory.value);
    else url.searchParams.delete('category');

    if (activeTag.value) url.searchParams.set('tag', activeTag.value);
    else url.searchParams.delete('tag');

    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function scrollToYear(year: number) {
    const el = document.getElementById(`year-${year}`);
    if (!el) return;

    const scroller = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

    if (scroller) {
        const elRect = el.getBoundingClientRect();
        const scrollerRect = scroller.getBoundingClientRect();
        scroller.scrollTo({ top: scroller.scrollTop + elRect.top - scrollerRect.top - 112, behavior });
        return;
    }

    el.scrollIntoView({ behavior, block: 'start' });
}

let isMounted = false;
let observerEpoch = 0;
let yearObserver: IntersectionObserver | null = null;

async function setupYearObserver() {
    const epoch = ++observerEpoch;
    yearObserver?.disconnect();
    yearObserver = null;
    await nextTick();

    if (epoch !== observerEpoch) return;

    const yearElements = archivesRoot.value?.querySelectorAll<HTMLElement>('.archives-year[data-year]') ?? [];
    const firstYear = filteredArchive.value.years[0]?.year ?? null;
    activeYear.value = firstYear;

    if (yearElements.length <= 1) return;

    const scroller = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    yearObserver = new IntersectionObserver(
        (entries) => {
            const visible = entries
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

            if (visible.length === 0) return;
            const year = Number((visible[0].target as HTMLElement).dataset.year);
            if (!Number.isNaN(year)) activeYear.value = year;
        },
        {
            root: scroller instanceof Element ? scroller : null,
            rootMargin: '-18% 0px -62% 0px',
            threshold: 0
        }
    );

    yearElements.forEach((element) => yearObserver?.observe(element));
}

watch([activeCategory, activeTag], () => {
    if (isMounted) syncFilterQuery();
});

watch(
    () => filteredArchive.value.years.map((year) => year.year).join(','),
    () => setupYearObserver(),
    { flush: 'post' }
);

let scrollAnimObserver: IntersectionObserver | null = null;

function setupScrollAnimations() {
    scrollAnimObserver?.disconnect();
    scrollAnimObserver = null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const scroller = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    const posts = archivesRoot.value?.querySelectorAll<HTMLElement>('.archives-post') ?? [];

    scrollAnimObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const el = entry.target as HTMLElement;
                    const delay = Number(el.dataset.animDelay) || 0;
                    setTimeout(() => el.classList.add('is-visible'), delay);
                    scrollAnimObserver?.unobserve(el);
                }
            });
        },
        {
            root: scroller instanceof Element ? scroller : null,
            rootMargin: '0px 0px -10% 0px',
            threshold: 0.1
        }
    );

    posts.forEach((post, idx) => {
        post.dataset.animDelay = String(Math.min(idx * 60, 300));
        post.classList.add('archives-post--animated');
        scrollAnimObserver?.observe(post);
    });
}

onMounted(() => {
    const search = new URLSearchParams(window.location.search);
    const requestedCategory = search.get('category');
    const requestedTag = search.get('tag');

    if (requestedCategory && props.categories.some((term) => term.name === requestedCategory)) {
        activeCategory.value = requestedCategory;
    }
    if (requestedTag && props.tags.some((term) => term.name === requestedTag)) {
        activeTag.value = requestedTag;
    }

    isMounted = true;
    syncFilterQuery();
    setupYearObserver();
    nextTick(() => setupScrollAnimations());
});

onUnmounted(() => {
    isMounted = false;
    observerEpoch += 1;
    yearObserver?.disconnect();
    yearObserver = null;
    scrollAnimObserver?.disconnect();
    scrollAnimObserver = null;
});
</script>

<template>
    <!-- eslint-disable vue/singleline-html-element-content-newline -->
    <section ref="archivesRoot" class="archives-page" aria-labelledby="archives-index-title">
        <div class="archives-page__inner">
            <header class="archives-index-header">
                <p class="archives-index-header__eyebrow">Archive index</p>
                <h2 id="archives-index-title">写作索引</h2>
                <p class="archives-index-header__summary">{{ archiveSummary }}</p>
                <div class="archives-stats-row">
                    <div v-for="(stat, idx) in statsCards" :key="idx" class="archives-stat-card">
                        <span class="archives-stat-card__value">{{ stat.value }}</span>
                        <span class="archives-stat-card__label">{{ stat.label }}</span>
                    </div>
                </div>
            </header>

            <section v-if="categories.length || tags.length" class="archives-topics" aria-labelledby="topics-title">
                <div class="archives-section-heading">
                    <div>
                        <p>Browse by subject</p>
                        <h3 id="topics-title">按主题浏览</h3>
                    </div>
                    <span>分类与标签可以组合筛选</span>
                </div>

                <div v-if="categories.length" class="archives-topic-group">
                    <div class="archives-topic-group__heading">
                        <h4>分类</h4>
                        <a href="/categories">全部分类 ↗</a>
                    </div>
                    <div class="archives-category-grid" aria-label="按分类筛选">
                        <button
                            v-for="(term, idx) in displayedCategories"
                            :key="term.name"
                            type="button"
                            class="archives-category-card"
                            :class="{ 'is-active': activeCategory === term.name }"
                            :style="{
                                '--card-accent': ['var(--accent-blue)', 'var(--accent-red)', 'var(--accent-yellow)'][
                                    idx % 3
                                ]
                            }"
                            :aria-pressed="activeCategory === term.name"
                            @click="toggleCategory(term.name)"
                        >
                            <span class="archives-category-card__bar" aria-hidden="true"></span>
                            <span class="archives-category-card__name">{{ term.name }}</span>
                            <span class="archives-category-card__count">{{ term.count }}</span>
                        </button>
                    </div>
                </div>

                <div v-if="tags.length" class="archives-topic-group archives-topic-group--tags">
                    <div class="archives-topic-group__heading">
                        <h4>标签</h4>
                        <a href="/tags">全部标签 ↗</a>
                    </div>
                    <div class="archives-tag-index" aria-label="按标签筛选">
                        <button
                            v-for="term in displayedTags"
                            :key="term.name"
                            type="button"
                            class="archives-tag-term"
                            :class="{ 'is-active': activeTag === term.name }"
                            :aria-pressed="activeTag === term.name"
                            @click="toggleTag(term.name)"
                        >
                            <span>#{{ term.name }}</span>
                            <sup>{{ term.count }}</sup>
                        </button>
                    </div>
                </div>

                <button
                    v-if="showExpandButton"
                    type="button"
                    class="archives-topics-expand"
                    :aria-expanded="isTaxonomyExpanded"
                    @click="isTaxonomyExpanded = !isTaxonomyExpanded"
                >
                    {{ isTaxonomyExpanded ? '收起主题' : '展开全部主题' }}
                </button>
            </section>

            <div v-if="hasFilters" class="archives-filter-bar" aria-label="当前筛选条件">
                <div class="archives-filter-bar__summary" aria-live="polite">{{ resultSummary }}</div>
                <div class="archives-filter-bar__items">
                    <div v-if="selectedCategoryTerm" class="archives-active-filter">
                        <button type="button" aria-label="清除分类筛选" @click="activeCategory = null">
                            分类：{{ selectedCategoryTerm.name }}
                            <span aria-hidden="true">×</span>
                        </button>
                        <a :href="selectedCategoryTerm.href">查看专题 ↗</a>
                    </div>
                    <div v-if="selectedTagTerm" class="archives-active-filter">
                        <button type="button" aria-label="清除标签筛选" @click="activeTag = null">
                            标签：#{{ selectedTagTerm.name }}
                            <span aria-hidden="true">×</span>
                        </button>
                        <a :href="selectedTagTerm.href">查看专题 ↗</a>
                    </div>
                    <button type="button" class="archives-filter-reset" @click="resetFilters">清除全部</button>
                </div>
            </div>
            <p v-else class="archives-result-summary" aria-live="polite">{{ resultSummary }}</p>

            <nav v-if="filteredArchive.years.length > 1" class="archives-year-index" aria-label="年份快速跳转">
                <span>年份</span>
                <button
                    v-for="year in filteredArchive.years"
                    :key="year.year"
                    type="button"
                    :class="{ 'is-active': activeYear === year.year }"
                    :aria-current="activeYear === year.year ? 'true' : undefined"
                    @click="scrollToYear(year.year)"
                >
                    {{ year.year }}
                </button>
            </nav>

            <div v-if="hasFilteredPosts" class="archives-timeline">
                <section
                    v-for="year in filteredArchive.years"
                    :id="`year-${year.year}`"
                    :key="year.year"
                    class="archives-year"
                    :data-year="year.year"
                >
                    <header class="archives-year__marker">
                        <span>{{ year.year }}</span>
                        <small>{{ year.count }} 篇</small>
                    </header>

                    <div class="archives-year__months">
                        <section
                            v-for="month in year.months"
                            :key="`${year.year}-${month.month}`"
                            class="archives-month"
                        >
                            <header class="archives-month__header">
                                <h3>{{ month.label }}</h3>
                                <span>{{ month.count }} 篇</span>
                            </header>

                            <div class="archives-month__posts">
                                <a
                                    v-for="post in month.posts"
                                    :key="post.slug"
                                    class="archives-post"
                                    :class="{
                                        'archives-post--has-cover': post.data.cover && !coverErrors[post.slug]
                                    }"
                                    :href="postHref(post.slug)"
                                >
                                    <div class="archives-post__body">
                                        <div class="archives-post__meta">
                                            <time :datetime="post.archiveIso">
                                                {{ post.archiveDayLabel }}/{{
                                                    String(post.archiveMonth).padStart(2, '0')
                                                }}
                                            </time>
                                            <span>{{ readingLabel(post.wordCount) }}</span>
                                            <span v-if="post.data.category">{{ post.data.category }}</span>
                                        </div>
                                        <h4>{{ post.data.title }}</h4>
                                        <p>{{ post.data.description }}</p>
                                        <div
                                            v-if="post.data.tags?.length"
                                            class="archives-post__tags"
                                            aria-label="文章标签"
                                        >
                                            <span v-for="tag in post.data.tags" :key="tag">#{{ tag }}</span>
                                        </div>
                                    </div>
                                    <div
                                        v-if="post.data.cover && !coverErrors[post.slug]"
                                        class="archives-post__cover"
                                        aria-hidden="true"
                                    >
                                        <img
                                            :src="post.data.cover"
                                            alt=""
                                            loading="lazy"
                                            decoding="async"
                                            fetchpriority="low"
                                            @error="markCoverFailed(post.slug)"
                                        />
                                    </div>
                                </a>
                            </div>
                        </section>
                    </div>
                </section>

                <section v-if="filteredArchive.undated.length" class="archives-year archives-year--undated">
                    <header class="archives-year__marker">
                        <span>日期待补</span>
                        <small>{{ filteredArchive.undated.length }} 篇</small>
                    </header>

                    <div class="archives-year__months">
                        <section class="archives-month">
                            <header class="archives-month__header">
                                <h3>未注明日期</h3>
                                <span>{{ filteredArchive.undated.length }} 篇</span>
                            </header>

                            <div class="archives-month__posts">
                                <a
                                    v-for="post in filteredArchive.undated"
                                    :key="post.slug"
                                    class="archives-post archives-post--undated"
                                    :class="{
                                        'archives-post--has-cover': post.data.cover && !coverErrors[post.slug]
                                    }"
                                    :href="postHref(post.slug)"
                                >
                                    <div class="archives-post__body">
                                        <div class="archives-post__meta">
                                            <span>{{ readingLabel(post.wordCount) }}</span>
                                            <span v-if="post.data.category">{{ post.data.category }}</span>
                                        </div>
                                        <h4>{{ post.data.title }}</h4>
                                        <p>{{ post.data.description }}</p>
                                        <div
                                            v-if="post.data.tags?.length"
                                            class="archives-post__tags"
                                            aria-label="文章标签"
                                        >
                                            <span v-for="tag in post.data.tags" :key="tag">#{{ tag }}</span>
                                        </div>
                                    </div>
                                    <div
                                        v-if="post.data.cover && !coverErrors[post.slug]"
                                        class="archives-post__cover"
                                        aria-hidden="true"
                                    >
                                        <img
                                            :src="post.data.cover"
                                            alt=""
                                            loading="lazy"
                                            decoding="async"
                                            fetchpriority="low"
                                            @error="markCoverFailed(post.slug)"
                                        />
                                    </div>
                                </a>
                            </div>
                        </section>
                    </div>
                </section>
            </div>

            <div v-else-if="hasArchivePosts" class="archives-empty archives-empty--filtered" role="status">
                <p>没有同时匹配这些主题的文章。</p>
                <button type="button" @click="resetFilters">清除筛选，查看全部文章</button>
            </div>

            <p v-else class="archives-empty">这里暂时还没有文章。</p>
        </div>
    </section>
</template>
