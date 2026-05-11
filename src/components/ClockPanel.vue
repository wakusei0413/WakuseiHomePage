<script setup lang="ts">
import { useTime } from '../composables/useTime';
import type { TimeConfig } from '../types/site';

const props = defineProps<{
    config: TimeConfig;
}>();

const { timeString, dateParts } = useTime(props.config);
</script>

<template>
    <div class="clock">
        {{ timeString }}
    </div>
    <div v-if="config.showWeekday" class="weekday">
        {{ dateParts.weekday }}
    </div>
    <div v-if="config.showDate && dateParts.dateDisplay" class="date-display">
        {{ dateParts.dateDisplay }}
    </div>
</template>
