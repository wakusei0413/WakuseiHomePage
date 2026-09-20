<script setup lang="ts">
import { useTime } from '../composables/useTime';
import type { TimeConfig } from '../types/site';

const props = defineProps<{ config: TimeConfig }>();

const { timeString, dateParts } = useTime(props.config);
</script>

<template>
    <div class="time-widget time-widget--compact">
        <!-- Weekday/date are also SSR-time dependent: they roll over at midnight
             and change with the locale, so allow text mismatch just like the clock. -->
        <div v-if="config.showWeekday" class="weekday" data-allow-mismatch="text">
            {{ dateParts.weekday }}
        </div>
        <div v-if="config.showDate && dateParts.dateDisplay" class="date-display" data-allow-mismatch="text">
            {{ dateParts.dateDisplay }}
        </div>
        <div class="clock" data-allow-mismatch="text">{{ timeString }}</div>
    </div>
</template>
