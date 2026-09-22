<script setup lang="ts">
import { useI18n } from '../composables/useI18n';

defineProps<{
    copyrightText: string;
    version?: string;
}>();

const { t } = useI18n();
</script>

<template>
    <footer class="site-footer">
        <div class="footer-bottom">
            <span class="footer-copyright">{{ copyrightText }}</span>
            <span class="footer-meta">
                <span class="footer-tagline">{{ t('footer.tagline') }}</span>
                <span v-if="version" class="footer-version" :title="`Wakusei HomePage v${version}`">
                    v{{ version }}
                </span>
            </span>
        </div>
    </footer>
</template>
