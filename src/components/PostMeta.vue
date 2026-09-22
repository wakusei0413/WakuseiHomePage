<script setup lang="ts">
import { useI18n } from '../composables/useI18n';

defineProps<{
    readingMinutes: number;
    updated: { iso: string; label: string } | null;
}>();

const { t } = useI18n();
</script>

<template>
    <span class="post-reading-time">{{ t('post.reading', { minutes: readingMinutes }) }}</span>
    <time v-if="updated" class="post-date post-date--updated" :datetime="updated.iso">
        {{ t('article.updated', { date: updated.label }) }}
    </time>
</template>
