import { ref, computed, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue';
import { formatDateParts, formatTimeString } from '../lib/time';
import { useI18nStore } from '../stores/i18n';
import type { TimeConfig } from '../types/site';

// Shared ticker so tiled marquee clock cards do not each open an interval.
const sharedNow: Ref<Date> = ref(new Date());
let sharedTimer: ReturnType<typeof setInterval> | null = null;
let sharedIntervalMs = 1000;
let subscriberCount = 0;

function ensureSharedTimer(intervalMs: number) {
    if (sharedTimer && sharedIntervalMs === intervalMs) {
        return;
    }
    if (sharedTimer) {
        clearInterval(sharedTimer);
    }
    sharedIntervalMs = intervalMs;
    sharedTimer = setInterval(() => {
        sharedNow.value = new Date();
    }, sharedIntervalMs);
}

function releaseSharedTimer() {
    if (subscriberCount > 0) {
        return;
    }
    if (sharedTimer) {
        clearInterval(sharedTimer);
        sharedTimer = null;
    }
}

export function useTime(config: TimeConfig): {
    now: Ref<Date>;
    timeString: ComputedRef<string>;
    dateParts: ComputedRef<ReturnType<typeof formatDateParts>>;
} {
    const i18n = useI18nStore();

    const timeString = computed(() => formatTimeString(sharedNow.value, config.format));
    const dateParts = computed(() => formatDateParts(sharedNow.value, i18n.locale));

    onMounted(() => {
        subscriberCount += 1;
        ensureSharedTimer(config.updateInterval);
        // Sync immediately so newly mounted clocks are not a second behind.
        sharedNow.value = new Date();
    });

    onUnmounted(() => {
        subscriberCount = Math.max(0, subscriberCount - 1);
        releaseSharedTimer();
    });

    return { now: sharedNow, timeString, dateParts };
}
