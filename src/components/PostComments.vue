<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useI18n } from '../composables/useI18n';
import { siteConfig } from '../data/site';
import { TWIKOO_LOCALE_BASE, twikooLang } from '../lib/comments';
import { loadTwikoo } from '../lib/twikoo-client';

const props = defineProps<{
    /** Locale-free thread key from `commentThreadPath`. */
    threadPath: string;
}>();

const { t, locale } = useI18n();
const host = ref<HTMLElement | null>(null);
const status = ref<'loading' | 'ready' | 'failed'>('loading');

// Twikoo keeps one app per page and unmounts the previous one on every init, so
// re-running init is how it switches language; the island itself is recreated
// on each client-side navigation because it lives inside the swapped page body.
async function mountComments() {
    const el = host.value;
    if (!el) return;
    status.value = 'loading';
    try {
        const twikoo = await loadTwikoo();
        await twikoo.init({
            envId: siteConfig.comments.envId,
            el,
            path: props.threadPath,
            lang: twikooLang(locale.value),
            localeBaseUrl: TWIKOO_LOCALE_BASE
        });
        status.value = 'ready';
    } catch (error) {
        console.warn('[comments] failed to load Twikoo', error);
        status.value = 'failed';
    }
}

// useI18n adopts the page locale in its own onMounted; ignore that first change
// so it does not trigger a second init right behind the initial one.
let started = false;
watch(locale, () => {
    if (started) void mountComments();
});
onMounted(async () => {
    await mountComments();
    started = true;
});
</script>

<template>
    <section class="post-comments" :aria-label="t('post.comments.title')">
        <h2 class="post-comments__title">{{ t('post.comments.title') }}</h2>
        <p v-if="status === 'loading'" class="post-comments__status">{{ t('post.comments.loading') }}</p>
        <p v-else-if="status === 'failed'" class="post-comments__status" role="alert">
            {{ t('post.comments.failed') }}
        </p>
        <div ref="host" class="post-comments__host"></div>
    </section>
</template>
