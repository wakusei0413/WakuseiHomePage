<script setup lang="ts">
import { toRef } from 'vue';
import PostCard from './PostCard.vue';
import { useI18n } from '../composables/useI18n';
import { useMasonryOrder } from '../composables/useMasonryOrder';
import type { PostListItem } from '../lib/post-model';

const props = defineProps<{ posts: PostListItem[] }>();

const { t } = useI18n();
const { orderedItems: displayPosts } = useMasonryOrder(toRef(props, 'posts'));
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
        </div>
    </section>
</template>
