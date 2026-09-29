<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from '../composables/useI18n';
import { siteConfig } from '../data/site';
import { isLocalPreview, loadTwikoo } from '../lib/twikoo-client';

const props = defineProps<{
    /** Locale-free thread key from `commentThreadPath`; the counter shares it. */
    threadPath: string;
}>();

const { t } = useI18n();
const views = ref<number | null>(null);

// One request both records this visit and returns the new total. The comment
// section never counts on its own (it has no `#twikoo_visitors` element), so a
// page view is counted exactly once.
onMounted(async () => {
    if (isLocalPreview()) return;
    try {
        const twikoo = await loadTwikoo();
        const result = await twikoo.getVisitorsCount({ envId: siteConfig.comments.envId, path: props.threadPath });
        if (typeof result?.time === 'number') views.value = result.time;
    } catch (error) {
        console.warn('[comments] failed to load view count', error);
    }
});
</script>

<template>
    <span v-if="views !== null" class="post-views">{{ t('post.views', { count: views }) }}</span>
</template>
