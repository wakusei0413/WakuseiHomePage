<script setup lang="ts">
import { toRef } from 'vue';
import PostCard from './PostCard.vue';
import { useI18n } from '../composables/useI18n';
import { useMasonryOrder } from '../composables/useMasonryOrder';
import type { HomepagePagination } from '../lib/home-pagination';
import type { PostListItem } from '../lib/post-model';

const props = defineProps<{ posts: PostListItem[]; pagination: HomepagePagination }>();

const { t } = useI18n();
const { orderedItems: displayPosts } = useMasonryOrder(toRef(props, 'posts'));

function pageAriaLabel(page: number) {
    return t('home.pagination.page').replace('{page}', String(page));
}
</script>

<template>
    <section id="posts" class="homepage-content" aria-labelledby="homepage-posts-title">
        <div class="homepage-content-inner">
            <h2 id="homepage-posts-title" class="blog-title">
                {{ t('home.posts.title') }}
            </h2>
            <div v-if="displayPosts.length" class="post-list--masonry">
                <PostCard
                    v-for="post in displayPosts"
                    :key="post.slug"
                    :slug="post.slug"
                    :data="post.data"
                    :date-label="post.dateLabel"
                    :word-count="post.wordCount"
                />
            </div>
            <p v-else class="homepage-section-lead">
                {{ t('home.posts.empty') }}
            </p>
            <nav v-if="pagination.totalPages > 1" class="homepage-pagination" :aria-label="t('home.pagination.label')">
                <a
                    v-if="pagination.previousHref"
                    class="homepage-pagination__control"
                    :href="pagination.previousHref"
                    rel="prev"
                >
                    {{ t('home.pagination.previous') }}
                </a>
                <span
                    v-else
                    class="homepage-pagination__control homepage-pagination__control--disabled"
                    aria-disabled="true"
                >
                    {{ t('home.pagination.previous') }}
                </span>

                <div class="homepage-pagination__pages">
                    <template v-for="item in pagination.pages" :key="item.page">
                        <span
                            v-if="item.page === pagination.currentPage"
                            class="homepage-pagination__page homepage-pagination__page--current"
                            aria-current="page"
                            :aria-label="pageAriaLabel(item.page)"
                        >
                            {{ item.page }}
                        </span>
                        <a
                            v-else
                            class="homepage-pagination__page"
                            :href="item.href"
                            :aria-label="pageAriaLabel(item.page)"
                        >
                            {{ item.page }}
                        </a>
                    </template>
                </div>

                <a
                    v-if="pagination.nextHref"
                    class="homepage-pagination__control"
                    :href="pagination.nextHref"
                    rel="next"
                >
                    {{ t('home.pagination.next') }}
                </a>
                <span
                    v-else
                    class="homepage-pagination__control homepage-pagination__control--disabled"
                    aria-disabled="true"
                >
                    {{ t('home.pagination.next') }}
                </span>
            </nav>
        </div>
    </section>
</template>
