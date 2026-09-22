<script setup lang="ts">
import Icon from './Icon.vue';
import { useI18n } from '../composables/useI18n';
import type { PostNavEntry } from '../lib/post-model';

defineProps<{
    prev: PostNavEntry | null;
    next: PostNavEntry | null;
}>();

const { t } = useI18n();
</script>

<template>
    <footer class="post-footer">
        <nav class="post-footer__actions" :aria-label="t('article.footer.aria')">
            <a href="/#posts" class="back-link post-footer__action post-footer__action--primary" data-internal-nav>
                <Icon name="arrow-left" size="0.9em" />
                <span>{{ t('article.footer.list') }}</span>
            </a>
            <a href="/" class="back-link post-footer__action" data-internal-nav>
                <Icon name="house" size="0.9em" />
                <span>{{ t('article.footer.home') }}</span>
            </a>
        </nav>
    </footer>
    <nav class="post-nav" :aria-label="t('article.nav.aria')">
        <a v-if="prev" class="post-nav__card post-nav__card--prev" data-internal-nav :href="`/posts/${prev.slug}`">
            <span class="post-nav__dir">← {{ t('article.nav.prev') }}</span>
            <span class="post-nav__title">{{ prev.title }}</span>
            <span v-if="prev.dateLabel" class="post-nav__date">{{ prev.dateLabel }}</span>
        </a>
        <span v-else class="post-nav__placeholder" />

        <a v-if="next" class="post-nav__card post-nav__card--next" data-internal-nav :href="`/posts/${next.slug}`">
            <span class="post-nav__dir">{{ t('article.nav.next') }} →</span>
            <span class="post-nav__title">{{ next.title }}</span>
            <span v-if="next.dateLabel" class="post-nav__date">{{ next.dateLabel }}</span>
        </a>
        <span v-else class="post-nav__placeholder" />
    </nav>
</template>
