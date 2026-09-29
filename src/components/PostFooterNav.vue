<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';
import { useI18n } from '../composables/useI18n';
import { resolveLocalizedPath } from '../lib/i18n-routing';
import type { PostNavEntry } from '../lib/post-model';

const props = defineProps<{
    prev: PostNavEntry | null;
    next: PostNavEntry | null;
}>();

const { t, locale } = useI18n();

const listHref = computed(() => resolveLocalizedPath('/#posts', locale.value));
const homeHref = computed(() => resolveLocalizedPath('/', locale.value));
const prevHref = computed(() => (props.prev ? resolveLocalizedPath(`/posts/${props.prev.slug}`, locale.value) : ''));
const nextHref = computed(() => (props.next ? resolveLocalizedPath(`/posts/${props.next.slug}`, locale.value) : ''));
</script>

<template>
    <footer class="post-footer">
        <nav class="post-footer__actions" :aria-label="t('article.footer.aria')">
            <a :href="listHref" class="back-link post-footer__action post-footer__action--primary" data-internal-nav>
                <Icon name="arrow-left" size="0.9em" />
                <span>{{ t('article.footer.list') }}</span>
            </a>
            <a :href="homeHref" class="back-link post-footer__action" data-internal-nav>
                <Icon name="house" size="0.9em" />
                <span>{{ t('article.footer.home') }}</span>
            </a>
        </nav>
    </footer>
    <nav class="post-nav" :aria-label="t('article.nav.aria')">
        <a v-if="prev" class="post-nav__card post-nav__card--prev" data-internal-nav :href="prevHref">
            <span class="post-nav__dir">← {{ t('article.nav.prev') }}</span>
            <span class="post-nav__title">{{ prev.title }}</span>
            <span v-if="prev.dateLabel" class="post-nav__date">{{ prev.dateLabel }}</span>
        </a>
        <span v-else class="post-nav__placeholder" />

        <a v-if="next" class="post-nav__card post-nav__card--next" data-internal-nav :href="nextHref">
            <span class="post-nav__dir">{{ t('article.nav.next') }} →</span>
            <span class="post-nav__title">{{ next.title }}</span>
            <span v-if="next.dateLabel" class="post-nav__date">{{ next.dateLabel }}</span>
        </a>
        <span v-else class="post-nav__placeholder" />
    </nav>
</template>
