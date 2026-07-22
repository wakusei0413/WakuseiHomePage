<script setup lang="ts">
import { useI18n } from '../composables/useI18n';

defineProps<{
    copyrightText: string;
}>();

const { t } = useI18n();
</script>

<template>
    <footer class="site-footer">
        <div class="footer-bottom">
            <span class="footer-copyright">{{ copyrightText }}</span>
            <span class="footer-tagline">{{ t('footer.tagline') }}</span>
        </div>
    </footer>
</template>
