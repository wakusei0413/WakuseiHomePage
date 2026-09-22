<script setup lang="ts">
import { useI18n } from '../composables/useI18n';

/**
 * Minimal island for copy that lives inside markup owned by an `.astro` page.
 * The wrapper `<span>` keeps the island single-rooted (Astro hydrates one
 * element per island) and inherits the page's scoped styles untouched.
 */
defineProps<{ textKey: string }>();

const { t } = useI18n();
</script>

<template>
    <span>{{ t(textKey) }}</span>
</template>
