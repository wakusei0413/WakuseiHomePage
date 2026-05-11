import { ref, computed, onMounted, onUnmounted } from 'vue';
import { formatDateParts, formatTimeString } from '../lib/time';
import { useI18nStore } from '../stores/i18n';
import type { TimeConfig } from '../types/site';

export function useTime(config: TimeConfig) {
    const i18n = useI18nStore();
    const now = ref(new Date());
    let timer: ReturnType<typeof setInterval> | null = null;

    const timeString = computed(() => formatTimeString(now.value, config.format));
    const dateParts = computed(() => formatDateParts(now.value, i18n.locale));

    onMounted(() => {
        timer = setInterval(() => {
            now.value = new Date();
        }, config.updateInterval);
    });

    onUnmounted(() => {
        if (timer) clearInterval(timer);
    });

    return { now, timeString, dateParts };
}
